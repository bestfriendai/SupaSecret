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
          bottom: 100,
          left: 16,
          right: 16,
          height: 2,
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          borderRadius: 1,
        },
        containerStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 1,
          },
          progressStyle,
        ]}
      />
    </Animated.View>
  );
}