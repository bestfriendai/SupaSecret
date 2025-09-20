import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthMonitor } from './healthMonitor';

export type ConnectionType = 'wifi' | '4g' | '5g' | '3g' | '2g' | 'ethernet' | 'unknown';
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface NetworkProfile {
  bandwidth: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
  packetLoss: number; // percentage
  connectionType: ConnectionType;
  quality: NetworkQuality;
  stability: number; // 0-1 score
  timestamp: number;
  isMetered: boolean;
  signalStrength?: number;
}

export interface NetworkPattern {
  hour: number;
  dayOfWeek: number;
  averageBandwidth: number;
  averageLatency: number;
  quality: NetworkQuality;
  samples: number;
}

interface NetworkMeasurement {
  bandwidth: number;
  latency: number;
  timestamp: number;
  connectionType: ConnectionType;
}

interface NetworkConditionOptions {
  enableAdaptiveMeasurement?: boolean;
  enablePatternLearning?: boolean;
  enableDataUsageTracking?: boolean;
  measurementInterval?: number;
  historySize?: number;
}

class NetworkProfiler {
  private currentProfile: NetworkProfile | null = null;
  private measurementHistory: NetworkMeasurement[] = [];
  private networkPatterns: Map<string, NetworkPattern> = new Map();
  private stabilityHistory: number[] = [];
  private dataUsage = {
    wifi: 0,
    cellular: 0,
    total: 0,
    resetDate: Date.now()
  };
  private networkSubscription: NetInfoSubscription | null = null;
  private measurementInterval: NodeJS.Timeout | null = null;
  private options: Required<NetworkConditionOptions>;
  private readonly CACHE_KEY_PREFIX = 'network_profiler_';
  private readonly STABILITY_WINDOW = 10;
  private readonly PATTERN_SAMPLE_THRESHOLD = 5;
  private testUrls = [
    'https://www.gstatic.com/generate_204',
    'https://api.github.com',
    'https://www.cloudflare.com/cdn-cgi/trace'
  ];

  constructor(options: NetworkConditionOptions = {}) {
    this.options = {
      enableAdaptiveMeasurement: options.enableAdaptiveMeasurement ?? true,
      enablePatternLearning: options.enablePatternLearning ?? true,
      enableDataUsageTracking: options.enableDataUsageTracking ?? true,
      measurementInterval: options.measurementInterval ?? 30000, // 30 seconds
      historySize: options.historySize ?? 100
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load persisted data
    await this.loadPersistedData();

    // Start network monitoring
    this.startNetworkMonitoring();

    // Start periodic measurements
    if (this.options.enableAdaptiveMeasurement) {
      this.startAdaptiveMeasurement();
    }

    // Initial measurement
    await this.measureNetworkCondition();
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load network patterns
      const patternsData = await AsyncStorage.getItem(`${this.CACHE_KEY_PREFIX}patterns`);
      if (patternsData) {
        const patterns = JSON.parse(patternsData);
        this.networkPatterns = new Map(Object.entries(patterns));
      }

      // Load data usage
      const dataUsageData = await AsyncStorage.getItem(`${this.CACHE_KEY_PREFIX}data_usage`);
      if (dataUsageData) {
        this.dataUsage = JSON.parse(dataUsageData);

        // Reset monthly
        const monthDiff = new Date().getMonth() - new Date(this.dataUsage.resetDate).getMonth();
        if (monthDiff !== 0) {
          this.resetDataUsage();
        }
      }

      // Load last profile
      const profileData = await AsyncStorage.getItem(`${this.CACHE_KEY_PREFIX}last_profile`);
      if (profileData) {
        this.currentProfile = JSON.parse(profileData);
      }
    } catch (error) {
      console.error('Failed to load persisted network data:', error);
    }
  }

  private startNetworkMonitoring(): void {
    this.networkSubscription = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
  }

  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    const wasConnected = this.currentProfile !== null;
    const isConnected = state.isConnected;

    if (isConnected && !wasConnected) {
      // Connection restored - measure immediately
      await this.measureNetworkCondition();
    } else if (!isConnected && wasConnected) {
      // Connection lost
      this.currentProfile = {
        bandwidth: 0,
        latency: Infinity,
        jitter: Infinity,
        packetLoss: 100,
        connectionType: 'unknown',
        quality: 'poor',
        stability: 0,
        timestamp: Date.now(),
        isMetered: false
      };
    }

