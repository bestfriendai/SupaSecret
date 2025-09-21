/**
 * Optimized Video Service for Enhanced Performance
 * Implements best practices for video streaming with Supabase
 */

import { supabase } from "../lib/supabase";
import type { Confession } from "../types/confession";
import { normalizeConfessions } from "../utils/confessionNormalizer";
import { VideoDataService } from "./VideoDataService";

interface VideoCache {
  data: Confession[];
  timestamp: number;
  etag?: string;
}

interface PreloadConfig {
  enabled: boolean;
  batchSize: number;
  maxConcurrent: number;
}

class OptimizedVideoService {
  private static instance: OptimizedVideoService;
  private videoCache: Map<string, VideoCache> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isPreloading: boolean = false;

  // Performance configurations
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private readonly PRELOAD_BATCH_SIZE = 5;
  private readonly MAX_CONCURRENT_PRELOADS = 3;
  private readonly VIDEO_QUALITY_MAPPING = {
    high: { bitrate: 2500000, resolution: "1080p" },
    medium: { bitrate: 1500000, resolution: "720p" },
    low: { bitrate: 800000, resolution: "480p" },
  };

  private constructor() {
    this.initializeService();
  }

  static getInstance(): OptimizedVideoService {
    if (!OptimizedVideoService.instance) {
      OptimizedVideoService.instance = new OptimizedVideoService();
    }
    return OptimizedVideoService.instance;
  }

  private async initializeService() {
    // Setup periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.CACHE_TTL_MS);

    // Monitor network status for adaptive streaming
    if (typeof window !== "undefined" && "connection" in navigator) {
      (navigator as any).connection?.addEventListener("change", () => {
        this.handleNetworkChange();
      });
    }
  }

  /**
   * Fetch videos with intelligent caching and optimization
   */
  async fetchOptimizedVideos(
    limit: number = 20,
    offset: number = 0,
    forceRefresh: boolean = false,
  ): Promise<Confession[]> {
    const cacheKey = `videos_${limit}_${offset}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCachedVideos(cacheKey);
      if (cached) {
        // Trigger background refresh if cache is stale
        if (this.isCacheStale(cacheKey)) {
          this.backgroundRefresh(cacheKey, limit, offset);
        }
        return cached;
      }
    }

    try {
      // Fetch from database with optimized query
      const { data, error } = await supabase
        .from("confessions")
        .select(
          `
          id,
          type,
          content,
          video_uri,
          video_url,
          transcription,
          created_at,
          is_anonymous,
          likes,
          views,
          user_id,
          face_blur_applied,
          voice_change_applied
        `,
        )
        .eq("type", "video")
        .not("video_uri", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const normalized = await normalizeConfessions(data || []);
      const optimized = this.optimizeVideoData(normalized);

      // Cache the results
      this.setCachedVideos(cacheKey, optimized);

      // Preload next batch
      this.preloadNextBatch(limit, offset + limit);

      return optimized;
    } catch (error) {
      console.error("OptimizedVideoService: Failed to fetch videos", error);

      // Fallback to cache if available
      const fallback = this.getCachedVideos(cacheKey, true);
      if (fallback) return fallback;

      // Ultimate fallback to basic service
      return VideoDataService.fetchVideoConfessions(limit);
    }
  }

  /**
   * Optimize video data for better performance
   */
  private optimizeVideoData(videos: Confession[]): Confession[] {
    return videos.map((video) => ({
      ...video,
      // Add CDN optimization hints
      videoUri: this.optimizeVideoUrl(video.videoUri),
      // Prepare thumbnail URL if available
      thumbnailUri: this.generateThumbnailUrl(video.videoUri),
      // Add quality options
      qualityOptions: this.getQualityOptions(video.videoUri),
    }));
  }

  /**
   * Optimize video URL for CDN delivery
   */
  private optimizeVideoUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Add CDN parameters for optimized delivery
    const optimizedUrl = new URL(url);

    // Add cache-busting parameter if needed
    if (!optimizedUrl.searchParams.has("v")) {
      optimizedUrl.searchParams.set("v", Date.now().toString(36));
    }

    return optimizedUrl.toString();
  }

  /**
   * Generate thumbnail URL from video URL
   */
  private generateThumbnailUrl(videoUrl: string | null | undefined): string | null {
    if (!videoUrl) return null;

    // For Google Cloud Storage videos, generate thumbnail
    if (videoUrl.includes("commondatastorage.googleapis.com")) {
      // Use first frame as thumbnail
      return `${videoUrl}#t=0.1`;
    }

