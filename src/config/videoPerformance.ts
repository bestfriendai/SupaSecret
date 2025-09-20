import { Platform } from 'react-native';

export enum DevicePerformanceTier {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high'
}

export enum NetworkQualityTier {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}

export interface PreloadProfile {
  maxConcurrentPreloads: number;
  preloadWindowSize: number;
  memoryLimit: number;
  cachePartitionSize: number;
  backgroundQueueLimit: number;
  cleanupInterval: number;
  downloadConcurrency: number;
}

export interface CacheManagementConfig {
  cleanupInterval: number;
  memoryPressureThreshold: number;
  evictionStrategy: 'lru' | 'lfu' | 'hybrid';
  maxCacheSize: number;
  partitionSizes: {
    low: number;
    medium: number;
    high: number;
  };
  qualityVariantLimits: {
    popular: number;
    regular: number;
    cold: number;
  };
}

export interface BackgroundProcessingConfig {
  maxConcurrentJobs: number;
  jobQueueLimit: number;
  priorityLevels: number;
  memoryThreshold: number;
  idleThreshold: number;
  batchSize: number;
}

export interface QualitySelectionMatrix {
  [deviceTier: string]: {
    [networkQuality: string]: {
      quality: string;
      bitrate: number;
      preloadAhead: number;
    };
  };
}

const deviceTierThresholds = {
  ios: {
    high: { memory: 6 * 1024 * 1024 * 1024, models: ['iphone 14', 'iphone 15', 'ipad pro'] },
    mid: { memory: 4 * 1024 * 1024 * 1024, models: ['iphone 11', 'iphone 12', 'iphone 13'] },
    low: { memory: 0, models: [] }
  },
  android: {
    high: { memory: 8 * 1024 * 1024 * 1024, cpuCores: 8 },
    mid: { memory: 4 * 1024 * 1024 * 1024, cpuCores: 6 },
    low: { memory: 0, cpuCores: 4 }
  }
};

const networkQualityThresholds = {
  excellent: { bandwidth: 5, latency: 20, jitter: 5 },
  good: { bandwidth: 2, latency: 50, jitter: 10 },
  fair: { bandwidth: 0.5, latency: 100, jitter: 20 },
  poor: { bandwidth: 0, latency: Infinity, jitter: Infinity }
};

const preloadProfiles: Record<DevicePerformanceTier, PreloadProfile> = {
  [DevicePerformanceTier.HIGH]: {
    maxConcurrentPreloads: 5,
    preloadWindowSize: 10,
    memoryLimit: 500 * 1024 * 1024,
    cachePartitionSize: 1024 * 1024 * 1024,
    backgroundQueueLimit: 20,
    cleanupInterval: 300000,
    downloadConcurrency: 3
  },
  [DevicePerformanceTier.MID]: {
    maxConcurrentPreloads: 3,
    preloadWindowSize: 5,
    memoryLimit: 300 * 1024 * 1024,
    cachePartitionSize: 512 * 1024 * 1024,
    backgroundQueueLimit: 10,
    cleanupInterval: 180000,
    downloadConcurrency: 2
  },
  [DevicePerformanceTier.LOW]: {
    maxConcurrentPreloads: 1,
    preloadWindowSize: 2,
    memoryLimit: 150 * 1024 * 1024,
    cachePartitionSize: 256 * 1024 * 1024,
    backgroundQueueLimit: 5,
    cleanupInterval: 120000,
    downloadConcurrency: 1
  }
};

