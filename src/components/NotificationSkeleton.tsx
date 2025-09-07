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

export default function NotificationSkeleton() {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);

    // Cleanup function to cancel animation on unmount
    return () => {
      cancelAnimation(shimmer);
      shimmer.value = 0;
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <View className="px-4 py-3 border-b border-gray-800">
      <View className="flex-row items-start">
        {/* Avatar skeleton */}
        <Animated.View 
          style={shimmerStyle}
          className="w-10 h-10 bg-gray-700 rounded-full mr-3"
        />
        
        <View className="flex-1">
          {/* Title skeleton */}
          <Animated.View 
            style={shimmerStyle}
            className="h-4 bg-gray-700 rounded mb-2"
            style={{ width: '80%' }}
          />
          
          {/* Content skeleton */}
          <Animated.View 
            style={shimmerStyle}
            className="h-3 bg-gray-700 rounded mb-1"
            style={{ width: '100%' }}
          />
          <Animated.View 
            style={shimmerStyle}
            className="h-3 bg-gray-700 rounded mb-2"
            style={{ width: '60%' }}
          />
          
          {/* Timestamp skeleton */}
          <Animated.View 
            style={shimmerStyle}
            className="h-3 bg-gray-700 rounded"
            style={{ width: '40%' }}
          />
        </View>
        
        {/* Unread indicator skeleton */}
        <Animated.View 
          style={shimmerStyle}
          className="w-2 h-2 bg-gray-700 rounded-full ml-2 mt-2"
        />
      </View>
    </View>
  );
}
