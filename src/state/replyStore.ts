import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { wrapWithRetry } from "../utils/supabaseWithRetry";
import { invalidateCache } from "../utils/cacheInvalidation";
import { isValidForDatabase } from "../utils/consolidatedUtils";
import { registerStoreCleanup } from "../utils/storeCleanup";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { VideoDataService } from "../services/VideoDataService";

// Debounce utility for preventing race conditions
const pendingOperations = new Map<string, Promise<any>>();

const debouncedOperation = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  if (pendingOperations.has(key)) {
    return pendingOperations.get(key) as Promise<T>;
  }

  const promise = operation().finally(() => {
    pendingOperations.delete(key);
  });

  pendingOperations.set(key, promise);
  return promise;
};

// Comment reaction types - exported for use in components
export type ReactionType = 'heart' | 'laugh' | 'sad' | 'angry' | 'wow' | 'thumbs_up';

export interface Reaction {
  id: string;
  reply_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

/**
 * Enhanced Reply interface with threading support
 */
export interface Reply {
  id: string;
  confessionId: string;
  userId?: string;
  content: string;
  isAnonymous: boolean;
  likes: number;
  isLiked?: boolean;
  timestamp: number;
  // New threading fields
  parentId?: string | null;
  replies?: Reply[];
  replyCount?: number;
  depth?: number;
  // New reaction fields
  reactions?: Reaction[];
  reactionCounts?: Record<ReactionType, number>;
  userReactions?: ReactionType[];
  // New metadata fields
  edited_at?: string;
  deleted_at?: string;
  flagged?: boolean;
  flag_reason?: string;
  // Draft support
  isDraft?: boolean;
  draftId?: string;
}

/**
 * Enhanced database reply record structure
 */
interface DatabaseReplyRecord {
  id: string;
  confession_id: string;
  user_id: string | null;
  content: string;
  is_anonymous: boolean;
  likes: number;
  created_at: string;
  parent_id?: string | null;
  reply_count?: number;
  edited_at?: string;
  deleted_at?: string;
  flagged?: boolean;
  flag_reason?: string;
}

// Typing indicator state
interface TypingUser {
  userId: string;
  replyId?: string;
  timestamp: number;
}

// Comment draft
interface CommentDraft {
  id: string;
  confessionId: string;
  content: string;
  parentId?: string;
  timestamp: number;
}

export interface ReplyState {
  replies: Record<string, Reply[]>;
  pagination: Record<string, {
    hasMore: boolean;
    lastCreatedAt?: string;
    isLoadingMore?: boolean;
    isLoading?: boolean;
    cursor?: string;
    totalCount?: number;
  }>;
  loading: boolean;
  error: string | null;

  // New state fields
  typingUsers: Record<string, TypingUser[]>; // confessionId -> typing users
  drafts: Record<string, CommentDraft>; // confessionId -> draft
  searchResults: Record<string, Reply[]>; // confessionId -> search results
  searchQuery: string;
  offlineQueue: Array<{
    type: 'add' | 'edit' | 'delete' | 'react';
    payload: any;
    timestamp: number;
  }>;
  connectionStatus: 'online' | 'offline' | 'reconnecting';

  // Enhanced actions
  loadReplies: (confessionId: string, parentId?: string) => Promise<void>;
  loadMoreReplies: (confessionId: string) => Promise<void>;
  addReply: (confessionId: string, content: string, isAnonymous?: boolean, parentId?: string | null) => Promise<void>;
  deleteReply: (replyId: string, confessionId?: string) => Promise<void>;
  editReply: (replyId: string, content: string) => Promise<void>;
  toggleReplyLike: (replyId: string, confessionId: string) => Promise<void>;

  // New threading actions
  loadThreadReplies: (parentId: string) => Promise<void>;
  collapseThread: (replyId: string) => void;
  expandThread: (replyId: string) => void;

  // New reaction actions
  addReaction: (replyId: string, type: ReactionType) => Promise<void>;
  removeReaction: (replyId: string, type: ReactionType) => Promise<void>;

  // New search actions
  searchComments: (confessionId: string, query: string) => Promise<void>;
  clearSearch: () => void;

  // New moderation actions
  reportComment: (replyId: string, reason: string) => Promise<void>;
  flagComment: (replyId: string, reason: string) => Promise<void>;

