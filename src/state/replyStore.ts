import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { invalidateCache } from "../utils/cacheInvalidation";

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

export interface Reply {
  id: string;
  confessionId: string;
  userId?: string;
  content: string;
  isAnonymous: boolean;
  likes: number;
  isLiked?: boolean;
  timestamp: number;
}

export interface ReplyState {
  replies: Record<string, Reply[]>; // confessionId -> replies
  isLoading: boolean;
  error: string | null;

  // Actions
  loadReplies: (confessionId: string) => Promise<void>;
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
      isLoading: false,
      error: null,

      loadReplies: async (confessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          // Load replies
          const { data, error } = await supabase
            .from("replies")
            .select("*")
            .eq("confession_id", confessionId)
            .order("created_at", { ascending: false });

          if (error) throw error;

          // Get user likes for these replies if user is authenticated
          let userLikes: string[] = [];
          if (user && data.length > 0) {
            const replyIds = data.map((reply) => reply.id);
            const { data: likesData } = await supabase
              .from("user_likes")
              .select("reply_id")
              .eq("user_id", user.id)
              .in("reply_id", replyIds);

            userLikes = likesData?.map((like) => like.reply_id) || [];
          }

          const replies: Reply[] = data.map((item) => ({
            id: item.id,
            confessionId: item.confession_id,
            userId: item.user_id || undefined,
            content: item.content,
            isAnonymous: item.is_anonymous,
            likes: item.likes,
            isLiked: userLikes.includes(item.id),
            timestamp: new Date(item.created_at).getTime(),
          }));

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: replies,
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load replies",
            isLoading: false,
          });
        }
      },

      addReply: async (confessionId: string, content: string, isAnonymous = true) => {
        set({ isLoading: true, error: null });
        try {
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
          invalidateCache('reply_created', { replyId: newReply.id, confessionId });
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
          const { error } = await supabase
            .from("replies")
            .delete()
            .eq("id", replyId)
            .eq("user_id", user.id);

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
        return state.replies[confessionId] || [];
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
