import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfessionState, Confession, UserPreferences, VideoAnalytics } from "../types/confession";
import { supabase } from "../lib/supabase";
import { ensureSignedVideoUrl, isLocalUri, uploadVideoToSupabase } from "../utils/storage";
import {
  selectWithRetry,
  insertWithRetry,
  updateWithRetry,
  deleteWithRetry,
  rpcWithRetry,
} from "../utils/supabaseWithRetry";
import { invalidateCache, registerInvalidationCallback } from "../utils/cacheInvalidation";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";

// Debounce utility for preventing race conditions in like toggles
const pendingOperations = new Map<string, Promise<any>>();

const debouncedOperation = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  // If operation is already pending, return the existing promise
  if (pendingOperations.has(key)) {
    return pendingOperations.get(key) as Promise<T>;
  }

  // Create new operation promise
  const promise = operation().finally(() => {
    // Clean up after operation completes
    pendingOperations.delete(key);
  });

  pendingOperations.set(key, promise);
  return promise;
};

const sampleConfessions: Confession[] = [
  {
    id: "sample-1",
    type: "text",
    content:
      "I've been pretending to be happy at work for months, but I'm actually struggling with #anxiety. Every meeting feels like I'm drowning and everyone can see right through me. #mentalhealth #worklife",
    isAnonymous: true,
    timestamp: Date.now() - 3600000, // 1 hour ago
    likes: 42,
    isLiked: false,
  },
  {
    id: "sample-2",
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    transcription:
      "I judge people on social media way too much. Someone posts vacation pics and I immediately think they're showing off. I hate that I'm like this but I can't stop. #socialmedia #jealousy #mentalhealth",
    isAnonymous: true,
    timestamp: Date.now() - 7200000, // 2 hours ago
    likes: 128,
    isLiked: true,
  },
  {
    id: "sample-3",
    type: "text",
    content:
      "I've been lying to my family about #money. I'm actually in debt but too embarrassed to ask for help. When they ask how I'm doing, I just say everything's fine. #debt #family #shame",
    isAnonymous: true,
    timestamp: Date.now() - 10800000, // 3 hours ago
    likes: 67,
    isLiked: false,
  },
  {
    id: "sample-4",
    type: "text",
    content:
      "Sometimes I feel like I'm not good enough for my partner. They deserve someone better and I'm just waiting for them to realize it. #relationships #insecurity #selfdoubt",
    isAnonymous: true,
    timestamp: Date.now() - 14400000, // 4 hours ago
    likes: 89,
    isLiked: false,
  },
  {
    id: "sample-5",
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    transcription:
      "I've been avoiding my best friend because I'm jealous of their success. They got promoted and I can barely handle my current job. I feel terrible about it. #friendship #jealousy #career #worklife",
    isAnonymous: true,
    timestamp: Date.now() - 18000000, // 5 hours ago
    likes: 156,
    isLiked: false,
  },
  {
    id: "sample-6",
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    transcription:
      "I still sleep with a stuffed animal and I'm 28 years old. I'm too embarrassed to tell anyone, even my partner doesn't know. #adulting #shame #relationships #comfort",
    isAnonymous: true,
    timestamp: Date.now() - 21600000, // 6 hours ago
    likes: 203,
    isLiked: true,
  },
  {
    id: "sample-7",
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    transcription:
      "I pretend to be busy at work but I actually finish my tasks in 2 hours and spend the rest of the day browsing the internet. I feel guilty but also trapped. #worklife #productivity #guilt #procrastination",
    isAnonymous: true,
    timestamp: Date.now() - 25200000, // 7 hours ago
    likes: 94,
    isLiked: false,
  },
  {
    id: "sample-8",
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    transcription:
      "I've been eating my roommate's food and replacing it before they notice. I know it's wrong but I'm too broke to buy groceries and too proud to ask for help. #money #roommates #shame #pride",
    isAnonymous: true,
    timestamp: Date.now() - 28800000, // 8 hours ago
    likes: 76,
    isLiked: false,
  },
];

