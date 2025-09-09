import React from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface CharacterCounterProps {
  currentLength: number;
  maxLength?: number;
  warningThreshold?: number;
  dangerThreshold?: number;
  showIcon?: boolean;
  className?: string;
}

export default function CharacterCounter({
  currentLength,
  maxLength = 280,
  warningThreshold = 240,
  dangerThreshold = 260,
  showIcon = true,
  className = "",
}: CharacterCounterProps) {
  const progress = useSharedValue(0);

  // Calculate progress (0 to 1)
  React.useEffect(() => {
    progress.value = withSpring(currentLength / maxLength, {
      damping: 20,
      stiffness: 300,
    });
  }, [currentLength, maxLength]);

  // Determine color state
  const colorState = useDerivedValue(() => {
    if (currentLength >= dangerThreshold) return 2; // Danger (red)
    if (currentLength >= warningThreshold) return 1; // Warning (yellow)
    return 0; // Normal (gray)
  });

  const textStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      colorState.value,
      [0, 1, 2],
      ["#8B98A5", "#F59E0B", "#EF4444"], // gray, yellow, red
    );

    return {
      color,
      transform: [
        {
          scale: withSpring(currentLength > maxLength ? 1.1 : 1, {
            damping: 15,
            stiffness: 400,
          }),
        },
      ],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      colorState.value,
      [0, 1, 2],
      ["#10B981", "#F59E0B", "#EF4444"], // green, yellow, red
    );

    return {
      color,
      transform: [
        {
          scale: withSpring(currentLength >= warningThreshold ? 1.1 : 1, {
            damping: 15,
            stiffness: 400,
          }),
        },
      ],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorState.value,
      [0, 1, 2],
      ["#1D9BF0", "#F59E0B", "#EF4444"], // blue, yellow, red
    );

    return {
      backgroundColor,
      width: `${Math.min(progress.value * 100, 100)}%`,
    };
  });

  const getIconName = () => {
    if (currentLength > maxLength) return "alert-circle";
    if (currentLength >= dangerThreshold) return "warning";
    if (currentLength >= warningThreshold) return "time";
    return "checkmark-circle";
  };

  const getWarningMessage = () => {
    const remaining = maxLength - currentLength;

    if (currentLength > maxLength) {
      return `${Math.abs(remaining)} characters over limit`;
    }
    if (currentLength >= dangerThreshold) {
      return `${remaining} characters remaining`;
    }
    if (currentLength >= warningThreshold) {
      return `Approaching limit (${remaining} left)`;
    }
    return null;
  };

  const warningMessage = getWarningMessage();

  return (
    <View className={`${className}`}>
      {/* Progress bar */}
      <View className="h-1 bg-gray-800 rounded-full mb-2 overflow-hidden">
        <Animated.View style={[progressBarStyle]} className="h-full rounded-full" />
      </View>

      {/* Counter and status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {showIcon && (
            <Animated.View style={iconStyle} className="mr-2">
              <Ionicons
                name={getIconName()}
                size={16}
                color="#10B981" // This will be overridden by animated style
              />
            </Animated.View>
          )}

          {warningMessage && (
            <Animated.Text style={textStyle} className="text-13 font-medium">
              {warningMessage}
            </Animated.Text>
          )}
        </View>

        <Animated.Text style={textStyle} className="text-13 font-mono">
          {currentLength}/{maxLength}
        </Animated.Text>
      </View>
    </View>
  );
}

// Simplified version for inline use
export function InlineCharacterCounter({
  currentLength,
  maxLength = 280,
  className = "",
}: {
  currentLength: number;
  maxLength?: number;
  className?: string;
}) {
  const getTextColor = () => {
    if (currentLength > maxLength) return "text-red-500";
    if (currentLength >= maxLength - 20) return "text-red-400";
    if (currentLength >= maxLength - 40) return "text-yellow-500";
    return "text-gray-500";
  };

  return (
    <Text className={`text-13 font-mono ${getTextColor()} ${className}`}>
      {currentLength}/{maxLength}
    </Text>
  );
}
