/**
 * OptimizedFeedAd Component
 * Optimized version with memoization to prevent unnecessary re-renders
 */

import React, { memo, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { FeedAdComponent } from "./FeedAd";
import type { FeedAdProps, AdConfig } from "../types";

interface OptimizedFeedAdProps extends FeedAdProps {
  config: AdConfig;
  isPremium: boolean;
  hasConsent: boolean;
}

/**
 * Optimized ad banner that only renders when necessary
 * and uses memoization to prevent unnecessary re-renders
 */
export const OptimizedFeedAd: React.FC<OptimizedFeedAdProps> = memo(
  ({ index, interval = 5, placement = "home-feed", size = "medium", config, isPremium, hasConsent }) => {
    // Create stable random offset once per component instance
    const randomOffsetRef = useRef(Math.floor(Math.random() * 2));

    // Memoize the ad decision to prevent recalculation
    const shouldShowAd = useMemo(() => {
      // Don't show ads for premium users
      if (isPremium) return false;

      // Don't show ad on first item
      if (index === 0) return false;

      // Show ad every nth item with deterministic randomization
      const baseInterval = Math.max(1, interval);
      const randomOffset = randomOffsetRef.current;
      const actualInterval = baseInterval + randomOffset;

      return index % actualInterval === 0;
    }, [index, interval, isPremium]);

    // Early return if no ad should be shown
    if (!shouldShowAd) return null;

    return (
      <View style={styles.container} accessibilityLabel="Advertisement" accessibilityRole="none">
        <FeedAdComponent
          index={index}
          interval={interval}
          placement={placement}
          size={size}
          config={config}
          isPremium={isPremium}
          hasConsent={hasConsent}
        />
      </View>
    );
  },
);

OptimizedFeedAd.displayName = "OptimizedFeedAd";

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
});

/**
 * Helper function to determine if an ad should be shown at a given index
 */
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
  const sanitizedInterval = Math.max(1, Math.floor(interval));
  const sanitizedOffset = Math.max(0, Math.floor(randomOffset));
  const actualInterval = Math.max(1, sanitizedInterval + sanitizedOffset);

  return index % actualInterval === 0;
};