export const useConfessionStore = create<ConfessionState>()(
  persist(
    (set, get) => ({
      confessions: [],
      userConfessions: [],
      videoAnalytics: {},
      userPreferences: {
        autoplay: true,
        soundEnabled: true,
        qualityPreference: "auto",
        dataUsageMode: "unlimited",
        captionsDefault: true,
        hapticsEnabled: true,
        reducedMotion: false,
        playbackSpeed: 1.0,
      },
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,

      loadConfessions: async () => {
        console.log("📥 Loading confessions...");
        set({ isLoading: true, error: null, hasMore: true });
        try {
          const INITIAL_LIMIT = 20;

          const { data: finalData, error } = await supabase
            .from("confessions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(INITIAL_LIMIT);

          if (error) throw error;

          console.log("📥 Loaded", finalData?.length || 0, "confessions from database");
          if (finalData && finalData.length > 0) {
            console.log("📥 Latest confession from DB:", {
              id: finalData[0].id,
              content: finalData[0].content.substring(0, 50) + "...",
              created_at: finalData[0].created_at,
            });
          }

          const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

          const confessions: Confession[] = await Promise.all(
            (finalData || []).map(async (item) => {
              const base: Confession = {
                id: item.id,
                type: item.type as "text" | "video",
                content: item.content,
                videoUri: undefined,
                transcription: item.transcription || undefined,
                timestamp: new Date(item.created_at).getTime(),
                isAnonymous: item.is_anonymous,
                likes: item.likes,
                isLiked: false,
              };

              if (base.type === "video" && (item.video_uri || item.video_url)) {
                // Handle both video_uri and video_url fields for compatibility
                const videoPath = item.video_uri || item.video_url;
                base.videoUri = (await ensureSignedVideoUrl(videoPath)) || FALLBACK_VIDEO;
              } else if (base.type === "video" && !item.video_uri && !item.video_url) {
                // Ensure we never render a blank player in dev/demo data
                base.videoUri = FALLBACK_VIDEO;
              }

              return base;
            }),
          );

          console.log("📥 Processed", confessions.length, "real confessions");

          // Combine real and sample confessions, then sort by timestamp (newest first)
          const combinedConfessions = [...confessions, ...sampleConfessions];
          const finalConfessions = combinedConfessions.sort((a, b) => b.timestamp - a.timestamp);

          console.log(
            "📥 Final confessions count:",
            finalConfessions.length,
            "(",
            confessions.length,
            "real +",
            sampleConfessions.length,
            "sample) - sorted chronologically",
          );

          set({
            confessions: finalConfessions,
            isLoading: false,
            hasMore: (finalData?.length || 0) >= INITIAL_LIMIT,
          });
        } catch (error) {
          console.error("❌ Failed to load confessions:", error);
          // On error, fall back to sample data
          set({
            confessions: sampleConfessions,
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to load confessions",
          });
        }
      },

      loadMoreConfessions: async () => {
        const { confessions, isLoadingMore, hasMore } = get();
        if (isLoadingMore || !hasMore) return;

        set({ isLoadingMore: true, error: null });
        try {
          const LOAD_MORE_LIMIT = 10;
          const lastConfession = confessions[confessions.length - 1];

          const { data, error } = await supabase
            .from("confessions")
            .select("*")
            .order("created_at", { ascending: false })
            .lt("created_at", new Date(lastConfession.timestamp).toISOString())
            .limit(LOAD_MORE_LIMIT);

          if (error) throw error;

          const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

          const newConfessions: Confession[] = await Promise.all(
            (data || []).map(async (item) => {
              const base: Confession = {
                id: item.id,
                type: item.type as "text" | "video",
                content: item.content,
                videoUri: undefined,
                transcription: item.transcription || undefined,
                timestamp: new Date(item.created_at).getTime(),
                isAnonymous: item.is_anonymous,
                likes: item.likes,
                isLiked: false,
              };

              if (base.type === "video" && (item.video_uri || item.video_url)) {
                // Handle both video_uri and video_url fields for compatibility
                const videoPath = item.video_uri || item.video_url;
                base.videoUri = (await ensureSignedVideoUrl(videoPath)) || FALLBACK_VIDEO;
              } else if (base.type === "video" && !item.video_uri && !item.video_url) {
                base.videoUri = FALLBACK_VIDEO;
              }

              return base;
            }),
          );

          set({
            confessions: [...confessions, ...newConfessions],
            isLoadingMore: false,
            hasMore: (data?.length || 0) >= LOAD_MORE_LIMIT,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load more confessions",
            isLoadingMore: false,
          });
        }
      },

      loadUserConfessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("confessions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

          const userConfessions: Confession[] = await Promise.all(
            (data || []).map(async (item) => {
              const base: Confession = {
                id: item.id,
                type: item.type as "text" | "video",
                content: item.content,
                videoUri: undefined,
                transcription: item.transcription || undefined,
                timestamp: new Date(item.created_at).getTime(),
                isAnonymous: item.is_anonymous,
                likes: item.likes,
                isLiked: false,
              };

              if (base.type === "video" && (item.video_uri || item.video_url)) {
                // Handle both video_uri and video_url fields for compatibility
                const videoPath = item.video_uri || item.video_url;
                base.videoUri = (await ensureSignedVideoUrl(videoPath)) || FALLBACK_VIDEO;
              } else if (base.type === "video" && !item.video_uri && !item.video_url) {
                base.videoUri = FALLBACK_VIDEO;
              }

              return base;
            }),
          );

          set({
            userConfessions,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load user confessions",
            isLoading: false,
          });
        }
      },

      addConfession: async (confession, opts) => {
        console.log("📝 Adding new confession:", confession);
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            throw new Error("User not authenticated");
          }

          console.log("👤 User authenticated:", user.id);

          let videoStoragePath: string | undefined;
          let signedVideoUrl: string | undefined;

          if (confession.type === "video" && confession.videoUri) {
            if (isLocalUri(confession.videoUri)) {
              const result = await uploadVideoToSupabase(confession.videoUri, user.id, opts?.onUploadProgress);
              videoStoragePath = result.path; // store path in DB
              signedVideoUrl = result.signedUrl; // use for immediate playback
            } else {
              // Already a remote URL (e.g., previously signed URL)
              signedVideoUrl = confession.videoUri;
              // Optionally, do not store signed URL in DB; keep it as content path if you have it
              // For now, store the URL directly
              videoStoragePath = confession.videoUri;
            }
          }

          const { data, error } = await supabase
            .from("confessions")
            .insert({
              user_id: user?.id,
              type: confession.type,
              content: confession.content,
              video_uri: videoStoragePath,
              transcription: confession.transcription,
              is_anonymous: confession.isAnonymous,
            })
            .select()
            .single();

          if (error) {
            console.error("❌ Database insert error:", error);
            throw error;
          }

          if (!data) {
            console.error("❌ No data returned from insert");
            throw new Error("No data returned from confession insert");
          }

          console.log("✅ Confession inserted successfully:", data);

          const newConfession: Confession = {
            id: data.id,
            type: data.type as "text" | "video",
            content: data.content,
            videoUri:
              signedVideoUrl ||
              (await ensureSignedVideoUrl(data.video_uri || undefined)) ||
              (data.type === "video"
                ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                : undefined),
            transcription: data.transcription || undefined,
            timestamp: new Date(data.created_at).getTime(),
            isAnonymous: data.is_anonymous,
            likes: data.likes,
            isLiked: false,
          };

          console.log("📝 Adding confession to local state:", newConfession);

          set((state) => {
            const updatedState = {
              confessions: [newConfession, ...state.confessions],
              isLoading: false,
            };
            console.log("📝 Updated confessions count:", updatedState.confessions.length);
            return updatedState;
          });

          // Trigger cache invalidation for new confession
          invalidateCache("confession_created", { confessionId: newConfession.id });

          console.log("✅ Confession added successfully to timeline");
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to add confession",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteConfession: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user to ensure they own the confession
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Delete confession with explicit user_id check for security
          const { error } = await supabase.from("confessions").delete().eq("id", id).eq("user_id", user.id);

          if (error) throw error;

          set((state) => ({
            confessions: state.confessions.filter((c) => c.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete confession",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteUserConfession: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase.from("confessions").delete().eq("id", id).eq("user_id", user.id); // Ensure user can only delete their own confessions

          if (error) throw error;

          set((state) => ({
            confessions: state.confessions.filter((c) => c.id !== id),
            userConfessions: state.userConfessions.filter((c) => c.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete confession",
            isLoading: false,
          });
          throw error;
        }
      },

      clearAllConfessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            set({ isLoading: false });
            return;
          }
          const { error } = await supabase.from("confessions").delete().eq("user_id", user.id);

          if (error) throw error;

          set({ confessions: [], isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to clear confessions",
            isLoading: false,
          });
          throw error;
        }
      },

      clearAllUserConfessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase.from("confessions").delete().eq("user_id", user.id);

          if (error) throw error;

          set((state) => {
            const userIds = new Set(state.userConfessions.map((c) => c.id));
            return {
              confessions: state.confessions.filter((c) => !userIds.has(c.id)),
              userConfessions: [],
              isLoading: false,
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to clear user confessions",
            isLoading: false,
          });
          throw error;
        }
      },

      toggleLike: async (id) => {
        return debouncedOperation(`like-${id}`, async () => {
          try {
            const state = get();
            const curr = state.confessions.find((c) => c.id === id);
            if (!curr) throw new Error("Confession not found");

            // Optimistic update first
            const newIsLiked = !curr.isLiked;
            const optimisticLikes = (curr.likes || 0) + (curr.isLiked ? -1 : 1);

            set((state) => ({
              confessions: state.confessions.map((c) =>
                c.id === id ? { ...c, isLiked: newIsLiked, likes: optimisticLikes } : c,
              ),
              videoAnalytics: {
                ...state.videoAnalytics,
                [id]: {
                  ...state.videoAnalytics[id],
                  interactions: (state.videoAnalytics[id]?.interactions || 0) + 1,
                },
              },
            }));

            // Check if online, if not queue the action
            if (!offlineQueue.getNetworkStatus()) {
              await offlineQueue.enqueue(
                newIsLiked ? OFFLINE_ACTIONS.LIKE_CONFESSION : OFFLINE_ACTIONS.UNLIKE_CONFESSION,
                { confessionId: id, isLiked: newIsLiked, likes: optimisticLikes },
              );
              return;
            }

            // Try RPC first for server-verified toggle
            const { data: rpcData, error: rpcError } = await supabase.rpc("toggle_confession_like", {
              confession_uuid: id,
            });

            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData[0]?.likes_count !== undefined) {
              const serverCount = rpcData[0].likes_count as number;
              set((state) => ({
                confessions: state.confessions.map((c) => (c.id === id ? { ...c, likes: serverCount } : c)),
              }));
              return;
            }

            // Fallback to direct update if RPC fails
            const { error } = await supabase.from("confessions").update({ likes: optimisticLikes }).eq("id", id);

            if (error) {
              // If online operation fails, queue it for retry
              await offlineQueue.enqueue(
                newIsLiked ? OFFLINE_ACTIONS.LIKE_CONFESSION : OFFLINE_ACTIONS.UNLIKE_CONFESSION,
                { confessionId: id, isLiked: newIsLiked, likes: optimisticLikes },
              );
              throw error;
            }

            // Trigger cache invalidation for like toggle
            invalidateCache(newIsLiked ? "confession_liked" : "confession_unliked", { confessionId: id });
          } catch (error) {
            // Revert optimistic update on error only if not queued
            if (offlineQueue.getNetworkStatus()) {
              const state = get();
              const curr = state.confessions.find((c) => c.id === id);
              if (curr) {
                const revertedLikes = (curr.likes || 0) + (curr.isLiked ? -1 : 1);
                set((state) => ({
                  confessions: state.confessions.map((c) =>
                    c.id === id ? { ...c, isLiked: !curr.isLiked, likes: revertedLikes } : c,
                  ),
                  error: error instanceof Error ? error.message : "Failed to toggle like",
                }));
              }
            }
            throw error;
          }
        });
      },

      updateLikes: async (id, likes) => {
        try {
          // Optimistic update first
          set((state) => ({
            confessions: state.confessions.map((confession) =>
              confession.id === id ? { ...confession, likes } : confession,
            ),
          }));

          const { error } = await supabase.from("confessions").update({ likes }).eq("id", id);

          if (error) throw error;
        } catch (error) {
          // Revert optimistic update on error
          const state = get();
          const curr = state.confessions.find((c) => c.id === id);
          if (curr) {
            set((state) => ({
              confessions: state.confessions.map((confession) =>
                confession.id === id ? { ...confession, likes: curr.likes } : confession,
              ),
              error: error instanceof Error ? error.message : "Failed to update likes",
            }));
          }
          throw error;
        }
      },
      updateVideoAnalytics: async (id, analytics) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from("video_analytics").upsert({
            confession_id: id,
            watch_time: analytics.watchTime,
            completion_rate: analytics.completionRate,
            last_watched: analytics.lastWatched
              ? new Date(analytics.lastWatched).toISOString()
              : new Date().toISOString(),
            interactions: analytics.interactions,
          });

          if (error) throw error;

          set((state) => ({
            videoAnalytics: {
              ...state.videoAnalytics,
              [id]: {
                ...{
                  watchTime: 0,
                  completionRate: 0,
                  lastWatched: Date.now(),
                  interactions: 0,
                },
                ...state.videoAnalytics[id],
                ...analytics,
              },
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update video analytics",
            isLoading: false,
          });
          throw error;
        }
      },

      loadUserPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single();

          if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

          if (data) {
            const preferences: UserPreferences = {
              autoplay: data.autoplay,
              soundEnabled: data.sound_enabled,
              qualityPreference: data.quality_preference as "auto" | "high" | "medium" | "low",
              dataUsageMode: data.data_usage_mode as "unlimited" | "wifi-only" | "minimal",
              captionsDefault: data.captions_default ?? true,
              hapticsEnabled: data.haptics_enabled ?? true,
              reducedMotion: data.reduced_motion ?? false,
              playbackSpeed: 1.0,
            };
            set({ userPreferences: preferences, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load user preferences",
            isLoading: false,
          });
        }
      },

      updateUserPreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase.from("user_preferences").upsert({
            user_id: user.id,
            autoplay: preferences.autoplay,
            sound_enabled: preferences.soundEnabled,
            quality_preference: preferences.qualityPreference,
            data_usage_mode: preferences.dataUsageMode,
            captions_default: preferences.captionsDefault,
            haptics_enabled: preferences.hapticsEnabled,
            reduced_motion: preferences.reducedMotion,
          });

          if (error) throw error;

          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              ...preferences,
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update user preferences",
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "confession-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        confessions: state.confessions,
        userConfessions: state.userConfessions,
        videoAnalytics: state.videoAnalytics,
        userPreferences: state.userPreferences,
      }),
    },
  ),
);

