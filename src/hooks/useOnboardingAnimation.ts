import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";
import { Dimensions } from "react-native";
import { usePreferenceAwareHaptics } from "../utils/haptics";

const { width: screenWidth } = Dimensions.get("window");

export interface OnboardingAnimationConfig {
  totalSlides: number;
  currentIndex: number;
  scrollX: any; // SharedValue<number>
}

export const useOnboardingAnimation = ({ totalSlides, currentIndex, scrollX }: OnboardingAnimationConfig) => {
  const { impactAsync } = usePreferenceAwareHaptics();

  // Animation values
  const slideOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const progressScale = useSharedValue(1);

  // Skip button animation - fades out on last slide
  const skipButtonStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(scrollX.value, [0, (totalSlides - 1) * screenWidth], [1, 0], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const scale = interpolate(opacity, [0, 1], [0.8, 1], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Slide container animation - subtle breathing effect
  const slideContainerStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: slideOpacity.value,
    };
  });

  // Button press animation
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Progress indicator container animation
  const progressContainerStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: progressScale.value }],
    };
  });

  // Animation functions
  const animateButtonPress = () => {
    buttonScale.value = withSpring(0.95, { duration: 100 }, (finished) => {
      if (finished) {
        buttonScale.value = withSpring(1, { duration: 100 });
      }
    });
    runOnJS(impactAsync)();
  };

  const animateSlideTransition = () => {
    slideOpacity.value = withTiming(0.9, { duration: 150 }, (finished) => {
      if (finished) {
        slideOpacity.value = withTiming(1, { duration: 150 });
      }
    });
  };

  const animateProgressUpdate = () => {
    progressScale.value = withSpring(1.1, { duration: 200 }, (finished) => {
      if (finished) {
        progressScale.value = withSpring(1, { duration: 200 });
      }
    });
  };

  return {
    // Styles
    skipButtonStyle,
    slideContainerStyle,
    buttonAnimatedStyle,
    progressContainerStyle,

    // Animation functions
    animateButtonPress,
    animateSlideTransition,
    animateProgressUpdate,

    // Values for external use
    slideOpacity,
    buttonScale,
    progressScale,
  };
};

// Individual slide animation hook
export const useSlideAnimation = (index: number, scrollX: any) => {
  const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];

  const slideStyle = useAnimatedStyle(() => {
    "worklet";
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    "worklet";
    const rotate = interpolate(scrollX.value, inputRange, [-8, 0, 8], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });

    return {
      transform: [{ rotate: `${rotate}deg` }, { scale }],
    };
  });

  return {
    slideStyle,
    iconStyle,
  };
};

// Progress dot animation hook
export const useProgressDotAnimation = (index: number, scrollX: any) => {
  const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];

  const dotStyle = useAnimatedStyle(() => {
    "worklet";
    const width = interpolate(scrollX.value, inputRange, [8, 28, 8], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], {
      extrapolateLeft: Extrapolation.CLAMP,
      extrapolateRight: Extrapolation.CLAMP,
    });

    return {
      width,
      opacity,
      transform: [{ scale }],
    };
  });

  return { dotStyle };
};
