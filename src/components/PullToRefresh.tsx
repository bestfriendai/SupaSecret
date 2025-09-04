import React, { useEffect } from "react";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export default function PullToRefresh({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRefreshing) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1
      );
      scale.value = withSpring(1.1);
    } else {
      rotation.value = withTiming(0, { duration: 300 });
      scale.value = withSpring(1);
    }
  }, [isRefreshing]);

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance,
      [0, threshold],
      [0, 1],
      "clamp"
    );

    const translateY = interpolate(
      pullDistance,
      [0, threshold],
      [-20, 0],
      "clamp"
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const shouldTrigger = pullDistance >= threshold;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 20,
        },
        containerStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          },
          iconStyle,
        ]}
      >
        <Ionicons
          name={isRefreshing ? "refresh" : shouldTrigger ? "checkmark" : "arrow-down"}
          size={20}
          color="#FFFFFF"
        />
      </Animated.View>
      <Text className="text-white text-12 font-medium">
        {isRefreshing
          ? "Refreshing..."
          : shouldTrigger
          ? "Release to refresh"
          : "Pull to refresh"}
      </Text>
    </Animated.View>
  );
}