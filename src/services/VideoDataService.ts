import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import type { Confession } from "../types/confession";
import { normalizeConfessions } from "../utils/confessionNormalizer";

interface TrendingHashtag {
  hashtag: string;
  count: number;
  percentage: number;
}

export interface VideoMetricUpdate {
  videoId: string;
  likesDelta?: number;
  viewsDelta?: number;
}

export interface VideoAnalytics {
  videoId: string;
  watchTime: number;
  completionRate: number;
  interactions: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

export interface VideoEvent {
  type: 'play' | 'pause' | 'seek' | 'complete' | 'like' | 'unlike' | 'comment' | 'share' | 'save';
  timestamp: number;
  metadata?: Record<string, any>;
}

type SupabaseOperation<T> = () => Promise<{ data: T | null; error: PostgrestError | null }>;

const CACHE_TTL_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 250;
const VIDEO_CONFESSIONS_PREFIX = "video-confessions";
const TRENDING_VIDEOS_PREFIX = "trending-videos";
const ANALYTICS_CACHE_PREFIX = "video-analytics";

const cacheStore = new Map<string, { data: Confession[]; timestamp: number }>();
const analyticsCache = new Map<string, { data: VideoAnalytics; timestamp: number }>();
const eventQueue = new Map<string, VideoEvent[]>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildCacheKey = (prefix: string, params: Record<string, unknown>): string => {
  const serialized = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
  return `${prefix}:${serialized}`;
};

const cloneConfessions = (confessions: Confession[]): Confession[] => confessions.map((confession) => ({ ...confession }));

const getCachedList = (key: string, allowStale = false): Confession[] | null => {
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }
  const age = Date.now() - entry.timestamp;
  if (age <= CACHE_TTL_MS || allowStale) {
    return cloneConfessions(entry.data);
  }
  cacheStore.delete(key);
  return null;
};

const setCachedList = (key: string, data: Confession[]) => {
  cacheStore.set(key, { data: cloneConfessions(data), timestamp: Date.now() });
};

