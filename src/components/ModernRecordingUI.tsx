/**
 * Modern Recording UI Components
 * Based on 2025 design trends: TikTok, Instagram Reels, BeReal
 * Features: Circular progress, smooth animations, glassmorphism
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

interface CircularProgressProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function CircularProgress({ progress, size = 80, strokeWidth = 4, color = "#EF4444" }: CircularProgressProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(animatedProgress.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  progress?: number; // 0-1
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, progress = 0, disabled = false }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <View style={styles.recordButtonContainer}>
      {/* Progress ring */}
      {isRecording && (
        <View style={styles.progressRing}>
          <CircularProgress progress={progress} size={90} strokeWidth={5} color="#EF4444" />
        </View>
      )}

      {/* Outer ring */}
      <View style={[styles.recordButtonOuter, isRecording && styles.recordButtonOuterActive]}>
        {/* Button */}
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={styles.recordButtonPressable}
        >
          <Animated.View
            style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive, animatedButtonStyle]}
          >
            {!isRecording && <View style={styles.recordButtonDot} />}
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

interface TimerDisplayProps {
  seconds: number;
  maxSeconds: number;
  isRecording: boolean;
}

export function TimerDisplay({ seconds, maxSeconds, isRecording }: TimerDisplayProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      opacity.value = withRepeat(withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = seconds / maxSeconds;

  return (
    <View style={styles.timerContainer}>
      <Animated.View style={[styles.timerContent, animatedStyle]}>
        {isRecording && <View style={styles.recordingDot} />}
        <Text style={styles.timerText}>
          {minutes}:{secs.toString().padStart(2, "0")}
        </Text>
        <Text style={styles.timerMaxText}>/ {maxSeconds}s</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.timerProgressBar}>
        <View style={[styles.timerProgressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

interface GlassButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}

export function GlassButton({ icon, onPress, label, variant = "default", disabled = false }: GlassButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "danger":
        return styles.glassButtonDanger;
      case "primary":
        return styles.glassButtonPrimary;
      default:
        return styles.glassButtonDefault;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.glassButtonPressable, disabled && styles.glassButtonDisabled]}
    >
      <Animated.View style={[styles.glassButton, getVariantStyle(), animatedStyle]}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        {label && <Text style={styles.glassButtonLabel}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

interface StatusBadgeProps {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "info" | "success" | "warning" | "error";
}

export function StatusBadge({ text, icon, variant = "info" }: StatusBadgeProps) {
  const getVariantColors = () => {
    switch (variant) {
      case "success":
        return { bg: "rgba(34, 197, 94, 0.2)", border: "#22C55E", text: "#22C55E" };
      case "warning":
        return { bg: "rgba(251, 191, 36, 0.2)", border: "#FBBF24", text: "#FBBF24" };
      case "error":
        return { bg: "rgba(239, 68, 68, 0.2)", border: "#EF4444", text: "#EF4444" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", border: "#3B82F6", text: "#3B82F6" };
    }
  };

  const colors = getVariantColors();

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {icon && <Ionicons name={icon} size={16} color={colors.text} />}
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Record Button
  recordButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressRing: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  recordButtonOuterActive: {
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  recordButtonPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordButtonInnerActive: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  recordButtonDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  // Timer
  timerContainer: {
    alignItems: "center",
    gap: 8,
  },
  timerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerMaxText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  timerProgressBar: {
    width: 120,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  timerProgressFill: {
    height: "100%",
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },

  // Glass Button
  glassButtonPressable: {
    borderRadius: 24,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  glassButtonDefault: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  glassButtonDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  glassButtonPrimary: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  glassButtonDisabled: {
    opacity: 0.5,
  },
  glassButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Status Badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
