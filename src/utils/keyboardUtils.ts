/**
 * Keyboard utilities for improved keyboard handling across the app
 * Provides consistent keyboard behavior and proper cleanup
 */

import { Keyboard, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";

export interface KeyboardInfo {
  isVisible: boolean;
  height: number;
  duration: number;
  easing: string;
}

/**
 * Hook to track keyboard visibility and height
 */
export const useKeyboard = () => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
    duration: 0,
    easing: "",
  });

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onKeyboardShow = (event: any) => {
      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
        duration: event.duration || 250,
        easing: event.easing || "keyboard",
      });
    };

    const onKeyboardHide = (event: any) => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
        duration: event.duration || 250,
        easing: event.easing || "keyboard",
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return keyboardInfo;
};

/**
 * Enhanced keyboard dismiss function with haptic feedback
 */
export const dismissKeyboard = (withHaptics = false) => {
  Keyboard.dismiss();

  if (withHaptics && Platform.OS === "ios") {
    // Add subtle haptic feedback on keyboard dismiss
    import("expo-haptics")
      .then(({ impactAsync, ImpactFeedbackStyle }) => {
        impactAsync(ImpactFeedbackStyle.Light);
      })
      .catch(() => {
        // Haptics not available - silently fail
      });
  }
};

/**
 * Get appropriate KeyboardAvoidingView behavior for platform
 */
export const getKeyboardBehavior = () => {
  return Platform.OS === "ios" ? "padding" : "height";
};

/**
 * Get keyboard vertical offset for different screen types
 */
export const getKeyboardVerticalOffset = (screenType: "modal" | "screen" | "bottomSheet" = "screen") => {
  if (Platform.OS === "android") return 0;

  switch (screenType) {
    case "modal":
      return 0;
    case "bottomSheet":
      return 0;
    case "screen":
    default:
      return 0; // Let SafeAreaView handle the offset
  }
};

/**
 * Hook for keyboard-aware bottom padding
 */
export const useKeyboardPadding = (additionalPadding = 0) => {
  const keyboard = useKeyboard();
  const insets = useSafeAreaInsets();

  return keyboard.isVisible ? keyboard.height + additionalPadding : insets.bottom + additionalPadding;
};

/**
 * Calculate safe keyboard height considering safe area
 */
export const useSafeKeyboardHeight = () => {
  const keyboard = useKeyboard();
  const insets = useSafeAreaInsets();

  if (!keyboard.isVisible) return 0;

  // On iOS, keyboard height already accounts for safe area
  if (Platform.OS === "ios") {
    return keyboard.height;
  }

  // On Android, we might need to adjust
  return keyboard.height;
};

/**
 * Keyboard configuration for different input types
 */
export const KEYBOARD_CONFIGS = {
  text: {
    keyboardType: "default" as const,
    autoCapitalize: "sentences" as const,
    autoCorrect: true,
    spellCheck: true,
  },
  email: {
    keyboardType: "email-address" as const,
    autoCapitalize: "none" as const,
    autoCorrect: false,
    spellCheck: false,
  },
  password: {
    keyboardType: "default" as const,
    autoCapitalize: "none" as const,
    autoCorrect: false,
    spellCheck: false,
    secureTextEntry: true,
  },
  numeric: {
    keyboardType: "numeric" as const,
    autoCapitalize: "none" as const,
    autoCorrect: false,
    spellCheck: false,
  },
  search: {
    keyboardType: "default" as const,
    autoCapitalize: "none" as const,
    autoCorrect: false,
    spellCheck: false,
    returnKeyType: "search" as const,
  },
  comment: {
    keyboardType: "default" as const,
    autoCapitalize: "sentences" as const,
    autoCorrect: true,
    spellCheck: true,
    returnKeyType: "send" as const,
  },
} as const;

/**
 * Enhanced TextInput props with keyboard optimizations
 */
export const getOptimizedTextInputProps = (type: keyof typeof KEYBOARD_CONFIGS) => {
  const config = KEYBOARD_CONFIGS[type];

  return {
    ...config,
    blurOnSubmit: type === "search" || type === "comment",
    enablesReturnKeyAutomatically: true,
    keyboardAppearance: "dark" as const,
    selectionColor: "#1D9BF0",
    underlineColorAndroid: "transparent",
  };
};

/**
 * Keyboard-aware scroll view props
 */
export const getKeyboardAwareScrollProps = () => {
  return {
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: Platform.OS === "ios" ? ("interactive" as const) : ("on-drag" as const),
    showsVerticalScrollIndicator: false,
    contentInsetAdjustmentBehavior: "automatic" as const,
  };
};

/**
 * Hook for keyboard-aware modal positioning
 */
export const useKeyboardAwareModal = () => {
  const keyboard = useKeyboard();
  const screenHeight = Dimensions.get("window").height;

  const modalOffset = keyboard.isVisible ? Math.max(0, (keyboard.height - screenHeight * 0.3) / 2) : 0;

  return {
    isKeyboardVisible: keyboard.isVisible,
    keyboardHeight: keyboard.height,
    modalOffset,
    animationDuration: keyboard.duration,
  };
};

/**
 * Utility to handle keyboard events in components
 */
export const createKeyboardHandler = (onShow?: (height: number) => void, onHide?: () => void) => {
  const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
  const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

  const showSubscription = Keyboard.addListener(showEvent, (event) => {
    onShow?.(event.endCoordinates.height);
  });

  const hideSubscription = Keyboard.addListener(hideEvent, () => {
    onHide?.();
  });

  return () => {
    showSubscription?.remove();
    hideSubscription?.remove();
  };
};

/**
 * Debounced keyboard dismiss for rapid interactions
 */
let dismissTimeout: NodeJS.Timeout;

export const debouncedKeyboardDismiss = (delay = 100) => {
  clearTimeout(dismissTimeout);
  dismissTimeout = setTimeout(() => {
    Keyboard.dismiss();
  }, delay);
};
