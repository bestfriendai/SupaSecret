import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
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
  activeColor = "#FF0050",
  inactiveColor = "#FFFFFF",
}: AnimatedActionButtonProps) {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isActive && icon === "heart") {
      heartScale.value = withSequence(
        withTiming(1.4, { duration: 200 }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
      
      // Add pulse effect for liked hearts
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isActive, icon]);

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    
    // Add rotation for share button
    if (icon === "share-outline") {
      rotation.value = withSequence(
        withTiming(15, { duration: 100 }),
        withTiming(-15, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
    
    onPress();
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heartScale.value * pulseScale.value }
    ],
  }));

  const iconColor = isActive ? activeColor : inactiveColor;

  return (
    <AnimatedPressable
      className="items-center mb-6"
      onPress={handlePress}
      style={buttonStyle}
    >
      <Animated.View 
        className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
          isActive && icon === "heart" 
            ? "bg-red-500/20" 
            : icon === "chatbubble-outline"
            ? "bg-blue-500/20"
            : icon === "share-outline"
            ? "bg-yellow-500/20"
            : "bg-black/40"
        }`}
        style={icon === "heart" ? heartStyle : undefined}
      >
        <Ionicons 
          name={icon} 
          size={icon === "heart" && isActive ? 28 : 26} 
          color={iconColor} 
        />
      </Animated.View>
      <Text className="text-white text-12 font-medium text-center">
        {count !== undefined ? (count > 999 ? `${Math.floor(count/1000)}k` : count) : label}
      </Text>
    </AnimatedPressable>
  );
}