    return null;
  }

  /**
   * Get available quality options for adaptive streaming
   */
  private getQualityOptions(videoUrl: string | null | undefined): string[] {
    if (!videoUrl) return ["auto"];

    // Determine available qualities based on network
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      switch (effectiveType) {
        case "4g":
          return ["1080p", "720p", "480p", "auto"];
        case "3g":
          return ["720p", "480p", "auto"];
        case "2g":
        case "slow-2g":
          return ["480p", "auto"];
        default:
          return ["auto"];
      }
    }

    return ["1080p", "720p", "480p", "auto"];
  }

  /**
   * Preload next batch of videos
   */
  private async preloadNextBatch(limit: number, offset: number) {
    const cacheKey = `videos_${limit}_${offset}`;

    // Skip if already preloaded or currently preloading
    if (this.preloadQueue.has(cacheKey) || this.isPreloading) return;

    this.preloadQueue.add(cacheKey);
    this.isPreloading = true;

    try {
      // Fetch next batch in background
      setTimeout(async () => {
        await this.fetchOptimizedVideos(limit, offset, false);
        this.preloadQueue.delete(cacheKey);
        this.isPreloading = false;
      }, 1000); // Delay to prevent blocking main thread
    } catch (error) {
      console.warn("Preload failed:", error);
      this.preloadQueue.delete(cacheKey);
      this.isPreloading = false;
    }
  }

  /**
   * Background refresh for stale cache
   */
  private async backgroundRefresh(cacheKey: string, limit: number, offset: number) {
    try {
      const fresh = await this.fetchOptimizedVideos(limit, offset, true);
      this.setCachedVideos(cacheKey, fresh);
    } catch (error) {
      console.warn("Background refresh failed:", error);
    }
  }

  /**
   * Handle network changes for adaptive streaming
   */
  private handleNetworkChange() {
    const connection = (navigator as any).connection;
    if (connection) {
      console.log("Network changed:", {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });

      // Clear cache to force quality adjustment
      if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") {
        this.videoCache.clear();
      }
    }
  }

  /**
   * Cache management methods
   */
  private getCachedVideos(key: string, includeStale: boolean = false): Confession[] | null {
    const cached = this.videoCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS && !includeStale) return null;

    return [...cached.data]; // Return copy to prevent mutations
  }

  private setCachedVideos(key: string, videos: Confession[]) {
    // Limit cache size
    if (this.videoCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.videoCache.keys().next().value;
      if (typeof oldestKey === "string") {
        this.videoCache.delete(oldestKey);
      }
    }

    this.videoCache.set(key, {
      data: videos,
      timestamp: Date.now(),
      etag: this.generateEtag(videos),
    });
  }

  private isCacheStale(key: string): boolean {
    const cached = this.videoCache.get(key);
    if (!cached) return true;

    const age = Date.now() - cached.timestamp;
    return age > this.CACHE_TTL_MS / 2; // Consider stale at half TTL
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.videoCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS * 2) {
        this.videoCache.delete(key);
      }
    }
  }

  private generateEtag(videos: Confession[]): string {
    const content = videos.map((v) => v.id).join(",");
    return btoa(content).substring(0, 16);
  }

  /**
   * Prefetch video content for smoother playback
   */
  async prefetchVideo(videoUrl: string): Promise<void> {
    if (!videoUrl || typeof window === "undefined") return;

    try {
      // Create a video element to start preloading
      const video = document.createElement("video");
      video.preload = "auto";
      video.src = videoUrl;
      video.muted = true;

      // Start loading
      video.load();

      // Clean up after a delay
      setTimeout(() => {
        video.src = "";
        video.remove();
      }, 30000); // 30 seconds
    } catch (error) {
      console.warn("Video prefetch failed:", error);
    }
  }

  /**
   * Get video analytics for optimization
   */
  async getVideoAnalytics(videoId: string): Promise<any> {
    try {
      const { data, error } = await supabase.from("video_analytics").select("*").eq("video_id", videoId).single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn("Failed to get video analytics:", error);
      return null;
    }
  }

  /**
   * Track video performance metrics
   */
  async trackVideoMetrics(
    videoId: string,
    metrics: {
      loadTime?: number;
      bufferCount?: number;
      watchTime?: number;
      completionRate?: number;
    },
  ): Promise<void> {
    try {
      // Queue metrics for batch processing
      if (__DEV__) {
        console.log("Video metrics:", { videoId, ...metrics });
      }

      // In production, send to analytics service
      // await supabase.rpc('track_video_metrics', { video_id: videoId, ...metrics });
    } catch (error) {
      console.warn("Failed to track video metrics:", error);
    }
  }
}

export default OptimizedVideoService.getInstance();
