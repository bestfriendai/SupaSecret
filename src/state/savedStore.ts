import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { Confession } from "../types/confession";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";

interface SavedState {
  savedConfessionIds: string[];
  savedConfessions: Confession[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastFetchTime: number | null;

  // Actions
  saveConfession: (confessionId: string) => Promise<void>;
  unsaveConfession: (confessionId: string) => Promise<void>;
  isSaved: (confessionId: string) => boolean;
  loadSavedConfessions: (refresh?: boolean) => Promise<void>;
  loadMoreSavedConfessions: () => Promise<void>;
  clearAllSaved: () => Promise<void>;
  clearError: () => void;
}

const ITEMS_PER_PAGE = 20;

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedConfessionIds: [],
      savedConfessions: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
      lastFetchTime: null,

      saveConfession: async (confessionId: string) => {
        try {
          const state = get();
          if (state.savedConfessionIds.includes(confessionId)) return;

          // Optimistically update the UI
          set({
            savedConfessionIds: [...state.savedConfessionIds, confessionId],
            error: null,
          });

          // Check if online, if not queue the action
          if (!offlineQueue.getNetworkStatus()) {
            await offlineQueue.enqueue(OFFLINE_ACTIONS.SAVE_CONFESSION, { confessionId });
            return;
          }

          // Try to save to backend
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from("user_saved_confessions")
              .insert({ user_id: user.id, confession_id: confessionId });

            if (error) {
              // Only enqueue for retry if the error is retryable (not unique constraint violations, etc.)
              const isRetryable = !error.code || !["23505", "23503", "23502"].includes(error.code); // Common non-retryable Postgres error codes
              if (isRetryable) {
                await offlineQueue.enqueue(OFFLINE_ACTIONS.SAVE_CONFESSION, { confessionId });
              }
              throw error;
            }
          }
        } catch (error) {
          // Revert optimistic update on error only if not queued
          if (offlineQueue.getNetworkStatus()) {
            set((state) => ({
              savedConfessionIds: state.savedConfessionIds.filter((id) => id !== confessionId),
              error: error instanceof Error ? error.message : "Failed to save confession",
            }));
          }
        }
      },

      unsaveConfession: async (confessionId: string) => {
        try {
          const state = get();

          // Optimistically update the UI
          set({
            savedConfessionIds: state.savedConfessionIds.filter((id) => id !== confessionId),
            savedConfessions: state.savedConfessions.filter((confession) => confession.id !== confessionId),
            error: null,
          });

          // Check if online, if not queue the action
          if (!offlineQueue.getNetworkStatus()) {
            await offlineQueue.enqueue(OFFLINE_ACTIONS.UNSAVE_CONFESSION, { confessionId });
            return;
          }

          // Try to remove from backend
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from("user_saved_confessions")
              .delete()
              .eq("user_id", user.id)
              .eq("confession_id", confessionId);

            if (error) {
              // If online operation fails, queue it for retry
              await offlineQueue.enqueue(OFFLINE_ACTIONS.UNSAVE_CONFESSION, { confessionId });
              throw error;
            }
          }
        } catch (error) {
          // Revert optimistic update on error only if not queued
          if (offlineQueue.getNetworkStatus()) {
            set((state) => ({
              savedConfessionIds: [...state.savedConfessionIds, confessionId],
              error: error instanceof Error ? error.message : "Failed to unsave confession",
            }));
          }
        }
      },

      isSaved: (confessionId: string) => {
        const state = get();
        return state.savedConfessionIds.includes(confessionId);
      },

      loadSavedConfessions: async (refresh = false) => {
        const state = get();

        // Skip if already loading or recently fetched (unless refreshing)
        if (state.isLoading || (!refresh && state.lastFetchTime && Date.now() - state.lastFetchTime < 30000)) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          if (state.savedConfessionIds.length === 0) {
            set({
              savedConfessions: [],
              isLoading: false,
              hasMore: false,
              lastFetchTime: Date.now(),
            });
            return;
          }

          // Fetch saved confessions from Supabase
          const { data: confessions, error } = await supabase
            .from("confessions")
            .select(
              `
              *,
              confession_likes!left(user_id)
            `,
            )
            .in("id", state.savedConfessionIds)
            .order("created_at", { ascending: false })
            .limit(ITEMS_PER_PAGE);

          if (error) throw error;

          // Process confessions to add like status
          const processedConfessions = (confessions || []).map((confession) => ({
            ...confession,
            isLiked: confession.confession_likes?.length > 0,
            likes: confession.likes || 0,
          }));

          set({
            savedConfessions: processedConfessions,
            isLoading: false,
            hasMore: processedConfessions.length === ITEMS_PER_PAGE,
            lastFetchTime: Date.now(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load saved confessions",
            isLoading: false,
          });
        }
      },

      loadMoreSavedConfessions: async () => {
        const state = get();

        if (state.isLoadingMore || !state.hasMore || state.savedConfessions.length === 0) {
          return;
        }

        set({ isLoadingMore: true, error: null });

        try {
          const remainingIds = state.savedConfessionIds.filter(
            (id) => !state.savedConfessions.some((confession) => confession.id === id),
          );

          if (remainingIds.length === 0) {
            set({ isLoadingMore: false, hasMore: false });
            return;
          }

          const { data: confessions, error } = await supabase
            .from("confessions")
            .select(
              `
              *,
              confession_likes!left(user_id)
            `,
            )
            .in("id", remainingIds.slice(0, ITEMS_PER_PAGE))
            .order("created_at", { ascending: false });

          if (error) throw error;

          const processedConfessions = (confessions || []).map((confession) => ({
            ...confession,
            isLiked: confession.confession_likes?.length > 0,
            likes: confession.likes || 0,
          }));

          set({
            savedConfessions: [...state.savedConfessions, ...processedConfessions],
            isLoadingMore: false,
            hasMore: remainingIds.length > ITEMS_PER_PAGE,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load more saved confessions",
            isLoadingMore: false,
          });
        }
      },

      clearAllSaved: async () => {
        try {
          set({
            savedConfessionIds: [],
            savedConfessions: [],
            hasMore: false,
            error: null,
          });

          // TODO: Clear from backend when user accounts are implemented
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to clear saved confessions",
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "saved-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedConfessionIds: state.savedConfessionIds,
      }),
    },
  ),
);
