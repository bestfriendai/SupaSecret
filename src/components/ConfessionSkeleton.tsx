import React from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";

interface ConfessionSkeletonProps {
  showVideo?: boolean;
}

export default function ConfessionSkeleton({ showVideo = false }: ConfessionSkeletonProps) {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);

    // Cleanup function to cancel animation on unmount
    return () => {
      cancelAnimation(shimmer);
      shimmer.value = 0; // Reset to safe default
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  }, []);

  const SkeletonBox = ({
    width,
    height,
    className = "",
  }: {
    width: DimensionValue;
    height: number;
    className?: string;
  }) => (
    <Animated.View
      style={[shimmerStyle, { width, height } as ViewStyle]}
      className={`bg-gray-700 rounded ${className}`}
    />
  );

  return (
    <View className="border-b border-gray-800 px-4 py-3">
      {/* Header with avatar and info */}
      <View className="flex-row items-start mb-3">
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden opacity-50">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <SkeletonBox width={80} height={16} className="mr-2" />
            <SkeletonBox width={4} height={4} className="rounded-full mr-2" />
            <SkeletonBox width={60} height={16} className="mr-2" />
            <SkeletonBox width={4} height={4} className="rounded-full mr-2" />
            <SkeletonBox width={40} height={16} />
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="mb-3">
        <SkeletonBox width="100%" height={16} className="mb-2" />
        <SkeletonBox width="85%" height={16} className="mb-2" />
        <SkeletonBox width="70%" height={16} />
      </View>

      {/* Video placeholder if needed */}
      {showVideo && (
        <View className="bg-gray-900 border border-gray-700 rounded-2xl p-3 mb-3">
          <View className="flex-row items-center">
            <SkeletonBox width={24} height={24} className="rounded-full mr-2" />
            <SkeletonBox width={120} height={16} className="mr-auto" />
            <SkeletonBox width={16} height={16} className="mr-1" />
            <SkeletonBox width={80} height={12} />
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row items-center justify-between pt-2">
        <View className="flex-row items-center">
          <View className="flex-row items-center">
            <SkeletonBox width={18} height={18} className="mr-1" />
            <SkeletonBox width={20} height={16} />
          </View>
          <View className="flex-row items-center ml-6">
            <SkeletonBox width={18} height={18} className="mr-1" />
            <SkeletonBox width={15} height={16} />
          </View>
          <View className="flex-row items-center ml-6">
            <SkeletonBox width={18} height={18} className="mr-1" />
            <SkeletonBox width={30} height={16} />
          </View>
        </View>
        <SkeletonBox width={18} height={18} />
      </View>
    </View>
  );
}
