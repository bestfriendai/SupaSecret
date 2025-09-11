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
  activeColor = "#1D9BF0",
  inactiveColor = "#FFFFFF",
}: AnimatedActionButtonProps) {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  useEffect(() => {
    if (isActive && icon === "heart") {
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, icon]);

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1, { damping: 10, stiffness: 200 }));
    onPress();
  };

  const buttonStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: scale.value }],
    }),
    [],
  );

  const heartStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: heartScale.value }],
    }),
    [],
  );

  const iconColor = isActive ? (icon === "heart" ? "#FF3040" : activeColor) : inactiveColor;

  const getAccessibilityLabel = () => {
    if (count !== undefined) {
      return `${label} ${count} ${count === 1 ? "time" : "times"}`;
    }
    return isActive ? `${label} (active)` : label;
  };

  const getAccessibilityHint = () => {
    switch (label) {
      case "Like":
        return isActive ? "Double tap to unlike this video" : "Double tap to like this video";
      case "Reply":
        return "Double tap to open comments";
      case "Share":
        return "Double tap to share this video";
      case "Save":
        return isActive ? "Double tap to unsave this video" : "Double tap to save this video";
      default:
        return `Double tap to ${label.toLowerCase()}`;
    }
  };

  return (
    <AnimatedPressable
      className="items-center"
      onPress={handlePress}
      style={buttonStyle}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        className="w-12 h-12 bg-black/50 rounded-full items-center justify-center mb-1"
        style={icon === "heart" ? heartStyle : undefined}
      >
        <Ionicons name={icon} size={24} color={iconColor} />
      </Animated.View>
      <Text className="text-white text-11">{count !== undefined ? count : label}</Text>
    </AnimatedPressable>
  );
}
