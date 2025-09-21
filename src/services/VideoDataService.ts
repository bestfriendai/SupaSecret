import type { PostgrestError } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

import { supabase } from "../lib/supabase";
import type { Confession } from "../types/confession";
import { normalizeConfessions } from "../utils/confessionNormalizer";
import { videoQualitySelector } from "./VideoQualitySelector";
import { videoPerformanceConfig, DevicePerformanceTier } from "../config/videoPerformance";
import { videoCacheManager } from "../utils/videoCacheManager";
import { environmentDetector } from "../utils/environmentDetector";
import { generateUUID } from "../utils/consolidatedUtils";
import { useConsentStore } from "../state/consentStore";
import { offlineQueue } from "../lib/offlineQueue";

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
  sessionId: string;
  watchTime: number;
  completionRate: number;
  engagementScore: number;
  interactions: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  qualityStats?: {
    selectedQuality: "360p" | "720p" | "1080p";
    qualitySwitches: number;
    bufferingTime: number;
  };
  bufferingEvents: number;
  seekCount: number;
  averageViewDuration: number;
  sessionStartTime: number;
  sessionEndTime?: number;
  lastWatchedPosition: number;
}

export interface VideoEvent {
  type:
    | "play"
    | "pause"
    | "seek"
    | "complete"
    | "like"
    | "unlike"
    | "comment"
    | "share"
    | "save"
    | "buffer_start"
    | "buffer_end"
    | "quality_change"
    | "volume_change"
    | "fullscreen_toggle"
    | "session_start"
    | "session_end"
    | "error"
    | "resume"
    | "impression"
    | "comment_sheet_open"
    | "comment_sheet_opened"
    | "comment_submitted"
    | "comment_reply_initiated"
    | "comment_reaction_added"
    | "comment_reaction_removed"
    | "comment_liked"
    | "comment_unliked"
    | "comment_added"
    | "comment_deleted"
    | "comment_edited"
    | "comments_loaded"
    | "comments_searched"
    | "comment_reported";
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface VideoSession {
  sessionId: string;
  videoId: string;
  startTime: number;
  endTime?: number;
  watchTime: number;
  events: VideoEvent[];
  isActive: boolean;
}

export interface VideoEngagementSummary {
  totalWatchTime: number;
  averageWatchTime: number;
  averageCompletionRate: number;
  totalViews: number;
  uniqueViewers: number;
  engagementRate: number;
  topVideos: {
    videoId: string;
    watchTime: number;
    completionRate: number;
    engagementScore: number;
  }[];
  timeDistribution: {
    hour: number;
    views: number;
    watchTime: number;
  }[];
}

type SupabaseOperation<T> = () => Promise<{ data: T | null; error: PostgrestError | null }>;

const CACHE_TTL_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 250;
const VIDEO_CONFESSIONS_PREFIX = "video-confessions";
const TRENDING_VIDEOS_PREFIX = "trending-videos";
const ANALYTICS_CACHE_PREFIX = "video-analytics";
const EVENT_QUEUE_KEY = "@video_analytics_event_queue";
const SESSIONS_KEY = "@video_analytics_sessions";
const BATCH_UPLOAD_INTERVAL = 30000; // 30 seconds
const BATCH_SIZE = 50;
const COMPLETION_THRESHOLD = 0.8; // 80% viewed = completed

const cacheStore = new Map<string, { data: Confession[]; timestamp: number; qualityOptimized?: boolean }>();
const analyticsCache = new Map<string, { data: VideoAnalytics; timestamp: number }>();
const eventQueue = new Map<string, VideoEvent[]>();
const qualitySelectionCache = new Map<
  string,
  {
    quality: string;
    selectedUri: string;
    variants: any[];
    deviceTier: string;
    networkQuality: string;
    timestamp: number;
  }
>();
const deviceTierCache = { tier: null as DevicePerformanceTier | null, timestamp: 0 };
const activeSessions = new Map<string, VideoSession>();
const watchTimeTrackers = new Map<string, { startTime: number; totalTime: number }>();

let batchUploadTimer: ReturnType<typeof setTimeout> | null = null;
let appState: AppStateStatus = "active";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildCacheKey = (prefix: string, params: Record<string, unknown>): string => {
  const serialized = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
  return `${prefix}:${serialized}`;
};

const cloneConfessions = (confessions: Confession[]): Confession[] =>
  confessions.map((confession) => ({ ...confession }));

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

const prepareVideoResults = async (confessions: Confession[], applyQualitySelection = false): Promise<Confession[]> => {
  const results: Confession[] = [];

  // Ensure confessions is a valid array
  if (!Array.isArray(confessions)) {
    console.warn("prepareVideoResults: confessions is not an array:", confessions);
    return results;
  }

  for (const confession of confessions) {
    // Add null/undefined check for confession object
    if (!confession || typeof confession !== "object") {
      console.warn("prepareVideoResults: invalid confession object:", confession);
      continue;
    }

    const sanitizedUri = sanitizeVideoUri(confession.videoUri);
    if (sanitizedUri) {
      let finalConfession = { ...confession, videoUri: sanitizedUri };

      // Apply quality selection if enabled
      if (applyQualitySelection) {
        try {
          const qualityResult = await getOrSelectVideoQuality(sanitizedUri);
          if (qualityResult) {
            // Add quality metadata to confession without overwriting original URI
            finalConfession = {
              ...finalConfession,
              videoUri: sanitizedUri, // Keep original URI
              originalVideoUri: sanitizedUri,
              selectedVideoUri: qualityResult.selectedUri || sanitizedUri,
              videoQuality: qualityResult.quality,
              videoVariants: qualityResult.variants,
              qualityMetadata: {
                deviceTier: qualityResult.deviceTier,
                networkQuality: qualityResult.networkQuality,
                selectedQuality: qualityResult.quality,
              },
            } as any;
          }
        } catch (error) {
          console.warn("prepareVideoResults: quality selection failed for", sanitizedUri, error);
          // Continue with basic confession without quality metadata
        }
      }

      results.push(finalConfession);
    }
  }
  return results;
};

/**
 * Get cached quality selection or select new quality for video
 */
const getOrSelectVideoQuality = async (
  uri: string,
): Promise<{
  quality: string;
  selectedUri: string;
  variants: any[];
  deviceTier: string;
  networkQuality: string;
  timestamp: number;
} | null> => {
  // Check cache first
  const cached = qualitySelectionCache.get(uri);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const deviceTier = await getDeviceTier();
    const networkQuality = "good"; // Simplified for now

    // For now, return basic quality selection
    // In a full implementation, this would analyze available video variants
    const result = {
      quality:
        deviceTier === DevicePerformanceTier.HIGH
          ? "1080p"
          : deviceTier === DevicePerformanceTier.MID
            ? "720p"
            : "360p",
      selectedUri: uri,
      variants: [
        { quality: "360p", uri: uri, width: 640, height: 360 },
        { quality: "720p", uri: uri, width: 1280, height: 720 },
        { quality: "1080p", uri: uri, width: 1920, height: 1080 },
      ],
      deviceTier: deviceTier.toString(),
      networkQuality,
      timestamp: Date.now(),
    };

    // Cache the result
    qualitySelectionCache.set(uri, result);
    return result;
  } catch (error) {
    console.warn("getOrSelectVideoQuality failed:", error);
    return null;
  }
};

