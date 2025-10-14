import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Confession } from "../types/confession";
import { HashtagData, TrendingSecret } from "../utils/trending";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { normalizeConfessions, normalizeConfession } from "../utils/confessionNormalizer";

// Memoized hashtag extraction with proper key generation
const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
const hashtagMemo = new Map<string, string[]>();

// Simple hash function for generating consistent keys
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

const extractHashtags = (text: string): string[] => {
  if (!text) return [];

  // Use full text for short strings, hash for longer ones
  const key = text.length <= 200 ? text : simpleHash(text);

  const cached = hashtagMemo.get(key);
  if (cached) return cached;

  const matches = text.match(hashtagRegex);
  const lower = matches ? matches.map((t) => t.toLowerCase()) : [];

  hashtagMemo.set(key, lower);
  return lower;
};

async function rpcWithRetry<T>(fn: () => Promise<{ data: T | null; error: any }>, attempts = 2) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await fn();
    if (!error) return { data, error };
    lastErr = error;
  }
  return { data: null as T | null, error: lastErr };
}

interface LoadTrendingOptions {
  force?: boolean;
  skipRealtimeInit?: boolean;
}

interface TrendingState {
  // Data
  trendingHashtags: HashtagData[];
  trendingSecrets: TrendingSecret[];
  searchResults: Confession[];

  // UI State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  realtimeInitialized: boolean;
  lastHashtagParams: { hours: number; limit: number } | null;
  lastSecretParams: { hours: number; limit: number } | null;

  // Cache settings
  cacheExpiry: number; // 5 minutes in milliseconds

  // Actions
  loadTrendingHashtags: (hours?: number, limit?: number, options?: LoadTrendingOptions) => Promise<void>;
  loadTrendingSecrets: (hours?: number, limit?: number, options?: LoadTrendingOptions) => Promise<void>;
  searchByHashtag: (hashtag: string) => Promise<void>;
  refreshAll: (hours?: number) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}

let trendingRealtimeChannel: RealtimeChannel | null = null;
let trendingRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const initializeTrendingRealtime = (_set: (partial: Partial<TrendingState>) => void, get: () => TrendingState) => {
  if (trendingRealtimeChannel) return;

  trendingRealtimeChannel = supabase
    .channel("trending-confessions")
    .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, () => {
      if (trendingRefreshTimer) return;

      trendingRefreshTimer = setTimeout(async () => {
        trendingRefreshTimer = null;
        const state = get();
        const { lastHashtagParams, lastSecretParams } = state;

        try {
          if (lastHashtagParams) {
            await state.loadTrendingHashtags(lastHashtagParams.hours, lastHashtagParams.limit, {
              force: true,
              skipRealtimeInit: true,
            });
          }

          if (lastSecretParams) {
            await state.loadTrendingSecrets(lastSecretParams.hours, lastSecretParams.limit, {
              force: true,
              skipRealtimeInit: true,
            });
          }
        } catch (error) {
          if (__DEV__) {
            console.warn("Trending realtime refresh failed:", error);
          }
        }
      }, 1200);
    })
    .subscribe((status) => {
      if (__DEV__) {
        console.log("Trending realtime channel status:", status);
      }
    });
};

