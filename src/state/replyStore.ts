import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { wrapWithRetry } from "../utils/supabaseWithRetry";
import { invalidateCache } from "../utils/cacheInvalidation";
import { isValidForDatabase } from "../utils/uuid";

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

/**
 * Reply interface for application state
 */
export interface Reply {
  /** Unique identifier for the reply */
  id: string;
  /** ID of the confession this reply belongs to */
  confessionId: string;
  /** User ID of the reply author (undefined for anonymous replies) */
  userId?: string;
  /** Content of the reply */
  content: string;
  /** Whether the reply was posted anonymously */
  isAnonymous: boolean;
  /** Number of likes the reply has received */
  likes: number;
  /** Whether the current user has liked this reply */
  isLiked?: boolean;
  /** Timestamp when the reply was created */
  timestamp: number;
}

/**
 * Database reply record structure from Supabase
 */
interface DatabaseReplyRecord {
  id: string;
  confession_id: string;
  user_id?: string;
  content: string;
  is_anonymous: boolean;
  likes: number;
  created_at: string;
}

export interface ReplyState {
  replies: Record<string, Reply[]>; // confessionId -> replies
  pagination: Record<string, { hasMore: boolean; lastCreatedAt?: string; isLoadingMore?: boolean }>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadReplies: (confessionId: string) => Promise<void>;
  loadMoreReplies: (confessionId: string) => Promise<void>;
  addReply: (confessionId: string, content: string, isAnonymous?: boolean) => Promise<void>;
  deleteReply: (replyId: string, confessionId: string) => Promise<void>;
  toggleReplyLike: (replyId: string, confessionId: string) => Promise<void>;
  clearError: () => void;
  getRepliesForConfession: (confessionId: string) => Reply[];
}

