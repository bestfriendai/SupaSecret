import * as FileSystem from "expo-file-system";
import { LRUCache } from "./lruCache";

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
  private cacheDir = `${FileSystem.Paths.cache.uri}video_cache/`;
  private isCleaningUp = false;
  private viewingPatterns: Map<string, number[]> = new Map();
  private cacheHitRate = 0;
  private totalRequests = 0;
  private totalHits = 0;
  private idleCleanupTimer?: ReturnType<typeof setInterval>;
  private memoryMonitorTimer?: ReturnType<typeof setInterval>;
  private cachePartitions: Map<string, Map<string, CacheEntry>> = new Map();

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };

    // Initialize LRU cache for metadata
    this.lruCache = new LRUCache<CacheEntry>({
      maxSize: this.config.maxEntries,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      onEvict: (key, entry) => this.handleEviction(key, entry),
      getSizeOf: (entry) => entry.size,
    });

    // Initialize cache partitions
    this.cachePartitions.set("thumbnail", new Map());
    this.cachePartitions.set("preview", new Map());
    this.cachePartitions.set("full", new Map());

    this.initializeCache();
    this.startBackgroundTasks();
  }

  async initialize() {
    await this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Create partition directories
      if (this.config.cachePartitioning) {
        for (const partition of ["thumbnail", "preview", "full"]) {
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
          this.cache.set(key, entry as CacheEntry);
          this.currentCacheSize += (entry as CacheEntry).size;
        }
      }
    } catch (error) {
      console.error("Failed to load cache index:", error);
    }
  }

  private async saveCacheIndex() {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const cacheData = Object.fromEntries(this.cache);
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
    const targetSize = this.config.maxCacheSize * 0.7; // Target 70% capacity
    const entries = Array.from(this.cache.entries());

    // Sort by priority and access patterns
    const sortedEntries = entries.sort(([, a], [, b]) => {
      // Priority-based sorting
      const priorityWeight = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first (keep)
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

      await this.handleEviction(key, entry);
    }
  }

  async getCachedVideo(uri: string, priority: "high" | "normal" | "low" = "normal"): Promise<string | null> {
    const cacheKey = this.generateCacheKey(uri);
    const entry = this.cache.get(cacheKey);

    this.totalRequests++;

    if (entry) {
      // Update access information
      const now = Date.now();
      entry.timestamp = now;
      entry.lastAccessTime = now;
      entry.accessCount++;
      entry.priority = priority; // Update priority based on current usage

      // Track hit rate
      this.totalHits++;
      this.cacheHitRate = this.totalHits / this.totalRequests;

      // Update viewing patterns for intelligent preloading
      if (this.config.intelligentPreload) {
        this.updateViewingPattern(uri, now);
      }

      this.cache.set(cacheKey, entry);
      this.lruCache.set(cacheKey, entry);

      // Verify file still exists
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
    const cacheKey = this.generateCacheKey(uri);
    const existingEntry = await this.getCachedVideo(uri, priority);

    if (existingEntry) {
      return existingEntry;
    }

    try {
      const fileName = `${cacheKey}.mp4`;
      const localPath = `${this.cacheDir}${fileName}`;

      // Download the video
      const downloadResult = await FileSystem.downloadAsync(uri, localPath);

      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const fileSize = fileInfo.exists && !fileInfo.isDirectory ? (fileInfo as any).size || 0 : 0;

        // Check if we need to evict old entries
        if (this.currentCacheSize + fileSize > this.config.maxCacheSize) {
          await this.evictLeastRecentlyUsed();
        }

        // Add to cache
        const entry: CacheEntry = {
          uri,
          localPath,
          timestamp: Date.now(),
          size: fileSize,
          accessCount: 1,
          priority,
          lastAccessTime: Date.now(),
        };

        this.cache.set(cacheKey, entry);
        this.lruCache.set(cacheKey, entry);
        this.currentCacheSize += fileSize;
        await this.saveCacheIndex();

        return localPath;
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error("Failed to cache video:", error);
      return uri; // Return original URI as fallback
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
    // Start idle cleanup
    if (this.config.idleCleanupInterval > 0) {
      this.idleCleanupTimer = setInterval(() => {
        this.performIdleCleanup();
      }, this.config.idleCleanupInterval);
    }

    // Start memory pressure monitoring
    this.memoryMonitorTimer = setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
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
    // Simplified memory check - in production use actual memory APIs
    const memoryUsageRatio = this.currentCacheSize / this.config.maxCacheSize;

    if (memoryUsageRatio > this.config.memoryPressureThreshold) {
      // Reduce cache size under memory pressure
      await this.reduceCache(0.5); // Reduce to 50% of max size
    }
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
   * Preload videos with priority support
   */
  async preloadVideos(uris: string[], priority: "high" | "normal" | "low" = "normal"): Promise<void> {
    // Limit concurrent preloads to prevent overwhelming the system
    const chunks = [];
    for (let i = 0; i < uris.length; i += this.config.preloadLimit) {
      chunks.push(uris.slice(i, i + this.config.preloadLimit));
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
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update LRU cache limits
    if (newConfig.maxEntries || newConfig.maxCacheSize) {
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
    if (this.idleCleanupTimer) {
      clearInterval(this.idleCleanupTimer);
    }
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer);
    }
    this.saveViewingPatterns();
    this.saveCacheIndex();
  }
}

export const videoCacheManager = new VideoCacheManager();
