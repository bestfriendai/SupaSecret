import * as FileSystem from "expo-file-system";
import { LRUCache } from "./lruCache";
import { videoQualitySelector } from "../services/VideoQualitySelector";
import { videoPerformanceConfig, DevicePerformanceTier, NetworkQualityTier } from "../config/videoPerformance";
import NetInfo from '@react-native-community/netinfo';
import { environmentDetector } from "./environmentDetector";

interface CacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
  accessCount: number;
  priority: "high" | "normal" | "low";
  lastAccessTime: number;
  predictedNextAccess?: number;
  quality?: "high" | "medium" | "low";
  contentType?: "thumbnail" | "preview" | "full";
  compressionRatio?: number;
  videoQuality?: '360p' | '720p' | '1080p';
  networkQuality?: NetworkQualityTier;
  deviceTier?: DevicePerformanceTier;
  variantUris?: Map<string, string>;
}

interface CacheConfig {
  maxCacheSize: number;
  maxEntries: number;
  preloadLimit: number;
  cleanupThreshold: number;
  memoryPressureThreshold: number;
  compressionEnabled: boolean;
  intelligentPreload: boolean;
  cachePartitioning: boolean;
  idleCleanupInterval: number;
}

class VideoCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private lruCache: LRUCache<CacheEntry>;
  private config: CacheConfig = {
    maxCacheSize: 500 * 1024 * 1024, // 500MB
    maxEntries: 100,
    preloadLimit: 5,
    cleanupThreshold: 0.9, // Start cleanup at 90% capacity
    memoryPressureThreshold: 0.8, // Reduce cache when memory usage > 80%
    compressionEnabled: true,
    intelligentPreload: true,
    cachePartitioning: true,
    idleCleanupInterval: 30000, // 30 seconds
  };
  private currentCacheSize = 0;
  private cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
  private isCleaningUp = false;
  private viewingPatterns: Map<string, number[]> = new Map();
  private cacheHitRate = 0;
  private totalRequests = 0;
  private totalHits = 0;
  private idleCleanupTimer?: ReturnType<typeof setInterval>;
  private memoryMonitorTimer?: ReturnType<typeof setInterval>;
  private cachePartitions: Map<string, Map<string, CacheEntry>> = new Map();
  private deviceTier: DevicePerformanceTier = DevicePerformanceTier.MID;
  private networkQuality: NetworkQualityTier = NetworkQualityTier.FAIR;
  private qualityVariantCache: Map<string, Map<string, string>> = new Map();
  private bandwidthAdaptiveDownloading = true;
  private networkListener: any = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };

    // Initialize LRU cache for metadata
    this.lruCache = new LRUCache<CacheEntry>({
      maxSize: this.config.maxEntries,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      onEvict: (key, entry) => this.handleEviction(key, entry),
      getSizeOf: (entry) => entry.size,
    });

    // Initialize cache partitions with quality-aware partitioning
    this.cachePartitions.set("thumbnail", new Map());
    this.cachePartitions.set("preview", new Map());
    this.cachePartitions.set("full", new Map());
    this.cachePartitions.set("low_quality", new Map());
    this.cachePartitions.set("medium_quality", new Map());
    this.cachePartitions.set("high_quality", new Map());

    this.initializeCache();
    this.startBackgroundTasks();
    this.initializeDeviceAndNetwork();
  }

  async initialize() {
    await this.initializeCache();
    await this.initializeDeviceAndNetwork();
  }

  private async initializeCache() {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Create partition directories including quality-based partitions
      if (this.config.cachePartitioning) {
        for (const partition of ["thumbnail", "preview", "full", "low_quality", "medium_quality", "high_quality"]) {
          const partitionDir = `${this.cacheDir}${partition}/`;
          const partitionInfo = await FileSystem.getInfoAsync(partitionDir);
          if (!partitionInfo.exists) {
            await FileSystem.makeDirectoryAsync(partitionDir, { intermediates: true });
          }
        }
      }

      // Load existing cache entries
      await this.loadCacheIndex();

      // Load viewing patterns
      await this.loadViewingPatterns();
    } catch (error) {
      console.error("Failed to initialize video cache:", error);
    }
  }

  private async loadCacheIndex() {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const indexInfo = await FileSystem.getInfoAsync(indexPath);

      if (indexInfo.exists) {
        const indexContent = await FileSystem.readAsStringAsync(indexPath);
        const cacheData = JSON.parse(indexContent);

        for (const [key, entry] of Object.entries(cacheData)) {
          const cacheEntry = entry as any;

          // Restore Map from array if present
          if (cacheEntry.variantUris && Array.isArray(cacheEntry.variantUris)) {
            cacheEntry.variantUris = new Map(cacheEntry.variantUris);
          }

          this.cache.set(key, cacheEntry as CacheEntry);
          this.currentCacheSize += cacheEntry.size;
        }
      }
    } catch (error) {
      console.error("Failed to load cache index:", error);
    }
  }

  private async saveCacheIndex() {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const cacheData: Record<string, any> = {};

      for (const [key, entry] of this.cache) {
        // Convert Map to array for serialization
        const serializedEntry = {
          ...entry,
          variantUris: entry.variantUris ? Array.from(entry.variantUris.entries()) : undefined
        };
        cacheData[key] = serializedEntry;
      }

      await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Failed to save cache index:", error);
    }
  }

  private generateCacheKey(uri: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  private async handleEviction(key: string, entry: CacheEntry) {
    try {
      await FileSystem.deleteAsync(entry.localPath, { idempotent: true });

      // Also evict quality variants if they exist
      if (entry.variantUris) {
        for (const [quality, variantPath] of entry.variantUris) {
          try {
            await FileSystem.deleteAsync(variantPath, { idempotent: true });
          } catch (error) {
            console.error(`Failed to evict variant ${quality}:`, error);
          }
        }
      }

      this.cache.delete(key);
      this.currentCacheSize -= entry.size;

      if (__DEV__) {
        console.log(`[VideoCache] Evicted ${key}, freed ${(entry.size / 1024 / 1024).toFixed(2)}MB`);
      }
    } catch (error) {
      console.error("Failed to evict cache entry:", error);
    }
  }

  private async evictLeastRecentlyUsed() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      // Use smart eviction strategy
      await this.smartEviction();
    } finally {
      this.isCleaningUp = false;
    }

    await this.saveCacheIndex();
  }

  private async smartEviction() {
    const perfConfig = videoPerformanceConfig.getCacheConfig();
    const targetSize = perfConfig.maxCacheSize * 0.7; // Target 70% capacity based on device tier
    const entries = Array.from(this.cache.entries());

    // Sort by priority, quality, and access patterns
    const sortedEntries = entries.sort(([, a], [, b]) => {
      // Priority-based sorting
      const priorityWeight = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first (keep)
      }

      // Quality-based sorting (keep higher quality for high-tier devices)
      if (this.deviceTier === DevicePerformanceTier.HIGH && a.videoQuality && b.videoQuality) {
        const qualityOrder = { '1080p': 3, '720p': 2, '360p': 1 };
        const aQuality = qualityOrder[a.videoQuality] || 0;
        const bQuality = qualityOrder[b.videoQuality] || 0;
        if (aQuality !== bQuality) {
          return bQuality - aQuality;
        }
      }

      // Calculate normalized recency score (0-1, where 1 is most recent)
      const now = Date.now();
      const maxAge = Math.max(...entries.map(([, entry]) => now - entry.timestamp), 1);
      const aRecency = 1 - (now - a.timestamp) / maxAge;
      const bRecency = 1 - (now - b.timestamp) / maxAge;

      // Calculate normalized access frequency score (0-1)
      const maxAccess = Math.max(...entries.map(([, entry]) => entry.accessCount), 1);
      const aFrequency = a.accessCount / maxAccess;
      const bFrequency = b.accessCount / maxAccess;

      // Combined score with proper weighting
      const aScore = aFrequency * 0.6 + aRecency * 0.4;
      const bScore = bFrequency * 0.6 + bRecency * 0.4;

      return aScore - bScore; // Lower score first (evict)
    });

    // Evict entries until we reach target size
    for (const [key, entry] of sortedEntries) {
      if (this.currentCacheSize <= targetSize) break;

      // Evict lower quality variants first for popular videos
      if (entry.variantUris && entry.accessCount > 5) {
        const variants = Array.from(entry.variantUris.entries());
        for (const [quality, path] of variants) {
          if (quality === '360p' && this.deviceTier !== DevicePerformanceTier.LOW) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(path);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(path, { idempotent: true });
                entry.variantUris.delete(quality);
                this.currentCacheSize -= (fileInfo as any).size || 0;
              }
            } catch (error) {
              console.error('Failed to evict quality variant:', error);
            }
          }
        }
      }

      if (this.currentCacheSize <= targetSize) break;
      await this.handleEviction(key, entry);
    }
  }

  async getCachedVideo(uri: string, priority: "high" | "normal" | "low" = "normal"): Promise<string | null> {
    // First check if we have the original URI cached
    const originalKey = this.generateCacheKey(uri);
    let entry = this.cache.get(originalKey);

    // If not found, check if we should use a quality variant
    if (!entry) {
      const qualityResult = await videoQualitySelector.selectVideoQuality(uri);
      const targetQuality = qualityResult.selectedQuality;
      const qualityUri = videoQualitySelector.getQualityForUri(uri, targetQuality);
      const qualityKey = this.generateCacheKey(qualityUri);
      entry = this.cache.get(qualityKey);
    }

    this.totalRequests++;

    if (entry) {
      // Update access information
      const now = Date.now();
      entry.timestamp = now;
      entry.lastAccessTime = now;
      entry.accessCount++;
      entry.priority = priority; // Update priority based on current usage
      entry.deviceTier = this.deviceTier;
      entry.networkQuality = this.networkQuality;

      // Track hit rate
      this.totalHits++;
      this.cacheHitRate = this.totalHits / this.totalRequests;

      // Update viewing patterns for intelligent preloading
      if (this.config.intelligentPreload) {
        this.updateViewingPattern(uri, now);
      }

      // Update existing entry, don't create duplicate under new key
      const existingKey = Array.from(this.cache.entries())
        .find(([_, e]) => e.localPath === entry!.localPath)?.[0];

      if (existingKey) {
        this.cache.set(existingKey, entry);
        this.lruCache.set(existingKey, entry);
      } else {
        const cacheKey = this.generateCacheKey(uri);
        this.cache.set(cacheKey, entry);
        this.lruCache.set(cacheKey, entry);
      }

      // Check for quality variant if available
      if (entry.variantUris && entry.variantUris.has(targetQuality)) {
        const variantPath = entry.variantUris.get(targetQuality)!;
        const variantInfo = await FileSystem.getInfoAsync(variantPath);
        if (variantInfo.exists) {
          return variantPath;
        }
      }

      // Verify original file still exists
      const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
      if (fileInfo.exists) {
        // Trigger cleanup if we're approaching capacity
        if (this.currentCacheSize > this.config.maxCacheSize * this.config.cleanupThreshold) {
          // Don't await - run cleanup in background
          this.evictLeastRecentlyUsed().catch((error) => {
            console.error("Background cleanup failed:", error);
          });
        }

        return entry.localPath;
      } else {
        // File was deleted externally, remove from cache
        this.cache.delete(cacheKey);
        this.lruCache.delete(cacheKey);
        this.currentCacheSize -= entry.size;
      }
    }

    return null;
  }

  async cacheVideo(uri: string, priority: "high" | "normal" | "low" = "normal"): Promise<string> {
    // Get quality selection for this video
    const qualityResult = await videoQualitySelector.selectVideoQuality(uri);
    const targetQuality = qualityResult.selectedQuality;
    const variants = qualityResult.variants;

    // Use quality-specific URI if available
    const targetUri = variants.find(v => v.quality === targetQuality)?.uri || uri;
    const cacheKey = this.generateCacheKey(targetUri);
    const existingEntry = await this.getCachedVideo(targetUri, priority);

    if (existingEntry) {
      return existingEntry;
    }

    try {
      const fileName = `${cacheKey}_${targetQuality}.mp4`;
      const qualityPartition = this.getQualityPartition(targetQuality);
      const localPath = `${this.cacheDir}${qualityPartition}/${fileName}`;

      // Apply bandwidth-adaptive downloading
      if (this.bandwidthAdaptiveDownloading && this.networkQuality === NetworkQualityTier.POOR) {
        // Use lower quality for poor networks
        const fallbackUri = variants.find(v => v.quality === '360p')?.uri || targetUri;
        const downloadResult = await FileSystem.downloadAsync(fallbackUri, localPath);

        if (downloadResult.status === 200) {
          return await this.processCachedVideo(fallbackUri, localPath, priority, '360p', qualityResult);
        }
      }

      // Download the video with retry logic for quality fallback
      let downloadResult = await FileSystem.downloadAsync(targetUri, localPath);

      if (downloadResult.status !== 200 && qualityResult.fallbackQuality) {
        // Try fallback quality
        const fallbackUri = variants.find(v => v.quality === qualityResult.fallbackQuality)?.uri || uri;
        downloadResult = await FileSystem.downloadAsync(fallbackUri, localPath);
      }

      if (downloadResult.status === 200) {
        return await this.processCachedVideo(targetUri, localPath, priority, targetQuality, qualityResult);
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error("Failed to cache video:", error);
      return uri; // Return original URI as fallback
    }
  }

  private async processCachedVideo(
    uri: string,
    localPath: string,
    priority: "high" | "normal" | "low",
    quality: '360p' | '720p' | '1080p',
    qualityResult: any
  ): Promise<string> {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const fileSize = fileInfo.exists && !fileInfo.isDirectory ? (fileInfo as any).size || 0 : 0;

    // Check if we need to evict old entries
    if (this.currentCacheSize + fileSize > this.config.maxCacheSize) {
      await this.evictLeastRecentlyUsed();
    }

    const cacheKey = this.generateCacheKey(uri);

    // Add to cache with quality information
    const entry: CacheEntry = {
      uri,
      localPath,
      timestamp: Date.now(),
      size: fileSize,
      accessCount: 1,
      priority,
      lastAccessTime: Date.now(),
      videoQuality: quality,
      deviceTier: this.deviceTier,
      networkQuality: this.networkQuality,
      variantUris: new Map(),
    };

    // Store quality variants if caching multiple qualities
    if (videoPerformanceConfig.shouldEnableFeature('multiQualityCaching')) {
      for (const variant of qualityResult.variants) {
        if (variant.quality !== quality) {
          // Queue background caching of other variants
          this.cacheQualityVariant(uri, variant.quality, variant.uri, cacheKey);
        }
      }
    }

    this.cache.set(cacheKey, entry);
    this.lruCache.set(cacheKey, entry);
    this.currentCacheSize += fileSize;
    await this.saveCacheIndex();

    return localPath;
  }

  private getQualityPartition(quality: '360p' | '720p' | '1080p'): string {
    const qualityMap = {
      '360p': 'low_quality',
      '720p': 'medium_quality',
      '1080p': 'high_quality'
    };
    return qualityMap[quality] || 'medium_quality';
  }

  private async cacheQualityVariant(
    originalUri: string,
    quality: '360p' | '720p' | '1080p',
    variantUri: string,
    parentCacheKey: string
  ): Promise<void> {
    try {
      const variantKey = `${parentCacheKey}_${quality}`;
      const fileName = `${variantKey}.mp4`;
      const qualityPartition = this.getQualityPartition(quality);
      const localPath = `${this.cacheDir}${qualityPartition}/${fileName}`;

      // Use background queue for variant caching
      import('../services/VideoBackgroundQueue').then(({ videoBackgroundQueue, JobType, JobPriority }) => {
        videoBackgroundQueue.enqueueJob(
          JobType.QUALITY_VARIANT_GENERATION,
          {
            originalUri,
            quality,
            variantUri,
            parentCacheKey,
            localPath
          },
          JobPriority.LOW,
          {
            onComplete: async (result) => {
              if (result.success) {
                try {
                  const downloadResult = await FileSystem.downloadAsync(variantUri, localPath);
                  if (downloadResult.status === 200) {
                    const entry = this.cache.get(parentCacheKey);
                    if (entry && entry.variantUris) {
                      entry.variantUris.set(quality, localPath);
                      this.cache.set(parentCacheKey, entry);
                    }
                  }
                } catch (error) {
                  console.error(`Failed to cache quality variant ${quality}:`, error);
                }
              }
            }
          }
        );
      }).catch(error => {
        console.error('Failed to load background queue:', error);
      });
    } catch (error) {
      console.error('Failed to queue quality variant caching:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      this.cache.clear();
      this.currentCacheSize = 0;
      await this.initializeCache();
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  getCacheSize(): number {
    return this.currentCacheSize;
  }

  private startBackgroundTasks() {
    // Clear any existing timers/listeners first
    this.clearBackgroundTasks();

    // Start idle cleanup with device-aware intervals
    const perfConfig = videoPerformanceConfig.getCacheConfig();
    const cleanupInterval = perfConfig.cleanupInterval;

    if (cleanupInterval > 0) {
      this.idleCleanupTimer = setInterval(() => {
        this.performIdleCleanup();
      }, cleanupInterval);
    }

    // Start memory pressure monitoring
    this.memoryMonitorTimer = setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds

    // Start network monitoring for adaptive caching
    this.networkListener = NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });
  }

  private clearBackgroundTasks() {
    if (this.idleCleanupTimer) {
      clearInterval(this.idleCleanupTimer);
      this.idleCleanupTimer = undefined;
    }
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
      this.memoryMonitorTimer = undefined;
    }
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }

  private async performIdleCleanup() {
    if (this.isCleaningUp) return;

    try {
      // Clean up old temporary files
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.lastAccessTime > maxAge && entry.priority === "low") {
          await this.handleEviction(key, entry);
        }
      }

      // Optimize cache based on access patterns
      if (this.config.intelligentPreload) {
        await this.optimizeCacheBasedOnPatterns();
      }
    } catch (error) {
      console.error("Idle cleanup failed:", error);
    }
  }

  private async checkMemoryPressure() {
    // Get actual memory info from environment detector
    const memoryInfo = await environmentDetector.getMemoryInfo();
    const memoryPressure = memoryInfo.usedMemory / memoryInfo.totalMemory;

    // Use device-aware memory pressure thresholds
    const perfConfig = videoPerformanceConfig.getCacheConfig();

    if (memoryPressure > perfConfig.memoryPressureThreshold) {
      // Progressive cache degradation based on device tier
      const reductionRatio = this.deviceTier === DevicePerformanceTier.LOW ? 0.3 : 0.5;
      await this.reduceCache(reductionRatio);

      // Reduce quality variants under pressure
      if (memoryPressure > 0.9) {
        await this.evictQualityVariants();
      }
    }
  }

  private async evictQualityVariants(): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.variantUris && entry.variantUris.size > 0) {
        // Keep only the most appropriate quality for current conditions
        const targetQuality = await this.getOptimalQualityForCurrentConditions();

        for (const [quality, path] of entry.variantUris) {
          if (quality !== targetQuality) {
            try {
              await FileSystem.deleteAsync(path, { idempotent: true });
              entry.variantUris.delete(quality);
            } catch (error) {
              console.error(`Failed to evict quality variant ${quality}:`, error);
            }
          }
        }
      }
    }
  }

  private async getOptimalQualityForCurrentConditions(): Promise<'360p' | '720p' | '1080p'> {
    const qualitySelection = videoPerformanceConfig.getQualitySelection();
    return qualitySelection.quality as '360p' | '720p' | '1080p';
  }

  private async reduceCache(targetRatio: number) {
    const targetSize = this.config.maxCacheSize * targetRatio;

    while (this.currentCacheSize > targetSize && this.cache.size > 0) {
      // Remove lowest priority items first
      const entries = Array.from(this.cache.entries());
      const lowestPriority = entries.sort((a, b) => {
        const priorityMap = { low: 0, normal: 1, high: 2 };
        return priorityMap[a[1].priority] - priorityMap[b[1].priority];
      })[0];

      if (lowestPriority) {
        await this.handleEviction(lowestPriority[0], lowestPriority[1]);
      } else {
        break;
      }
    }
  }

  private updateViewingPattern(uri: string, timestamp: number) {
    const patterns = this.viewingPatterns.get(uri) || [];
    patterns.push(timestamp);

    // Keep only recent patterns (last 10 accesses)
    if (patterns.length > 10) {
      patterns.shift();
    }

    this.viewingPatterns.set(uri, patterns);

    // Predict next access time
    if (patterns.length >= 2) {
      const intervals = [];
      for (let i = 1; i < patterns.length; i++) {
        intervals.push(patterns[i] - patterns[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Update entry with predicted next access
      const entry = this.cache.get(this.generateCacheKey(uri));
      if (entry) {
        entry.predictedNextAccess = timestamp + avgInterval;
      }
    }
  }

  private async optimizeCacheBasedOnPatterns() {
    const now = Date.now();
    const upcomingVideos: string[] = [];

    // Find videos likely to be accessed soon
    for (const [key, entry] of this.cache.entries()) {
      if (
        entry.predictedNextAccess &&
        entry.predictedNextAccess - now < 60000 && // Within next minute
        entry.predictedNextAccess > now
      ) {
        upcomingVideos.push(entry.uri);
      }
    }

    // Preload predicted videos
    if (upcomingVideos.length > 0) {
      await this.warmCache(upcomingVideos.slice(0, 3)); // Warm up to 3 videos
    }
  }

  async warmCache(uris: string[]) {
    for (const uri of uris) {
      const cacheKey = this.generateCacheKey(uri);
      const entry = this.cache.get(cacheKey);

      if (entry) {
        // Touch the entry to keep it warm
        entry.lastAccessTime = Date.now();
        this.lruCache.set(cacheKey, entry);
      }
    }
  }

  private async loadViewingPatterns() {
    try {
      const patternsPath = `${this.cacheDir}patterns.json`;
      const patternsInfo = await FileSystem.getInfoAsync(patternsPath);

      if (patternsInfo.exists) {
        const patternsContent = await FileSystem.readAsStringAsync(patternsPath);
        const patterns = JSON.parse(patternsContent);
        this.viewingPatterns = new Map(Object.entries(patterns));
      }
    } catch (error) {
      console.error("Failed to load viewing patterns:", error);
    }
  }

  private async saveViewingPatterns() {
    try {
      const patternsPath = `${this.cacheDir}patterns.json`;
      const patterns = Object.fromEntries(this.viewingPatterns);
      await FileSystem.writeAsStringAsync(patternsPath, JSON.stringify(patterns));
    } catch (error) {
      console.error("Failed to save viewing patterns:", error);
    }
  }

  getCacheStats(): {
    size: number;
    count: number;
    maxSize: number;
    hitRate: number;
    priorityBreakdown: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
    averageAccessFrequency: number;
    storageEfficiency: number;
    predictiveAccuracy?: number;
  } {
    const lruStats = this.lruCache.getStats();
    const entries = Array.from(this.cache.values());

    const priorityBreakdown = entries.reduce(
      (acc, entry) => {
        acc[entry.priority] = (acc[entry.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const timestamps = entries.map((e) => e.timestamp);

    const avgAccessFreq = entries.length > 0 ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length : 0;

    const storageEfficiency = this.config.maxCacheSize > 0 ? this.currentCacheSize / this.config.maxCacheSize : 0;

    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: this.cacheHitRate,
      priorityBreakdown,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      averageAccessFrequency: avgAccessFreq,
      storageEfficiency,
    };
  }

  /**
   * Preload videos with device-aware and network-aware support
   */
  async preloadVideos(uris: string[], priority: "high" | "normal" | "low" = "normal"): Promise<void> {
    // Get device-specific preload configuration
    const preloadProfile = videoPerformanceConfig.getPreloadProfile();
    const maxConcurrent = preloadProfile.maxConcurrentPreloads;
    const preloadWindow = Math.min(uris.length, preloadProfile.preloadWindowSize);

    // Filter URIs based on preload window
    const urisToPreload = uris.slice(0, preloadWindow);

    // Apply network-aware preloading
    if (this.networkQuality === NetworkQualityTier.POOR) {
      // Reduce preload for poor networks
      const reducedUris = urisToPreload.slice(0, Math.ceil(preloadWindow / 2));
      return this.preloadVideosWithConcurrency(reducedUris, priority, Math.max(1, maxConcurrent / 2));
    }

    // Check if aggressive preloading is enabled for this device tier
    if (videoPerformanceConfig.shouldEnableFeature('aggressivePreloading')) {
      // Preload with higher concurrency for high-tier devices
      return this.preloadVideosWithConcurrency(urisToPreload, priority, maxConcurrent * 2);
    }

    return this.preloadVideosWithConcurrency(urisToPreload, priority, maxConcurrent);
  }

  private async preloadVideosWithConcurrency(
    uris: string[],
    priority: "high" | "normal" | "low",
    concurrency: number
  ): Promise<void> {
    // Limit concurrent preloads to prevent overwhelming the system
    const chunks = [];
    for (let i = 0; i < uris.length; i += concurrency) {
      chunks.push(uris.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const preloadPromises = chunk.map((uri) =>
        this.cacheVideo(uri, priority).catch((error) => {
          console.error(`Failed to preload video ${uri}:`, error);
        }),
      );

      await Promise.allSettled(preloadPromises);
    }
  }

  /**
   * Update cache configuration with device-aware settings
   */
  updateConfig(newConfig?: Partial<CacheConfig>): void {
    // Get device-specific configuration
    const perfConfig = videoPerformanceConfig.getCacheConfig();

    // Merge device-specific config with provided config
    this.config = {
      ...this.config,
      maxCacheSize: perfConfig.maxCacheSize,
      cleanupThreshold: perfConfig.memoryPressureThreshold,
      ...newConfig
    };

    // Clear and restart background tasks with new config
    this.clearBackgroundTasks();
    this.startBackgroundTasks();

    // Update LRU cache limits
    if (newConfig?.maxEntries || newConfig?.maxCacheSize) {
      // Note: LRUCache doesn't support dynamic config updates
      // In a real implementation, you might need to recreate the cache
      console.warn("Cache config updated, consider restarting the cache for full effect");
    }
  }

  /**
   * Force cleanup of expired and low-priority entries
   */
  async forceCleanup(): Promise<{ removedCount: number; freedSpace: number }> {
    const initialSize = this.currentCacheSize;
    const initialCount = this.cache.size;

    // Clean up expired entries from LRU cache
    const _expiredRemoved = this.lruCache.cleanup();

    // Force eviction if still over threshold
    if (this.currentCacheSize > this.config.maxCacheSize * 0.8) {
      await this.evictLeastRecentlyUsed();
    }

    const freedSpace = initialSize - this.currentCacheSize;
    const removedCount = initialCount - this.cache.size;

    return { removedCount, freedSpace };
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    this.clearBackgroundTasks();
    this.saveViewingPatterns();
    this.saveCacheIndex();
  }

  /**
   * Initialize device and network detection
   */
  private async initializeDeviceAndNetwork(): Promise<void> {
    try {
      // Detect device tier
      const deviceInfo = await environmentDetector.getDeviceInfo();
      const memoryInfo = await environmentDetector.getMemoryInfo();

      const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);
      if (totalMemoryGB >= 6) {
        this.deviceTier = DevicePerformanceTier.HIGH;
      } else if (totalMemoryGB >= 4) {
        this.deviceTier = DevicePerformanceTier.MID;
      } else {
        this.deviceTier = DevicePerformanceTier.LOW;
      }

      videoPerformanceConfig.setDeviceTier(this.deviceTier);

      // Detect initial network quality
      const netInfo = await NetInfo.fetch();
      this.updateNetworkQuality(netInfo);

      // Update cache config based on device tier
      this.updateConfig();
    } catch (error) {
      console.error('Failed to initialize device and network detection:', error);
    }
  }

  /**
   * Handle network changes
   */
  private handleNetworkChange(state: any): void {
    this.updateNetworkQuality(state);

    // Adjust cache strategy based on network change
    if (this.networkQuality === NetworkQualityTier.POOR) {
      // Reduce cleanup interval on poor networks
      if (this.idleCleanupTimer) {
        clearInterval(this.idleCleanupTimer);
        this.idleCleanupTimer = setInterval(() => {
          this.performIdleCleanup();
        }, 60000); // Faster cleanup on poor networks
      }
    }
  }

  /**
   * Update network quality based on connection info
   */
  private updateNetworkQuality(state: any): void {
    if (!state.isConnected) {
      this.networkQuality = NetworkQualityTier.POOR;
      return;
    }

    const type = state.type?.toLowerCase();
    const effectiveType = state.details?.cellularGeneration?.toLowerCase() || type;

    if (effectiveType === 'wifi' || effectiveType === '5g') {
      this.networkQuality = NetworkQualityTier.EXCELLENT;
    } else if (effectiveType === '4g') {
      this.networkQuality = NetworkQualityTier.GOOD;
    } else if (effectiveType === '3g') {
      this.networkQuality = NetworkQualityTier.FAIR;
    } else {
      this.networkQuality = NetworkQualityTier.POOR;
    }

    videoPerformanceConfig.setNetworkQuality(this.networkQuality);
  }

  /**
   * Get device-aware cache statistics
   */
  getDeviceAwareCacheStats(): any {
    const baseStats = this.getCacheStats();
    return {
      ...baseStats,
      deviceTier: this.deviceTier,
      networkQuality: this.networkQuality,
      qualityVariants: this.getQualityVariantStats(),
      adaptiveSettings: {
        currentPreloadLimit: videoPerformanceConfig.getPreloadProfile().maxConcurrentPreloads,
        currentMemoryLimit: videoPerformanceConfig.getPreloadProfile().memoryLimit,
        currentCleanupInterval: videoPerformanceConfig.getCacheConfig().cleanupInterval,
      }
    };
  }

  private getQualityVariantStats(): any {
    let variantCount = 0;
    let variantSize = 0;
    const qualityDistribution: Record<string, number> = {};

    for (const entry of this.cache.values()) {
      if (entry.variantUris) {
        variantCount += entry.variantUris.size;
        for (const quality of entry.variantUris.keys()) {
          qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1;
        }
      }
    }

    return {
      count: variantCount,
      size: variantSize,
      distribution: qualityDistribution
    };
  }
}

export const videoCacheManager = new VideoCacheManager();
