import React, { memo } from "react";
import { View } from "react-native";
import { FeedAdComponent } from "./ads/FeedAdComponent";
import { useSubscriptionStore } from "../features/subscription";

interface OptimizedAdBannerProps {
  index: number;
  placement: "home-feed" | "video-feed" | "profile";
  interval?: number;
}

/**
 * Optimized ad banner that only renders when necessary
 * and uses memoization to prevent unnecessary re-renders
 */
const OptimizedAdBanner: React.FC<OptimizedAdBannerProps> = memo(({ index, placement, interval = 5 }) => {
  const { isPremium } = useSubscriptionStore();

  // Don't show ads for premium users
  if (isPremium) return null;

  return (
    <View
      style={{
        marginVertical: 8,
        paddingHorizontal: 16,
      }}
      accessibilityLabel="Advertisement"
      accessibilityRole="none"
    >
      <FeedAdComponent index={index} interval={interval} placement={placement} />
    </View>
  );
});

OptimizedAdBanner.displayName = "OptimizedAdBanner";

export default OptimizedAdBanner;

// Helper function to determine if an ad should be shown at a given index
export const shouldShowAdAtIndex = (
  index: number,
  interval: number = 5,
  isPremium: boolean = false,
  randomOffset: number = 0,
): boolean => {
  // Return false early for invalid index values
  if (index < 0 || !Number.isInteger(index)) return false;
  if (isPremium || index === 0) return false;

  // Sanitize inputs
  const sanitizedInterval = Math.max(1, Math.floor(interval)); // Ensure positive integer >= 1
  const sanitizedOffset = Math.max(0, Math.floor(randomOffset)); // Ensure non-negative integer
  const actualInterval = Math.max(1, sanitizedInterval + sanitizedOffset); // Ensure >= 1

  return index % actualInterval === 0;
};
