import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { videoQualitySelector } from '../services/VideoQualitySelector';
import { videoBackgroundQueue, JobType, JobPriority } from '../services/VideoBackgroundQueue';
import { networkProfiler, NetworkProfile, NetworkQuality } from '../utils/networkProfiler';
import { videoPerformanceConfig, DevicePerformanceTier, NetworkQualityTier } from '../config/videoPerformance';
import { videoCacheManager } from '../utils/videoCacheManager';
import { environmentDetector } from '../utils/environmentDetector';
import { VideoDataService } from '../services/VideoDataService';

export interface VideoPerformanceState {
  deviceTier: DevicePerformanceTier;
  networkQuality: NetworkQuality;
  currentVideoQuality: '360p' | '720p' | '1080p';
  isOptimizing: boolean;
  cacheStats: {
    size: number;
    count: number;
    hitRate: number;
  };
  backgroundQueueStats: {
    pending: number;
    processing: number;
    completed: number;
  };
  memoryPressure: number;
  adaptiveSettings: {
    preloadCount: number;
    cacheSize: number;
    qualityMode: 'auto' | 'manual' | 'save-data';
  };
  errors: string[];
}

export interface VideoPerformanceActions {
  optimizeVideoQuality: (videoUri: string) => Promise<void>;
  preloadVideos: (videoUris: string[], priority?: 'high' | 'normal' | 'low') => Promise<void>;
  clearCache: () => Promise<void>;
  forceQuality: (quality: '360p' | '720p' | '1080p') => void;
  toggleSaveDataMode: () => void;
  runPerformanceTest: () => Promise<PerformanceTestResult>;
  getRecommendedSettings: () => PerformanceRecommendations;
}

export interface PerformanceTestResult {
  bandwidth: number;
  latency: number;
  deviceScore: number;
  recommendedQuality: '360p' | '720p' | '1080p';
  issues: string[];
}

export interface PerformanceRecommendations {
  quality: '360p' | '720p' | '1080p';
  preloadCount: number;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
  features: {
    autoQualityUpgrade: boolean;
    backgroundProcessing: boolean;
    aggressivePreloading: boolean;
  };
}

interface UseVideoPerformanceOptions {
  enableAutoOptimization?: boolean;
  enableBackgroundProcessing?: boolean;
  enableAnalytics?: boolean;
  debugMode?: boolean;
}

