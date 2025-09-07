import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import LottieView from "lottie-react-native"; // Commented out for now, using fallback
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { useConfessionStore } from "../state/confessionStore";
import { useTrendingStore } from "../state/trendingStore";

interface PullToRefreshProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
  context?: "secrets" | "videos";
  onRefreshComplete?: () => void;
}

export default function PullToRefresh({
  pullDistance,
  isRefreshing,
  threshold = 80,
  context = "secrets",
  onRefreshComplete,
}: PullToRefreshProps) {
  const { userPreferences } = useConfessionStore();
  const { trendingHashtags } = useTrendingStore();
  const [showTrendingHint, setShowTrendingHint] = useState(false);
  const [trendingHintText, setTrendingHintText] = useState("");

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const progressArc = useSharedValue(0);
  const trendingHintOpacity = useSharedValue(0);

  // Update progress arc based on pull distance
  useEffect(() => {
    const progress = Math.min(pullDistance / threshold, 1);
    progressArc.value = withTiming(progress, { duration: 100 });
  }, [pullDistance, threshold]);

  useEffect(() => {
    if (isRefreshing) {
      if (!userPreferences.reducedMotion) {
        rotation.value = withRepeat(
          withTiming(360, {
            duration: 1000,
            easing: Easing.linear,
          }),
          -1,
        );
        scale.value = withSpring(1.1);
      }
    } else {
      rotation.value = withTiming(0, { duration: 300 });
      scale.value = withSpring(1);

      // Show trending hint after refresh completes
      if (onRefreshComplete && trendingHashtags.length > 0) {
        const topHashtag = trendingHashtags[0];
        setTrendingHintText(`Top tag: ${topHashtag.hashtag}`);
        setShowTrendingHint(true);

        trendingHintOpacity.value = withSequence(
          withDelay(500, withTiming(1, { duration: 300 })),
          withDelay(2000, withTiming(0, { duration: 300 })),
        );

        setTimeout(() => {
          setShowTrendingHint(false);
          onRefreshComplete();
        }, 3000);
      }
    }
  }, [isRefreshing, userPreferences.reducedMotion, trendingHashtags, onRefreshComplete]);

  // Dynamic messaging based on context and pull state
  const getContextualMessage = () => {
    const contextMessages = {
      secrets: {
        pull: "Pull to refresh secrets",
        near: "Release to refresh — fetching freshest confessions",
        refreshing: "Refreshing… new secrets secure and anonymous",
      },
      videos: {
        pull: "Pull to refresh videos",
        near: "Release to refresh — loading fresh video confessions",
        refreshing: "Refreshing… discovering new stories",
      },
    };

    const messages = contextMessages[context];

    if (isRefreshing) return messages.refreshing;
    if (shouldTrigger) return messages.near;
    return messages.pull;
  };

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(pullDistance, [0, threshold], [0, 1], "clamp");

    const translateY = interpolate(pullDistance, [0, threshold], [-20, 0], "clamp");

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progressArc.value * 360}deg` }],
  }));

  const trendingHintStyle = useAnimatedStyle(() => ({
    opacity: trendingHintOpacity.value,
  }));

  const shouldTrigger = pullDistance >= threshold;

  return (
    <>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 20,
          },
          containerStyle,
        ]}
      >
        {/* Main refresh indicator */}
        <View style={{ position: "relative", marginBottom: 8 }}>
          {/* Progress arc background */}
          {!isRefreshing && (
            <View
              style={{
                position: "absolute",
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.2)",
                top: -2,
                left: -2,
              }}
            />
          )}

          {/* Progress arc */}
          {!isRefreshing && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  borderRightColor: "transparent",
                  borderBottomColor: "transparent",
                  top: -2,
                  left: -2,
                },
                progressStyle,
              ]}
            />
          )}

          {/* Icon container */}
          <Animated.View
            style={[
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                alignItems: "center",
                justifyContent: "center",
              },
              iconStyle,
            ]}
          >
            {isRefreshing && !userPreferences.reducedMotion ? (
              // Use Lottie animation for enhanced refresh experience
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isRefreshing ? "refresh" : shouldTrigger ? "checkmark" : "arrow-down"}
                size={20}
                color="#FFFFFF"
              />
            )}
          </Animated.View>
        </View>

        {/* Contextual message */}
        <Text className="text-white text-12 font-medium text-center max-w-64">{getContextualMessage()}</Text>
      </Animated.View>

      {/* Trending hint */}
      {showTrendingHint && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 140,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 19,
            },
            trendingHintStyle,
          ]}
        >
          <View
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.9)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="trending-up" size={14} color="#FFFFFF" />
            <Text className="text-white text-11 font-medium ml-1">{trendingHintText}</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}
