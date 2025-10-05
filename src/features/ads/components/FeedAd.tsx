/**
 * FeedAd Component
 * Displays ads within list/feed items at regular intervals
 */

import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { BannerAdComponent } from "./BannerAd";
import type { FeedAdProps, AdConfig } from "../types";

interface FeedAdComponentProps extends FeedAdProps {
  config: AdConfig;
  isPremium: boolean;
  hasConsent: boolean;
}

/**
 * FeedAd Component
 * Shows ads at specified intervals in a feed
 */
export const FeedAdComponent: React.FC<FeedAdComponentProps> = memo(
  ({ index, interval = 5, placement = "home-feed", size = "medium", config, isPremium, hasConsent }) => {
    // Don't show ads for premium users
    if (isPremium) return null;

    // Ensure interval is at least 1 to prevent division by zero
    const safeInterval = Math.max(1, interval);

    // Use deterministic offset based on index for stable ad placement
    const offset = index % safeInterval;
    if ((index - offset) % safeInterval !== 0 || index === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <BannerAdComponent
          visible={true}
          size={size}
          placement={placement}
          config={config}
          isPremium={isPremium}
          hasConsent={hasConsent}
        />
      </View>
    );
  },
);

FeedAdComponent.displayName = "FeedAdComponent";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
});