    // Update health monitor
    healthMonitor.updateNetworkStatus(isConnected);
  }

  private startAdaptiveMeasurement(): void {
    const performMeasurement = async () => {
      const profile = await this.measureNetworkCondition();

      if (profile) {
        // Adjust measurement frequency based on stability
        let nextInterval = this.options.measurementInterval;

        if (profile.stability < 0.5) {
          // Unstable network - measure more frequently
          nextInterval = Math.max(10000, nextInterval / 2);
        } else if (profile.stability > 0.9) {
          // Very stable - measure less frequently
          nextInterval = Math.min(60000, nextInterval * 1.5);
        }

        // Schedule next measurement
        this.measurementInterval = setTimeout(performMeasurement, nextInterval);
      }
    };

    performMeasurement();
  }

  public async measureNetworkCondition(): Promise<NetworkProfile | null> {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      return null;
    }

    const connectionType = this.detectConnectionType(netInfo);
    const bandwidth = await this.measureBandwidth();
    const latency = await this.measureLatency();
    const jitter = this.calculateJitter();
    const packetLoss = await this.estimatePacketLoss();
    const stability = this.calculateStability(bandwidth);

    const profile: NetworkProfile = {
      bandwidth,
      latency,
      jitter,
      packetLoss,
      connectionType,
      quality: this.classifyNetworkQuality(bandwidth, latency, stability),
      stability,
      timestamp: Date.now(),
      isMetered: netInfo.details?.isConnectionExpensive ?? false,
      signalStrength: this.getSignalStrength(netInfo)
    };

    // Update history
    this.addMeasurement({
      bandwidth,
      latency,
      timestamp: Date.now(),
      connectionType
    });

    // Learn patterns
    if (this.options.enablePatternLearning) {
      this.learnNetworkPattern(profile);
    }

    // Track data usage
    if (this.options.enableDataUsageTracking) {
      this.trackDataUsage(connectionType);
    }

    this.currentProfile = profile;
    await this.persistProfile(profile);

    return profile;
  }

  private detectConnectionType(netInfo: NetInfoState): ConnectionType {
    const type = netInfo.type.toLowerCase();

    if (type === 'wifi') return 'wifi';
    if (type === 'ethernet') return 'ethernet';

    if (type === 'cellular') {
      const cellularGeneration = (netInfo.details as any)?.cellularGeneration;

      if (cellularGeneration) {
        const gen = cellularGeneration.toLowerCase();
        if (gen.includes('5g')) return '5g';
        if (gen.includes('4g') || gen.includes('lte')) return '4g';
        if (gen.includes('3g')) return '3g';
        if (gen.includes('2g')) return '2g';
      }

      return '4g'; // Default to 4G for cellular
    }

    return 'unknown';
  }

  private async measureBandwidth(): Promise<number> {
    const measurements: number[] = [];

    for (const url of this.testUrls.slice(0, 2)) {
      try {
        const size = 1024; // Approximate response size in bytes
        const startTime = Date.now();

        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (response.ok) {
          const duration = Date.now() - startTime;
          const bandwidth = (size * 8) / (duration / 1000) / 1000000; // Mbps
          measurements.push(bandwidth);
        }
      } catch (error) {
        // Continue with other URLs
      }
    }

    if (measurements.length === 0) {
      return this.estimateBandwidthFromConnection();
    }

    // Return median
    measurements.sort((a, b) => a - b);
    return measurements[Math.floor(measurements.length / 2)];
  }

  private async measureLatency(): Promise<number> {
    const measurements: number[] = [];

    for (const url of this.testUrls) {
      try {
        const startTime = Date.now();

        await fetch(url, {
          method: 'HEAD',
          cache: 'no-cache'
        });

        const latency = Date.now() - startTime;
        measurements.push(latency);
      } catch (error) {
        // Continue with other URLs
      }
    }

    if (measurements.length === 0) {
      return 100; // Default latency
    }

    // Return minimum (best case)
    return Math.min(...measurements);
  }

  private calculateJitter(): number {
    if (this.measurementHistory.length < 2) return 0;

    const recentLatencies = this.measurementHistory
      .slice(-10)
      .map(m => m.latency);

    if (recentLatencies.length < 2) return 0;

    let sumDifferences = 0;
    for (let i = 1; i < recentLatencies.length; i++) {
      sumDifferences += Math.abs(recentLatencies[i] - recentLatencies[i - 1]);
    }

    return sumDifferences / (recentLatencies.length - 1);
  }

  private async estimatePacketLoss(): Promise<number> {
    // Simplified packet loss estimation
    // In a real implementation, this would use ICMP or specialized protocols
    let successCount = 0;
    const attempts = 5;

    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(this.testUrls[0], {
          method: 'HEAD',
          signal: AbortSignal.timeout(1000)
        });

        if (response.ok) {
          successCount++;
        }
      } catch {
        // Counted as packet loss
      }
    }

    return ((attempts - successCount) / attempts) * 100;
  }

  private calculateStability(currentBandwidth: number): number {
    this.stabilityHistory.push(currentBandwidth);

    if (this.stabilityHistory.length > this.STABILITY_WINDOW) {
      this.stabilityHistory.shift();
    }

    if (this.stabilityHistory.length < 2) return 1;

    // Calculate coefficient of variation
    const mean = this.stabilityHistory.reduce((a, b) => a + b, 0) / this.stabilityHistory.length;
    const variance = this.stabilityHistory.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / this.stabilityHistory.length;

    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Convert to 0-1 stability score (lower variation = higher stability)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  private classifyNetworkQuality(
    bandwidth: number,
    latency: number,
    stability: number
  ): NetworkQuality {
    // Weighted scoring
    const bandwidthScore = Math.min(1, bandwidth / 20); // 20 Mbps = perfect
    const latencyScore = Math.max(0, 1 - latency / 200); // 0ms = perfect, 200ms+ = 0
    const stabilityScore = stability;

    const totalScore = bandwidthScore * 0.4 + latencyScore * 0.3 + stabilityScore * 0.3;

    if (totalScore >= 0.8) return 'excellent';
    if (totalScore >= 0.6) return 'good';
    if (totalScore >= 0.4) return 'fair';
    return 'poor';
  }

  private getSignalStrength(netInfo: NetInfoState): number | undefined {
    // This would need platform-specific implementation
    // For now, return undefined
    return undefined;
  }

  private addMeasurement(measurement: NetworkMeasurement): void {
    this.measurementHistory.push(measurement);

    // Keep history size limited
    if (this.measurementHistory.length > this.options.historySize) {
      this.measurementHistory.shift();
    }
  }

  private learnNetworkPattern(profile: NetworkProfile): void {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const key = `${dayOfWeek}_${hour}`;

    const existing = this.networkPatterns.get(key);

    if (existing) {
      // Update existing pattern
      const samples = existing.samples + 1;
      const avgBandwidth = (existing.averageBandwidth * existing.samples + profile.bandwidth) / samples;
      const avgLatency = (existing.averageLatency * existing.samples + profile.latency) / samples;

      this.networkPatterns.set(key, {
        hour,
        dayOfWeek,
        averageBandwidth: avgBandwidth,
        averageLatency: avgLatency,
        quality: this.classifyNetworkQuality(avgBandwidth, avgLatency, profile.stability),
        samples
      });
    } else {
      // Create new pattern
      this.networkPatterns.set(key, {
        hour,
        dayOfWeek,
        averageBandwidth: profile.bandwidth,
        averageLatency: profile.latency,
        quality: profile.quality,
        samples: 1
      });
    }

    // Persist patterns periodically
    if (Math.random() < 0.1) {
      this.persistPatterns();
    }
  }

  private trackDataUsage(connectionType: ConnectionType): void {
    const estimatedBytes = 1024; // Rough estimate per measurement

    if (connectionType === 'wifi') {
      this.dataUsage.wifi += estimatedBytes;
    } else if (['4g', '5g', '3g', '2g'].includes(connectionType)) {
      this.dataUsage.cellular += estimatedBytes;
    }

    this.dataUsage.total += estimatedBytes;

    // Persist periodically
    if (Math.random() < 0.1) {
      this.persistDataUsage();
    }
  }

  private resetDataUsage(): void {
    this.dataUsage = {
      wifi: 0,
      cellular: 0,
      total: 0,
      resetDate: Date.now()
    };
    this.persistDataUsage();
  }

  private async estimateBandwidthFromConnection(): Promise<number> {
    const netInfo = await NetInfo.fetch();
    const connectionType = this.detectConnectionType(netInfo);

    const bandwidthMap: Record<ConnectionType, number> = {
      '5g': 20,
      '4g': 10,
      '3g': 2,
      '2g': 0.1,
      'wifi': 15,
      'ethernet': 100,
      'unknown': 5
    };

    return bandwidthMap[connectionType];
  }

  private async persistProfile(profile: NetworkProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_KEY_PREFIX}last_profile`,
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error('Failed to persist network profile:', error);
    }
  }

  private async persistPatterns(): Promise<void> {
    try {
      const patterns = Object.fromEntries(this.networkPatterns);
      await AsyncStorage.setItem(
        `${this.CACHE_KEY_PREFIX}patterns`,
        JSON.stringify(patterns)
      );
    } catch (error) {
      console.error('Failed to persist network patterns:', error);
    }
  }

  private async persistDataUsage(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_KEY_PREFIX}data_usage`,
        JSON.stringify(this.dataUsage)
      );
    } catch (error) {
      console.error('Failed to persist data usage:', error);
    }
  }

  public getCurrentProfile(): NetworkProfile | null {
    return this.currentProfile;
  }

  public getPredictedQuality(): NetworkQuality | null {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const key = `${dayOfWeek}_${hour}`;

    const pattern = this.networkPatterns.get(key);

    if (pattern && pattern.samples >= this.PATTERN_SAMPLE_THRESHOLD) {
      return pattern.quality;
    }

    return this.currentProfile?.quality ?? null;
  }

  public getDataUsage(): typeof this.dataUsage {
    return { ...this.dataUsage };
  }

  public shouldReduceDataUsage(): boolean {
    if (!this.currentProfile) return false;

    // Reduce data usage on metered connections or poor quality
    return this.currentProfile.isMetered || this.currentProfile.quality === 'poor';
  }

  public async testConnectivity(url?: string): Promise<boolean> {
    try {
      const testUrl = url || this.testUrls[0];
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  public destroy(): void {
    if (this.networkSubscription) {
      this.networkSubscription();
      this.networkSubscription = null;
    }

    if (this.measurementInterval) {
      clearTimeout(this.measurementInterval);
      this.measurementInterval = null;
    }

    // Persist final state
    this.persistPatterns();
    this.persistDataUsage();
  }
}

export const networkProfiler = new NetworkProfiler();