import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

interface VideoProgressIndicatorProps {
  currentTime: number;
  duration: number;
  isVisible?: boolean;
}

export default function VideoProgressIndicator({
  currentTime,
  duration,
  isVisible = true,
}: VideoProgressIndicatorProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    if (duration > 0) {
      progress.value = withTiming(currentTime / duration, { duration: 100 });
    }
  }, [currentTime, duration]);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 120,
          left: 16,
          right: 90,
          height: 3,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 2,
        },
        containerStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            backgroundColor: "#1D9BF0",
            borderRadius: 2,
          },
          progressStyle,
        ]}
      />
    </Animated.View>
  );
}