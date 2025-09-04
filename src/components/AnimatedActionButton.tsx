import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AnimatedActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  isActive?: boolean;
  onPress: () => void;
  activeColor?: string;
  inactiveColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedActionButton({
  icon,
  label,
  count,
  isActive = false,
  onPress,
  activeColor = "#FF3040",
  inactiveColor = "#FFFFFF",
}: AnimatedActionButtonProps) {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  useEffect(() => {
    if (isActive && icon === "heart") {
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [isActive, icon]);

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    onPress();
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const iconColor = isActive ? activeColor : inactiveColor;

  return (
    <AnimatedPressable
      className="items-center"
      onPress={handlePress}
      style={buttonStyle}
    >
      <Animated.View 
        className="w-12 h-12 bg-black/50 rounded-full items-center justify-center mb-1"
        style={icon === "heart" ? heartStyle : undefined}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
      </Animated.View>
      <Text className="text-white text-11">
        {count !== undefined ? count : label}
      </Text>
    </AnimatedPressable>
  );
}