export function useVideoPerformanceOptimization(
  currentVideoUri?: string,
  options: UseVideoPerformanceOptions = {}
): [VideoPerformanceState, VideoPerformanceActions] {
  const {
    enableAutoOptimization = true,
    enableBackgroundProcessing = true,
    enableAnalytics = true,
    debugMode = false
  } = options;

  // State
  const [state, setState] = useState<VideoPerformanceState>({
    deviceTier: DevicePerformanceTier.MID,
    networkQuality: 'fair',
    currentVideoQuality: '720p',
    isOptimizing: false,
    cacheStats: {
      size: 0,
      count: 0,
      hitRate: 0
    },
    backgroundQueueStats: {
      pending: 0,
      processing: 0,
      completed: 0
    },
    memoryPressure: 0,
    adaptiveSettings: {
      preloadCount: 5,
      cacheSize: 500 * 1024 * 1024,
      qualityMode: 'auto'
    },
    errors: []
  });

  // Refs
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const networkSubscription = useRef<any>(null);
  const memoryMonitorInterval = useRef<NodeJS.Timeout | null>(null);
  const analyticsInterval = useRef<NodeJS.Timeout | null>(null);
  const appStateSubscription = useRef<any>(null);
  const queueStatsInterval = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Initialize performance optimization
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    initializePerformanceOptimization();

    return () => {
      cleanup();
    };
  }, []);

  const initializePerformanceOptimization = async () => {
    try {
      // Detect device capabilities
      await detectDeviceCapabilities();

      // Initialize network monitoring
      initializeNetworkMonitoring();

      // Start memory monitoring
      startMemoryMonitoring();

      // Initialize background processing
      if (enableBackgroundProcessing) {
        await initializeBackgroundProcessing();
      }

      // Start analytics collection
      if (enableAnalytics) {
        startAnalyticsCollection();
      }

      // Initialize app state monitoring
      initializeAppStateMonitoring();

      // Update initial state
      await updatePerformanceState();
    } catch (error) {
      console.error('Failed to initialize performance optimization:', error);
      addError('Failed to initialize performance optimization');
    }
  };

  const detectDeviceCapabilities = async () => {
    try {
      const deviceInfo = await environmentDetector.getDeviceInfo();
      const memoryInfo = await environmentDetector.getMemoryInfo();

      const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);
      let tier: DevicePerformanceTier;

      if (totalMemoryGB >= 6) {
        tier = DevicePerformanceTier.HIGH;
      } else if (totalMemoryGB >= 4) {
        tier = DevicePerformanceTier.MID;
      } else {
        tier = DevicePerformanceTier.LOW;
      }

      videoPerformanceConfig.setDeviceTier(tier);

      setState(prev => ({ ...prev, deviceTier: tier }));
    } catch (error) {
      console.error('Failed to detect device capabilities:', error);
      addError('Failed to detect device capabilities');
    }
  };

  const initializeNetworkMonitoring = () => {
    networkSubscription.current = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        const profile = await networkProfiler.measureNetworkCondition();
        if (profile) {
          handleNetworkChange(profile);
        }
      } else {
        setState(prev => ({ ...prev, networkQuality: 'poor' }));
      }
    });
  };

  const handleNetworkChange = async (profile: NetworkProfile) => {
    setState(prev => ({ ...prev, networkQuality: profile.quality }));

    // Map to NetworkQualityTier for video config
    const qualityTierMap: Record<NetworkQuality, NetworkQualityTier> = {
      excellent: NetworkQualityTier.EXCELLENT,
      good: NetworkQualityTier.GOOD,
      fair: NetworkQualityTier.FAIR,
      poor: NetworkQualityTier.POOR
    };

    videoPerformanceConfig.setNetworkQuality(qualityTierMap[profile.quality]);

    // Auto-optimize quality if enabled
    if (enableAutoOptimization && currentVideoUri) {
      if (profile.quality === 'excellent') {
        const canUpgrade = await videoQualitySelector.canUpgradeQuality(currentVideoUri);
        if (canUpgrade) {
          await optimizeCurrentVideo();
        }
      } else if (profile.quality === 'poor') {
        const shouldDowngrade = await videoQualitySelector.shouldDowngradeQuality(currentVideoUri);
        if (shouldDowngrade) {
          setState(prev => ({ ...prev, currentVideoQuality: '360p' }));
        }
      }
    }
  };

  const startMemoryMonitoring = () => {
    memoryMonitorInterval.current = setInterval(async () => {
      try {
        const memoryInfo = await environmentDetector.getMemoryInfo();
        const memoryPressure = memoryInfo.usedMemory / memoryInfo.totalMemory;

        setState(prev => ({ ...prev, memoryPressure }));

        // Trigger cache cleanup if memory pressure is high
        if (memoryPressure > 0.8) {
          await videoCacheManager.forceCleanup();
        }
      } catch (error) {
        console.error('Memory monitoring failed:', error);
      }
    }, 10000); // Check every 10 seconds
  };

  const initializeBackgroundProcessing = async () => {
    // Queue some initial optimization jobs
    await videoBackgroundQueue.enqueueJob(
      JobType.CACHE_OPTIMIZATION,
      {},
      JobPriority.LOW
    );

    // Update queue stats periodically
    queueStatsInterval.current = setInterval(() => {
      const queueStats = videoBackgroundQueue.getQueueStats();
      setState(prev => ({
        ...prev,
        backgroundQueueStats: {
          pending: queueStats.pending,
          processing: queueStats.processing,
          completed: queueStats.completed
        }
      }));
    }, 5000);
  };

  const startAnalyticsCollection = () => {
    analyticsInterval.current = setInterval(async () => {
      try {
        const cacheStats = videoCacheManager.getDeviceAwareCacheStats();

        setState(prev => ({
          ...prev,
          cacheStats: {
            size: cacheStats.size,
            count: cacheStats.count,
            hitRate: cacheStats.hitRate
          }
        }));

        // Send analytics data (placeholder)
        if (debugMode) {
          console.log('Performance Analytics:', {
            deviceTier: state.deviceTier,
            networkQuality: state.networkQuality,
            cacheHitRate: cacheStats.hitRate,
            memoryPressure: state.memoryPressure
          });
        }
      } catch (error) {
        console.error('Analytics collection failed:', error);
      }
    }, 30000); // Every 30 seconds
  };

  const initializeAppStateMonitoring = () => {
    appStateSubscription.current = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current === 'background' && nextAppState === 'active') {
        // App came to foreground - refresh state
        updatePerformanceState();
      }
      appStateRef.current = nextAppState;
    });
  };

  const updatePerformanceState = async () => {
    try {
      const [networkProfile, cacheStats, queueStats] = await Promise.all([
        networkProfiler.getCurrentProfile(),
        videoCacheManager.getDeviceAwareCacheStats(),
        Promise.resolve(videoBackgroundQueue.getQueueStats())
      ]);

      const perfConfig = videoPerformanceConfig.getDynamicConfig();

      setState(prev => ({
        ...prev,
        networkQuality: networkProfile?.quality ?? 'fair',
        cacheStats: {
          size: cacheStats.size,
          count: cacheStats.count,
          hitRate: cacheStats.hitRate
        },
        backgroundQueueStats: {
          pending: queueStats.pending,
          processing: queueStats.processing,
          completed: queueStats.completed
        },
        adaptiveSettings: {
          preloadCount: perfConfig.preloadProfile.preloadWindowSize,
          cacheSize: perfConfig.cacheConfig.maxCacheSize,
          qualityMode: prev.adaptiveSettings.qualityMode
        }
      }));
    } catch (error) {
      console.error('Failed to update performance state:', error);
    }
  };

  const optimizeCurrentVideo = async () => {
    if (!currentVideoUri) {
      console.warn('No current video URI provided for optimization');
      return;
    }

    setState(prev => ({ ...prev, isOptimizing: true }));

    try {
      const qualityResult = await videoQualitySelector.selectVideoQuality(currentVideoUri);
      setState(prev => ({
        ...prev,
        currentVideoQuality: qualityResult.selectedQuality,
        isOptimizing: false
      }));
    } catch (error) {
      console.error('Video optimization failed:', error);
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  };

  const addError = (error: string) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-4), error] // Keep last 5 errors
    }));
  };

  const cleanup = () => {
    if (networkSubscription.current) {
      networkSubscription.current();
      networkSubscription.current = null;
    }
    if (memoryMonitorInterval.current) {
      clearInterval(memoryMonitorInterval.current);
      memoryMonitorInterval.current = null;
    }
    if (analyticsInterval.current) {
      clearInterval(analyticsInterval.current);
      analyticsInterval.current = null;
    }
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
      appStateSubscription.current = null;
    }
    if (queueStatsInterval.current) {
      clearInterval(queueStatsInterval.current);
      queueStatsInterval.current = null;
    }
  };

  // Actions
  const actions: VideoPerformanceActions = {
    optimizeVideoQuality: async (videoUri: string) => {
      setState(prev => ({ ...prev, isOptimizing: true }));

      try {
        const qualityResult = await videoQualitySelector.selectVideoQuality(videoUri);

        setState(prev => ({
          ...prev,
          currentVideoQuality: qualityResult.selectedQuality,
          isOptimizing: false
        }));

        // Queue background optimization
        if (enableBackgroundProcessing) {
          await videoBackgroundQueue.enqueueJob(
            JobType.QUALITY_VARIANT_GENERATION,
            { uri: videoUri, videoId: 'generated' },
            JobPriority.NORMAL
          );
        }
      } catch (error) {
        console.error('Quality optimization failed:', error);
        addError('Quality optimization failed');
        setState(prev => ({ ...prev, isOptimizing: false }));
      }
    },

    preloadVideos: async (videoUris: string[], priority = 'normal') => {
      try {
        await videoCacheManager.preloadVideos(videoUris, priority);

        // Queue background preloading for additional optimization
        if (enableBackgroundProcessing) {
          await videoBackgroundQueue.enqueueJob(
            JobType.VIDEO_PRELOADING,
            { uris: videoUris, priority },
            JobPriority.LOW
          );
        }
      } catch (error) {
        console.error('Video preloading failed:', error);
        addError('Video preloading failed');
      }
    },

    clearCache: async () => {
      try {
        await videoCacheManager.clearCache();
        await updatePerformanceState();
      } catch (error) {
        console.error('Cache clearing failed:', error);
        addError('Cache clearing failed');
      }
    },

    forceQuality: (quality: '360p' | '720p' | '1080p') => {
      setState(prev => ({
        ...prev,
        currentVideoQuality: quality,
        adaptiveSettings: {
          ...prev.adaptiveSettings,
          qualityMode: 'manual'
        }
      }));
    },

    toggleSaveDataMode: () => {
      setState(prev => {
        const newMode = prev.adaptiveSettings.qualityMode === 'save-data' ? 'auto' : 'save-data';

        if (newMode === 'save-data') {
          // Force low quality in save data mode
          return {
            ...prev,
            currentVideoQuality: '360p',
            adaptiveSettings: {
              ...prev.adaptiveSettings,
              qualityMode: newMode,
              preloadCount: 2,
              cacheSize: 100 * 1024 * 1024 // 100MB
            }
          };
        } else {
          return {
            ...prev,
            adaptiveSettings: {
              ...prev.adaptiveSettings,
              qualityMode: newMode
            }
          };
        }
      });
    },

    runPerformanceTest: async (): Promise<PerformanceTestResult> => {
      try {
        const [networkProfile, memoryInfo] = await Promise.all([
          networkProfiler.measureNetworkCondition(),
          environmentDetector.getMemoryInfo()
        ]);

        const deviceScore = calculateDeviceScore(memoryInfo);
        const issues: string[] = [];

        if (!networkProfile) {
          throw new Error('Network test failed');
        }

        if (networkProfile.bandwidth < 2) {
          issues.push('Low bandwidth detected');
        }
        if (networkProfile.latency > 100) {
          issues.push('High latency detected');
        }
        if (memoryInfo.usedMemory / memoryInfo.totalMemory > 0.8) {
          issues.push('High memory usage');
        }

        const recommendedQuality = determineRecommendedQuality(
          networkProfile.bandwidth,
          deviceScore
        );

        return {
          bandwidth: networkProfile.bandwidth,
          latency: networkProfile.latency,
          deviceScore,
          recommendedQuality,
          issues
        };
      } catch (error) {
        console.error('Performance test failed:', error);
        throw error;
      }
    },

    getRecommendedSettings: (): PerformanceRecommendations => {
      const perfConfig = videoPerformanceConfig.getDynamicConfig();

      let cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
      if (state.deviceTier === DevicePerformanceTier.HIGH) {
        cacheStrategy = 'aggressive';
      } else if (state.deviceTier === DevicePerformanceTier.MID) {
        cacheStrategy = 'balanced';
      } else {
        cacheStrategy = 'conservative';
      }

      return {
        quality: state.currentVideoQuality,
        preloadCount: perfConfig.preloadProfile.preloadWindowSize,
        cacheStrategy,
        features: {
          autoQualityUpgrade: perfConfig.features.autoQualityUpgrade,
          backgroundProcessing: perfConfig.features.backgroundTranscoding,
          aggressivePreloading: perfConfig.features.aggressivePreloading
        }
      };
    }
  };

  return [state, actions];
}

// Helper functions
function calculateDeviceScore(memoryInfo: any): number {
  const memoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);
  const memoryScore = Math.min(100, (memoryGB / 8) * 100);

  // Simple scoring based on available memory
  return memoryScore;
}

function determineRecommendedQuality(
  bandwidth: number,
  deviceScore: number
): '360p' | '720p' | '1080p' {
  const combinedScore = (bandwidth / 20) * 50 + (deviceScore / 100) * 50;

  if (combinedScore >= 70) return '1080p';
  if (combinedScore >= 40) return '720p';
  return '360p';
}