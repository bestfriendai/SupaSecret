import React from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";

export default function TrendingSkeleton() {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);

    // Cleanup function to cancel animation on unmount
    return () => {
      cancelAnimation(shimmer);
      shimmer.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View className="py-4">
      {/* Hashtags section skeleton */}
      <View className="mb-6">
        <Animated.View style={shimmerStyle} className="h-4 bg-gray-700 rounded mb-3 w-32" />
        <View className="flex-row flex-wrap">
          {[1, 2, 3, 4, 5].map((index) => (
            <View key={index} className="mr-2 mb-2">
              <Animated.View
                style={[shimmerStyle, { width: Math.random() * 40 + 60 }]}
                className="bg-gray-700 rounded-full px-3 py-1 h-8"
              />
            </View>
          ))}
        </View>
      </View>

      {/* Trending secrets section skeleton */}
      <View>
        <Animated.View style={shimmerStyle} className="h-4 bg-gray-700 rounded mb-3 w-40" />
        {[1, 2, 3].map((index) => (
          <View key={index} className="bg-gray-900 rounded-lg p-4 mb-3">
            <View className="flex-row items-center mb-2">
              <Animated.View style={shimmerStyle} className="w-8 h-8 bg-gray-700 rounded-full mr-2" />
              <Animated.View style={shimmerStyle} className="h-3 bg-gray-700 rounded flex-1" />
            </View>

            <Animated.View style={shimmerStyle} className="h-4 bg-gray-700 rounded mb-2" />
            <Animated.View style={shimmerStyle} className="h-4 bg-gray-700 rounded mb-2 w-4/5" />
            <Animated.View style={shimmerStyle} className="h-4 bg-gray-700 rounded w-3/5" />

            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-row items-center">
                <Animated.View style={shimmerStyle} className="w-6 h-6 bg-gray-700 rounded mr-2" />
                <Animated.View style={shimmerStyle} className="h-3 bg-gray-700 rounded w-8" />
              </View>
              <Animated.View style={shimmerStyle} className="h-3 bg-gray-700 rounded w-16" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
