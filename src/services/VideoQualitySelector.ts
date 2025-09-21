import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { environmentDetector } from "../utils/environmentDetector";
import { healthMonitor } from "../utils/healthMonitor";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { networkProfiler } from "../utils/networkProfiler";

export type VideoQuality = "360p" | "720p" | "1080p";
type NetworkQuality = "poor" | "fair" | "good" | "excellent";
type DeviceCapabilityTier = "low" | "mid" | "high";

interface NetworkProfile {
  bandwidth: number;
  connectionType: string;
  stability: number;
  quality: NetworkQuality;
  timestamp: number;
}

interface QualityVariant {
  quality: VideoQuality;
  uri: string;
  bitrate: number;
}

interface QualitySelectionResult {
  selectedQuality: VideoQuality;
  variants: QualityVariant[];
  fallbackQuality?: VideoQuality;
  networkProfile: NetworkProfile;
  deviceTier: DeviceCapabilityTier;
}

class NetworkProfiler {
  private lastProfile: NetworkProfile | null = null;
  private measurementCache = new Map<string, NetworkProfile>();
  private stabilityHistory: number[] = [];
  private readonly CACHE_DURATION = 60000;
  private readonly STABILITY_WINDOW = 10;

  async measureBandwidth(): Promise<number> {
    try {
      // Use the network profiler utility for accurate measurement
      const profile = await networkProfiler.getCurrentProfile();
      if (profile && profile.bandwidth > 0) {
        return profile.bandwidth;
      }

      // Fallback to network profiler's measurement if no cached profile
      const newProfile = await networkProfiler.measureNetworkCondition();
      if (newProfile && newProfile.bandwidth > 0) {
        return newProfile.bandwidth;
      }

      // Final fallback to estimation
      return this.estimateBandwidthFromConnection();
    } catch (error) {
      console.error("Bandwidth measurement failed:", error);
      return this.estimateBandwidthFromConnection();
    }
  }

  private async estimateBandwidthFromConnection(): Promise<number> {
    const netInfo = await NetInfo.fetch();

    const bandwidthMap: Record<string, number> = {
      "2g": 0.05,
      "3g": 0.5,
      "4g": 5,
      "5g": 20,
      wifi: 10,
      ethernet: 100,
      unknown: 2,
    };

    const type = netInfo.type.toLowerCase();
    const effectiveType = (netInfo.details as any)?.cellularGeneration?.toLowerCase() || type;

    return bandwidthMap[effectiveType] || bandwidthMap[type] || bandwidthMap.unknown;
  }

  async getNetworkProfile(forceRefresh = false): Promise<NetworkProfile> {
    // Use networkProfiler utility for consistent network measurement
    const utilityProfile = await (forceRefresh
      ? networkProfiler.measureNetworkCondition()
      : networkProfiler.getCurrentProfile() || networkProfiler.measureNetworkCondition());

    if (utilityProfile) {
      // Convert from utility profile format
      const profile: NetworkProfile = {
        bandwidth: utilityProfile.bandwidth,
        connectionType: utilityProfile.connectionType,
        stability: utilityProfile.stability,
        quality: utilityProfile.quality as NetworkQuality,
        timestamp: utilityProfile.timestamp,
      };

      this.lastProfile = profile;
      this.measurementCache.set("current", profile);
      await this.persistProfile(profile);

      return profile;
    }

    // Fallback to basic network info if utility fails
    const netInfo = await NetInfo.fetch();
    const bandwidth = await this.estimateBandwidthFromConnection();
    const stability = 0.5; // Default medium stability
    const quality = this.classifyNetworkQuality(bandwidth, stability);

    const profile: NetworkProfile = {
      bandwidth,
      connectionType: netInfo.type,
      stability,
      quality,
      timestamp: Date.now(),
    };

    this.lastProfile = profile;
    this.measurementCache.set("current", profile);
    await this.persistProfile(profile);

    return profile;
  }

  private calculateStability(): number {
    if (this.stabilityHistory.length < 2) return 1;

    const mean = this.stabilityHistory.reduce((a, b) => a + b, 0) / this.stabilityHistory.length;
    const variance =
      this.stabilityHistory.reduce((sum, val) => {
        return sum + Math.pow(val - mean, 2);
      }, 0) / this.stabilityHistory.length;

    const coefficientOfVariation = Math.sqrt(variance) / mean;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private classifyNetworkQuality(bandwidth: number, stability: number): NetworkQuality {
    const adjustedBandwidth = bandwidth * stability;

    if (adjustedBandwidth >= 5) return "excellent";
    if (adjustedBandwidth >= 2) return "good";
    if (adjustedBandwidth >= 0.5) return "fair";
    return "poor";
  }

  private async persistProfile(profile: NetworkProfile): Promise<void> {
    try {
      await AsyncStorage.setItem("last_network_profile", JSON.stringify(profile));
    } catch (error) {
      console.error("Failed to persist network profile:", error);
    }
  }

  async loadPersistedProfile(): Promise<NetworkProfile | null> {
    try {
      const stored = await AsyncStorage.getItem("last_network_profile");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to load persisted profile:", error);
      return null;
    }
  }
}

class DeviceCapabilityDetector {
  private cachedTier: DeviceCapabilityTier | null = null;
  private readonly detectionCache = new Map<string, any>();

