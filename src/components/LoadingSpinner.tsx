import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  color?: string;
}

export default function LoadingSpinner({ 
  message, 
  size = 40, 
  color = "#1D9BF0" 
}: LoadingSpinnerProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );

    scale.value = withRepeat(
      withTiming(1.1, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View className="items-center justify-center py-8">
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: `${color}40`,
            borderTopColor: color,
          },
          animatedStyle,
        ]}
      />
      {message && (
        <Text className="text-gray-500 text-15 mt-3 text-center">
          {message}
        </Text>
      )}
    </View>
  );
}