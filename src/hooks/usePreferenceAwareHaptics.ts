import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

/**
 * Hook that provides haptic feedback functions that respect user preferences
 */
export function usePreferenceAwareHaptics() {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("haptics_enabled").then((value) => {
      if (value !== null) {
        setHapticsEnabled(value === "true");
      }
    });
  }, []);

  const triggerLight = useCallback(async () => {
    if (hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  const triggerMedium = useCallback(async () => {
    if (hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [hapticsEnabled]);

  const triggerHeavy = useCallback(async () => {
    if (hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [hapticsEnabled]);

  const triggerSelection = useCallback(async () => {
    if (hapticsEnabled) {
      await Haptics.selectionAsync();
    }
  }, [hapticsEnabled]);

  const triggerNotification = useCallback(
    async (type: "success" | "warning" | "error" = "success") => {
      if (hapticsEnabled) {
        const notificationType =
          type === "success"
            ? Haptics.NotificationFeedbackType.Success
            : type === "warning"
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error;

        await Haptics.notificationAsync(notificationType);
      }
    },
    [hapticsEnabled]
  );

  return {
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSelection,
    triggerNotification,
    hapticsEnabled,
  };
}

