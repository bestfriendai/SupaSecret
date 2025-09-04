import * as FileSystem from "expo-file-system";

interface CacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
}

class VideoCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private currentCacheSize = 0;
  private cacheDir = `${FileSystem.documentDirectory}video_cache/`;

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }

      // Load existing cache entries
      await this.loadCacheIndex();
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
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  private async evictLeastRecentlyUsed() {
    // Sort by timestamp (oldest first)
    const sortedEntries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    // Remove oldest entries until we're under the size limit
    for (const [key, entry] of sortedEntries) {
      if (this.currentCacheSize <= this.maxCacheSize * 0.8) break;

      try {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
      } catch (error) {
        console.error("Failed to evict cache entry:", error);
      }
    }

    await this.saveCacheIndex();
  }

  async getCachedVideo(uri: string): Promise<string | null> {
    const cacheKey = this.generateCacheKey(uri);
    const entry = this.cache.get(cacheKey);

    if (entry) {
      // Update timestamp for LRU
      entry.timestamp = Date.now();
      this.cache.set(cacheKey, entry);
      await this.saveCacheIndex();

      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
      if (fileInfo.exists) {
        return entry.localPath;
      } else {
        // File was deleted externally, remove from cache
        this.cache.delete(cacheKey);
        this.currentCacheSize -= entry.size;
      }
    }

    return null;
  }

  async cacheVideo(uri: string): Promise<string> {
    const cacheKey = this.generateCacheKey(uri);
    const existingEntry = await this.getCachedVideo(uri);

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
        if (this.currentCacheSize + fileSize > this.maxCacheSize) {
          await this.evictLeastRecentlyUsed();
        }

        // Add to cache
        const entry: CacheEntry = {
          uri,
          localPath,
          timestamp: Date.now(),
          size: fileSize,
        };

        this.cache.set(cacheKey, entry);
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

  async preloadVideos(uris: string[]): Promise<void> {
    const preloadPromises = uris.map(uri => 
      this.cacheVideo(uri).catch(error => {
        console.error(`Failed to preload video ${uri}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
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

  getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

export const videoCacheManager = new VideoCacheManager();