  // New typing indicator actions
  startTyping: (confessionId: string, parentId?: string) => void;
  stopTyping: (confessionId: string, parentId?: string) => void;

  // New draft actions
  saveDraft: (confessionId: string, content: string, parentId?: string) => void;
  loadDraft: (confessionId: string) => CommentDraft | null;
  clearDraft: (confessionId: string) => void;

  // New offline support actions
  processOfflineQueue: () => Promise<void>;
  setConnectionStatus: (status: 'online' | 'offline' | 'reconnecting') => void;

  // Real-time subscription management
  subscribeToReplies: (confessionId: string) => void;
  unsubscribeFromReplies: () => void;
  subscribeToTypingIndicators: (confessionId: string) => void;
  unsubscribeFromTypingIndicators: () => void;

  // Utility actions
  bulkDeleteReplies: (replyIds: string[], confessionId: string) => Promise<void>;
  bulkToggleReplyLikes: (replyIds: string[], confessionId: string, like: boolean) => Promise<void>;
  clearError: () => void;
  getRepliesForConfession: (confessionId: string) => Reply[];
}

// Real-time subscription channels
let repliesChannel: any = null;
let typingChannel: any = null;
let reconnectTimer: any = null;
let reconnectAttempts = 0;
let typingTimers: Record<string, NodeJS.Timeout> = {};

export const useReplyStore = create<ReplyState>()(
  persist(
    (set, get) => ({
      replies: {},
      pagination: {},
      loading: false,
      error: null,
      typingUsers: {},
      drafts: {},
      searchResults: {},
      searchQuery: '',
      offlineQueue: [],
      connectionStatus: 'online',

      loadReplies: async (confessionId: string, parentId?: string) => {
        set({ loading: true, error: null });
        try {
          trackStoreOperation('replyStore', 'loadReplies', Date.now());

          if (!isValidForDatabase(confessionId)) {
            set((state) => ({
              replies: { ...state.replies, [confessionId]: [] },
              loading: false,
            }));
            return;
          }

          const { data: { user } } = await supabase.auth.getUser();

          const INITIAL_LIMIT = 20;
          let query = supabase
            .from("replies")
            .select(`
              *,
              reactions:comment_reactions(*),
              replies:replies!parent_id(count)
            `)
            .eq("confession_id", confessionId)
            .order("created_at", { ascending: false })
            .limit(INITIAL_LIMIT);

          if (parentId) {
            query = query.eq("parent_id", parentId);
          } else {
            query = query.is("parent_id", null);
          }

          const { data, error } = await wrapWithRetry(async () => query)();

          if (error) throw error;

          // Get user reactions if authenticated
          let userReactions: Record<string, ReactionType[]> = {};
          if (user && data && data.length > 0) {
            const replyIds = data.map(reply => reply.id);
            // Comment reactions table not yet implemented
            const reactionsData: any[] = [];

            if (reactionsData) {
              reactionsData.forEach(r => {
                if (!userReactions[r.reply_id]) userReactions[r.reply_id] = [];
                userReactions[r.reply_id].push(r.type as ReactionType);
              });
            }
          }

          // Get user likes
          let userLikes: string[] = [];
          if (user && data && data.length > 0) {
            const replyIds = data.map(reply => reply.id);
            const { data: likesData } = await supabase
              .from("user_likes")
              .select("reply_id")
              .eq("user_id", user.id)
              .in("reply_id", replyIds);

            userLikes = likesData?.map(like => like.reply_id).filter(Boolean) || [];
          }

          const replies: Reply[] = (data || []).map(item => {
            const reactionCounts: Record<ReactionType, number> = {
              heart: 0, laugh: 0, sad: 0, angry: 0, wow: 0, thumbs_up: 0
            };

            if (item.reactions) {
              item.reactions.forEach((r: any) => {
                if (reactionCounts[r.type as ReactionType] !== undefined) {
                  reactionCounts[r.type as ReactionType]++;
                }
              });
            }

            return {
              id: item.id,
              confessionId: item.confession_id,
              userId: item.user_id || undefined,
              content: item.content,
              isAnonymous: item.is_anonymous,
              likes: item.likes || 0,
              isLiked: userLikes.includes(item.id),
              timestamp: new Date(item.created_at).getTime(),
              parentId: (item as any).parent_id,
              replyCount: item.replies?.[0]?.count || 0,
              reactions: item.reactions || [],
              reactionCounts,
              userReactions: userReactions[item.id] || [],
              edited_at: item.edited_at,
              deleted_at: item.deleted_at,
              flagged: item.flagged,
              flag_reason: item.flag_reason,
            };
          });

          const hasMore = (data?.length || 0) >= INITIAL_LIMIT;
          const lastCreatedAt = data?.[data.length - 1]?.created_at;

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
                isLoading: false,
                totalCount: replies.length,
              },
            },
            loading: false,
          }));

          // Track analytics
          VideoDataService.trackVideoEvent('comments_loaded', {
            confession_id: confessionId,
            count: replies.length,
            has_parent: !!parentId,
          });
        } catch (error) {
          console.error("Error loading replies:", error);
          set({
            error: error instanceof Error ? error.message : "Failed to load comments",
            loading: false,
          });
        }
      },

      loadMoreReplies: async (confessionId: string) => {
        const state = get();
        const page = state.pagination[confessionId];
        if (!page || page.isLoadingMore || !page.hasMore) return;

        set({
          pagination: {
            ...state.pagination,
            [confessionId]: { ...page, isLoadingMore: true },
          },
        });

        try {
          const LIMIT = 10;
          let query = supabase
            .from("replies")
            .select(`
              *,
              reactions:comment_reactions(*),
              replies:replies!parent_id(count)
            `)
            .eq("confession_id", confessionId)
            .is("parent_id", null)
            .order("created_at", { ascending: false })
            .limit(LIMIT);

          if (page.lastCreatedAt) {
            query = query.lt("created_at", page.lastCreatedAt);
          }

          const { data, error } = await wrapWithRetry(async () => query)();
          if (error) throw error;

          const newReplies: Reply[] = (data || []).map(item => ({
            id: item.id,
            confessionId: item.confession_id,
            userId: item.user_id || undefined,
            content: item.content,
            isAnonymous: item.is_anonymous,
            likes: item.likes || 0,
            timestamp: new Date(item.created_at).getTime(),
            parentId: (item as any).parent_id,
            replyCount: item.replies?.[0]?.count || 0,
            reactions: item.reactions || [],
          }));

          const hasMore = (data?.length || 0) >= LIMIT;
          const lastCreatedAt = data?.[data.length - 1]?.created_at || page.lastCreatedAt;

          set((curr) => ({
            replies: {
              ...curr.replies,
              [confessionId]: [...(curr.replies[confessionId] || []), ...newReplies],
            },
            pagination: {
              ...curr.pagination,
              [confessionId]: {
                hasMore,
                lastCreatedAt,
                isLoadingMore: false,
                totalCount: (curr.replies[confessionId]?.length || 0) + newReplies.length,
              },
            },
          }));
        } catch (error) {
          set((curr) => ({
            error: error instanceof Error ? error.message : "Failed to load more comments",
            pagination: {
              ...curr.pagination,
              [confessionId]: { ...(curr.pagination[confessionId] || {}), isLoadingMore: false },
            },
          }));
        }
      },

      addReply: async (confessionId: string, content: string, isAnonymous = true, parentId?: string | null) => {
        const state = get();

        // Save to offline queue if offline
        if (state.connectionStatus === 'offline') {
          set((state) => ({
            offlineQueue: [...state.offlineQueue, {
              type: 'add',
              payload: { confessionId, content, isAnonymous, parentId },
              timestamp: Date.now(),
            }],
          }));
          return;
        }

        set({ loading: true, error: null });
        try {
          if (!isValidForDatabase(confessionId)) {
            throw new Error("Cannot add replies to sample confessions");
          }

          const { data: { user } } = await supabase.auth.getUser();

          // Optimistic update
          const tempId = `temp-${Date.now()}`;
          const optimisticReply: Reply = {
            id: tempId,
            confessionId,
            userId: user?.id,
            content: content.trim(),
            isAnonymous,
            likes: 0,
            isLiked: false,
            timestamp: Date.now(),
            parentId,
            reactions: [],
            reactionCounts: { heart: 0, laugh: 0, sad: 0, angry: 0, wow: 0, thumbs_up: 0 },
            userReactions: [],
          };

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: [optimisticReply, ...(state.replies[confessionId] || [])],
            },
          }));

          const { data, error } = await supabase
            .from("replies")
            .insert({
              confession_id: confessionId,
              user_id: user?.id,
              content: content.trim(),
              is_anonymous: isAnonymous,
              parent_id: parentId,
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
            likes: data.likes || 0,
            isLiked: false,
            timestamp: new Date(data.created_at).getTime(),
            parentId: data.parent_id,
            reactions: [],
            reactionCounts: { heart: 0, laugh: 0, sad: 0, angry: 0, wow: 0, thumbs_up: 0 },
            userReactions: [],
          };

          // Replace optimistic update with real data
          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: state.replies[confessionId].map(r =>
                r.id === tempId ? newReply : r
              ),
            },
            loading: false,
          }));

          // Clear draft after successful submission
          get().clearDraft(confessionId);

          // Trigger cache invalidation
          invalidateCache("reply_created", { replyId: newReply.id, confessionId });

          // Track analytics
          VideoDataService.trackVideoEvent('comment_added', {
            confession_id: confessionId,
            parent_id: parentId,
            is_anonymous: isAnonymous,
            content_length: content.length,
          });
        } catch (error) {
          // Remove optimistic update on error
          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: state.replies[confessionId].filter(r => !r.id.startsWith('temp-')),
            },
            error: error instanceof Error ? error.message : "Failed to add comment",
            loading: false,
          }));
          throw error;
        }
      },

      deleteReply: async (replyId: string, confessionId?: string) => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase
            .from("replies")
            .delete()
            .eq("id", replyId)
            .eq("user_id", user.id);

          if (error) throw error;

          // Update all confession replies that might contain this reply
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].filter(r => r.id !== replyId);
            });
            return { replies: newReplies, loading: false };
          });

          VideoDataService.trackVideoEvent('comment_deleted', { confession_id: '' });  // TODO: Add confession_id
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete comment",
            loading: false,
          });
          throw error;
        }
      },

      editReply: async (replyId: string, content: string) => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("replies")
            .update({
              content: content.trim(),
              edited_at: new Date().toISOString(),
            })
            .eq("id", replyId)
            .eq("user_id", user.id)
            .select()
            .single();

          if (error) throw error;

          // Update in all confessions
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].map(r =>
                r.id === replyId ? { ...r, content: data.content, edited_at: data.edited_at } : r
              );
            });
            return { replies: newReplies, loading: false };
          });

          VideoDataService.trackVideoEvent('comment_edited', { confession_id: '' });  // TODO: Add confession_id
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to edit comment",
            loading: false,
          });
          throw error;
        }
      },

      toggleReplyLike: async (replyId: string, confessionId: string) => {
        return debouncedOperation(`reply-like-${replyId}`, async () => {
          const state = get();
          const replies = state.replies[confessionId] || [];
          const reply = replies.find(r => r.id === replyId);

          if (!reply) return;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const newIsLiked = !reply.isLiked;
          const optimisticLikes = newIsLiked ? reply.likes + 1 : Math.max(0, reply.likes - 1);

          // Optimistic update
          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: replies.map(r =>
                r.id === replyId ? { ...r, likes: optimisticLikes, isLiked: newIsLiked } : r
              ),
            },
          }));

          try {
            if (newIsLiked) {
              await supabase.from("user_likes").insert({ user_id: user.id, reply_id: replyId });
              await supabase.from("replies").update({ likes: optimisticLikes }).eq("id", replyId);
            } else {
              await supabase.from("user_likes").delete().eq("user_id", user.id).eq("reply_id", replyId);
              await supabase.from("replies").update({ likes: optimisticLikes }).eq("id", replyId);
            }

            VideoDataService.trackVideoEvent(newIsLiked ? 'comment_liked' : 'comment_unliked', {
              reply_id: replyId,
              confession_id: confessionId,
            });
          } catch (error) {
            // Revert optimistic update
            set((state) => ({
              replies: {
                ...state.replies,
                [confessionId]: replies,
              },
              error: error instanceof Error ? error.message : "Failed to update like",
            }));
          }
        });
      },

      // Threading actions
      loadThreadReplies: async (parentId: string) => {
        try {
          const { data, error } = await supabase
            .from("replies")
            .select("*")
            .eq("parent_id", parentId)
            .order("created_at", { ascending: true });

          if (error) throw error;

          // Update parent reply with children
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].map(r => {
                if (r.id === parentId) {
                  return { ...r, replies: data.map((d: any) => ({
                    id: d.id,
                    confessionId: d.confession_id,
                    content: d.content,
                    userId: d.user_id,
                    isAnonymous: d.is_anonymous,
                    likes: d.likes,
                    timestamp: new Date(d.created_at).getTime(),
                    parentId: d.parent_id,
                  }))};
                }
                return r;
              });
            });
            return { replies: newReplies };
          });
        } catch (error) {
          console.error("Error loading thread replies:", error);
        }
      },

      collapseThread: (replyId: string) => {
        set((state) => {
          const newReplies = { ...state.replies };
          Object.keys(newReplies).forEach(cId => {
            newReplies[cId] = newReplies[cId].map(r =>
              r.id === replyId ? { ...r, replies: undefined } : r
            );
          });
          return { replies: newReplies };
        });
      },

      expandThread: (replyId: string) => {
        get().loadThreadReplies(replyId);
      },

      // Reaction actions
      addReaction: async (replyId: string, type: ReactionType) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from("comment_reactions")
            .insert({ reply_id: replyId, user_id: user.id, type });

          if (error) throw error;

          // Update local state
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].map(r => {
                if (r.id === replyId) {
                  const newReactionCounts = { ...r.reactionCounts };
                  newReactionCounts[type] = (newReactionCounts[type] || 0) + 1;
                  return {
                    ...r,
                    reactionCounts: newReactionCounts,
                    userReactions: [...(r.userReactions || []), type],
                  };
                }
                return r;
              });
            });
            return { replies: newReplies };
          });

          VideoDataService.trackVideoEvent('comment_reaction_added', {
            confession_id: '',  // TODO: Add confession_id
            reaction_type: type,
          });
        } catch (error) {
          console.error("Error adding reaction:", error);
        }
      },

      removeReaction: async (replyId: string, type: ReactionType) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from("comment_reactions")
            .delete()
            .eq("reply_id", replyId)
            .eq("user_id", user.id)
            .eq("type", type);

          if (error) throw error;

          // Update local state
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].map(r => {
                if (r.id === replyId) {
                  const newReactionCounts = { ...r.reactionCounts };
                  newReactionCounts[type] = Math.max(0, (newReactionCounts[type] || 0) - 1);
                  return {
                    ...r,
                    reactionCounts: newReactionCounts,
                    userReactions: (r.userReactions || []).filter(rt => rt !== type),
                  };
                }
                return r;
              });
            });
            return { replies: newReplies };
          });

          VideoDataService.trackVideoEvent('comment_reaction_removed', {
            confession_id: '',  // TODO: Add confession_id
            reaction_type: type,
          });
        } catch (error) {
          console.error("Error removing reaction:", error);
        }
      },

      // Search actions
      searchComments: async (confessionId: string, query: string) => {
        set({ loading: true, searchQuery: query });
        try {
          const { data, error } = await supabase
            .from("replies")
            .select("*")
            .eq("confession_id", confessionId)
            .textSearch("content", query)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const searchResults: Reply[] = (data || []).map(item => ({
            id: item.id,
            confessionId: item.confession_id,
            userId: item.user_id || undefined,
            content: item.content,
            isAnonymous: item.is_anonymous,
            likes: item.likes || 0,
            timestamp: new Date(item.created_at).getTime(),
            parentId: (item as any).parent_id,
          }));

          set((state) => ({
            searchResults: { ...state.searchResults, [confessionId]: searchResults },
            loading: false,
          }));

          VideoDataService.trackVideoEvent('comments_searched', {
            confession_id: confessionId,
            query,
            results_count: searchResults.length,
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Search failed", loading: false });
        }
      },

      clearSearch: () => {
        set({ searchResults: {}, searchQuery: '' });
      },

      // Moderation actions
      reportComment: async (replyId: string, reason: string) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Comment reports table not yet implemented
          const error = null;
          // await supabase
          //   .from("comment_reports")
          //   .insert({ reply_id: replyId, user_id: user.id, reason });

          if (error) throw error;

          VideoDataService.trackVideoEvent('comment_reported', { confession_id: '', reason });  // TODO: Add confession_id
        } catch (error) {
          console.error("Error reporting comment:", error);
        }
      },

      flagComment: async (replyId: string, reason: string) => {
        try {
          const { error } = await supabase
            .from("replies")
            .update({ flagged: true, flag_reason: reason })
            .eq("id", replyId);

          if (error) throw error;

          // Update local state
          set((state) => {
            const newReplies = { ...state.replies };
            Object.keys(newReplies).forEach(cId => {
              newReplies[cId] = newReplies[cId].map(r =>
                r.id === replyId ? { ...r, flagged: true, flag_reason: reason } : r
              );
            });
            return { replies: newReplies };
          });
        } catch (error) {
          console.error("Error flagging comment:", error);
        }
      },

      // Typing indicators
      startTyping: async (confessionId: string, parentId?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const key = `${confessionId}-${parentId || 'main'}`;

        // Clear existing timer
        if (typingTimers[key]) {
          clearTimeout(typingTimers[key]);
        }

        // Broadcast typing event
        if (typingChannel) {
          typingChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { confessionId, parentId, userId: user.id },
          });
        }

        // Auto-stop typing after 3 seconds
        typingTimers[key] = setTimeout(() => {
          get().stopTyping(confessionId, parentId);
        }, 3000);
      },

      stopTyping: async (confessionId: string, parentId?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const key = `${confessionId}-${parentId || 'main'}`;

        // Clear timer
        if (typingTimers[key]) {
          clearTimeout(typingTimers[key]);
          delete typingTimers[key];
        }

        // Broadcast stop typing event
        if (typingChannel) {
          typingChannel.send({
            type: 'broadcast',
            event: 'stop_typing',
            payload: { confessionId, parentId, userId: user.id },
          });
        }
      },

      // Draft management
      saveDraft: (confessionId: string, content: string, parentId?: string) => {
        const draft: CommentDraft = {
          id: `draft-${confessionId}`,
          confessionId,
          content,
          parentId,
          timestamp: Date.now(),
        };

        set((state) => ({
          drafts: { ...state.drafts, [confessionId]: draft },
        }));
      },

      loadDraft: (confessionId: string) => {
        const state = get();
        return state.drafts[confessionId] || null;
      },

      clearDraft: (confessionId: string) => {
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[confessionId];
          return { drafts: newDrafts };
        });
      },

      // Offline support
      processOfflineQueue: async () => {
        const state = get();
        if (state.connectionStatus !== 'online' || state.offlineQueue.length === 0) return;

        const queue = [...state.offlineQueue];
        set({ offlineQueue: [] });

        for (const item of queue) {
          try {
            switch (item.type) {
              case 'add':
                await get().addReply(
                  item.payload.confessionId,
                  item.payload.content,
                  item.payload.isAnonymous,
                  item.payload.parentId
                );
                break;
              case 'edit':
                await get().editReply(item.payload.replyId, item.payload.content);
                break;
              case 'delete':
                await get().deleteReply(item.payload.replyId);
                break;
              case 'react':
                await get().addReaction(item.payload.replyId, item.payload.type);
                break;
            }
          } catch (error) {
            console.error("Error processing offline queue item:", error);
            // Re-add to queue if failed
            set((state) => ({
              offlineQueue: [...state.offlineQueue, item],
            }));
          }
        }
      },

      setConnectionStatus: (status) => {
        set({ connectionStatus: status });
        if (status === 'online') {
          get().processOfflineQueue();
        }
      },

      // Real-time subscriptions
      subscribeToReplies: (confessionId: string) => {
        if (repliesChannel) return;

        repliesChannel = supabase
          .channel(`replies:${confessionId}`)
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'replies', filter: `confession_id=eq.${confessionId}` },
            (payload) => {
              const reply = payload.new as DatabaseReplyRecord;
              set((state) => {
                const existing = state.replies[confessionId] || [];
                if (existing.find(r => r.id === reply.id)) return state;

                const newReply: Reply = {
                  id: reply.id,
                  confessionId: reply.confession_id,
                  userId: reply.user_id || undefined,
                  content: reply.content,
                  isAnonymous: reply.is_anonymous,
                  likes: reply.likes || 0,
                  timestamp: new Date(reply.created_at).getTime(),
                  parentId: reply.parent_id,
                };

                return {
                  replies: {
                    ...state.replies,
                    [confessionId]: [newReply, ...existing].slice(0, 200),
                  },
                };
              });
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'replies' },
            (payload) => {
              const reply = payload.new as DatabaseReplyRecord;
              set((state) => {
                const newReplies = { ...state.replies };
                if (newReplies[confessionId]) {
                  newReplies[confessionId] = newReplies[confessionId].map(r =>
                    r.id === reply.id ? { ...r, likes: reply.likes || r.likes, content: reply.content } : r
                  );
                }
                return { replies: newReplies };
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              reconnectAttempts = 0;
              set({ connectionStatus: 'online' });
            }
            if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              set({ connectionStatus: 'reconnecting' });
              const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts++));
              reconnectTimer = setTimeout(() => {
                get().unsubscribeFromReplies();
                get().subscribeToReplies(confessionId);
              }, delay);
            }
          });
      },

      unsubscribeFromReplies: () => {
        if (repliesChannel) {
          repliesChannel.unsubscribe();
          repliesChannel = null;
        }
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      },

      subscribeToTypingIndicators: (confessionId: string) => {
        if (typingChannel) return;

        typingChannel = supabase
          .channel(`typing:${confessionId}`)
          .on('broadcast', { event: 'typing' }, (payload) => {
            const { userId, parentId } = payload.payload;
            set((state) => {
              const key = parentId || 'main';
              const typing = state.typingUsers[confessionId] || [];
              const newTyping = typing.filter(t => t.userId !== userId);
              newTyping.push({ userId, replyId: parentId, timestamp: Date.now() });
              return {
                typingUsers: {
                  ...state.typingUsers,
                  [confessionId]: newTyping,
                },
              };
            });
          })
          .on('broadcast', { event: 'stop_typing' }, (payload) => {
            const { userId } = payload.payload;
            set((state) => {
              const typing = state.typingUsers[confessionId] || [];
              return {
                typingUsers: {
                  ...state.typingUsers,
                  [confessionId]: typing.filter(t => t.userId !== userId),
                },
              };
            });
          })
          .subscribe();
      },

      unsubscribeFromTypingIndicators: () => {
        if (typingChannel) {
          typingChannel.unsubscribe();
          typingChannel = null;
        }
        // Clear all typing timers
        Object.values(typingTimers).forEach(timer => clearTimeout(timer));
        typingTimers = {};
      },

      // Bulk actions
      bulkDeleteReplies: async (replyIds: string[], confessionId: string) => {
        set({ loading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase
            .from("replies")
            .delete()
            .in("id", replyIds)
            .eq("user_id", user.id);

          if (error) throw error;

          set((state) => ({
            replies: {
              ...state.replies,
              [confessionId]: (state.replies[confessionId] || []).filter(r => !replyIds.includes(r.id)),
            },
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to delete comments", loading: false });
          throw error;
        }
      },

      bulkToggleReplyLikes: async (replyIds: string[], confessionId: string, like: boolean) => {
        const state = get();
        const replies = state.replies[confessionId] || [];

        // Optimistic batch update
        set({
          replies: {
            ...state.replies,
            [confessionId]: replies.map(r =>
              replyIds.includes(r.id)
                ? { ...r, likes: like ? r.likes + 1 : Math.max(0, r.likes - 1), isLiked: like }
                : r
            ),
          },
        });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          if (like) {
            const rows = replyIds.map(id => ({ user_id: user.id, reply_id: id }));
            const { error } = await supabase.from("user_likes").insert(rows);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("user_likes")
              .delete()
              .eq("user_id", user.id)
              .in("reply_id", replyIds);
            if (error) throw error;
          }
        } catch (error) {
          // Revert on error
          set({ replies: { ...state.replies, [confessionId]: replies } });
          set({ error: error instanceof Error ? error.message : "Failed to update likes" });
        }
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
        drafts: state.drafts,
        offlineQueue: state.offlineQueue,
      }),
    },
  ),
);

// Cleanup function
const cleanupSubscriptions = () => {
  const store = useReplyStore.getState();
  store.unsubscribeFromReplies();
  store.unsubscribeFromTypingIndicators();
};

// Register cleanup
registerStoreCleanup("replyStore", cleanupSubscriptions);