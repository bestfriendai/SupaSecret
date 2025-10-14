import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfessionState, Confession, UserPreferences } from "../types/confession";
import { supabase } from "../lib/supabase";
import { ensureSignedVideoUrl, isLocalUri, uploadVideoToSupabase } from "../utils/storage";
import { rpcWithRetry, wrapWithRetry } from "../utils/supabaseWithRetry";
import { invalidateCache } from "../utils/cacheInvalidation";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";
import { trackPositiveInteraction, showReviewPrompt } from "../utils/reviewPrompt";
import { registerStoreCleanup } from "../utils/storeCleanup";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { normalizeConfession, normalizeConfessions } from "../utils/confessionNormalizer";
import { confessionValidation, videoValidation } from "../utils/validation";
import * as FileSystem from "../utils/legacyFileSystem";
import { compressVideo, deleteVideoFile, getVideoSize } from "../utils/videoCompression";

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
    views: 156,
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
    views: 342,
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
    views: 234,
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
    views: 287,
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
    views: 445,
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
    views: 567,
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
    views: 198,
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
    views: 123,
    isLiked: false,
  },
];

let loadConfessionsInFlight: Promise<void> | null = null;
let loadMoreInFlight: Promise<void> | null = null;

export const useConfessionStore = create<ConfessionState>()(
  persist(
    (set, get) => ({
      confessions: [],
      userConfessions: [],
      videoAnalytics: {},
      userPreferences: {
        autoplay: true,
        sound_enabled: true,
        quality_preference: "auto",
        data_usage_mode: "unlimited",
        captions_default: true,
        haptics_enabled: true,
        reduced_motion: false,
        playback_speed: 1.0,
      },
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
      isStoreInitialized: false,

      loadConfessions: async () => {
        if (loadConfessionsInFlight) return loadConfessionsInFlight;
        const start = Date.now();
        set({ isLoading: true, error: null, hasMore: true });
        loadConfessionsInFlight = (async () => {
          try {
            const INITIAL_LIMIT = 20;
            const { data: finalData, error } = await wrapWithRetry(async () => {
              return await supabase
                .from("public_confessions")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(INITIAL_LIMIT);
            })();
            if (error) throw error;

            const confessions: Confession[] = await normalizeConfessions((finalData as any[]) || []);

            const combinedConfessions = __DEV__ ? [...confessions, ...sampleConfessions] : [...confessions];

            // Remove duplicates by ID with enhanced logging
            const uniqueConfessions = Array.from(new Map(combinedConfessions.map((c) => [c.id, c])).values());

            if (__DEV__ && combinedConfessions.length !== uniqueConfessions.length) {
              console.warn(
                `ConfessionStore: Deduplicated ${combinedConfessions.length - uniqueConfessions.length} duplicate confessions`,
              );
            }

            const finalConfessions = uniqueConfessions
              .sort((a, b) => {
                const aTime = typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : a.timestamp;
                const bTime = typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : b.timestamp;
                return bTime - aTime;
              })
              .slice(0, 200); // limit to reduce memory pressure

            set({
              confessions: finalConfessions,
              isLoading: false,
              hasMore: (finalData?.length || 0) >= INITIAL_LIMIT,
            });
          } catch (error) {
            set({
              confessions: sampleConfessions,
              isLoading: false,
              error: error instanceof Error ? error.message : "Failed to load confessions",
            });
          } finally {
            trackStoreOperation("confessionStore", "loadConfessions", Date.now() - start);
            loadConfessionsInFlight = null;
          }
        })();
        return loadConfessionsInFlight;
      },

      loadMoreConfessions: async () => {
        const { confessions, isLoadingMore, hasMore } = get();
        if (isLoadingMore || !hasMore) return;

        set({ isLoadingMore: true, error: null });
        if (loadMoreInFlight) return loadMoreInFlight;
        const start = Date.now();
        loadMoreInFlight = (async () => {
          try {
            const LOAD_MORE_LIMIT = 10;
            const lastConfession = confessions[confessions.length - 1];

            const { data, error } = await wrapWithRetry(async () => {
              return await supabase
                .from("public_confessions")
                .select("*")
                .order("created_at", { ascending: false })
                .lt("created_at", new Date(lastConfession.timestamp).toISOString())
                .limit(LOAD_MORE_LIMIT);
            })();

            if (error) throw error;

            const newConfessions: Confession[] = await normalizeConfessions((data as any[]) || []);

            // Filter out duplicates by ID
            const existingIds = new Set(confessions.map((c) => c.id));
            const uniqueNewConfessions = newConfessions.filter((c) => !existingIds.has(c.id));

            set({
              confessions: [...confessions, ...uniqueNewConfessions].slice(-400),
              isLoadingMore: false,
              hasMore: (data?.length || 0) >= LOAD_MORE_LIMIT,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to load more confessions",
              isLoadingMore: false,
            });
          } finally {
            trackStoreOperation("confessionStore", "loadMoreConfessions", Date.now() - start);
            loadMoreInFlight = null;
          }
        })();
        return loadMoreInFlight;
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

          const userConfessions: Confession[] = await normalizeConfessions(data || []);

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
          // Comprehensive validation before processing
          const validationResult = confessionValidation.complete({
            content: confession.content,
            type: confession.type,
            video:
              confession.type === "video" && confession.videoUri
                ? {
                    file: { uri: confession.videoUri },
                    // Duration and size would need to be extracted from video file
                    // For now, we'll skip these specific validations
                  }
                : undefined,
          });

          if (!validationResult.isValid && validationResult.error) {
            throw new Error(validationResult.error);
          }

          // Log validation warnings
          if (validationResult.warnings && __DEV__) {
            console.warn("Confession validation warnings:", validationResult.warnings);
          }

          // Check if user is online for immediate processing vs offline queue
          if (!offlineQueue.getNetworkStatus()) {
            await get().queueTempConfession(confession, { type: confession.type });
            return;
          }

          // User is online - proceed with immediate processing
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            throw new Error("User not authenticated");
          }

          if (__DEV__) {
            console.log("👤 User authenticated:", user.id);
          }

          let videoStoragePath: string | undefined;
          let signedVideoUrl: string | undefined;

          // Enhanced video processing with validation
          if (confession.type === "video" && confession.videoUri) {
            if (isLocalUri(confession.videoUri)) {
              // Additional validation for local video files before upload
              try {
                const videoFileValidation = videoValidation.videoFile({ uri: confession.videoUri });
                if (!videoFileValidation.isValid && videoFileValidation.error) {
                  throw new Error(`Video validation failed: ${videoFileValidation.error}`);
                }

                if (videoFileValidation.warnings && __DEV__) {
                  console.warn("Video file warnings:", videoFileValidation.warnings);
                }

                // Get file info for size and duration validation
                const fileInfo = await FileSystem.getInfoAsync(confession.videoUri);
                if (fileInfo.exists && (fileInfo as any).size) {
                  const sizeValidation = videoValidation.videoSize((fileInfo as any).size);
                  if (!sizeValidation.isValid && sizeValidation.error) {
                    throw new Error(sizeValidation.error);
                  }

                  if (sizeValidation.warnings && __DEV__) {
                    console.warn("Video size warnings:", sizeValidation.warnings);
                  }
                }

                // TODO: Add duration validation when duration info is available
                // This would require video metadata extraction which is complex

                // Log video size before upload
                const videoSize = await getVideoSize(confession.videoUri);
                console.log(`📹 Uploading video: ${videoSize.toFixed(2)}MB`);

                // Compress video if needed (currently just validates)
                const compressionResult = await compressVideo(confession.videoUri, {
                  quality: "medium",
                  onProgress: (progress) => {
                    // Report compression progress (0-20% of total)
                    opts?.onUploadProgress?.(progress * 0.2);
                  },
                });

                if (!compressionResult.success) {
                  throw new Error(compressionResult.error || "Video compression failed");
                }

                const videoToUpload = compressionResult.uri || confession.videoUri;

                const result = await uploadVideoToSupabase(videoToUpload, user.id, {
                  onProgress: (progress) => {
                    // Report upload progress (20-100% of total)
                    opts?.onUploadProgress?.(20 + progress * 0.8);
                  },
                });
                videoStoragePath = result.path; // store path in DB
                signedVideoUrl = result.signedUrl; // use for immediate playback

                // Clean up temporary file after successful upload
                if (videoToUpload !== confession.videoUri) {
                  await deleteVideoFile(videoToUpload);
                }
                await deleteVideoFile(confession.videoUri);
              } catch (uploadError) {
                if (__DEV__) {
                  console.error("Video upload failed:", uploadError);
                }
                // If upload fails, queue for retry
                await get().queueTempConfession(confession, { type: confession.type, uploadFailed: true });
                return;
              }
            } else {
              // Already a remote URL (likely a signed URL) – do not persist path to DB
              signedVideoUrl = confession.videoUri;
              videoStoragePath = undefined;
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
              has_face_blur: confession.type === "video" ? ((confession as any).faceBlurApplied ?? false) : false,
              has_voice_change: confession.type === "video" ? ((confession as any).voiceChangeApplied ?? false) : false,
            })
            .select()
            .single();

          if (error) {
            if (__DEV__) {
              console.error("❌ Database insert error:", error);
            }
            throw error;
          }

          if (!data) {
            if (__DEV__) {
              console.error("❌ No data returned from insert");
            }
            throw new Error("No data returned from confession insert");
          }

          if (__DEV__) {
            console.log("✅ Confession inserted successfully:", data);
          }

          const newConfession: Confession = {
            id: data.id,
            type: data.type as "text" | "video",
            content: data.content,
            videoUri:
              signedVideoUrl ||
              (data.type === "video" && data.video_uri
                ? (await ensureSignedVideoUrl(data.video_uri))?.signedUrl ||
                  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                : undefined),
            transcription: data.transcription || undefined,
            timestamp: new Date(data.created_at).getTime(),
            isAnonymous: data.is_anonymous,
            likes: data.likes,
            views: data.views,
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

          // Track positive interaction for review prompting (successful confession creation)
          trackPositiveInteraction();

          // Show review prompt if conditions are met
          showReviewPrompt();

          console.log("✅ Confession added successfully to timeline");
        } catch (error) {
          if (__DEV__) {
            console.error("Failed to add confession:", error);
          }

          let errorMessage = "Failed to add confession";

          // Provide user-friendly error messages based on validation failures
          if (error instanceof Error) {
            if (
              error.message.includes("Video validation failed:") ||
              error.message.includes("Please enter your confession") ||
              error.message.includes("too short") ||
              error.message.includes("too long") ||
              error.message.includes("Video file is required") ||
              error.message.includes("Unsupported video format")
            ) {
              // These are validation errors - show the original message
              errorMessage = error.message;
            } else if (error.message.includes("User not authenticated")) {
              errorMessage = "Please sign in to share your confession";
            } else if (error.message.includes("upload")) {
              errorMessage = "Failed to upload video. Please check your connection and try again.";
            } else {
              errorMessage = error.message;
            }
          }

          set({
            error: errorMessage,
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

            // Track positive interaction for review prompting (only when liking)
            if (newIsLiked) {
              trackPositiveInteraction();
            }

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

            // Check authentication first - the function requires it
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();
            if (authError || !user) {
              throw new Error("Please sign in to like confessions");
            }

            // Try RPC first for server-verified toggle
            const { data: rpcData, error: rpcError } = await wrapWithRetry(async () => {
              return await rpcWithRetry("toggle_confession_like", {
                confession_uuid: id,
                // Note: user_id parameter removed - function gets it from auth.uid() internally
              });
            })();

            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
              const serverCount = rpcData[0].likes_count as number;
              set((state) => ({
                confessions: state.confessions.map((c) => (c.id === id ? { ...c, likes: serverCount } : c)),
              }));
              return;
            }

            // Fallback to direct update if RPC fails
            const { error } = await wrapWithRetry(async () => {
              return await supabase.from("confessions").update({ likes: optimisticLikes }).eq("id", id);
            })();

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
            watch_time: analytics.watch_time,
            completion_rate: analytics.completion_rate,
            last_watched: analytics.last_watched
              ? new Date(analytics.last_watched).toISOString()
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
              autoplay: data.autoplay ?? true,
              sound_enabled: data.sound_enabled ?? true,
              quality_preference: data.quality_preference as "auto" | "high" | "medium" | "low",
              data_usage_mode: data.data_usage_mode as "unlimited" | "wifi-only" | "minimal",
              captions_default: data.captions_default ?? true,
              haptics_enabled: data.haptics_enabled ?? true,
              reduced_motion: data.reduced_motion ?? false,
              playback_speed: (data as any).playback_speed ?? 1.0,
            };
            set({ userPreferences: preferences, isLoading: false, isStoreInitialized: true });
          } else {
            set({ isLoading: false, isStoreInitialized: true });
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

          const curr = get().userPreferences;
          const { error } = await supabase.from("user_preferences").upsert({
            user_id: user.id,
            autoplay: preferences.autoplay ?? curr.autoplay,
            sound_enabled: (preferences as any).sound_enabled ?? curr.sound_enabled,
            quality_preference: (preferences as any).quality_preference ?? curr.quality_preference,
            data_usage_mode: (preferences as any).data_usage_mode ?? curr.data_usage_mode,
            captions_default: (preferences as any).captions_default ?? curr.captions_default,
            haptics_enabled: (preferences as any).haptics_enabled ?? curr.haptics_enabled,
            reduced_motion: (preferences as any).reduced_motion ?? curr.reduced_motion,
            playback_speed: (preferences as any).playback_speed ?? curr.playback_speed,
          });

          if (error) throw error;

          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              ...(preferences.autoplay !== undefined && { autoplay: preferences.autoplay }),
              ...((preferences as any).sound_enabled !== undefined && {
                sound_enabled: (preferences as any).sound_enabled,
              }),
              ...((preferences as any).quality_preference !== undefined && {
                quality_preference: (preferences as any).quality_preference,
              }),
              ...((preferences as any).data_usage_mode !== undefined && {
                data_usage_mode: (preferences as any).data_usage_mode,
              }),
              ...((preferences as any).captions_default !== undefined && {
                captions_default: (preferences as any).captions_default,
              }),
              ...((preferences as any).haptics_enabled !== undefined && {
                haptics_enabled: (preferences as any).haptics_enabled,
              }),
              ...((preferences as any).reduced_motion !== undefined && {
                reduced_motion: (preferences as any).reduced_motion,
              }),
              ...((preferences as any).playback_speed !== undefined && {
                playback_speed: (preferences as any).playback_speed,
              }),
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

      // Helper function to extract duplicate logic for queuing temp confessions
      queueTempConfession: async (confession: any, metadata: any) => {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const tempConfession: Confession = {
          id: tempId,
          type: confession.type,
          content: confession.content,
          videoUri: confession.videoUri,
          transcription: confession.transcription,
          timestamp: Date.now(),
          isAnonymous: confession.isAnonymous,
          likes: 0,
          views: 0,
          isLiked: false,
        };

        // Add to local state optimistically
        set((state) => ({
          confessions: [tempConfession, ...state.confessions],
          isLoading: false,
        }));

        // Queue for later processing
        await offlineQueue.enqueue(
          OFFLINE_ACTIONS.CREATE_CONFESSION,
          {
            tempId,
            confession: {
              type: confession.type,
              content: confession.content,
              videoUri: confession.videoUri,
              transcription: confession.transcription,
              isAnonymous: confession.isAnonymous,
            },
          },
          {
            priority: 10, // High priority for confession creation
            reconciliation: {
              tempId,
              targetStore: "confessionStore",
              metadata,
            },
          },
        );

        if (__DEV__) {
          console.log("✅ Confession queued for offline processing with temp ID:", tempId);
        }
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
let confessionReconnectTimer: any = null;
let confessionReconnectAttempts = 0;

// Cleanup function for confession subscriptions
const cleanupConfessionSubscriptions = () => {
  if (confessionChannel) {
    confessionChannel.unsubscribe();
    confessionChannel = null;
  }
  if (confessionReconnectTimer) {
    clearTimeout(confessionReconnectTimer);
    confessionReconnectTimer = null;
  }
  confessionReconnectAttempts = 0;

  if (__DEV__) {
    console.log("[ConfessionStore] Cleaned up subscriptions and timers");
  }
};

// Function to set up real-time subscriptions for confessions
const setupConfessionSubscriptions = () => {
  if (confessionChannel) {
    if (__DEV__) console.log("🔄 Real-time: Confession channel already exists");
    return;
  }

  const connect = () => {
    confessionChannel = supabase
      .channel("confessions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, async (payload) => {
        const item: any = payload.new;
        const base: Confession = await normalizeConfession(item);

        const { confessions } = useConfessionStore.getState();
        if (!confessions.find((c) => c.id === base.id)) {
          useConfessionStore.setState({ confessions: [base, ...confessions].slice(0, 200) });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "confessions" }, async (payload) => {
        const updated = payload.new as any;
        const { confessions, userConfessions } = useConfessionStore.getState();

        // Check if video_uri changed and needs to be refreshed
        let updatedConfession: Partial<Confession> = { likes: updated.likes };

        if (updated.type === "video" && (updated.video_uri || updated.video_url)) {
          // Video URI changed, normalize it to get the signed URL
          const normalized = await normalizeConfession(updated);
          updatedConfession.videoUri = normalized.videoUri;
        }

        useConfessionStore.setState({
          confessions: confessions.map((c) => (c.id === updated.id ? { ...c, ...updatedConfession } : c)),
          userConfessions: userConfessions.map((c) => (c.id === updated.id ? { ...c, ...updatedConfession } : c)),
        });
      })
      .subscribe((status) => {
        if (__DEV__) console.log("🔄 Real-time: Confession status:", status);
        if (status === "SUBSCRIBED") {
          confessionReconnectAttempts = 0;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // Attempt reconnect with exponential backoff
          const delay = Math.min(30000, 1000 * Math.pow(2, confessionReconnectAttempts++));
          if (confessionReconnectTimer) clearTimeout(confessionReconnectTimer);
          confessionReconnectTimer = setTimeout(() => {
            cleanupConfessionSubscriptions();
            connect();
          }, delay);
        }
      });
  };

  connect();
};

// Export functions for app-level management
export { cleanupConfessionSubscriptions, setupConfessionSubscriptions };

// Register centralized cleanup
registerStoreCleanup("confessionStore", cleanupConfessionSubscriptions);
