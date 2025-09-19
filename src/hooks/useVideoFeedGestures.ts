import { useCallback, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { Dimensions } from "react-native";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Gesture thresholds and configuration
const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 650;
const DOUBLE_TAP_MAX_DELAY = 280;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 1,
};

interface UseVideoFeedGesturesProps {
  currentIndex: number;
  totalVideos: number;
  onLongPress?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function useVideoFeedGestures({
  currentIndex,
  totalVideos,
  onLongPress,
  onRefresh,
  isLoading = false,
}: UseVideoFeedGesturesProps) {
  // Animation values
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const progressY = useSharedValue(0);

  // Gesture state
  const isScrolling = useSharedValue(false);
  const activeDirection = useSharedValue<"idle" | "up" | "down">("idle");


  // Pan gesture for swipe navigation
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isScrolling.value = true;
      activeDirection.value = "idle";
    })
    .onUpdate((event) => {
      // Update translation and scale based on gesture
      const dampenedTranslation = event.translationY + event.velocityY * 0.05;
      translateY.value = dampenedTranslation;
      
      // Scale effect for visual feedback
      const progress = Math.abs(dampenedTranslation) / SCREEN_HEIGHT;
      scale.value = interpolate(progress, [0, 0.3], [1, 0.95], "clamp");
      
      // Opacity effect for smooth transitions
      opacity.value = interpolate(progress, [0, 0.5], [1, 0.8], "clamp");

      activeDirection.value = dampenedTranslation > 0 ? "down" : "up";

      // Update shared value for progress
      const normalized = Math.max(-1, Math.min(1, dampenedTranslation / SCREEN_HEIGHT));
      progressY.value = normalized;
    })
    .onEnd((event) => {
      const shouldSwipe =
        Math.abs(event.translationY) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityY) > SWIPE_VELOCITY_THRESHOLD;

      // Only trigger refresh at index 0 when swiping down
      // Navigation is handled by FlashList's built-in paging
      if (shouldSwipe && event.translationY > 0 && currentIndex === 0 && onRefresh && !isLoading) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRefresh();
        })();
      }

      // Reset animations
      translateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withSpring(1, SPRING_CONFIG);
      progressY.value = withSpring(0, SPRING_CONFIG);
      isScrolling.value = false;
      activeDirection.value = "idle";
    });

  // Long press gesture for additional actions
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onLongPress) {
        runOnJS(onLongPress)();
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        })();
      }
    });

  // Only return pan gesture at feed level for visual feedback during scrolling
  const composedGestures = panGesture;

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: isScrolling.value ? 0.5 : 1,
  }));

  // Reset animations
  const resetAnimations = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
    progressY.value = withSpring(0, SPRING_CONFIG);
    isScrolling.value = false;
    activeDirection.value = "idle";
  }, [translateY, scale, opacity, progressY, isScrolling]);

  return {
    gestures: composedGestures,
    containerStyle,
    overlayStyle,
    resetAnimations,
    isScrolling,
    progressY,
    gestureState: {
      activeDirection,
    },
  };
}
