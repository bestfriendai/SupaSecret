import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  cancelAnimation,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GUIDANCE_SHOWN_KEY = "video_guidance_shown";

interface VideoGuidanceOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export default function VideoGuidanceOverlay({ isVisible, onDismiss }: VideoGuidanceOverlayProps) {
  const [showGuidance, setShowGuidance] = useState(false);
  const overlayOpacity = useSharedValue(0);
  const swipeIndicatorY = useSharedValue(0);
  const heartScale = useSharedValue(0);

  useEffect(() => {
    checkShouldShowGuidance();
  }, []);

  useEffect(() => {
    if (isVisible && showGuidance) {
      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 300 });

      // Animate swipe indicator
      swipeIndicatorY.value = withRepeat(
        withSequence(withTiming(-20, { duration: 800 }), withTiming(0, { duration: 800 })),
        -1,
        true,
      );

      // Animate heart
      heartScale.value = withDelay(
        1000,
        withRepeat(withSequence(withTiming(1.2, { duration: 300 }), withTiming(1, { duration: 300 })), -1, true),
      );
    } else {
      // Cancel all animations when hiding
      cancelAnimation(overlayOpacity);
      cancelAnimation(swipeIndicatorY);
      cancelAnimation(heartScale);

      overlayOpacity.value = withTiming(0, { duration: 300 });
      swipeIndicatorY.value = 0;
      heartScale.value = 0;
    }

    // Cleanup function to cancel animations on unmount
    return () => {
      cancelAnimation(overlayOpacity);
      cancelAnimation(swipeIndicatorY);
      cancelAnimation(heartScale);
    };
  }, [isVisible, showGuidance]);

  const checkShouldShowGuidance = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(GUIDANCE_SHOWN_KEY);
      if (!hasShown) {
        setShowGuidance(true);
      }
    } catch (error) {
      console.warn("Failed to check guidance status:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(GUIDANCE_SHOWN_KEY, "true");
      setShowGuidance(false);
      onDismiss();
    } catch (error) {
      console.warn("Failed to save guidance status:", error);
      setShowGuidance(false);
      onDismiss();
    }
  };

  const overlayStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: overlayOpacity.value,
    };
  });

  const swipeIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: swipeIndicatorY.value }],
    };
  });

  const heartStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: heartScale.value }],
    };
  });

  if (!isVisible || !showGuidance) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          zIndex: 100,
          justifyContent: "center",
          alignItems: "center",
        },
        overlayStyle,
      ]}
    >
      {/* Swipe up gesture */}
      <View style={{ position: "absolute", top: "30%", alignItems: "center" }}>
        <Animated.View style={[swipeIndicatorStyle]}>
          <Ionicons name="chevron-up" size={40} color="#FFFFFF" />
        </Animated.View>
        <Text className="text-white text-16 font-medium mt-2">Swipe up for next video</Text>
      </View>

      {/* Double tap gesture */}
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Animated.View style={[heartStyle]}>
          <Ionicons name="heart" size={60} color="#EF4444" />
        </Animated.View>
        <Text className="text-white text-16 font-medium mt-4">Double-tap to like</Text>
      </View>

      {/* Swipe down gesture */}
      <View style={{ position: "absolute", bottom: "30%", alignItems: "center" }}>
        <Text className="text-white text-16 font-medium mb-2">Swipe down for previous</Text>
        <Animated.View style={[{ transform: [{ rotate: "180deg" }] }, swipeIndicatorStyle]}>
          <Ionicons name="chevron-up" size={40} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Dismiss button */}
      <Pressable
        onPress={handleDismiss}
        style={{
          position: "absolute",
          bottom: 100,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.3)",
        }}
      >
        <Text className="text-white text-14 font-medium">Got it!</Text>
      </Pressable>
    </Animated.View>
  );
}
