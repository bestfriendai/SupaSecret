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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Gesture thresholds and configuration
const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 650;
const HORIZONTAL_SWIPE_THRESHOLD = 80;
const DOUBLE_TAP_MAX_DELAY = 280;
const PINCH_SCALE_THRESHOLD = 0.1;
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
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  onPlaybackSpeedChange?: () => void;
  isLoading?: boolean;
}

export function useVideoFeedGestures({
  currentIndex,
  totalVideos,
  onLongPress,
  onRefresh,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onPinch,
  onPlaybackSpeedChange,
  isLoading = false,
}: UseVideoFeedGesturesProps) {
  // Animation values
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const progressY = useSharedValue(0);
  const progressX = useSharedValue(0);
  const pinchScale = useSharedValue(1);

  // Gesture state
  const isScrolling = useSharedValue(false);
  const activeDirection = useSharedValue<"idle" | "up" | "down" | "left" | "right">("idle");
  const lastTapTime = useRef(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pan gesture for swipe navigation (vertical and horizontal)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isScrolling.value = true;
      activeDirection.value = "idle";
    })
    .onUpdate((event) => {
      const absY = Math.abs(event.translationY);
      const absX = Math.abs(event.translationX);

      // Determine primary direction
      if (absY > absX) {
        // Vertical swipe
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
      } else {
        // Horizontal swipe
        translateX.value = event.translationX;

        // Scale effect for horizontal swipes
        const progress = Math.abs(event.translationX) / SCREEN_WIDTH;
        scale.value = interpolate(progress, [0, 0.2], [1, 0.98], "clamp");

        activeDirection.value = event.translationX > 0 ? "right" : "left";

        // Update shared value for progress
        const normalized = Math.max(-1, Math.min(1, event.translationX / SCREEN_WIDTH));
        progressX.value = normalized;
      }
    })
    .onEnd((event) => {
      const absY = Math.abs(event.translationY);
      const absX = Math.abs(event.translationX);
      const shouldSwipeVertical = absY > SWIPE_THRESHOLD || Math.abs(event.velocityY) > SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeHorizontal =
        absX > HORIZONTAL_SWIPE_THRESHOLD || Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;

      if (absY > absX) {
        // Vertical swipe handling
        if (shouldSwipeVertical && event.translationY > 0 && currentIndex === 0 && onRefresh && !isLoading) {
          runOnJS(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRefresh();
          })();
        } else if (shouldSwipeVertical) {
          runOnJS(() => {
            if (event.translationY > 0 && onSwipeDown) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSwipeDown();
            } else if (event.translationY < 0 && onSwipeUp) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSwipeUp();
            }
          })();
        }
      } else {
        // Horizontal swipe handling
        if (shouldSwipeHorizontal) {
          runOnJS(() => {
            if (event.translationX > 0 && onSwipeRight) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSwipeRight();
            } else if (event.translationX < 0 && onSwipeLeft) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSwipeLeft();
            }
          })();
        }
      }

      // Reset animations
      translateY.value = withSpring(0, SPRING_CONFIG);
      translateX.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withSpring(1, SPRING_CONFIG);
      progressY.value = withSpring(0, SPRING_CONFIG);
      progressX.value = withSpring(0, SPRING_CONFIG);
      isScrolling.value = false;
      activeDirection.value = "idle";
    });

  // Double tap gesture for like
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;

      if (timeSinceLastTap < DOUBLE_TAP_MAX_DELAY && onDoubleTap) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDoubleTap();
        })();
      }
      lastTapTime.current = now;
    });

  // Long press gesture for playback speed control
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onPlaybackSpeedChange) {
        runOnJS(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPlaybackSpeedChange();
        })();
      } else if (onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  // Pinch gesture for zoom controls
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      pinchScale.value = event.scale;
    })
    .onEnd((event) => {
      const scaleChange = event.scale - 1;
      if (Math.abs(scaleChange) > PINCH_SCALE_THRESHOLD && onPinch) {
        runOnJS(() => {
          onPinch(event.scale);
        })();
      }
      pinchScale.value = withSpring(1, SPRING_CONFIG);
    });

  // Compose all gestures with proper priority
  const composedGestures = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(panGesture, pinchGesture),
    longPressGesture,
  );

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { scale: scale.value * pinchScale.value },
      ],
      opacity: opacity.value,
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: isScrolling.value ? 0.5 : 1,
    };
  });

  // Reset animations
  const resetAnimations = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    translateX.value = withSpring(0, SPRING_CONFIG);
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withSpring(1, SPRING_CONFIG);
    progressY.value = withSpring(0, SPRING_CONFIG);
    progressX.value = withSpring(0, SPRING_CONFIG);
    pinchScale.value = withSpring(1, SPRING_CONFIG);
    isScrolling.value = false;
    activeDirection.value = "idle";
  }, [translateY, translateX, scale, opacity, progressY, progressX, pinchScale, isScrolling]);

  return {
    gestures: composedGestures,
    containerStyle,
    overlayStyle,
    resetAnimations,
    isScrolling,
    progressY,
    progressX,
    pinchScale,
    gestureState: {
      activeDirection,
    },
  };
}
