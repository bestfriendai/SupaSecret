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
    const { userPreferences } = useConfessionStore.getState();
    
    if (userPreferences.hapticsEnabled) {
      try {
        await Haptics.impactAsync(style);
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
      }
    }
  }

  /**
   * Trigger notification haptics if enabled in user preferences
   */
  static async notificationAsync(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
    const { userPreferences } = useConfessionStore.getState();
    
    if (userPreferences.hapticsEnabled) {
      try {
        await Haptics.notificationAsync(type);
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
      }
    }
  }

  /**
   * Trigger selection haptics if enabled in user preferences
   */
  static async selectionAsync() {
    const { userPreferences } = useConfessionStore.getState();
    
    if (userPreferences.hapticsEnabled) {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
      }
    }
  }
}

/**
 * Hook-based haptics utility for use in React components
 */
export const usePreferenceAwareHaptics = () => {
  const hapticsEnabled = useConfessionStore((state) => state.userPreferences.hapticsEnabled);

  const impactAsync = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (hapticsEnabled) {
      try {
        await Haptics.impactAsync(style);
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
      }
    }
  };

  const notificationAsync = async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    if (hapticsEnabled) {
      try {
        await Haptics.notificationAsync(type);
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
      }
    }
  };

  const selectionAsync = async () => {
    if (hapticsEnabled) {
      try {
        await Haptics.selectionAsync();
      } catch (error) {
        if (__DEV__) {
          console.warn('Haptics failed:', error);
        }
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
