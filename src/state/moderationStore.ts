/**
 * Moderation Store
 * Handles user blocking, content hiding, and moderation actions
 * Required for App Store Guideline 1.2 - User Generated Content
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export interface BlockedUser {
  userId: string;
  blockedAt: string;
  reason?: string;
}

export interface HiddenContent {
  contentId: string;
  contentType: "confession" | "reply";
  hiddenAt: string;
  reason?: string;
}

interface ModerationState {
  blockedUsers: BlockedUser[];
  hiddenContent: HiddenContent[];
  isLoading: boolean;
  error: string | null;

  // Actions
  blockUser: (userId: string, reason?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isUserBlocked: (userId: string) => boolean;

  hideContent: (contentId: string, contentType: "confession" | "reply", reason?: string) => Promise<void>;
  unhideContent: (contentId: string) => Promise<void>;
  isContentHidden: (contentId: string) => boolean;

  loadBlockedUsers: () => Promise<void>;
  clearError: () => void;
}

export const useModerationStore = create<ModerationState>()(
  persist(
    (set, get) => ({
      blockedUsers: [],
      hiddenContent: [],
      isLoading: false,
      error: null,

      /**
       * Block a user - prevents seeing their content
       */
      blockUser: async (userId: string, reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Add to local state immediately
          const blockedUser: BlockedUser = {
            userId,
            blockedAt: new Date().toISOString(),
            reason,
          };

          set((state) => ({
            blockedUsers: [...state.blockedUsers.filter((b) => b.userId !== userId), blockedUser],
            isLoading: false,
          }));

          // Save to database
          const { error } = await supabase.from("blocked_users" as any).upsert(
            {
              user_id: user.id,
              blocked_user_id: userId,
              reason: reason || null,
              created_at: blockedUser.blockedAt,
            },
            { onConflict: "user_id,blocked_user_id" },
          );

          if (error) {
            console.error("Failed to save block to database:", error);
            // Don't throw - local block still works
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to block user",
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Unblock a user
       */
      unblockUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Remove from local state
          set((state) => ({
            blockedUsers: state.blockedUsers.filter((b) => b.userId !== userId),
            isLoading: false,
          }));

          // Remove from database
          const { error } = await supabase
            .from("blocked_users" as any)
            .delete()
            .eq("user_id", user.id)
            .eq("blocked_user_id", userId);

          if (error) {
            console.error("Failed to remove block from database:", error);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to unblock user",
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Check if a user is blocked
       */
      isUserBlocked: (userId: string) => {
        return get().blockedUsers.some((b) => b.userId === userId);
      },

      /**
       * Hide content immediately from feed
       */
      hideContent: async (contentId: string, contentType: "confession" | "reply", reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          const hiddenItem: HiddenContent = {
            contentId,
            contentType,
            hiddenAt: new Date().toISOString(),
            reason,
          };

          set((state) => ({
            hiddenContent: [...state.hiddenContent.filter((h) => h.contentId !== contentId), hiddenItem],
            isLoading: false,
          }));

          // Optionally save to database for sync across devices
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("hidden_content" as any).upsert(
              {
                user_id: user.id,
                content_id: contentId,
                content_type: contentType,
                reason: reason || null,
                created_at: hiddenItem.hiddenAt,
              },
              { onConflict: "user_id,content_id" },
            );
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to hide content",
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Unhide content
       */
      unhideContent: async (contentId: string) => {
        set({ isLoading: true, error: null });
        try {
          set((state) => ({
            hiddenContent: state.hiddenContent.filter((h) => h.contentId !== contentId),
            isLoading: false,
          }));

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("hidden_content" as any)
              .delete()
              .eq("user_id", user.id)
              .eq("content_id", contentId);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to unhide content",
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Check if content is hidden
       */
      isContentHidden: (contentId: string) => {
        return get().hiddenContent.some((h) => h.contentId === contentId);
      },

      /**
       * Load blocked users from database
       */
      loadBlockedUsers: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            set({ isLoading: false });
            return;
          }

          const { data, error } = await supabase
            .from("blocked_users" as any)
            .select("blocked_user_id, reason, created_at")
            .eq("user_id", user.id);

          if (error) throw error;

          const blockedUsers: BlockedUser[] =
            data?.map((item: any) => ({
              userId: item.blocked_user_id,
              blockedAt: item.created_at,
              reason: item.reason || undefined,
            })) || [];

          set({ blockedUsers, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load blocked users",
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "moderation-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        blockedUsers: state.blockedUsers,
        hiddenContent: state.hiddenContent,
      }),
    },
  ),
);
