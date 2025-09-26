import * as Haptics from "expo-haptics";
import { useConfessionStore } from "../state/confessionStore";

/**
 * Preference-aware haptics utility that respects user's haptics settings
 */
export class PreferenceAwareHaptics {
  /**
   * Trigger impact haptics if enabled in user preferences
   */
  static async impactAsync(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
    try {
      const state = useConfessionStore.getState();
      const hapticsEnabled = state?.userPreferences?.haptics_enabled ?? true; // Default to true if not initialized

      if (hapticsEnabled) {
        await Haptics.impactAsync(style);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  }

  /**
   * Trigger notification haptics if enabled in user preferences
   */
  static async notificationAsync(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
    try {
      const state = useConfessionStore.getState();
      const hapticsEnabled = state?.userPreferences?.haptics_enabled ?? true; // Default to true if not initialized

      if (hapticsEnabled) {
        await Haptics.notificationAsync(type);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  }

  /**
   * Trigger selection haptics if enabled in user preferences
   */
  static async selectionAsync() {
    try {
      const state = useConfessionStore.getState();
      const hapticsEnabled = state?.userPreferences?.haptics_enabled ?? true; // Default to true if not initialized

      if (hapticsEnabled) {
        await Haptics.selectionAsync();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  }
}

/**
 * Hook-based haptics utility for use in React components
 */
export const usePreferenceAwareHaptics = () => {
  // Safely access the store with fallback values
  const hapticsEnabled = useConfessionStore((state) => {
    try {
      return state?.userPreferences?.haptics_enabled ?? true; // Default to true if not initialized
    } catch {
      return true; // Fallback to enabled if store access fails
    }
  });

  const impactAsync = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      if (hapticsEnabled) {
        await Haptics.impactAsync(style);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  };

  const notificationAsync = async (
    type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
  ) => {
    try {
      if (hapticsEnabled) {
        await Haptics.notificationAsync(type);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  };

  const selectionAsync = async () => {
    try {
      if (hapticsEnabled) {
        await Haptics.selectionAsync();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Haptics failed:", error);
      }
    }
  };

  return {
    impactAsync,
    notificationAsync,
    selectionAsync,
    hapticsEnabled,
  };
};
