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
}

export interface CacheOptions {
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  ttl?: number; // Time to live in milliseconds
  onEvict?: (key: string, value: any) => void;
  getSizeOf?: (value: any) => number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private currentMemoryUsage = 0;
  private readonly options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      maxMemory: options.maxMemory ?? 50 * 1024 * 1024, // 50MB default
      ttl: options.ttl ?? 30 * 60 * 1000, // 30 minutes default
      onEvict: options.onEvict ?? (() => {}),
      getSizeOf: options.getSizeOf ?? ((value: any) => {
        if (typeof value === 'string') return value.length * 2; // UTF-16
        if (typeof value === 'object') return JSON.stringify(value).length * 2;
        return 64; // Default size for primitives
      }),
    };
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    // Update access information
    entry.timestamp = Date.now();
    entry.accessCount++;
    
    // Move to end of access order (most recently used)
    this.updateAccessOrder(key);
    
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    const existingEntry = this.cache.get(key);
    const size = this.options.getSizeOf(value);

    // If updating existing entry, adjust memory usage
    if (existingEntry) {
      this.currentMemoryUsage -= existingEntry.size || 0;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size,
    };

    // Check if we need to evict before adding
    this.currentMemoryUsage += size;
    this.evictIfNecessary();

    // Add to cache
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
    this.options.onEvict(key, entry.value);
    
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
    for (const [key, entry] of this.cache) {
      this.options.onEvict(key, entry.value);
    }
    
    this.cache.clear();
    this.accessOrder = [];
    this.currentMemoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      maxSize: this.options.maxSize,
      maxMemory: this.options.maxMemory,
      expiredCount,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * Get all keys in the cache (excluding expired ones)
   */
  keys(): string[] {
    const validKeys: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry)) {
        validKeys.push(key);
      }
    }
    
    return validKeys;
  }

  /**
   * Get all values in the cache (excluding expired ones)
   */
  values(): T[] {
    const validValues: T[] = [];
    
    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry)) {
        validValues.push(entry.value);
      }
    }
    
    return validValues;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.delete(key);
        removedCount++;
      }
    }
    
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
    // Evict by size limit
    while (this.cache.size >= this.options.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.delete(oldestKey);
    }

    // Evict by memory limit
    while (this.currentMemoryUsage > this.options.maxMemory && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      this.delete(oldestKey);
    }

    // Clean up expired entries
    this.cleanup();
  }

  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    const hits = Array.from(this.cache.values())
      .filter(entry => entry.accessCount > 1)
      .reduce((sum, entry) => sum + (entry.accessCount - 1), 0);
    
    return totalAccesses > 0 ? hits / totalAccesses : 0;
  }
}

/**
 * Create a specialized cache for different data types
 */
export const createImageCache = (maxMemory = 100 * 1024 * 1024) => // 100MB
  new LRUCache<string>({
    maxSize: 200,
    maxMemory,
    ttl: 60 * 60 * 1000, // 1 hour
    getSizeOf: (uri: string) => uri.length * 2 + 1024, // Estimate image overhead
  });

export const createDataCache = <T>(maxSize = 100, ttl = 15 * 60 * 1000) => // 15 minutes
  new LRUCache<T>({
    maxSize,
    maxMemory: 10 * 1024 * 1024, // 10MB
    ttl,
  });

export const createVideoCache = (maxMemory = 500 * 1024 * 1024) => // 500MB
  new LRUCache<string>({
    maxSize: 50,
    maxMemory,
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    getSizeOf: () => 10 * 1024 * 1024, // Estimate 10MB per video
  });
