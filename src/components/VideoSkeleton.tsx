import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface VideoSkeletonProps {
  isVisible: boolean;
}

export default function VideoSkeleton({ isVisible }: VideoSkeletonProps) {
  const shimmerTranslateX = useSharedValue(-screenWidth);

  useEffect(() => {
    if (isVisible) {
      shimmerTranslateX.value = withRepeat(withTiming(screenWidth, { duration: 1500 }), -1, false);
    } else {
      // Cancel animation when hidden
      cancelAnimation(shimmerTranslateX);
      shimmerTranslateX.value = -screenWidth;
    }

    // Cleanup function to cancel animation on unmount
    return () => {
      cancelAnimation(shimmerTranslateX);
    };
  }, [isVisible]);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerTranslateX.value }],
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: isVisible ? 1 : 0,
    };
  });

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#1F2937",
          zIndex: 10,
        },
        containerStyle,
      ]}
    >
      {/* Background blur effect */}
      <BlurView
        intensity={20}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Shimmer effect */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              width: screenWidth * 0.3,
              height: screenHeight,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              transform: [{ skewX: "-20deg" }],
            },
            shimmerStyle,
          ]}
        />
      </View>

      {/* Skeleton content placeholders */}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          alignItems: "center",
        }}
      >
        {/* Action buttons skeleton */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            marginBottom: 16,
          }}
        />
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            marginBottom: 16,
          }}
        />
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            marginBottom: 16,
          }}
        />
      </View>

      {/* Bottom content skeleton */}
      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 20,
          right: 80,
        }}
      >
        {/* Text lines skeleton */}
        <View
          style={{
            height: 16,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            marginBottom: 8,
            width: "80%",
          }}
        />
        <View
          style={{
            height: 16,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            marginBottom: 8,
            width: "60%",
          }}
        />
        <View
          style={{
            height: 14,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 7,
            width: "40%",
          }}
        />
      </View>
    </Animated.View>
  );
}