  async detectDeviceTier(): Promise<DeviceCapabilityTier> {
    if (this.cachedTier) return this.cachedTier;

    const deviceInfo = await environmentDetector.getDeviceInfo();
    const memoryInfo = await environmentDetector.getMemoryInfo();

    const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);
    const isTablet = deviceInfo.deviceType === "tablet";
    const platform = Platform.OS;

    let tier: DeviceCapabilityTier;

    if (platform === "ios") {
      const model = deviceInfo.modelName?.toLowerCase() || "";

      if (
        model.includes("iphone 14") ||
        model.includes("iphone 15") ||
        model.includes("ipad pro") ||
        totalMemoryGB >= 6
      ) {
        tier = "high";
      } else if (
        model.includes("iphone 11") ||
        model.includes("iphone 12") ||
        model.includes("iphone 13") ||
        totalMemoryGB >= 4
      ) {
        tier = "mid";
      } else {
        tier = "low";
      }
    } else {
      if (totalMemoryGB >= 8) {
        tier = "high";
      } else if (totalMemoryGB >= 4) {
        tier = "mid";
      } else {
        tier = "low";
      }
    }

    if (isTablet && tier !== "high") {
      tier = "mid";
    }

    this.cachedTier = tier;
    await this.persistDeviceTier(tier);

    return tier;
  }

  private async persistDeviceTier(tier: DeviceCapabilityTier): Promise<void> {
    try {
      await AsyncStorage.setItem("device_capability_tier", tier);
    } catch (error) {
      console.error("Failed to persist device tier:", error);
    }
  }

  async loadPersistedTier(): Promise<DeviceCapabilityTier | null> {
    try {
      const stored = await AsyncStorage.getItem("device_capability_tier");
      return stored as DeviceCapabilityTier | null;
    } catch (error) {
      console.error("Failed to load persisted tier:", error);
      return null;
    }
  }

  getMemoryBasedQualityLimit(memoryPressure: number): VideoQuality {
    if (memoryPressure > 0.8) return "360p";
    if (memoryPressure > 0.6) return "720p";
    return "1080p";
  }
}

class QualitySelectionEngine {
  private readonly qualityMatrix: Record<DeviceCapabilityTier, Record<NetworkQuality, VideoQuality>> = {
    high: {
      excellent: "1080p",
      good: "1080p",
      fair: "720p",
      poor: "360p",
    },
    mid: {
      excellent: "1080p",
      good: "720p",
      fair: "720p",
      poor: "360p",
    },
    low: {
      excellent: "720p",
      good: "720p",
      fair: "360p",
      poor: "360p",
    },
  };

  private readonly bitrateMap: Record<VideoQuality, number> = {
    "360p": 800,
    "720p": 2500,
    "1080p": 5000,
  };

  selectOptimalQuality(
    networkProfile: NetworkProfile,
    deviceTier: DeviceCapabilityTier,
    memoryPressure?: number,
  ): VideoQuality {
    let baseQuality = this.qualityMatrix[deviceTier][networkProfile.quality];

    if (memoryPressure && memoryPressure > 0.5) {
      const detector = new DeviceCapabilityDetector();
      const memoryLimit = detector.getMemoryBasedQualityLimit(memoryPressure);
      baseQuality = this.downgradeQuality(baseQuality, memoryLimit);
    }

    if (networkProfile.stability < 0.5) {
      baseQuality = this.downgradeQuality(baseQuality);
    }

    return baseQuality;
  }

  private downgradeQuality(current: VideoQuality, limit?: VideoQuality): VideoQuality {
    const qualities: VideoQuality[] = ["360p", "720p", "1080p"];
    const currentIndex = qualities.indexOf(current);
    const limitIndex = limit ? qualities.indexOf(limit) : -1;

    if (limitIndex >= 0 && currentIndex > limitIndex) {
      return limit!;
    }

    if (currentIndex > 0) {
      return qualities[currentIndex - 1];
    }

    return current;
  }

  async generateQualityVariants(baseUri: string, selectedQuality: VideoQuality): Promise<QualityVariant[]> {
    const variants: QualityVariant[] = [];
    const qualities: VideoQuality[] = ["360p", "720p", "1080p"];
    const selectedIndex = qualities.indexOf(selectedQuality);

    const extension = baseUri.split(".").pop() || "mp4";
    const basePath = baseUri.substring(0, baseUri.lastIndexOf("."));

    // Always include the original as fallback
    variants.push({
      quality: selectedQuality,
      uri: baseUri,
      bitrate: this.bitrateMap[selectedQuality],
    });

    // Generate potential variant URIs and validate them
    const potentialVariants: QualityVariant[] = [];
    for (let i = 0; i <= selectedIndex; i++) {
      const quality = qualities[i];
      if (quality !== selectedQuality) {
        potentialVariants.push({
          quality,
          uri: `${basePath}_${quality.replace("p", "")}.${extension}`,
          bitrate: this.bitrateMap[quality],
        });
      }
    }

    // Validate variants exist (HEAD request with timeout)
    const validationPromises = potentialVariants.map(async (variant) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(variant.uri, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          return variant;
        }
      } catch (error) {
        // Variant doesn't exist or network error
      }
      return null;
    });

    const validatedVariants = await Promise.all(validationPromises);

    // Add only valid variants
    for (const variant of validatedVariants) {
      if (variant) {
        variants.push(variant);
      }
    }

    return variants;
  }

  selectFallbackQuality(currentQuality: VideoQuality): VideoQuality | undefined {
    const qualities: VideoQuality[] = ["360p", "720p", "1080p"];
    const currentIndex = qualities.indexOf(currentQuality);

    if (currentIndex > 0) {
      return qualities[currentIndex - 1];
    }

    return undefined;
  }
}

