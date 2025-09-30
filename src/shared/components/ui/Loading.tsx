import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import type { ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { cn } from "../../../utils/cn";

export interface LoadingProps extends ViewProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
  color?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message,
  size = "md",
  variant = "spinner",
  color = "#3B82F6",
  fullScreen = false,
  className,
  ...viewProps
}) => {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 60,
  };

  const spinnerSize = sizeMap[size];

  const containerClassName = cn(
    "items-center justify-center",
    fullScreen ? "flex-1 bg-black" : "py-8",
    className,
  );

  if (variant === "spinner") {
    return (
      <View className={containerClassName} {...viewProps}>
        <ActivityIndicator size={size === "sm" ? "small" : "large"} color={color} />
        {message && <Text className="text-gray-400 text-sm mt-3 text-center">{message}</Text>}
      </View>
    );
  }

  if (variant === "dots") {
    return <LoadingDots message={message} size={size} color={color} fullScreen={fullScreen} className={className} {...viewProps} />;
  }

  return <LoadingPulse message={message} size={size} color={color} fullScreen={fullScreen} className={className} {...viewProps} />;
};

// Animated Loading Spinner
export const LoadingSpinner: React.FC<LoadingProps> = ({
  message,
  size = "md",
  color = "#3B82F6",
  fullScreen = false,
  className,
  ...viewProps
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const sizeMap = { sm: 24, md: 40, lg: 60 };
  const spinnerSize = sizeMap[size];

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
    );

    scale.value = withRepeat(
      withTiming(1.1, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [rotation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  const containerClassName = cn(
    "items-center justify-center",
    fullScreen ? "flex-1 bg-black" : "py-8",
    className,
  );

  return (
    <View className={containerClassName} {...viewProps}>
      <Animated.View
        style={[
          {
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: spinnerSize / 2,
            borderWidth: 3,
            borderColor: `${color}40`,
            borderTopColor: color,
          },
          animatedStyle,
        ]}
      />
      {message && <Text className="text-gray-400 text-sm mt-3 text-center">{message}</Text>}
    </View>
  );
};

// Loading Dots
export const LoadingDots: React.FC<LoadingProps> = ({
  message,
  size = "md",
  color = "#3B82F6",
  fullScreen = false,
  className,
  ...viewProps
}) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  const sizeMap = { sm: 6, md: 10, lg: 14 };
  const dotSize = sizeMap[size];

  useEffect(() => {
    const animateDot = (value: SharedValue<number>, delay: number) => {
      value.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(delay, { duration: delay }),
          withTiming(-10, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      );
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [dot1, dot2, dot3]);

  const createDotStyle = (value: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ translateY: value.value }],
    }));

  const dot1Style = createDotStyle(dot1);
  const dot2Style = createDotStyle(dot2);
  const dot3Style = createDotStyle(dot3);

  const containerClassName = cn(
    "items-center justify-center",
    fullScreen ? "flex-1 bg-black" : "py-8",
    className,
  );

  return (
    <View className={containerClassName} {...viewProps}>
      <View className="flex-row items-center space-x-2">
        <Animated.View
          style={[dot1Style, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }]}
        />
        <Animated.View
          style={[dot2Style, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }]}
        />
        <Animated.View
          style={[dot3Style, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }]}
        />
      </View>
      {message && <Text className="text-gray-400 text-sm mt-4 text-center">{message}</Text>}
    </View>
  );
};

// Loading Pulse
export const LoadingPulse: React.FC<LoadingProps> = ({
  message,
  size = "md",
  color = "#3B82F6",
  fullScreen = false,
  className,
  ...viewProps
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const sizeMap = { sm: 30, md: 50, lg: 70 };
  const pulseSize = sizeMap[size];

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.3, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
    );

    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const containerClassName = cn(
    "items-center justify-center",
    fullScreen ? "flex-1 bg-black" : "py-8",
    className,
  );

  return (
    <View className={containerClassName} {...viewProps}>
      <Animated.View
        style={[
          {
            width: pulseSize,
            height: pulseSize,
            borderRadius: pulseSize / 2,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
      {message && <Text className="text-gray-400 text-sm mt-4 text-center">{message}</Text>}
    </View>
  );
};

// Loading Skeleton
export interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = "100%", height = 20, borderRadius = 4, className, ...viewProps }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: "#374151" }, animatedStyle]}
      className={className}
      {...viewProps}
    />
  );
};

// Full Screen Loading Overlay
export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  variant?: "spinner" | "dots" | "pulse";
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message, variant = "spinner" }) => {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/80 items-center justify-center z-50">
      <Loading message={message} variant={variant} size="lg" />
    </View>
  );
};
