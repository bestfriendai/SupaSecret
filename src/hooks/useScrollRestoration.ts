import { useRef, useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, FlatList, SectionList } from "react-native";
import type { FlashList } from "@shopify/flash-list";

interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface ScrollRestorationOptions {
  key: string;
  enabled?: boolean;
  debounceMs?: number;
  maxAge?: number; // Maximum age in milliseconds before position is considered stale
}

/**
 * Hook for restoring scroll position when navigating back to a screen
 * Automatically saves and restores scroll position with debouncing
 */
export const useScrollRestoration = (options: ScrollRestorationOptions) => {
  const { key, enabled = true, debounceMs = 500, maxAge = 5 * 60 * 1000 } = options; // 5 minutes default

  const scrollViewRef = useRef<ScrollView | FlatList<any> | SectionList<any, any> | FlashList<any> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPosition = useRef<ScrollPosition | null>(null);
  const isRestoringRef = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const storageKey = `scroll_position_${key}`;

  // Save scroll position to storage with debouncing
  const saveScrollPosition = useCallback(
    async (x: number, y: number) => {
      if (!enabled) return;

      const position: ScrollPosition = {
        x,
        y,
        timestamp: Date.now(),
      };

      lastSavedPosition.current = position;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(position));
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to save scroll position:", error);
          }
        }
      }, debounceMs);
    },
    [enabled, storageKey, debounceMs],
  );

  // Load and restore scroll position
  const restoreScrollPosition = useCallback(async () => {
    if (!enabled || !scrollViewRef.current) return;

    try {
      const savedData = await AsyncStorage.getItem(storageKey);
      if (!savedData) return;

      const position: ScrollPosition = JSON.parse(savedData);

      // Check if position is not too old
      if (Date.now() - position.timestamp > maxAge) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }

      isRestoringRef.current = true;
      setIsRestoring(true);

      // Restore scroll position with a small delay to ensure content is loaded
      setTimeout(() => {
        if (scrollViewRef.current) {
          // Type-safe scroll handling with proper type guards
          const scrollComponent = scrollViewRef.current;

          // Check for ScrollView scrollTo method
          if (typeof (scrollComponent as any).scrollTo === "function") {
            (scrollComponent as ScrollView).scrollTo({
              x: position.x,
              y: position.y,
              animated: false,
            });
          }
          // Check for FlatList/FlashList scrollToOffset method
          else if (typeof (scrollComponent as any).scrollToOffset === "function") {
            (scrollComponent as FlatList<any> | FlashList<any>).scrollToOffset({
              offset: position.y,
              animated: false,
            });
          }
        }

        // Reset restoration flag after a short delay
        setTimeout(() => {
          isRestoringRef.current = false;
          setIsRestoring(false);
        }, 100);
      }, 100);
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to restore scroll position:", error);
      }
    }
  }, [enabled, storageKey, maxAge]);

  // Clear saved position
  const clearScrollPosition = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      lastSavedPosition.current = null;
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to clear scroll position:", error);
      }
    }
  }, [storageKey]);

  // Handle scroll events
  const handleScroll = useCallback(
    (event: any) => {
      if (!enabled || isRestoringRef.current) return;

      // Handle both regular React Native events and Reanimated worklet events
      let contentOffset;
      if (event.nativeEvent && event.nativeEvent.contentOffset) {
        // Regular React Native scroll event
        contentOffset = event.nativeEvent.contentOffset;
      } else if (event.contentOffset) {
        // Reanimated worklet event (called via runOnJS)
        contentOffset = event.contentOffset;
      } else {
        // Fallback - treat event as contentOffset directly
        contentOffset = event;
      }

      if (contentOffset) {
        saveScrollPosition(contentOffset.x || 0, contentOffset.y || 0);
      }
    },
    [enabled, saveScrollPosition],
  );

  // Restore position when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      restoreScrollPosition();
    }, [restoreScrollPosition]),
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    scrollViewRef,
    handleScroll,
    restoreScrollPosition,
    clearScrollPosition,
    isRestoring,
  };
};

/**
 * Hook for managing scroll position restoration across multiple screens
 */
export const useGlobalScrollRestoration = () => {
  const clearAllScrollPositions = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scrollKeys = keys.filter((key) => key.startsWith("scroll_position_"));
      await AsyncStorage.multiRemove(scrollKeys);
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to clear all scroll positions:", error);
      }
    }
  }, []);

  const getScrollPositionInfo = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scrollKeys = keys.filter((key) => key.startsWith("scroll_position_"));
      const positions = await AsyncStorage.multiGet(scrollKeys);

      return positions.map(([key, value]) => ({
        key: key.replace("scroll_position_", ""),
        position: value ? JSON.parse(value) : null,
      }));
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to get scroll position info:", error);
      }
      return [];
    }
  }, []);

  return {
    clearAllScrollPositions,
    getScrollPositionInfo,
  };
};