const cacheManagementConfigs: Record<DevicePerformanceTier, CacheManagementConfig> = {
  [DevicePerformanceTier.HIGH]: {
    cleanupInterval: 300000,
    memoryPressureThreshold: 0.8,
    evictionStrategy: 'hybrid',
    maxCacheSize: 2048 * 1024 * 1024,
    partitionSizes: {
      low: 512 * 1024 * 1024,
      medium: 768 * 1024 * 1024,
      high: 768 * 1024 * 1024
    },
    qualityVariantLimits: {
      popular: 3,
      regular: 2,
      cold: 1
    }
  },
  [DevicePerformanceTier.MID]: {
    cleanupInterval: 180000,
    memoryPressureThreshold: 0.7,
    evictionStrategy: 'lru',
    maxCacheSize: 1024 * 1024 * 1024,
    partitionSizes: {
      low: 256 * 1024 * 1024,
      medium: 512 * 1024 * 1024,
      high: 256 * 1024 * 1024
    },
    qualityVariantLimits: {
      popular: 2,
      regular: 1,
      cold: 1
    }
  },
  [DevicePerformanceTier.LOW]: {
    cleanupInterval: 120000,
    memoryPressureThreshold: 0.6,
    evictionStrategy: 'lru',
    maxCacheSize: 512 * 1024 * 1024,
    partitionSizes: {
      low: 256 * 1024 * 1024,
      medium: 192 * 1024 * 1024,
      high: 64 * 1024 * 1024
    },
    qualityVariantLimits: {
      popular: 1,
      regular: 1,
      cold: 0
    }
  }
};

const backgroundProcessingConfigs: Record<DevicePerformanceTier, BackgroundProcessingConfig> = {
  [DevicePerformanceTier.HIGH]: {
    maxConcurrentJobs: 4,
    jobQueueLimit: 50,
    priorityLevels: 5,
    memoryThreshold: 0.75,
    idleThreshold: 0.3,
    batchSize: 10
  },
  [DevicePerformanceTier.MID]: {
    maxConcurrentJobs: 2,
    jobQueueLimit: 25,
    priorityLevels: 3,
    memoryThreshold: 0.65,
    idleThreshold: 0.5,
    batchSize: 5
  },
  [DevicePerformanceTier.LOW]: {
    maxConcurrentJobs: 1,
    jobQueueLimit: 10,
    priorityLevels: 2,
    memoryThreshold: 0.55,
    idleThreshold: 0.7,
    batchSize: 3
  }
};

const qualitySelectionMatrix: QualitySelectionMatrix = {
  [DevicePerformanceTier.HIGH]: {
    [NetworkQualityTier.EXCELLENT]: {
      quality: '1080p',
      bitrate: 5000,
      preloadAhead: 10
    },
    [NetworkQualityTier.GOOD]: {
      quality: '1080p',
      bitrate: 4000,
      preloadAhead: 7
    },
    [NetworkQualityTier.FAIR]: {
      quality: '720p',
      bitrate: 2500,
      preloadAhead: 5
    },
    [NetworkQualityTier.POOR]: {
      quality: '360p',
      bitrate: 800,
      preloadAhead: 2
    }
  },
  [DevicePerformanceTier.MID]: {
    [NetworkQualityTier.EXCELLENT]: {
      quality: '1080p',
      bitrate: 4000,
      preloadAhead: 7
    },
    [NetworkQualityTier.GOOD]: {
      quality: '720p',
      bitrate: 2500,
      preloadAhead: 5
    },
    [NetworkQualityTier.FAIR]: {
      quality: '720p',
      bitrate: 2000,
      preloadAhead: 3
    },
    [NetworkQualityTier.POOR]: {
      quality: '360p',
      bitrate: 800,
      preloadAhead: 1
    }
  },
  [DevicePerformanceTier.LOW]: {
    [NetworkQualityTier.EXCELLENT]: {
      quality: '720p',
      bitrate: 2500,
      preloadAhead: 5
    },
    [NetworkQualityTier.GOOD]: {
      quality: '720p',
      bitrate: 2000,
      preloadAhead: 3
    },
    [NetworkQualityTier.FAIR]: {
      quality: '360p',
      bitrate: 1000,
      preloadAhead: 2
    },
    [NetworkQualityTier.POOR]: {
      quality: '360p',
      bitrate: 600,
      preloadAhead: 1
    }
  }
};

export class VideoPerformanceConfig {
  private deviceTier: DevicePerformanceTier = DevicePerformanceTier.MID;
  private networkQuality: NetworkQualityTier = NetworkQualityTier.FAIR;
  private userPreferences: Partial<PreloadProfile> = {};
  private abTestConfig: Record<string, any> = {};

