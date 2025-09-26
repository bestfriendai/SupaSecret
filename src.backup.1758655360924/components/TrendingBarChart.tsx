import React, { useEffect } from "react";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from "react-native-reanimated";

interface TrendingBarChartProps {
  percentage: number;
  maxHeight?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export default function TrendingBarChart({
  percentage,
  maxHeight = 20,
  color = "#1D9BF0",
  backgroundColor = "#374151",
  animated = true,
}: TrendingBarChartProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withSpring(percentage / 100, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      progress.value = percentage / 100;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, animated]);

  const barStyle = useAnimatedStyle(() => {
    const height = interpolate(progress.value, [0, 1], [2, maxHeight]);

    return {
      height,
      opacity: withTiming(progress.value > 0 ? 1 : 0.3, { duration: 300 }),
    };
  }, [maxHeight]);

  const containerStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          scaleY: withTiming(progress.value > 0 ? 1 : 0.8, { duration: 300 }),
        },
      ],
    }),
    [],
  );

  return (
    <Animated.View
      style={[
        {
          width: 4,
          height: maxHeight,
          backgroundColor,
          borderRadius: 2,
          justifyContent: "flex-end",
          overflow: "hidden",
        },
        containerStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            backgroundColor: color,
            borderRadius: 2,
            width: "100%",
          },
          barStyle,
        ]}
      />
    </Animated.View>
  );
}
