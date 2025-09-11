import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { NotificationState, Notification, GroupedNotification } from "../types/notification";

// Helper function to group notifications
const groupNotifications = (notifications: Notification[]): GroupedNotification[] => {
  const groups = new Map<string, GroupedNotification>();

  notifications.forEach((notification) => {
    const key = `${notification.type}-${notification.entity_id}`;

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count += 1;
      group.notifications.push(notification);
      group.is_read = group.is_read && !!notification.read_at;

      // Update to latest timestamp
      if (new Date(notification.created_at) > new Date(group.latest_created_at)) {
        group.latest_created_at = notification.created_at;
        group.message = notification.message;
      }
    } else {
      groups.set(key, {
        id: key,
        type: notification.type,
        entity_id: notification.entity_id,
        entity_type: notification.entity_type,
        message: notification.message,
        count: 1,
        latest_created_at: notification.created_at,
        is_read: !!notification.read_at,
        notifications: [notification],
      });
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime(),
  );
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      groupedNotifications: [],
      preferences: null,
      unreadCount: 0,
      isLoading: false,
      error: null,

      loadNotifications: async () => {
        set({ isLoading: true, error: null });

        // Set up real-time subscriptions if not already done
        setupNotificationSubscriptions();

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);

          if (error) throw error;

          const notifications: Notification[] = data || [];
          const groupedNotifications = groupNotifications(notifications);
          const unreadCount = notifications.filter((n) => !n.read_at).length;

          set({
            notifications,
            groupedNotifications,
            unreadCount,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load notifications",
            isLoading: false,
          });
        }
      },

      loadPreferences: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

          if (data) {
            set({ preferences: data });
          } else {
            // Create default preferences
            const defaultPreferences = {
              user_id: user.id,
              likes_enabled: true,
              replies_enabled: true,
              push_enabled: false,
              quiet_hours_start: "22:00:00",
              quiet_hours_end: "08:00:00",
            };

            const { data: newPrefs, error: insertError } = await supabase
              .from("notification_preferences")
              .insert(defaultPreferences)
              .select()
              .single();

            if (insertError) throw insertError;
            set({ preferences: newPrefs });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load preferences",
          });
        }
      },

      updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase
            .from("notification_preferences")
            .upsert({
              user_id: user.id,
              ...preferences,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            preferences: { ...state.preferences, ...data },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update preferences",
            isLoading: false,
          });
        }
      },

      markAsRead: async (notificationId) => {
        try {
          // Get current user to ensure they own the notification
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Update notification with explicit user_id check for security
          const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", notificationId)
            .eq("user_id", user.id);

          if (error) throw error;

          set((state) => {
            const updatedNotifications = state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n,
            );

            return {
              notifications: updatedNotifications,
              groupedNotifications: groupNotifications(updatedNotifications),
              unreadCount: updatedNotifications.filter((n) => !n.read_at).length,
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to mark as read",
          });
        }
      },

      markAllAsRead: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .is("read_at", null);

          if (error) throw error;

          set((state) => {
            const updatedNotifications = state.notifications.map((n) => ({
              ...n,
              read_at: n.read_at || new Date().toISOString(),
            }));

            return {
              notifications: updatedNotifications,
              groupedNotifications: groupNotifications(updatedNotifications),
              unreadCount: 0,
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to mark all as read",
          });
        }
      },

      clearAllNotifications: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);

          if (error) throw error;

          set({
            notifications: [],
            groupedNotifications: [],
            unreadCount: 0,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to clear notifications",
          });
        }
      },

      getUnreadCount: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data, error } = await supabase.rpc("get_unread_notification_count", { target_user_id: user.id });

          if (error) throw error;

          const count = data || 0;
          set({ unreadCount: count });
          return count;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to get unread count",
          });
          return 0;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      cleanup: () => {
        cleanupNotificationSubscriptions();
      },
    }),
    {
      name: "notification-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        groupedNotifications: state.groupedNotifications,
        preferences: state.preferences,
        unreadCount: state.unreadCount,
      }),
    },
  ),
);

// Notification subscription management
let notificationChannel: any = null;

// Cleanup function for notification subscriptions
const cleanupNotificationSubscriptions = () => {
  if (notificationChannel) {
    notificationChannel.unsubscribe();
    notificationChannel = null;
  }
};

// Function to set up real-time subscriptions for notifications
const setupNotificationSubscriptions = () => {
  if (notificationChannel) return; // Already set up

  notificationChannel = supabase
    .channel("notifications")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      const { loadNotifications } = useNotificationStore.getState();
      loadNotifications(); // Reload notifications when new ones are added
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
      const { loadNotifications } = useNotificationStore.getState();
      loadNotifications(); // Reload notifications when they're updated
    })
    .subscribe();
};

// Export functions for app-level management
export { cleanupNotificationSubscriptions, setupNotificationSubscriptions };
