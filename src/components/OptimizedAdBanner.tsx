import React, { memo, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { FeedAdComponent } from './ads/FeedAdComponent';
import { useSubscriptionStore } from '../state/subscriptionStore';

interface OptimizedAdBannerProps {
  index: number;
  placement: 'home-feed' | 'video-feed' | 'profile';
  interval?: number;
}

/**
 * Optimized ad banner that only renders when necessary
 * and uses memoization to prevent unnecessary re-renders
 */
const OptimizedAdBanner: React.FC<OptimizedAdBannerProps> = memo(({
  index,
  placement,
  interval = 5,
}) => {
  const { isPremium } = useSubscriptionStore();

  // Create stable random offset once per component instance
  const randomOffsetRef = useRef(() => Math.floor(Math.random() * 2));

  // Memoize the ad decision to prevent recalculation
  const shouldShowAd = useMemo(() => {
    // Don't show ads for premium users
    if (isPremium) return false;

    // Don't show ad on first item
    if (index === 0) return false;

    // Show ad every nth item with deterministic randomization
    const baseInterval = interval;
    const randomOffset = randomOffsetRef.current();
    const actualInterval = baseInterval + randomOffset;

    return index % actualInterval === 0;
  }, [index, interval, isPremium]);

  // Early return if no ad should be shown
  if (!shouldShowAd) return null;

  return (
    <View 
      style={{ 
        marginVertical: 8,
        paddingHorizontal: 16,
      }}
      accessibilityLabel="Advertisement"
      accessibilityRole="banner"
    >
      <FeedAdComponent
        index={index}
        interval={interval}
        placement={placement}
      />
    </View>
  );
});

OptimizedAdBanner.displayName = 'OptimizedAdBanner';

export default OptimizedAdBanner;

// Helper function to determine if an ad should be shown at a given index
export const shouldShowAdAtIndex = (
  index: number,
  interval: number = 5,
  isPremium: boolean = false,
  randomOffset: number = 0
): boolean => {
  if (isPremium || index === 0) return false;

  const actualInterval = interval + randomOffset;

  return index % actualInterval === 0;
};
