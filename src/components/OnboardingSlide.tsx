import React from "react";
import { View, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, interpolate, SharedValue } from "react-native-reanimated";
import { OnboardingSlide as OnboardingSlideType } from "../types/auth";

const { width: screenWidth } = Dimensions.get("window");

interface OnboardingSlideProps {
  slide: OnboardingSlideType;
  index: number;
  scrollX: SharedValue<number>;
}

export default function OnboardingSlide({ slide, index, scrollX }: OnboardingSlideProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];

    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], "clamp");

    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], "clamp");

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];

    const translateY = interpolate(scrollX.value, inputRange, [50, 0, -50], "clamp");

    const rotate = interpolate(scrollX.value, inputRange, [-10, 0, 10], "clamp");

    return {
      transform: [{ translateY }, { rotate: `${rotate}deg` }],
    };
  });

  return (
    <View className="flex-1 items-center justify-center px-8" style={{ width: screenWidth }}>
      <Animated.View style={animatedStyle} className="items-center">
        {/* Icon */}
        <Animated.View
          style={[
            iconAnimatedStyle,
            {
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: slide.color,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 40,
              shadowColor: slide.color,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            },
          ]}
        >
          <Ionicons name={slide.icon as any} size={48} color="#FFFFFF" />
        </Animated.View>

        {/* Content */}
        <View className="items-center max-w-sm">
          <Text className="text-white text-28 font-bold text-center mb-4 leading-8">{slide.title}</Text>
          <Text className="text-blue-400 text-18 font-semibold text-center mb-6">{slide.subtitle}</Text>
          <Text className="text-gray-400 text-16 text-center leading-6">{slide.description}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