/**
 * Get device tier with caching
 */
const getDeviceTier = async (): Promise<DevicePerformanceTier> => {
  if (deviceTierCache.tier && Date.now() - deviceTierCache.timestamp < 600000) {
    // 10 minute cache
    return deviceTierCache.tier;
  }

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

    deviceTierCache.tier = tier;
    deviceTierCache.timestamp = Date.now();
    videoPerformanceConfig.setDeviceTier(tier);

    return tier;
  } catch (error) {
    console.error("Failed to detect device tier:", error);
    return DevicePerformanceTier.MID;
  }
};

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
   * Fetch video confessions with intelligent quality selection and device-aware pagination.
   */
  static async fetchVideoConfessions(limit: number = 20, enableQualitySelection = true): Promise<Confession[]> {
    // Adjust limit based on device tier
    const deviceTier = await getDeviceTier();
    const tierMultipliers = {
      [DevicePerformanceTier.HIGH]: 1.0,
      [DevicePerformanceTier.MID]: 0.75,
      [DevicePerformanceTier.LOW]: 0.5,
    };
    const multiplier = tierMultipliers[deviceTier] ?? 0.75; // Default to MID tier multiplier
    const adjustedLimit = Math.ceil(limit * multiplier);
    const safeLimit = Math.max(1, Math.min(Math.floor(adjustedLimit), 200));

    const cacheKey = buildCacheKey(VIDEO_CONFESSIONS_PREFIX, { limit: safeLimit, tier: deviceTier });
    const cached = getCachedList(cacheKey);
    if (cached) {
      // Trigger background quality optimization for cached results
      if (enableQualitySelection && !cacheStore.get(cacheKey)?.qualityOptimized) {
        VideoDataService.optimizeQualityInBackground(cached);
      }
      return cached;
    }

    try {
      const confessions = await executeWithRetry<any[]>(
        "fetchVideoConfessions",
        async () =>
          await supabase
            .from("confessions")
            .select(
              "id,type,content,video_uri,video_url,video_quality,transcription,created_at,is_anonymous,likes,views",
            )
            .eq("type", "video")
            .or("video_uri.not.is.null,video_url.not.is.null")
            .order("created_at", { ascending: false })
            .limit(safeLimit),
      );

      const normalized = await normalizeConfessions(confessions ?? []);
      const playable = await prepareVideoResults(normalized, enableQualitySelection);

      if (playable.length) {
        setCachedList(cacheKey, playable);

        // Mark as quality optimized if quality selection was applied
        if (enableQualitySelection) {
          const entry = cacheStore.get(cacheKey);
          if (entry) {
            entry.qualityOptimized = true;
          }
        }

        // Trigger intelligent preloading based on device capabilities
        VideoDataService.intelligentPreload(playable);
      }

      return playable;
    } catch (error) {
      console.error("VideoDataService.fetchVideoConfessions failed", error);
      const fallback = handleFetchFailure("VideoDataService.fetchVideoConfessions", cacheKey);
      return Array.isArray(fallback) ? fallback : [];
    }
  }

  /**
   * Fetch trending videos with quality selection and device optimization.
   */
  static async fetchTrendingVideos(
    hoursBack: number = 24,
    limit: number = 10,
    enableQualitySelection = true,
  ): Promise<Confession[]> {
    const deviceTier = await getDeviceTier();
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
    const safeHours = Math.max(1, Math.min(Math.floor(hoursBack), 168));
    const cacheKey = buildCacheKey(TRENDING_VIDEOS_PREFIX, {
      limit: safeLimit,
      hoursBack: safeHours,
      tier: deviceTier,
    });
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
      const playable = await prepareVideoResults(normalized, enableQualitySelection);
      const sliced = playable.slice(0, safeLimit);

      if (sliced.length) {
        setCachedList(cacheKey, sliced);

        // Preload trending videos more aggressively for high-tier devices
        if (deviceTier === DevicePerformanceTier.HIGH) {
          VideoDataService.aggressivePreload(sliced);
        } else {
          VideoDataService.intelligentPreload(sliced);
        }
      }

      return sliced;
    } catch (error) {
      console.error("VideoDataService.fetchTrendingVideos failed", error);
      const fallback = handleFetchFailure("VideoDataService.fetchTrendingVideos", cacheKey);
      return Array.isArray(fallback) ? fallback : [];
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
      const results = await prepareVideoResults(normalized, true);
      return results.slice(0, safeLimit);
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
        type: isLiked ? "like" : "unlike",
        timestamp: Date.now(),
      });

      // Fetch the current like count
      const { data: confession } = await supabase.from("confessions").select("likes").eq("id", videoId).single();

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
      await executeWithRetry(
        "updateVideoViews",
        async () =>
          await (supabase as any).rpc("increment_video_views", {
            confession_uuid: videoId,
          }),
      );

      invalidateCacheByPrefix(VIDEO_CONFESSIONS_PREFIX);
      invalidateCacheByPrefix(TRENDING_VIDEOS_PREFIX);

      // Track the view event
      VideoDataService.trackVideoEvent(videoId, {
        type: "play",
        timestamp: Date.now(),
      });

      // Try to fetch updated view count
      const { data: confession } = await supabase.from("confessions").select("views").eq("id", videoId).single();

      return confession?.views || 0;
    } catch (error) {
      if (__DEV__) {
        console.warn("VideoDataService.updateVideoViews failed", error);
      }
      return null;
    }
  }

  /**
   * Get comment count for a video confession.
   */
  static async getCommentCount(videoId: string): Promise<number> {
    if (!videoId) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from("replies")
        .select("*", { count: "exact", head: true })
        .eq("confession_id", videoId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      if (__DEV__) {
        console.warn("VideoDataService.getCommentCount failed", error);
      }
      return 0;
    }
  }

  /**
   * Track video interaction events for analytics with consent checking.
   *
   * Supports both `trackVideoEvent(videoId, event)` and
   * `trackVideoEvent(eventType, metadataWithConfessionId)` call patterns for backwards compatibility.
   */
  static async trackVideoEvent(
    arg1: string,
    arg2: Omit<VideoEvent, "sessionId"> | Record<string, unknown>,
  ): Promise<void> {
    if (!arg1 || !arg2) return;

    // Handle legacy signature where the event type is passed first and metadata second
    if (!("type" in arg2)) {
      const metadata = {
        ...(arg2 as Record<string, unknown> & {
          confession_id?: unknown;
          videoId?: unknown;
          timestamp?: unknown;
        }),
      };

      const possibleId = metadata.confession_id ?? metadata.videoId;
      const videoId = typeof possibleId === "string" && possibleId.length > 0 ? possibleId : undefined;
      const timestampValue =
        typeof metadata.timestamp === "number"
          ? (metadata.timestamp as number)
          : Date.now();

      if (!videoId) {
        if (__DEV__) {
          console.warn(
            `[VideoDataService] trackVideoEvent missing videoId in metadata for event '${arg1}'. Event ignored.`,
          );
        }
        return;
      }

      delete metadata.timestamp;

      const event: Omit<VideoEvent, "sessionId"> = {
        type: arg1 as VideoEvent["type"],
        timestamp: timestampValue,
        metadata,
      };

      await VideoDataService.trackVideoEventInternal(videoId, event);
      return;
    }

    await VideoDataService.trackVideoEventInternal(arg1, arg2 as Omit<VideoEvent, "sessionId">);
  }

  private static async trackVideoEventInternal(videoId: string, event: Omit<VideoEvent, "sessionId">): Promise<void> {
    if (!videoId || !event) return;

    const consentState = useConsentStore.getState();
    if (!consentState.preferences?.analytics) {
      return;
    }

    const sessionId = VideoDataService.getOrCreateSession(videoId);
    const fullEvent: VideoEvent = {
      ...event,
      sessionId,
      metadata: { ...(event.metadata || {}), videoId },
    };

    const events = eventQueue.get(videoId) || [];
    events.push(fullEvent);
    eventQueue.set(videoId, events);

    const session = activeSessions.get(sessionId);
    if (session) {
      session.events.push(fullEvent);
      await VideoDataService.persistSessionToStorage(session);
    }

    await VideoDataService.persistEventToStorage(videoId, fullEvent);

    switch (event.type) {
      case "play":
      case "resume":
        VideoDataService.startWatchTimeTracking(videoId);
        break;
      case "pause":
      case "complete":
      case "session_end": {
        const delta = VideoDataService.stopWatchTimeTracking(videoId);
        if (session) {
          session.watchTime += delta;
          await VideoDataService.persistSessionToStorage(session);
        }
        break;
      }
      case "buffer_start":
        VideoDataService.trackBufferingStart(videoId);
        break;
      case "buffer_end":
        VideoDataService.trackBufferingEnd(videoId);
        break;
    }

    if (events.length >= 10) {
      await VideoDataService.processEventQueue(videoId);
    }

    if (!batchUploadTimer) {
      batchUploadTimer = setTimeout(() => {
        VideoDataService.batchUploadEvents();
      }, BATCH_UPLOAD_INTERVAL);
    }
  }

  /**
   * Process queued events for a video with offline support.
   */
  static async processEventQueue(videoId: string): Promise<void> {
    const events = eventQueue.get(videoId);
    if (!events || events.length === 0) return;

    eventQueue.delete(videoId);

    try {
      // Check consent before processing
      const consentStore = useConsentStore.getState();
      if (!consentStore.preferences?.analytics) {
        return;
      }

      // Calculate aggregated metrics
      const session = activeSessions.get(events[0]?.sessionId);
      if (session) {
        const metrics = VideoDataService.calculateSessionMetrics(session);

        // Update analytics cache
        VideoDataService.updateAnalyticsCache(videoId, {
          sessionId: session.sessionId,
          watchTime: metrics.watchTime,
          completionRate: metrics.completionRate,
          engagementScore: metrics.engagementScore,
          bufferingEvents: metrics.bufferingEvents,
          seekCount: metrics.seekCount,
          averageViewDuration: metrics.averageViewDuration,
          sessionStartTime: session.startTime,
          sessionEndTime: session.endTime,
          lastWatchedPosition: metrics.lastPosition,
        });
      }

      // Queue for upload via offline queue
      await offlineQueue.enqueue("video.analytics.batch", {
        videoId,
        events,
        sessionId: events[0]?.sessionId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to process video events", error);
      // Re-add events to queue for retry
      const existingEvents = eventQueue.get(videoId) || [];
      eventQueue.set(videoId, [...events, ...existingEvents]);
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
   * Update analytics cache with comprehensive metrics.
   */
  static updateAnalyticsCache(videoId: string, analytics: Partial<VideoAnalytics>): void {
    const existing = VideoDataService.getCachedAnalytics(videoId);
    const updated: VideoAnalytics = {
      videoId,
      sessionId: analytics.sessionId ?? existing?.sessionId ?? generateUUID(),
      watchTime: analytics.watchTime ?? existing?.watchTime ?? 0,
      completionRate: analytics.completionRate ?? existing?.completionRate ?? 0,
      engagementScore: analytics.engagementScore ?? existing?.engagementScore ?? 0,
      interactions: {
        likes: analytics.interactions?.likes ?? existing?.interactions?.likes ?? 0,
        comments: analytics.interactions?.comments ?? existing?.interactions?.comments ?? 0,
        shares: analytics.interactions?.shares ?? existing?.interactions?.shares ?? 0,
        saves: analytics.interactions?.saves ?? existing?.interactions?.saves ?? 0,
      },
      qualityStats: analytics.qualityStats ?? existing?.qualityStats,
      bufferingEvents: analytics.bufferingEvents ?? existing?.bufferingEvents ?? 0,
      seekCount: analytics.seekCount ?? existing?.seekCount ?? 0,
      averageViewDuration: analytics.averageViewDuration ?? existing?.averageViewDuration ?? 0,
      sessionStartTime: analytics.sessionStartTime ?? existing?.sessionStartTime ?? Date.now(),
      sessionEndTime: analytics.sessionEndTime ?? existing?.sessionEndTime,
      lastWatchedPosition: analytics.lastWatchedPosition ?? existing?.lastWatchedPosition ?? 0,
    };

    analyticsCache.set(videoId, { data: updated, timestamp: Date.now() });

    // Persist to AsyncStorage for offline support
    VideoDataService.persistAnalyticsToStorage(videoId, updated);
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
   * Track video completion event with configurable threshold.
   */
  static async trackVideoCompletion(videoId: string, watchTime: number, duration: number): Promise<void> {
    const completionRate = duration > 0 ? watchTime / duration : 0;
    const isCompleted = completionRate >= COMPLETION_THRESHOLD;

    await VideoDataService.trackVideoEvent(videoId, {
      type: isCompleted ? "complete" : "pause",
      timestamp: Date.now(),
      metadata: {
        watchTime,
        duration,
        completionRate: completionRate * 100,
        threshold: COMPLETION_THRESHOLD * 100,
        isCompleted,
      },
    });

    // Calculate engagement score
    const engagementScore = VideoDataService.calculateEngagementScore({
      completionRate,
      watchTime,
      interactions: VideoDataService.getCachedAnalytics(videoId)?.interactions,
    });

    VideoDataService.updateAnalyticsCache(videoId, {
      watchTime,
      completionRate: completionRate * 100,
      engagementScore,
    });

    // End session if completed
    if (isCompleted) {
      const sessionId = VideoDataService.getCurrentSessionId(videoId);
      if (sessionId) {
        VideoDataService.endSession(sessionId);
      }
    }
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

  /**
   * Intelligent preloading based on device capabilities and network conditions.
   */
  static async intelligentPreload(confessions: Confession[]): Promise<void> {
    try {
      const preloadProfile = videoPerformanceConfig.getPreloadProfile();
      const videoUris = confessions
        .slice(0, preloadProfile.preloadWindowSize)
        .map((c) => (c as any).videoUri)
        .filter(Boolean);

      if (videoUris.length > 0) {
        // Use device-aware preloading from cache manager
        await videoCacheManager.preloadVideos(videoUris, "normal");
      }
    } catch (error) {
      console.error("Intelligent preload failed:", error);
    }
  }

  /**
   * Aggressive preloading for high-tier devices.
   */
  static async aggressivePreload(confessions: Confession[]): Promise<void> {
    if (!videoPerformanceConfig.shouldEnableFeature("aggressivePreloading")) {
      return VideoDataService.intelligentPreload(confessions);
    }

    try {
      const videoUris = confessions
        .slice(0, 15) // Preload more videos for high-tier devices
        .map((c) => (c as any).videoUri)
        .filter(Boolean);

      if (videoUris.length > 0) {
        await videoCacheManager.preloadVideos(videoUris, "high");
      }
    } catch (error) {
      console.error("Aggressive preload failed:", error);
    }
  }

  /**
   * Optimize quality selection in background for cached videos.
   */
  static async optimizeQualityInBackground(confessions: Confession[]): Promise<void> {
    try {
      const { videoBackgroundQueue, JobType, JobPriority } = await import("./VideoBackgroundQueue");

      const videoUris = confessions
        .slice(0, 5)
        .map((c) => (c as any).videoUri)
        .filter(Boolean);

      // Enqueue quality optimization job
      await videoBackgroundQueue.enqueueJob(
        JobType.QUALITY_VARIANT_GENERATION,
        {
          videoUris,
          batchOptimization: true,
        },
        JobPriority.LOW,
        {
          onComplete: async (result) => {
            if (result.success) {
              // Batch select qualities
              await videoQualitySelector.selectBatchVideoQualities(videoUris);
            }
          },
        },
      );
    } catch (error) {
      console.error("Failed to enqueue background quality optimization:", error);
    }
  }

  /**
   * Check if quality upgrade is available for current network conditions.
   */
  static async checkQualityUpgrade(videoUri: string): Promise<boolean> {
    try {
      return await videoQualitySelector.canUpgradeQuality(videoUri);
    } catch (error) {
      console.error("Quality upgrade check failed:", error);
      return false;
    }
  }

  /**
   * Get performance-optimized batch size for operations.
   */
  static async getOptimizedBatchSize(): Promise<number> {
    const deviceTier = await getDeviceTier();
    const batchSizes = {
      [DevicePerformanceTier.HIGH]: 20,
      [DevicePerformanceTier.MID]: 10,
      [DevicePerformanceTier.LOW]: 5,
    };
    return batchSizes[deviceTier];
  }

  /**
   * Generate or retrieve session ID for a video.
   */
  static getOrCreateSession(videoId: string): string {
    // Check if active session exists
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.videoId === videoId && session.isActive) {
        return sessionId;
      }
    }

    // Create new session
    const sessionId = generateUUID();
    const session: VideoSession = {
      sessionId,
      videoId,
      startTime: Date.now(),
      watchTime: 0,
      events: [],
      isActive: true,
    };
    activeSessions.set(sessionId, session);

    // Persist session
    VideoDataService.persistSessionToStorage(session);

    return sessionId;
  }

  /**
   * Get current session ID for a video.
   */
  static getCurrentSessionId(videoId: string): string | null {
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.videoId === videoId && session.isActive) {
        return sessionId;
      }
    }
    return null;
  }

  /**
   * End a video session.
   */
  static endSession(sessionId: string): void {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endTime = Date.now();
      VideoDataService.persistSessionToStorage(session);
    }
  }

  /**
   * Start watch time tracking.
   */
  static startWatchTimeTracking(videoId: string): void {
    const tracker = watchTimeTrackers.get(videoId) || { startTime: Date.now(), totalTime: 0 };
    tracker.startTime = Date.now();
    watchTimeTrackers.set(videoId, tracker);
  }

  /**
   * Stop watch time tracking.
   */
  static stopWatchTimeTracking(videoId: string): number {
    const tracker = watchTimeTrackers.get(videoId);
    if (tracker && tracker.startTime > 0) {
      const elapsed = (Date.now() - tracker.startTime) / 1000; // Convert to seconds
      tracker.totalTime += elapsed;
      tracker.startTime = 0;
      watchTimeTrackers.set(videoId, tracker);
      return tracker.totalTime;
    }
    return 0;
  }

  /**
   * Track buffering start.
   */
  private static bufferingStartTimes = new Map<string, number>();

  static trackBufferingStart(videoId: string): void {
    VideoDataService.bufferingStartTimes.set(videoId, Date.now());
  }

  /**
   * Track buffering end.
   */
  static trackBufferingEnd(videoId: string): void {
    const startTime = VideoDataService.bufferingStartTimes.get(videoId);
    if (startTime) {
      const bufferTime = Date.now() - startTime;
      VideoDataService.bufferingStartTimes.delete(videoId);

      const analytics = VideoDataService.getCachedAnalytics(videoId);
      if (analytics) {
        const currentBufferTime = analytics.qualityStats?.bufferingTime || 0;
        VideoDataService.updateAnalyticsCache(videoId, {
          qualityStats: {
            ...analytics.qualityStats,
            bufferingTime: currentBufferTime + bufferTime,
          } as any,
          bufferingEvents: (analytics.bufferingEvents || 0) + 1,
        });
      }
    }
  }

  /**
   * Calculate engagement score based on multiple factors.
   */
  static calculateEngagementScore(metrics: {
    completionRate: number;
    watchTime: number;
    interactions?: VideoAnalytics["interactions"];
  }): number {
    const completionWeight = 0.4;
    const watchTimeWeight = 0.3;
    const interactionWeight = 0.3;

    const completionScore = Math.min(metrics.completionRate, 1) * 100;
    const watchTimeScore = Math.min(metrics.watchTime / 300, 1) * 100; // Normalize to 5 minutes
    const interactionScore = Math.min(
      ((metrics.interactions?.likes || 0) * 10 +
        (metrics.interactions?.comments || 0) * 20 +
        (metrics.interactions?.shares || 0) * 30 +
        (metrics.interactions?.saves || 0) * 15) /
        100,
      100,
    );

    return Math.round(
      completionScore * completionWeight + watchTimeScore * watchTimeWeight + interactionScore * interactionWeight,
    );
  }

  /**
   * Calculate session metrics.
   */
  static calculateSessionMetrics(session: VideoSession): {
    watchTime: number;
    completionRate: number;
    engagementScore: number;
    bufferingEvents: number;
    seekCount: number;
    averageViewDuration: number;
    lastPosition: number;
  } {
    const seekEvents = session.events.filter((e) => e.type === "seek").length;
    const bufferEvents = session.events.filter((e) => e.type === "buffer_start").length;
    const playEvents = session.events.filter((e) => e.type === "play" || e.type === "resume");

    const watchTime = session.watchTime || 0;
    const duration = session.events.find((e) => e.metadata?.duration)?.metadata?.duration || 0;
    const completionRate = duration > 0 ? (watchTime / duration) * 100 : 0;

    const lastPositionEvent = [...session.events].reverse().find((e) => e.metadata?.position !== undefined);
    const lastPosition = lastPositionEvent?.metadata?.position || 0;

    const engagementScore = VideoDataService.calculateEngagementScore({
      completionRate: completionRate / 100,
      watchTime,
    });

    return {
      watchTime,
      completionRate,
      engagementScore,
      bufferingEvents: bufferEvents,
      seekCount: seekEvents,
      averageViewDuration: playEvents.length > 0 ? watchTime / playEvents.length : 0,
      lastPosition,
    };
  }

  /**
   * Persist event to AsyncStorage.
   */
  static async persistEventToStorage(videoId: string, event: VideoEvent): Promise<void> {
    try {
      const key = `${EVENT_QUEUE_KEY}_${videoId}`;
      const stored = await AsyncStorage.getItem(key);
      const events = stored ? JSON.parse(stored) : [];
      events.push(event);

      // Limit stored events to prevent storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      await AsyncStorage.setItem(key, JSON.stringify(events));
    } catch (error) {
      console.error("Failed to persist event to storage:", error);
    }
  }

  /**
   * Persist session to AsyncStorage.
   */
  static async persistSessionToStorage(session: VideoSession): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      const sessions = stored ? JSON.parse(stored) : {};
      sessions[session.sessionId] = session;

      // Clean up old sessions (keep last 50)
      const sessionKeys = Object.keys(sessions);
      if (sessionKeys.length > 50) {
        const sortedKeys = sessionKeys.sort((a, b) => (sessions[b].startTime || 0) - (sessions[a].startTime || 0));
        sortedKeys.slice(50).forEach((key) => delete sessions[key]);
      }

      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to persist session to storage:", error);
    }
  }

  /**
   * Persist analytics to AsyncStorage.
   */
  static async persistAnalyticsToStorage(videoId: string, analytics: VideoAnalytics): Promise<void> {
    try {
      const key = `${ANALYTICS_CACHE_PREFIX}_${videoId}`;
      await AsyncStorage.setItem(key, JSON.stringify(analytics));
    } catch (error) {
      console.error("Failed to persist analytics to storage:", error);
    }
  }

  /**
   * Load persisted events from storage.
   */
  static async loadPersistedEvents(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter((k) => k.startsWith(EVENT_QUEUE_KEY));

      for (const key of eventKeys) {
        const videoId = key.replace(`${EVENT_QUEUE_KEY}_`, "");
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const events = JSON.parse(stored);
          eventQueue.set(videoId, events);
        }
      }
    } catch (error) {
      console.error("Failed to load persisted events:", error);
    }
  }

  /**
   * Clear persisted events for specific video IDs.
   */
  static async clearPersistedEvents(videoIds: string[]): Promise<void> {
    try {
      const keys = videoIds.map((id) => `${EVENT_QUEUE_KEY}_${id}`);
      await AsyncStorage.multiRemove(keys);

      // Also clear from in-memory queue
      videoIds.forEach((id) => eventQueue.delete(id));
    } catch (error) {
      console.error("Failed to clear persisted events:", error);
    }
  }

  /**
   * Batch upload analytics events.
   */
  static async batchUploadEvents(): Promise<void> {
    batchUploadTimer = null;

    const consentStore = useConsentStore.getState();
    if (!consentStore.preferences?.analytics) {
      return;
    }

    const allEvents: { videoId: string; events: VideoEvent[] }[] = [];

    for (const [videoId, events] of eventQueue.entries()) {
      if (events.length > 0) {
        allEvents.push({ videoId, events: [...events] });
        eventQueue.delete(videoId);
      }
    }

    if (allEvents.length === 0) return;

    try {
      // Batch events by session
      const sessionBatches = new Map<string, VideoEvent[]>();
      allEvents.forEach(({ events }) => {
        events.forEach((event) => {
          const batch = sessionBatches.get(event.sessionId) || [];
          batch.push(event);
          sessionBatches.set(event.sessionId, batch);
        });
      });

      // Upload each session batch
      for (const [sessionId, events] of sessionBatches.entries()) {
        await offlineQueue.enqueue("video.analytics.batch", {
          sessionId,
          events: events.slice(0, BATCH_SIZE),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to batch upload events:", error);
      // Re-add events to queue
      allEvents.forEach(({ videoId, events }) => {
        const existing = eventQueue.get(videoId) || [];
        eventQueue.set(videoId, [...existing, ...events]);
      });
    }
  }

  /**
   * Get video engagement summary for dashboard.
   */
  static async getVideoEngagementSummary(
    period: "day" | "week" | "month" = "week",
  ): Promise<VideoEngagementSummary | null> {
    try {
      // Simplified implementation - get basic video stats
      const hoursBack = period === "day" ? 24 : period === "week" ? 168 : 720;

      const { data: videos, error } = await supabase
        .from("confessions")
        .select("id, likes, views, created_at")
        .eq("type", "video")
        .gte("created_at", new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const totalVideos = videos?.length || 0;
      const totalViews = videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;
      const totalLikes = videos?.reduce((sum, v) => sum + (v.likes || 0), 0) || 0;

      return {
        totalVideos,
        totalViews,
        totalLikes,
        averageEngagement: totalVideos > 0 ? (totalLikes / totalViews) * 100 : 0,
        totalWatchTime: 0, // Would need analytics tracking
        averageWatchTime: 0, // Would need analytics tracking
        averageCompletionRate: 0, // Would need analytics tracking
        uniqueViewers: totalViews, // Simplified
        topPerformingVideos: [], // Would need more complex query
        engagementTrends: [], // Would need time-series data
        engagementRate: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0,
        topVideos: [], // Would need more complex query
        timeDistribution: [], // Would need time-series data
        period,
      } as VideoEngagementSummary;
    } catch (error) {
      console.error("Failed to fetch video engagement summary:", error);
      return null;
    }
  }

  /**
   * Get watch time analytics.
   */
  static async getWatchTimeAnalytics(videoId?: string): Promise<{
    totalWatchTime: number;
    averageWatchTime: number;
    sessions: number;
  } | null> {
    try {
      // Simplified implementation - would need proper analytics tracking
      if (!videoId) return null;

      const session = activeSessions.get(videoId);
      const watchTracker = watchTimeTrackers.get(videoId);

      return {
        totalWatchTime: watchTracker?.totalTime || 0,
        averageWatchTime: watchTracker?.totalTime || 0,
        sessions: session ? 1 : 0,
      };
    } catch (error) {
      console.error("Failed to fetch watch time analytics:", error);
      return null;
    }
  }

  /**
   * Get completion rate statistics.
   */
  static async getCompletionRateStats(): Promise<{
    averageCompletionRate: number;
    completedVideos: number;
    totalVideos: number;
  } | null> {
    try {
      // Simplified implementation - would need proper analytics tracking
      const { data: videos, error } = await supabase.from("confessions").select("id, views").eq("type", "video");

      if (error) throw error;

      const totalVideos = videos?.length || 0;
      // Simplified completion rate calculation
      const completedVideos = Math.floor(totalVideos * 0.7); // Assume 70% completion rate

      return {
        averageCompletionRate: totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0,
        completedVideos,
        totalVideos,
      };
    } catch (error) {
      console.error("Failed to fetch completion rate stats:", error);
      return null;
    }
  }

  /**
   * Initialize app state monitoring.
   */
  static initializeAppStateMonitoring(): void {
    AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState === "active" && nextAppState.match(/inactive|background/)) {
        // App going to background - pause all tracking
        for (const videoId of watchTimeTrackers.keys()) {
          VideoDataService.stopWatchTimeTracking(videoId);
        }
        // Flush events
        VideoDataService.batchUploadEvents();
      } else if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App coming to foreground - load persisted events
        VideoDataService.loadPersistedEvents();
      }
      appState = nextAppState;
    });
  }

  /**
   * Clean up resources on unmount.
   */
  static cleanup(): void {
    // Clear quality selection cache
    qualitySelectionCache.clear();

    // Stop batch upload timer
    if (batchUploadTimer) {
      clearTimeout(batchUploadTimer);
      batchUploadTimer = null;
    }

    // End all active sessions
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.isActive) {
        VideoDataService.endSession(sessionId);
      }
    }

    // Flush any pending events
    VideoDataService.flushAllEvents();
  }
}

// Initialize app state monitoring on module load
VideoDataService.initializeAppStateMonitoring();
// Load persisted events on startup
VideoDataService.loadPersistedEvents();