export const useReplyStore = create<ReplyState>()(
  persist(
    (set, get) => ({
      replies: {},
      pagination: {},
      isLoading: false,
      error: null,

      loadReplies: async (confessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          if (__DEV__) {
            console.log("Loading replies for confession:", confessionId);
          }

          // Check if confessionId is valid for database operations
          if (!isValidForDatabase(confessionId)) {
            if (__DEV__) {
              console.log(`Skipping replies for sample confession: ${confessionId}`);
            }
            // For sample data, just return empty replies
            set((state) => ({
              replies: {
                ...state.replies,
                [confessionId]: [],
              },
              isLoading: false,
            }));
            return;
          }

          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          // Load replies
          const INITIAL_LIMIT = 20;
          const { data, error } = await wrapWithRetry(async () => {
            return await supabase
              .from("replies")
              .select("*")
              .eq("confession_id", confessionId)
              .order("created_at", { ascending: false })
              .limit(INITIAL_LIMIT);
          })();

          if (error) {
            console.error("Supabase error loading replies:", error);
            throw error;
          }

          // Get user likes for these replies if user is authenticated
          let userLikes: string[] = [];
          if (user && data && data.length > 0) {
            try {
              const replyIds = data.map((reply) => reply.id);
              const { data: likesData, error: likesError } = await supabase
                .from("user_likes")
                .select("reply_id")
                .eq("user_id", user.id)
                .in("reply_id", replyIds);

              if (likesError) {
                console.warn("Failed to load user likes for replies:", likesError);
              }

              userLikes = likesData?.map((like) => like.reply_id).filter((v): v is string => !!v) || [];
            } catch (likesError) {
              console.warn("Error loading user likes:", likesError);
              // Continue without user likes
            }
          }

          const replies: Reply[] = (data || []).map((item) => ({
            id: item.id,
            confessionId: item.confession_id,
            userId: item.user_id || undefined,
            content: item.content,
            isAnonymous: item.is_anonymous,
            likes: item.likes || 0,
            isLiked: userLikes.includes(item.id),
            timestamp: new Date(item.created_at).getTime(),
          }));

          if (__DEV__) {
            console.log(`Loaded ${replies.length} replies for confession ${confessionId}`);
          }

          const hasMore = (data?.length || 0) >= INITIAL_LIMIT;
          const lastCreatedAt: string | undefined =
            data && data.length > 0 ? data[data.length - 1].created_at : undefined;

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: replies,
            },
            pagination: {
              ...state.pagination,
              [confessionId]: {
                hasMore,
                lastCreatedAt,
                isLoadingMore: false,
              },
            },
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error in loadReplies:", error);

          let errorMessage = "Failed to load replies";
          if (error instanceof Error) {
            errorMessage = error.message;

            // Handle specific Supabase errors
            if (error.message.includes('relation "replies" does not exist')) {
              errorMessage = "Replies feature is not yet available";
            } else if (error.message.includes("permission denied")) {
              errorMessage = "Unable to access replies at this time";
            }
          }

          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      loadMoreReplies: async (confessionId: string) => {
        const state = get();
        const page = state.pagination[confessionId] || {};
        if (page.isLoadingMore || page.hasMore === false) return;

        set({
          pagination: {
            ...state.pagination,
            [confessionId]: { ...page, isLoadingMore: true },
          },
          error: null,
        });

        try {
          const LIMIT = 10;
          const { data, error } = await wrapWithRetry(async () => {
            let q = supabase
              .from("replies")
              .select("*")
              .eq("confession_id", confessionId)
              .order("created_at", { ascending: false })
              .limit(LIMIT);
            if (page.lastCreatedAt) {
              q = q.lt("created_at", page.lastCreatedAt);
            }
            return await q;
          })();

          if (error) throw error;

          const newReplies: Reply[] = (data || []).map((item: DatabaseReplyRecord) => ({
            id: item.id,
            confessionId: item.confession_id,
            userId: item.user_id || undefined,
            content: item.content,
            isAnonymous: item.is_anonymous,
            likes: item.likes || 0,
            isLiked: false,
            timestamp: new Date(item.created_at).getTime(),
          }));

          const hasMore = (data?.length || 0) >= LIMIT;
          const lastCreatedAt: string | undefined =
            data && data.length > 0 ? data[data.length - 1].created_at : page.lastCreatedAt;

          set((curr) => ({
            replies: {
              ...curr.replies,
              [confessionId]: [...(curr.replies[confessionId] || []), ...newReplies],
            },
            pagination: {
              ...curr.pagination,
              [confessionId]: { hasMore, lastCreatedAt, isLoadingMore: false },
            },
          }));
        } catch (err) {
          set((curr) => ({
            error: err instanceof Error ? err.message : "Failed to load more replies",
            pagination: {
              ...curr.pagination,
              [confessionId]: { ...(curr.pagination[confessionId] || {}), isLoadingMore: false },
            },
          }));
        }
      },

      addReply: async (confessionId: string, content: string, isAnonymous = true) => {
        set({ isLoading: true, error: null });
        try {
          // Check if confessionId is valid for database operations
          if (!isValidForDatabase(confessionId)) {
            if (__DEV__) {
              console.log(`Cannot add reply to sample confession: ${confessionId}`);
            }
            throw new Error("Cannot add replies to sample confessions");
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();

          const { data, error } = await supabase
            .from("replies")
            .insert({
              confession_id: confessionId,
              user_id: user?.id,
              content: content.trim(),
              is_anonymous: isAnonymous,
            })
            .select()
            .single();

          if (error) throw error;

          const newReply: Reply = {
            id: data.id,
            confessionId: data.confession_id,
            userId: data.user_id || undefined,
            content: data.content,
            isAnonymous: data.is_anonymous,
            likes: data.likes,
            isLiked: false,
            timestamp: new Date(data.created_at).getTime(),
          };

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: [newReply, ...(state.replies[confessionId] || [])],
            },
            isLoading: false,
          }));

          // Trigger cache invalidation for new reply
          invalidateCache("reply_created", { replyId: newReply.id, confessionId });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to add reply",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteReply: async (replyId: string, confessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user to ensure they own the reply
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Delete reply with explicit user_id check for security
          const { error } = await supabase.from("replies").delete().eq("id", replyId).eq("user_id", user.id);

          if (error) throw error;

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: (state.replies[confessionId] || []).filter((reply) => reply.id !== replyId),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete reply",
            isLoading: false,
          });
          throw error;
        }
      },

      toggleReplyLike: async (replyId: string, confessionId: string) => {
        return debouncedOperation(`reply-like-${replyId}`, async () => {
          const state = get();
          const replies = state.replies[confessionId] || [];
          const reply = replies.find((r) => r.id === replyId);

          if (!reply) return;

          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const newIsLiked = !reply.isLiked;
          const optimisticLikes = reply.isLiked ? reply.likes - 1 : reply.likes + 1;

          // Optimistic update
          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: replies.map((r) =>
                r.id === replyId ? { ...r, likes: optimisticLikes, isLiked: newIsLiked } : r,
              ),
            },
          }));

          try {
            if (newIsLiked) {
              // Add like
              const { error: likeError } = await supabase
                .from("user_likes")
                .insert({ user_id: user.id, reply_id: replyId });

              if (likeError) throw likeError;

              // Update reply likes count
              const { error: updateError } = await supabase
                .from("replies")
                .update({ likes: optimisticLikes })
                .eq("id", replyId);

              if (updateError) throw updateError;
            } else {
              // Remove like
              const { error: unlikeError } = await supabase
                .from("user_likes")
                .delete()
                .eq("user_id", user.id)
                .eq("reply_id", replyId);

              if (unlikeError) throw unlikeError;

              // Update reply likes count
              const { error: updateError } = await supabase
                .from("replies")
                .update({ likes: optimisticLikes })
                .eq("id", replyId);

              if (updateError) throw updateError;
            }
          } catch (error) {
            // Revert optimistic update on error
            set((state) => ({
              replies: {
                ...state.replies,
                [confessionId]: replies.map((r) =>
                  r.id === replyId ? { ...r, likes: reply.likes, isLiked: reply.isLiked } : r,
                ),
              },
              error: error instanceof Error ? error.message : "Failed to update like",
            }));
          }
        });
      },

      clearError: () => {
        set({ error: null });
      },

      getRepliesForConfession: (confessionId: string) => {
        const state = get();
        return state.replies[confessionId] ?? [];
      },
    }),
    {
      name: "reply-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        replies: state.replies,
      }),
    },
  ),
);