const invalidateCacheByPrefix = (prefix: string) => {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

const sanitizeVideoUri = (uri?: string | null): string | null => {
  if (!uri) {
    return null;
  }

  const trimmed = uri.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const prepareVideoResults = (confessions: Confession[]): Confession[] =>
  confessions.reduce<Confession[]>((acc, confession) => {
    const sanitizedUri = sanitizeVideoUri(confession.videoUri);
    if (sanitizedUri) {
      acc.push({ ...confession, videoUri: sanitizedUri });
    }
    return acc;
  }, []);

const executeWithRetry = async <T>(operationName: string, operation: SupabaseOperation<T>): Promise<T | null> => {
  let attempt = 0;
  let lastError: PostgrestError | null = null;

  while (attempt <= MAX_RETRIES) {
    const { data, error } = await operation();
    if (!error) {
      return data;
    }

    lastError = error;
    attempt += 1;
    if (attempt > MAX_RETRIES) {
      break;
    }
    await delay(RETRY_BASE_DELAY_MS * attempt);
  }

  throw lastError ?? new Error(`${operationName} failed after ${MAX_RETRIES + 1} attempts`);
};

const handleFetchFailure = (context: string, cacheKey: string): Confession[] => {
  const fallback = getCachedList(cacheKey, true);
  if (fallback) {
    if (__DEV__) {
      console.warn(`${context}: falling back to stale cache`);
    }
    return fallback;
  }
  return [];
};

/**
 * Service for fetching video data for the TikTok-style feed
 * Integrates with Supabase confessions and trending RPC helpers.
 */
export class VideoDataService {
  /**
   * Fetch video confessions from the database with caching and retry support.
   */
  static async fetchVideoConfessions(limit: number = 20): Promise<Confession[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200));
    const cacheKey = buildCacheKey(VIDEO_CONFESSIONS_PREFIX, { limit: safeLimit });
    const cached = getCachedList(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const confessions = await executeWithRetry<any[]>(
        "fetchVideoConfessions",
        async () =>
          await supabase
            .from("confessions")
            .select(
              "id,type,content,video_uri,video_url,transcription,created_at,is_anonymous,likes,views",
            )
            .eq("type", "video")
            .or("video_uri.not.is.null,video_url.not.is.null")
            .order("created_at", { ascending: false })
            .limit(safeLimit),
      );

      const normalized = await normalizeConfessions(confessions ?? []);
      const playable = prepareVideoResults(normalized);

      if (playable.length) {
        setCachedList(cacheKey, playable);
      }

      return playable;
    } catch (error) {
      console.error("VideoDataService.fetchVideoConfessions failed", error);
      return handleFetchFailure("VideoDataService.fetchVideoConfessions", cacheKey);
    }
  }

  /**
   * Fetch trending video confessions with caching.
   */
  static async fetchTrendingVideos(hoursBack: number = 24, limit: number = 10): Promise<Confession[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
    const safeHours = Math.max(1, Math.min(Math.floor(hoursBack), 168));
    const cacheKey = buildCacheKey(TRENDING_VIDEOS_PREFIX, { limit: safeLimit, hoursBack: safeHours });
    const cached = getCachedList(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const trendingData = await executeWithRetry<any[]>(
        "fetchTrendingVideos",
        async () =>
          await supabase.rpc("get_trending_secrets", {
            hours_back: safeHours,
            limit_count: safeLimit,
          }),
      );

      const normalized = await normalizeConfessions(trendingData ?? []);
      const playable = prepareVideoResults(normalized).slice(0, safeLimit);

      if (playable.length) {
        setCachedList(cacheKey, playable);
      }

      return playable;
    } catch (error) {
      console.error("VideoDataService.fetchTrendingVideos failed", error);
      return handleFetchFailure("VideoDataService.fetchTrendingVideos", cacheKey);
    }
  }

  /**
   * Fetch trending hashtags using get_trending_hashtags.
   */
  static async fetchTrendingHashtags(hoursBack: number = 24, limit: number = 10): Promise<TrendingHashtag[]> {
    try {
      const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
      const safeHours = Math.max(1, Math.min(Math.floor(hoursBack), 168));

      const data = await executeWithRetry<TrendingHashtag[]>(
        "fetchTrendingHashtags",
        async () =>
          await supabase.rpc("get_trending_hashtags", {
            hours_back: safeHours,
            limit_count: safeLimit,
          }),
      );

      return (data ?? []).map((row) => ({
        hashtag: row.hashtag,
        count: Number(row.count) || 0,
        percentage: Number(row.percentage) || 0,
      }));
    } catch (error) {
      console.error("VideoDataService.fetchTrendingHashtags failed", error);
      return [];
    }
  }

  /**
   * Search for video confessions by hashtag via search_confessions_by_hashtag.
   */
  static async searchVideosByHashtag(hashtag: string, limit: number = 20): Promise<Confession[]> {
    if (!hashtag || !hashtag.trim()) {
      return [];
    }

    try {
      const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
      const data = await executeWithRetry<any[]>(
        "searchVideosByHashtag",
        async () =>
          await supabase.rpc("search_confessions_by_hashtag", {
            search_hashtag: hashtag,
          }),
      );

      const normalized = await normalizeConfessions(data ?? []);
      return prepareVideoResults(normalized).slice(0, safeLimit);
    } catch (error) {
      console.error("VideoDataService.searchVideosByHashtag failed", error);
      return [];
    }
  }

  /**
   * Update video likes with improved analytics and feedback.
   * Only tracks the event and fetches latest likes - does NOT toggle the like itself.
   */
  static async updateVideoLikes(videoId: string, isLiked: boolean): Promise<number | null> {
    if (!videoId) {
      return null;
    }

    try {
      // Track the like event for analytics
      VideoDataService.trackVideoEvent(videoId, {
        type: isLiked ? 'like' : 'unlike',
        timestamp: Date.now(),
      });

      // Fetch the current like count
      const { data: confession } = await supabase
        .from("confessions")
        .select("likes")
        .eq("id", videoId)
        .single();

      invalidateCacheByPrefix(VIDEO_CONFESSIONS_PREFIX);
      invalidateCacheByPrefix(TRENDING_VIDEOS_PREFIX);

      return confession?.likes || 0;
    } catch (error) {
      console.error("VideoDataService.updateVideoLikes failed", error);
      return null;
    }
  }

  /**
   * Update video views with improved analytics and return new count.
   */
  static async updateVideoViews(videoId: string): Promise<number | null> {
    if (!videoId) {
      return null;
    }

    try {
      await executeWithRetry("updateVideoViews", async () =>
        await (supabase as any).rpc("increment_video_views", {
          confession_uuid: videoId,
        }),
      );

      invalidateCacheByPrefix(VIDEO_CONFESSIONS_PREFIX);
      invalidateCacheByPrefix(TRENDING_VIDEOS_PREFIX);

      // Track the view event
      VideoDataService.trackVideoEvent(videoId, {
        type: 'play',
        timestamp: Date.now(),
      });

      // Try to fetch updated view count
      const { data: confession } = await supabase
        .from("confessions")
        .select("views")
        .eq("id", videoId)
        .single();

      return confession?.views || 0;
    } catch (error) {
      if (__DEV__) {
        console.warn("VideoDataService.updateVideoViews failed", error);
      }
      return null;
    }
  }

  /**
   * Track video interaction events for analytics.
   */
  static trackVideoEvent(videoId: string, event: VideoEvent): void {
    if (!videoId || !event) return;

    const events = eventQueue.get(videoId) || [];
    events.push(event);
    eventQueue.set(videoId, events);

    // Process events if queue is getting large
    if (events.length >= 10) {
      VideoDataService.processEventQueue(videoId);
    }
  }

  /**
   * Process queued events for a video.
   */
  static async processEventQueue(videoId: string): Promise<void> {
    const events = eventQueue.get(videoId);
    if (!events || events.length === 0) return;

    eventQueue.delete(videoId);

    try {
      // In a real implementation, this would send to an analytics service
      // For now, we'll just log the events
      if (__DEV__) {
        console.log(`Processing ${events.length} events for video ${videoId}`);
      }
    } catch (error) {
      console.error("Failed to process video events", error);
    }
  }

  /**
   * Get cached analytics for a video.
   */
  static getCachedAnalytics(videoId: string): VideoAnalytics | null {
    const entry = analyticsCache.get(videoId);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL_MS) {
      analyticsCache.delete(videoId);
      return null;
    }

    return entry.data;
  }

  /**
   * Update analytics cache.
   */
  static updateAnalyticsCache(videoId: string, analytics: Partial<VideoAnalytics>): void {
    const existing = VideoDataService.getCachedAnalytics(videoId);
    const updated: VideoAnalytics = {
      videoId,
      watchTime: analytics.watchTime ?? existing?.watchTime ?? 0,
      completionRate: analytics.completionRate ?? existing?.completionRate ?? 0,
      interactions: {
        likes: analytics.interactions?.likes ?? existing?.interactions?.likes ?? 0,
        comments: analytics.interactions?.comments ?? existing?.interactions?.comments ?? 0,
        shares: analytics.interactions?.shares ?? existing?.interactions?.shares ?? 0,
        saves: analytics.interactions?.saves ?? existing?.interactions?.saves ?? 0,
      },
    };

    analyticsCache.set(videoId, { data: updated, timestamp: Date.now() });
  }

  /**
   * Batch update video metrics. Falls back to individual updates if the batch RPC fails.
   */
  static async updateVideoMetricsBatch(updates: VideoMetricUpdate[]): Promise<{ success: string[]; failed: string[] }> {
    const normalized = updates.filter((update) => update && update.videoId);
    if (!normalized.length) {
      return { success: [], failed: [] };
    }

    const success: string[] = [];
    const failed: string[] = [];

    for (const update of normalized) {
      try {
        if (typeof update.viewsDelta === "number" && update.viewsDelta > 0) {
          const iterations = Math.max(1, Math.floor(update.viewsDelta));
          for (let index = 0; index < iterations; index += 1) {
            await VideoDataService.updateVideoViews(update.videoId);
          }
        }

        if (typeof update.likesDelta === "number" && update.likesDelta !== 0) {
          const increment = update.likesDelta > 0;
          const likeResult = await VideoDataService.updateVideoLikes(update.videoId, increment);
          if (likeResult === null) {
            throw new Error("Unable to update like state");
          }
        }

        success.push(update.videoId);
      } catch (error) {
        failed.push(update.videoId);
      }
    }

    if (success.length) {
      invalidateCacheByPrefix(VIDEO_CONFESSIONS_PREFIX);
      invalidateCacheByPrefix(TRENDING_VIDEOS_PREFIX);
    }

    return { success, failed };
  }

  /**
   * Track video completion event.
   */
  static trackVideoCompletion(videoId: string, watchTime: number, duration: number): void {
    const completionRate = duration > 0 ? (watchTime / duration) * 100 : 0;

    VideoDataService.trackVideoEvent(videoId, {
      type: 'complete',
      timestamp: Date.now(),
      metadata: { watchTime, duration, completionRate },
    });

    VideoDataService.updateAnalyticsCache(videoId, {
      watchTime,
      completionRate,
    });
  }

  /**
   * Flush all pending analytics events.
   */
  static async flushAllEvents(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const videoId of eventQueue.keys()) {
      promises.push(VideoDataService.processEventQueue(videoId));
    }
    await Promise.all(promises);
  }
}
