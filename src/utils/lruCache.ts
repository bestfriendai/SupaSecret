/**
 * Generic LRU (Least Recently Used) Cache implementation
 * Supports both memory and size-based eviction policies
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  size?: number;
  lastAccessTime?: number;
  score?: number;
  compressed?: boolean;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  ttl?: number; // Time to live in milliseconds
  onEvict?: (key: string, value: any) => void | Promise<void>;
  getSizeOf?: (value: any) => number;
  enableCompression?: boolean;
  enableStatistics?: boolean;
  scoreFunction?: (entry: CacheEntry<any>) => number;
  persistToDisk?: boolean;
  warmupEntries?: string[];
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private currentMemoryUsage = 0;
  private readonly options: Required<CacheOptions>;
  private statistics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0,
    avgAccessTime: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };
  private batchOperationQueue: Map<string, { operation: "set" | "delete"; value?: T }> = new Map();
  private batchTimer?: ReturnType<typeof setTimeout>;
  private cleanupScheduled = false;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      maxMemory: options.maxMemory ?? 50 * 1024 * 1024, // 50MB default
      ttl: options.ttl ?? 30 * 60 * 1000, // 30 minutes default
      onEvict: options.onEvict ?? (() => {}),
      getSizeOf:
        options.getSizeOf ??
        ((value: any) => {
          if (typeof value === "string") return value.length * 2; // UTF-16
          if (typeof value === "object") return JSON.stringify(value).length * 2;
          return 64; // Default size for primitives
        }),
      enableCompression: options.enableCompression ?? false,
      enableStatistics: options.enableStatistics ?? true,
      scoreFunction: options.scoreFunction ?? this.defaultScoreFunction,
      persistToDisk: options.persistToDisk ?? false,
      warmupEntries: options.warmupEntries ?? [],
    };

    // Warm up cache with predefined entries
    if (this.options.warmupEntries.length > 0) {
      this.warmupCache();
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.options.enableStatistics) {
        this.statistics.misses++;
      }
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      if (this.options.enableStatistics) {
        this.statistics.misses++;
      }
      return undefined;
    }

    // Update access information
    const now = Date.now();
    entry.timestamp = now;
    entry.lastAccessTime = now;
    entry.accessCount++;
    entry.score = this.options.scoreFunction(entry);

    // Move to end of access order (most recently used)
    this.updateAccessOrder(key);

    // Update statistics
    if (this.options.enableStatistics) {
      this.statistics.hits++;
      const accessTime = Date.now() - startTime;
      this.statistics.totalAccessTime += accessTime;
      this.statistics.accessCount++;
      this.statistics.avgAccessTime = this.statistics.totalAccessTime / this.statistics.accessCount;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    const existingEntry = this.cache.get(key);
    let size = this.options.getSizeOf(value);
    let compressedValue = value;

    // Apply compression if enabled and beneficial
    if (this.options.enableCompression && size > 1024) {
      const compressed = this.compress(value);
      if (compressed.size < size * 0.8) {
        compressedValue = compressed.value as T;
        size = compressed.size;
        if (this.options.enableStatistics) {
          this.statistics.compressions++;
        }
      }
    }

    // If updating existing entry, adjust memory usage
    if (existingEntry) {
      this.currentMemoryUsage -= existingEntry.size || 0;
    }

    // Check if we need to evict before adding new entry
    const tempMemoryUsage = this.currentMemoryUsage + size;
    if (tempMemoryUsage > this.options.maxMemory || this.cache.size >= this.options.maxSize) {
      this.evictIfNecessary();
    }

    // Create new entry
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value: compressedValue,
      timestamp: now,
      lastAccessTime: now,
      accessCount: 1,
      size,
      compressed: compressedValue !== value,
      score: 0,
    };
    entry.score = this.options.scoreFunction(entry);

    // Update memory usage and add to cache
    this.currentMemoryUsage += size;
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Update memory usage
    this.currentMemoryUsage -= entry.size || 0;

    // Remove from cache and access order
    this.cache.delete(key);
    this.removeFromAccessOrder(key);

    // Call eviction callback
    const evictResult = this.options.onEvict(key, entry.value);
    if (evictResult instanceof Promise) {
      evictResult.catch((err) => console.error("Eviction callback error:", err));
    }

    if (this.options.enableStatistics) {
      this.statistics.evictions++;
    }

    return true;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    // Call eviction callback for all entries
    this.cache.forEach((entry, key) => {
      this.options.onEvict(key, entry.value);
    });

    this.cache.clear();
    this.accessOrder = [];
    this.currentMemoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const _now = Date.now();
    let expiredCount = 0;

    this.cache.forEach((entry) => {
      if (this.isExpired(entry)) {
        expiredCount++;
      }
    });

    const hitRate =
      this.statistics.hits + this.statistics.misses > 0
        ? this.statistics.hits / (this.statistics.hits + this.statistics.misses)
        : 0;

    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      maxSize: this.options.maxSize,
      maxMemory: this.options.maxMemory,
      expiredCount,
      hitRate,
      hits: this.statistics.hits,
      misses: this.statistics.misses,
      evictions: this.statistics.evictions,
      compressions: this.statistics.compressions,
      avgAccessTime: this.statistics.avgAccessTime,
      memoryEfficiency: this.cache.size > 0 ? this.currentMemoryUsage / (this.cache.size * 1024) : 0,
    };
  }

  /**
   * Get all keys in the cache (excluding expired ones)
   */
  keys(): string[] {
    const validKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (!this.isExpired(entry)) {
        validKeys.push(key);
      }
    });

    return validKeys;
  }

  /**
   * Get all values in the cache (excluding expired ones)
   */
  values(): T[] {
    const validValues: T[] = [];

    this.cache.forEach((entry) => {
      if (!this.isExpired(entry)) {
        validValues.push(entry.value);
      }
    });

    return validValues;
  }

  /**
   * Cleanup expired entries - now with lazy cleanup option
   */
  cleanup(): number {
    if (this.cleanupScheduled) {
      return 0; // Cleanup already scheduled
    }

    // Schedule lazy cleanup
    if (this.cache.size < this.options.maxSize * 0.9) {
      this.cleanupScheduled = true;
      setImmediate(() => {
        this.performCleanup();
        this.cleanupScheduled = false;
      });
      return 0;
    }

    // Immediate cleanup for high usage
    return this.performCleanup();
  }

  private performCleanup(): number {
    let removedCount = 0;
    const _now = Date.now();

    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.delete(key);
      removedCount++;
    });

    return removedCount;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictIfNecessary(): void {
    // Use intelligent eviction with scoring
    const entries = Array.from(this.cache.entries());

    // Sort by score (lower score = more likely to evict)
    entries.sort((a, b) => {
      const scoreA = a[1].score || this.options.scoreFunction(a[1]);
      const scoreB = b[1].score || this.options.scoreFunction(b[1]);
      return scoreA - scoreB;
    });

    // Evict by size limit
    while (this.cache.size >= this.options.maxSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.delete(key);
    }

    // Evict by memory limit
    while (this.currentMemoryUsage > this.options.maxMemory && entries.length > 0) {
      const [key] = entries.shift()!;
      this.delete(key);
    }

    // Clean up expired entries
    this.cleanup();
  }

  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;

    let totalRequests = 0;
    let cacheHits = 0;

    this.cache.forEach((entry) => {
      totalRequests += entry.accessCount;
      // Every access after the first is a cache hit
      if (entry.accessCount > 1) {
        cacheHits += entry.accessCount - 1;
      }
    });

    return totalRequests > 0 ? cacheHits / totalRequests : 0;
  }

  /**
   * Batch operations for better performance
   */
  batchSet(entries: [string, T][]): void {
    entries.forEach(([key, value]) => {
      this.batchOperationQueue.set(key, { operation: "set", value });
    });
    this.processBatchOperations();
  }

  batchDelete(keys: string[]): void {
    keys.forEach((key) => {
      this.batchOperationQueue.set(key, { operation: "delete" });
    });
    this.processBatchOperations();
  }

  private processBatchOperations(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.batchOperationQueue.forEach(({ operation, value }, key) => {
        if (operation === "set" && value !== undefined) {
          this.set(key, value);
        } else if (operation === "delete") {
          this.delete(key);
        }
      });
      this.batchOperationQueue.clear();
    }, 10); // Process batch after 10ms
  }

  /**
   * Warm up cache with predefined entries
   */
  async warmup(keys: string[], loadFunction: (key: string) => Promise<T>): Promise<void> {
    const warmupPromises = keys.map(async (key) => {
      try {
        const value = await loadFunction(key);
        this.set(key, value);
      } catch (error) {
        console.error(`Failed to warm up cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  private warmupCache(): void {
    // Implementation for initial warmup from options
    console.log("Cache warmup initiated with", this.options.warmupEntries.length, "entries");
  }

  /**
   * Default scoring function for intelligent eviction
   */
  private defaultScoreFunction(entry: CacheEntry<any>): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const recency = now - (entry.lastAccessTime || entry.timestamp);
    const frequency = entry.accessCount;
    const size = entry.size || 1;

    // Higher score = keep in cache
    // Consider frequency, recency, and size
    const frequencyScore = Math.log(frequency + 1) * 100;
    const recencyScore = Math.max(0, 1000 - recency / 1000);
    const sizeScore = Math.max(0, 100 - size / 10000);
    const ageScore = Math.max(0, 1000 - age / 10000);

    return frequencyScore + recencyScore + sizeScore + ageScore;
  }

  /**
   * Simple compression for text data
   */
  private compress(value: any): { value: any; size: number } {
    // Compression disabled for React Native - Buffer not available
    // In production, use a RN-compatible compression library
    if (this.options.enableCompression && typeof value === "string" && value.length > 1024) {
      // For now, just return the original value
      // TODO: Integrate react-native-compression or similar
      if (__DEV__) {
        console.log("Compression requested but not available in React Native");
      }
    }
    return {
      value,
      size: this.options.getSizeOf(value),
    };
  }

  /**
   * Debug utilities
   */
  debug(): void {
    if (__DEV__) {
      console.log("Cache Debug Info:");
      console.log("- Size:", this.cache.size, "/", this.options.maxSize);
      console.log(
        "- Memory:",
        (this.currentMemoryUsage / 1024 / 1024).toFixed(2),
        "MB /",
        (this.options.maxMemory / 1024 / 1024).toFixed(2),
        "MB",
      );
      console.log("- Statistics:", this.statistics);
      console.log("- Top 5 by score:");

      const entries = Array.from(this.cache.entries())
        .map(([key, entry]) => ({ key, score: entry.score || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      entries.forEach(({ key, score }) => {
        console.log(`  ${key}: ${score.toFixed(2)}`);
      });
    }
  }
}

/**
 * Create a specialized cache for different data types
 */
export const createImageCache = (
  maxMemory = 100 * 1024 * 1024, // 100MB
) =>
  new LRUCache<string>({
    maxSize: 200,
    maxMemory,
    ttl: 60 * 60 * 1000, // 1 hour
    getSizeOf: (uri: string) => {
      // More accurate image size estimation
      const baseSize = uri.length * 2; // URI string size
      // Estimate typical image sizes based on URI patterns
      if (uri.includes("thumb") || uri.includes("small")) {
        return baseSize + 50 * 1024; // 50KB for thumbnails
      }
      if (uri.includes("large") || uri.includes("full")) {
        return baseSize + 500 * 1024; // 500KB for large images
      }
      return baseSize + 200 * 1024; // 200KB default estimate
    },
  });

export const createDataCache = <T>(
  maxSize = 100,
  ttl = 15 * 60 * 1000, // 15 minutes
) =>
  new LRUCache<T>({
    maxSize,
    maxMemory: 10 * 1024 * 1024, // 10MB
    ttl,
  });

export const createVideoCache = (
  maxMemory = 500 * 1024 * 1024, // 500MB
) =>
  new LRUCache<string>({
    maxSize: 50,
    maxMemory,
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    getSizeOf: (uri: string) => {
      // More accurate video size estimation based on URI patterns
      const baseSize = uri.length * 2;
      if (uri.includes("preview") || uri.includes("thumb")) {
        return baseSize + 2 * 1024 * 1024; // 2MB for previews
      }
      if (uri.includes("720p") || uri.includes("hd")) {
        return baseSize + 25 * 1024 * 1024; // 25MB for HD videos
      }
      if (uri.includes("1080p") || uri.includes("fhd")) {
        return baseSize + 50 * 1024 * 1024; // 50MB for Full HD
      }
      return baseSize + 15 * 1024 * 1024; // 15MB default estimate
    },
  });