export class VideoQualitySelector {
  private networkProfiler: NetworkProfiler;
  private deviceDetector: DeviceCapabilityDetector;
  private selectionEngine: QualitySelectionEngine;
  private selectionCache: Map<string, QualitySelectionResult> = new Map();
  private networkListener: any = null;

  constructor() {
    this.networkProfiler = new NetworkProfiler();
    this.deviceDetector = new DeviceCapabilityDetector();
    this.selectionEngine = new QualitySelectionEngine();
    this.initializeNetworkListener();
  }

  private initializeNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
  }

  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    if (!state.isConnected) return;

    const profile = await this.networkProfiler.getNetworkProfile(true);
    // Clear cache on significant network change
    for (const [uri, selection] of this.selectionCache.entries()) {
      if (profile.quality !== selection.networkProfile.quality) {
        this.selectionCache.delete(uri);
      }
    }
  }

  async selectVideoQuality(videoUri: string, forceRefresh = false): Promise<QualitySelectionResult> {
    if (!forceRefresh && this.selectionCache.has(videoUri)) {
      return this.selectionCache.get(videoUri)!;
    }

    const [networkProfile, deviceTier] = await Promise.all([
      this.networkProfiler.getNetworkProfile(forceRefresh),
      this.deviceDetector.detectDeviceTier(),
    ]);

    const memoryInfo = await environmentDetector.getMemoryInfo();
    const memoryPressure =
      (memoryInfo.totalMemory - memoryInfo.availableMemory) / memoryInfo.totalMemory;

    const selectedQuality = this.selectionEngine.selectOptimalQuality(networkProfile, deviceTier, memoryPressure);

    const variants = await this.selectionEngine.generateQualityVariants(videoUri, selectedQuality);
    const fallbackQuality = this.selectionEngine.selectFallbackQuality(selectedQuality);

    const selection = {
      selectedQuality,
      variants,
      fallbackQuality,
      networkProfile,
      deviceTier,
    };

    this.selectionCache.set(videoUri, selection);
    return selection;
  }

  async selectBatchVideoQualities(videoUris: string[]): Promise<Map<string, QualitySelectionResult>> {
    const [networkProfile, deviceTier] = await Promise.all([
      this.networkProfiler.getNetworkProfile(),
      this.deviceDetector.detectDeviceTier(),
    ]);

    const memoryInfo = await environmentDetector.getMemoryInfo();
    const memoryPressure =
      (memoryInfo.totalMemory - memoryInfo.availableMemory) / memoryInfo.totalMemory;

    const selectedQuality = this.selectionEngine.selectOptimalQuality(networkProfile, deviceTier, memoryPressure);

    const results = new Map<string, QualitySelectionResult>();

    for (const uri of videoUris) {
      const variants = await this.selectionEngine.generateQualityVariants(uri, selectedQuality);
      const fallbackQuality = this.selectionEngine.selectFallbackQuality(selectedQuality);

      results.set(uri, {
        selectedQuality,
        variants,
        fallbackQuality,
        networkProfile,
        deviceTier,
      });
    }

    return results;
  }

  async canUpgradeQuality(videoUri: string): Promise<boolean> {
    const selection = this.selectionCache.get(videoUri);
    if (!selection) return false;

    const currentProfile = await this.networkProfiler.getNetworkProfile();
    const currentQuality = selection.selectedQuality;

    return currentProfile.quality === "excellent" && currentQuality !== "1080p" && currentProfile.stability > 0.8;
  }

  async shouldDowngradeQuality(videoUri: string): Promise<boolean> {
    const selection = this.selectionCache.get(videoUri);
    if (!selection) return false;

    const currentProfile = await this.networkProfiler.getNetworkProfile();
    const currentQuality = selection.selectedQuality;

    return (currentProfile.quality === "poor" && currentQuality !== "360p") || currentProfile.stability < 0.3;
  }

  getQualityForUri(uri: string, quality: VideoQuality): string {
    const extension = uri.split(".").pop() || "mp4";
    const basePath = uri.substring(0, uri.lastIndexOf("."));
    return `${basePath}_${quality.replace("p", "")}.${extension}`;
  }

  cleanup(): void {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}

export const videoQualitySelector = new VideoQualitySelector();