  setDeviceTier(tier: DevicePerformanceTier): void {
    this.deviceTier = tier;
  }

  setNetworkQuality(quality: NetworkQualityTier): void {
    this.networkQuality = quality;
  }

  setUserPreferences(preferences: Partial<PreloadProfile>): void {
    this.userPreferences = preferences;
  }

  setABTestConfig(config: Record<string, any>): void {
    this.abTestConfig = config;
  }

  getPreloadProfile(): PreloadProfile {
    const baseProfile = preloadProfiles[this.deviceTier];
    return {
      ...baseProfile,
      ...this.userPreferences,
      ...this.applyABTestOverrides(baseProfile)
    };
  }

  getCacheConfig(): CacheManagementConfig {
    const baseConfig = cacheManagementConfigs[this.deviceTier];

    if (this.networkQuality === NetworkQualityTier.POOR) {
      return {
        ...baseConfig,
        cleanupInterval: baseConfig.cleanupInterval / 2,
        maxCacheSize: baseConfig.maxCacheSize / 2
      };
    }

    return baseConfig;
  }

  getBackgroundProcessingConfig(): BackgroundProcessingConfig {
    return backgroundProcessingConfigs[this.deviceTier];
  }

  getQualitySelection(): { quality: string; bitrate: number; preloadAhead: number } {
    return qualitySelectionMatrix[this.deviceTier][this.networkQuality];
  }

  getDeviceTierThresholds(): any {
    return deviceTierThresholds[Platform.OS] || deviceTierThresholds.android;
  }

  getNetworkQualityThresholds(): any {
    return networkQualityThresholds;
  }

  shouldEnableFeature(feature: string): boolean {
    const features: Record<string, Record<DevicePerformanceTier, boolean>> = {
      autoQualityUpgrade: {
        [DevicePerformanceTier.HIGH]: true,
        [DevicePerformanceTier.MID]: true,
        [DevicePerformanceTier.LOW]: false
      },
      aggressivePreloading: {
        [DevicePerformanceTier.HIGH]: true,
        [DevicePerformanceTier.MID]: false,
        [DevicePerformanceTier.LOW]: false
      },
      backgroundTranscoding: {
        [DevicePerformanceTier.HIGH]: true,
        [DevicePerformanceTier.MID]: true,
        [DevicePerformanceTier.LOW]: false
      },
      multiQualityCaching: {
        [DevicePerformanceTier.HIGH]: true,
        [DevicePerformanceTier.MID]: false,
        [DevicePerformanceTier.LOW]: false
      }
    };

    return features[feature]?.[this.deviceTier] ?? false;
  }

  private applyABTestOverrides(baseProfile: PreloadProfile): Partial<PreloadProfile> {
    const overrides: Partial<PreloadProfile> = {};

    if (this.abTestConfig.preloadWindowMultiplier) {
      overrides.preloadWindowSize = Math.round(
        baseProfile.preloadWindowSize * this.abTestConfig.preloadWindowMultiplier
      );
    }

    if (this.abTestConfig.memoryLimitMultiplier) {
      overrides.memoryLimit = Math.round(
        baseProfile.memoryLimit * this.abTestConfig.memoryLimitMultiplier
      );
    }

    return overrides;
  }

  getDynamicConfig(): any {
    return {
      deviceTier: this.deviceTier,
      networkQuality: this.networkQuality,
      preloadProfile: this.getPreloadProfile(),
      cacheConfig: this.getCacheConfig(),
      backgroundConfig: this.getBackgroundProcessingConfig(),
      qualitySelection: this.getQualitySelection(),
      features: {
        autoQualityUpgrade: this.shouldEnableFeature('autoQualityUpgrade'),
        aggressivePreloading: this.shouldEnableFeature('aggressivePreloading'),
        backgroundTranscoding: this.shouldEnableFeature('backgroundTranscoding'),
        multiQualityCaching: this.shouldEnableFeature('multiQualityCaching')
      }
    };
  }
}

export const videoPerformanceConfig = new VideoPerformanceConfig();