export const useTrendingStore = create<TrendingState>()(
  persist(
    (set, get) => ({
      // Initial state
      trendingHashtags: [],
      trendingSecrets: [],
      searchResults: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastUpdated: null,
      realtimeInitialized: false,
      lastHashtagParams: null,
      lastSecretParams: null,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes

      loadTrendingHashtags: async (hours = 24, limit = 10, options: LoadTrendingOptions = {}) => {
        const state = get();
        const t0 = Date.now();

        if (!options.skipRealtimeInit && !state.realtimeInitialized) {
          initializeTrendingRealtime((partial) => set(partial), get);
          set({ realtimeInitialized: true });
        }

        if (
          !options.force &&
          state.lastHashtagParams &&
          state.lastHashtagParams.hours === hours &&
          state.lastHashtagParams.limit === limit &&
          state.lastUpdated &&
          Date.now() - state.lastUpdated < state.cacheExpiry &&
          state.trendingHashtags.length > 0
        ) {
          return;
        }

        set({
          error: null,
          ...(options.skipRealtimeInit ? {} : { isLoading: true }),
        });

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await rpcWithRetry(
            async () =>
              await supabase.rpc("get_trending_hashtags", {
                hours_back: hours,
                limit_count: limit,
              }),
          );

          if (!functionError && functionData) {
            const hashtags: HashtagData[] = (functionData as any[]).map((item: any) => ({
              hashtag: item.hashtag,
              count: parseInt(item.count),
              percentage: parseFloat(item.percentage),
            }));

            set({
              trendingHashtags: hashtags,
              isLoading: false,
              lastUpdated: Date.now(),
              lastHashtagParams: { hours, limit },
            });
            return;
          }

          // Fallback to client-side calculation
          if (__DEV__) {
            console.log("Using client-side hashtag calculation");
          }
          const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const { data: confessions, error } = await supabase
            .from("confessions")
            .select("content, transcription")
            .gte("created_at", cutoffTime)
            .order("created_at", { ascending: false });

          if (error) throw error;

          // Client-side hashtag extraction and counting
          const hashtagCounts: Record<string, number> = {};

          confessions?.forEach((confession) => {
            const contentHashtags = extractHashtags(confession.content || "");
            const transcriptionHashtags = confession.transcription ? extractHashtags(confession.transcription) : [];
            [...contentHashtags, ...transcriptionHashtags].forEach((hashtag) => {
              hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
            });
          });

          const totalHashtags = Object.values(hashtagCounts).reduce((sum, count) => sum + count, 0);
          const hashtags: HashtagData[] = Object.entries(hashtagCounts)
            .map(([hashtag, count]) => ({
              hashtag,
              count,
              percentage: totalHashtags > 0 ? (count / totalHashtags) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

          set({
            trendingHashtags: hashtags,
            isLoading: false,
            lastUpdated: Date.now(),
            lastHashtagParams: { hours, limit },
          });
          trackStoreOperation("trendingStore", "loadTrendingHashtags", Date.now() - t0);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load trending hashtags",
            isLoading: false,
          });
        }
      },

      loadTrendingSecrets: async (hours = 24, limit = 10, options: LoadTrendingOptions = {}) => {
        const state = get();
        const t0 = Date.now();

        if (!options.skipRealtimeInit && !state.realtimeInitialized) {
          initializeTrendingRealtime((partial) => set(partial), get);
          set({ realtimeInitialized: true });
        }

        if (
          !options.force &&
          state.lastSecretParams &&
          state.lastSecretParams.hours === hours &&
          state.lastSecretParams.limit === limit &&
          state.lastUpdated &&
          Date.now() - state.lastUpdated < state.cacheExpiry &&
          state.trendingSecrets.length > 0
        ) {
          return;
        }

        set({
          error: null,
          ...(options.skipRealtimeInit ? {} : { isLoading: true }),
        });

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await rpcWithRetry(
            async () =>
              await supabase.rpc("get_trending_secrets", {
                hours_back: hours,
                limit_count: limit,
              }),
          );

          if (!functionError && functionData) {
            // Process confessions using normalizer for consistent field mapping
            let secrets: TrendingSecret[] = [];
            try {
              const normalizedConfessions = await normalizeConfessions(functionData as any[]);
              secrets = normalizedConfessions.map((confession, index) => ({
                confession: {
                  ...confession,
                  isLiked: false,
                },
                engagementScore: parseFloat((functionData as any[])[index].engagement_score),
              }));
            } catch (normalizationError) {
              if (__DEV__) {
                console.error("Failed to normalize trending secrets from RPC:", normalizationError);
              }
              // Fallback to basic processing
              secrets = (functionData as any[]).map((item: any) => ({
                confession: {
                  id: item.id,
                  type: item.type as "text" | "video",
                  content: item.content,
                  videoUri: item.video_uri || item.video_url || undefined,
                  transcription: item.transcription,
                  timestamp: new Date(item.created_at).getTime(),
                  isAnonymous: item.is_anonymous,
                  likes: item.likes,
                  views: item.views || 0,
                  isLiked: false,
                },
                engagementScore: parseFloat(item.engagement_score),
              }));
            }

            set({
              trendingSecrets: secrets,
              isLoading: false,
              lastUpdated: Date.now(),
              lastSecretParams: { hours, limit },
            });
            return;
          }

          // Fallback to client-side calculation
          if (__DEV__) {
            console.log("Using client-side trending calculation");
          }
          const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

          const { data: confessions, error } = await supabase
            .from("confessions")
            .select("*")
            .gte("created_at", cutoffTime)
            .order("likes", { ascending: false })
            .limit(limit * 2); // Get more to account for engagement scoring

          if (error) throw error;

          // Client-side engagement calculation
          const calculateEngagementScore = (likes: number, createdAt: string): number => {
            const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
            const decayFactor = Math.exp(-hoursOld / 24); // Half-life of 24 hours
            return likes * decayFactor;
          };

          // Process confessions using normalizer for consistent field mapping
          let secrets: TrendingSecret[] = [];
          try {
            const normalizedConfessions = await normalizeConfessions(confessions || []);
            secrets = normalizedConfessions
              .map((confession, index) => {
                const originalRow = confessions?.[index];
                return {
                  confession: {
                    ...confession,
                    isLiked: false,
                  },
                  engagementScore: calculateEngagementScore(
                    originalRow?.likes || 0,
                    originalRow?.created_at || new Date().toISOString(),
                  ),
                };
              })
              .sort((a, b) => b.engagementScore - a.engagementScore)
              .slice(0, limit);
          } catch (normalizationError) {
            if (__DEV__) {
              console.error("Failed to normalize trending secrets fallback:", normalizationError);
            }
            // Fallback to basic processing
            secrets = (confessions || [])
              .map((confession) => ({
                confession: {
                  id: confession.id,
                  type: confession.type as "text" | "video",
                  content: confession.content,
                  videoUri: confession.video_uri || confession.video_url || undefined,
                  transcription: confession.transcription || undefined,
                  timestamp: new Date(confession.created_at).getTime(),
                  isAnonymous: confession.is_anonymous,
                  likes: confession.likes,
                  views: confession.views || 0,
                  isLiked: false,
                },
                engagementScore: calculateEngagementScore(confession.likes, confession.created_at),
              }))
              .sort((a, b) => b.engagementScore - a.engagementScore)
              .slice(0, limit);
          }

          set({
            trendingSecrets: secrets,
            isLoading: false,
            lastUpdated: Date.now(),
            lastSecretParams: { hours, limit },
          });
          trackStoreOperation("trendingStore", "loadTrendingSecrets", Date.now() - t0);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load trending secrets",
            isLoading: false,
          });
        }
      },

      searchByHashtag: async (hashtag: string) => {
        set({ isLoading: true, error: null });
        const t0 = Date.now();

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await supabase.rpc("search_confessions_by_hashtag", {
            search_hashtag: hashtag,
          });

          if (!functionError && functionData) {
            // Process confessions using normalizer for consistent field mapping
            let results: Confession[] = [];
            try {
              results = await normalizeConfessions(functionData as any[]);
              results = results.map((confession) => ({ ...confession, isLiked: false }));
            } catch (normalizationError) {
              if (__DEV__) {
                console.error("Failed to normalize hashtag search results from RPC:", normalizationError);
              }
              // Fallback to basic processing
              results = (functionData as any[]).map((item: any) => ({
                id: item.id,
                type: item.type as "text" | "video",
                content: item.content,
                videoUri: item.video_uri || item.video_url || undefined,
                transcription: item.transcription,
                timestamp: new Date(item.created_at).getTime(),
                isAnonymous: item.is_anonymous,
                likes: item.likes,
                views: item.views || 0,
                isLiked: false,
              }));
            }

            set({
              searchResults: results,
              isLoading: false,
            });
            return;
          }

          // Fallback to client-side search
          if (__DEV__) {
            console.log("Using client-side hashtag search");
          }
          const normalizedHashtag = hashtag.toLowerCase().startsWith("#")
            ? hashtag.toLowerCase()
            : `#${hashtag.toLowerCase()}`;

          const { data: confessions, error } = await supabase
            .from("confessions")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;

          // Process confessions using normalizer for consistent field mapping
          let results: Confession[] = [];
          try {
            const filteredConfessions = (confessions || []).filter((confession) => {
              const contentHashtags = extractHashtags(confession.content || "");
              const transcriptionHashtags = confession.transcription ? extractHashtags(confession.transcription) : [];
              const allHashtags = [...contentHashtags, ...transcriptionHashtags];
              return allHashtags.includes(normalizedHashtag);
            });

            results = await normalizeConfessions(filteredConfessions);
            results = results.map((confession) => ({ ...confession, isLiked: false }));
          } catch (normalizationError) {
            if (__DEV__) {
              console.error("Failed to normalize hashtag search results fallback:", normalizationError);
            }
            // Fallback to basic processing
            results = (confessions || [])
              .filter((confession) => {
                const contentHashtags = extractHashtags(confession.content || "");
                const transcriptionHashtags = confession.transcription ? extractHashtags(confession.transcription) : [];
                const allHashtags = [...contentHashtags, ...transcriptionHashtags];
                return allHashtags.includes(normalizedHashtag);
              })
              .map((confession) => ({
                id: confession.id,
                type: confession.type as "text" | "video",
                content: confession.content,
                videoUri: confession.video_uri || confession.video_url || undefined,
                transcription: confession.transcription || undefined,
                timestamp: new Date(confession.created_at).getTime(),
                isAnonymous: confession.is_anonymous,
                likes: confession.likes,
                views: confession.views || 0,
                isLiked: false,
              }));
          }

          set({
            searchResults: results,
            isLoading: false,
          });
          trackStoreOperation("trendingStore", "searchByHashtag", Date.now() - t0);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to search hashtag",
            isLoading: false,
          });
        }
      },

      refreshAll: async (hours = 24) => {
        set({ isRefreshing: true });
        try {
          await Promise.all([
            get().loadTrendingHashtags(hours, undefined, { force: true }),
            get().loadTrendingSecrets(hours, undefined, { force: true }),
          ]);
        } finally {
          set({ isRefreshing: false });
        }
      },

      clearSearch: () => {
        set({ searchResults: [] });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "trending-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data, not loading states
      partialize: (state) => ({
        trendingHashtags: state.trendingHashtags,
        trendingSecrets: state.trendingSecrets,
        lastUpdated: state.lastUpdated,
        lastHashtagParams: state.lastHashtagParams,
        lastSecretParams: state.lastSecretParams,
      }),
    },
  ),
);

// Cleanup function for trending store
const cleanupTrendingStore = () => {
  if (trendingRealtimeChannel) {
    trendingRealtimeChannel.unsubscribe();
    trendingRealtimeChannel = null;
  }
  if (trendingRefreshTimer) {
    clearTimeout(trendingRefreshTimer);
    trendingRefreshTimer = null;
  }

  if (__DEV__) {
    console.log("[TrendingStore] Cleaned up subscriptions and timers");
  }
};

// Export cleanup function
export { cleanupTrendingStore };
