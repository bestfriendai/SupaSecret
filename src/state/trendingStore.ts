import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { Confession } from "../types/confession";
import { HashtagData, TrendingSecret } from "../utils/trending";

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

  // Cache settings
  cacheExpiry: number; // 5 minutes in milliseconds

  // Actions
  loadTrendingHashtags: (hours?: number, limit?: number) => Promise<void>;
  loadTrendingSecrets: (hours?: number, limit?: number) => Promise<void>;
  searchByHashtag: (hashtag: string) => Promise<void>;
  refreshAll: (hours?: number) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}

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
      cacheExpiry: 5 * 60 * 1000, // 5 minutes

      loadTrendingHashtags: async (hours = 24, limit = 10) => {
        const state = get();

        // Check cache validity
        if (
          state.lastUpdated &&
          Date.now() - state.lastUpdated < state.cacheExpiry &&
          state.trendingHashtags.length > 0
        ) {
          return; // Use cached data
        }

        set({ isLoading: true, error: null });

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await supabase.rpc("get_trending_hashtags", {
            hours_back: hours,
            limit_count: limit,
          });

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
            const extractHashtags = (text: string): string[] => {
              const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
              const matches = text.match(hashtagRegex);
              return matches ? matches.map((tag) => tag.toLowerCase()) : [];
            };

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
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load trending hashtags",
            isLoading: false,
          });
        }
      },

      loadTrendingSecrets: async (hours = 24, limit = 10) => {
        const state = get();

        // Check cache validity
        if (
          state.lastUpdated &&
          Date.now() - state.lastUpdated < state.cacheExpiry &&
          state.trendingSecrets.length > 0
        ) {
          return; // Use cached data
        }

        set({ isLoading: true, error: null });

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await supabase.rpc("get_trending_secrets", {
            hours_back: hours,
            limit_count: limit,
          });

          if (!functionError && functionData) {
            const secrets: TrendingSecret[] = (functionData as any[]).map((item: any) => ({
              confession: {
                id: item.id,
                type: item.type as "text" | "video",
                content: item.content,
                videoUri: item.video_uri || undefined,
                transcription: item.transcription,
                timestamp: new Date(item.created_at).getTime(),
                isAnonymous: item.is_anonymous,
                likes: item.likes,
                isLiked: false,
              },
              engagementScore: parseFloat(item.engagement_score),
            }));

            set({
              trendingSecrets: secrets,
              isLoading: false,
              lastUpdated: Date.now(),
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

          const secrets: TrendingSecret[] = (confessions || [])
            .map((confession) => ({
              confession: {
                id: confession.id,
                type: confession.type as "text" | "video",
                content: confession.content,
                videoUri: confession.video_uri || undefined,
                transcription: confession.transcription || undefined,
                timestamp: new Date(confession.created_at).getTime(),
                isAnonymous: confession.is_anonymous,
                likes: confession.likes,
                isLiked: false,
              },
              engagementScore: calculateEngagementScore(confession.likes, confession.created_at),
            }))
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, limit);

          set({
            trendingSecrets: secrets,
            isLoading: false,
            lastUpdated: Date.now(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load trending secrets",
            isLoading: false,
          });
        }
      },

      searchByHashtag: async (hashtag: string) => {
        set({ isLoading: true, error: null });

        try {
          // Try to use database function first
          const { data: functionData, error: functionError } = await supabase.rpc("search_confessions_by_hashtag", {
            search_hashtag: hashtag,
          });

          if (!functionError && functionData) {
            const results: Confession[] = (functionData as any[]).map((item: any) => ({
              id: item.id,
              type: item.type as "text" | "video",
              content: item.content,
              videoUri: item.video_uri || undefined,
              transcription: item.transcription,
              timestamp: new Date(item.created_at).getTime(),
              isAnonymous: item.is_anonymous,
              likes: item.likes,
              isLiked: false,
            }));

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

          const extractHashtags = (text: string): string[] => {
            const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
            const matches = text.match(hashtagRegex);
            return matches ? matches.map((tag) => tag.toLowerCase()) : [];
          };

          const results: Confession[] = (confessions || [])
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
              videoUri: confession.video_uri || undefined,
              transcription: confession.transcription || undefined,
              timestamp: new Date(confession.created_at).getTime(),
              isAnonymous: confession.is_anonymous,
              likes: confession.likes,
              isLiked: false,
            }));

          set({
            searchResults: results,
            isLoading: false,
          });
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
          await Promise.all([get().loadTrendingHashtags(hours), get().loadTrendingSecrets(hours)]);
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
      }),
    },
  ),
);