// Confession subscription management
let confessionChannel: any = null;

// Cleanup function for confession subscriptions
const cleanupConfessionSubscriptions = () => {
  if (confessionChannel) {
    confessionChannel.unsubscribe();
    confessionChannel = null;
  }
};

// Function to set up real-time subscriptions for confessions
const setupConfessionSubscriptions = () => {
  if (confessionChannel) {
    console.log("🔄 Real-time: Subscription already exists, skipping setup");
    return; // Already set up
  }

  console.log("🔄 Real-time: Setting up confession subscriptions...");

  confessionChannel = supabase
    .channel("confessions")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, async (payload) => {
      console.log("🔄 Real-time: New confession inserted", payload.new);

      // Don't reload all confessions, just add the new one if it's not already in the list
      const { confessions } = useConfessionStore.getState();
      const newConfessionId = payload.new.id;

      // Check if this confession is already in our local state (from optimistic update)
      const existingConfession = confessions.find((c) => c.id === newConfessionId);
      if (existingConfession) {
        console.log("🔄 Real-time: Confession already exists in local state, skipping");
        return;
      }

      // Only reload if this is a confession from another user
      const { loadConfessions } = useConfessionStore.getState();
      console.log("🔄 Real-time: Loading confessions to include new confession from another user");
      await loadConfessions();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "confessions" }, (payload) => {
      console.log("🔄 Real-time: Confession updated", payload.new);
      const { confessions, userConfessions } = useConfessionStore.getState();
      const updatedConfession = payload.new;

      useConfessionStore.setState({
        confessions: confessions.map((confession) =>
          confession.id === updatedConfession.id
            ? {
                ...confession,
                likes: updatedConfession.likes,
              }
            : confession,
        ),
        userConfessions: userConfessions.map((confession) =>
          confession.id === updatedConfession.id
            ? {
                ...confession,
                likes: updatedConfession.likes,
              }
            : confession,
        ),
      });
    })
    .subscribe((status) => {
      console.log("🔄 Real-time: Subscription status:", status);
      if (status === "SUBSCRIBED") {
        console.log("✅ Real-time: Successfully subscribed to confession changes");
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Real-time: Subscription error");
      } else if (status === "TIMED_OUT") {
        console.error("❌ Real-time: Subscription timed out");
      } else if (status === "CLOSED") {
        console.log("🔄 Real-time: Subscription closed");
      }
    });

  console.log("🔄 Real-time: Confession subscription setup complete");
};

// Export functions for app-level management
export { cleanupConfessionSubscriptions, setupConfessionSubscriptions };
