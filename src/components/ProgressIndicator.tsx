import React from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, interpolate } from "react-native-reanimated";

interface ProgressIndicatorProps {
  totalSlides: number;
  scrollX: Animated.SharedValue<number>;
  screenWidth: number;
}

function ProgressDot({
  index,
  scrollX,
  screenWidth,
}: {
  index: number;
  scrollX: Animated.SharedValue<number>;
  screenWidth: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];
    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], "clamp");
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], "clamp");
    return { width, opacity };
  });
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: "#1D9BF0",
        },
        animatedStyle,
      ]}
    />
  );
}

export default function ProgressIndicator({ totalSlides, scrollX, screenWidth }: ProgressIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center space-x-2">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <ProgressDot key={index} index={index} scrollX={scrollX} screenWidth={screenWidth} />
      ))}
    </View>
  );
}
