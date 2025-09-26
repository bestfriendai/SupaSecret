import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Expo SDK 53 NotificationBehavior fields
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // iOS specific fields for newer SDKs
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private pushToken: string | null = null;

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  /**
   * Request notification permissions and register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn("Push notifications only work on physical devices");
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Push notification permissions not granted");
        return null;
      }

      // Get push token with comprehensive fallback strategy
      const projectId =
        process.env.EXPO_PUBLIC_PROJECT_ID ||
        process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID ||
        (Constants.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants.expoConfig as any)?.projectId;

      if (!projectId) {
        if (__DEV__) {
          console.warn("Expo projectId missing from all sources; skipping push token registration");
          console.warn("Available sources checked:", {
            env_project_id: !!process.env.EXPO_PUBLIC_PROJECT_ID,
            env_vibecode_project_id: !!process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID,
            expo_config_eas: !!(Constants.expoConfig as any)?.extra?.eas?.projectId,
            expo_config_direct: !!(Constants.expoConfig as any)?.projectId,
          });
        }
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

      this.pushToken = tokenData.data;

      // Store token in database
      await this.storePushToken(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  /**
   * Store push token in database with proper error handling
   */
  private async storePushToken(token: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (__DEV__) {
          console.warn("Cannot store push token: User not authenticated");
        }
        return;
      }

      const platform: "ios" | "android" | "web" =
        Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web" ? Platform.OS : "web";

      // First check if the push_tokens table exists by attempting a simple query
      const { error: tableCheckError } = await supabase.from("push_tokens").select("user_id").limit(1);

      if (tableCheckError) {
        if (__DEV__) {
          console.warn("push_tokens table may not exist:", tableCheckError.message);
          console.warn("Push token storage skipped - ensure database migration is run");
        }
        return;
      }

      const { error } = await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" },
      );

      if (error) {
        if (__DEV__) {
          console.error("Error storing push token:", error);
        }
      } else if (__DEV__) {
        console.log("Push token stored successfully");
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Error storing push token:", error);
      }
    }
  }

  /**
   * Remove push token from database (when user disables notifications)
   */
  async removePushToken(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("push_tokens").delete().eq("user_id", user.id);

      if (error) {
        console.error("Error removing push token:", error);
      }

      this.pushToken = null;
    } catch (error) {
      console.error("Error removing push token:", error);
    }
  }

  /**
   * Check if push notifications are enabled for the current user
   */
  async arePushNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted" && this.pushToken !== null;
    } catch (error) {
      console.error("Error checking push notification status:", error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received in foreground:", notification);
    });

    // Handle notification tapped
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification tapped:", response);

      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      if (data?.type === "like" || data?.type === "reply") {
        // Navigate to notifications screen or specific confession
        // This would be handled by the navigation system
      }
    });

    return {
      foregroundSubscription,
      responseSubscription,
    };
  }

  /**
   * Clean up notification listeners
   */
  cleanupListeners(subscriptions: {
    foregroundSubscription: Notifications.Subscription;
    responseSubscription: Notifications.Subscription;
  }) {
    subscriptions.foregroundSubscription.remove();
    subscriptions.responseSubscription.remove();
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if current time is within quiet hours
   */
  isWithinQuietHours(quietStart: string, quietEnd: string): boolean {
    // Input validation
    if (!quietStart || !quietEnd || typeof quietStart !== "string" || typeof quietEnd !== "string") {
      console.warn("Invalid quiet hours parameters:", { quietStart, quietEnd });
      return false;
    }

    // Validate time format (HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timePattern.test(quietStart) || !timePattern.test(quietEnd)) {
      console.warn("Invalid time format for quiet hours:", { quietStart, quietEnd });
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const startParts = quietStart.split(":");
    const endParts = quietEnd.split(":");

    const startHour = parseInt(startParts[0], 10);
    const startMin = parseInt(startParts[1], 10);
    const endHour = parseInt(endParts[0], 10);
    const endMin = parseInt(endParts[1], 10);

    // Additional validation for parsed values
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      console.warn("Failed to parse time values:", { quietStart, quietEnd });
      return false;
    }

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day (e.g., 9:00 to 17:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance();
