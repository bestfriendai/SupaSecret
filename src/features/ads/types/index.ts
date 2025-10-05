/**
 * Ad Types and Interfaces
 */

export type AdPlacement = "home-feed" | "video-feed" | "profile" | "post-creation" | "settings";

export type AdSize = "banner" | "medium" | "large" | "full-banner" | "leaderboard";

export type AdType = "banner" | "interstitial" | "rewarded";

export interface AdConfig {
  enabled: boolean;
  testMode: boolean;
  appId: {
    ios: string;
    android: string;
  };
  adUnits: {
    banner: {
      ios: string;
      android: string;
    };
    interstitial: {
      ios: string;
      android: string;
    };
    rewarded: {
      ios: string;
      android: string;
    };
  };
}

export interface AdRequestOptions {
  requestNonPersonalizedAdsOnly?: boolean;
  tagForChildDirectedTreatment?: boolean;
  tagForUnderAgeOfConsent?: boolean;
  maxAdContentRating?: "G" | "PG" | "T" | "MA";
}

export interface BannerAdProps {
  visible?: boolean;
  size?: AdSize;
  placement?: AdPlacement;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
}

export interface InterstitialAdOptions {
  skipIfPremium?: boolean;
  placement?: AdPlacement;
  onAdDismissed?: () => void;
  onAdFailedToShow?: (error: Error) => void;
}

export interface RewardedAdResult {
  shown: boolean;
  rewarded: boolean;
  rewardAmount?: number;
  rewardType?: string;
}

export interface RewardedAdOptions {
  placement?: AdPlacement;
  onEarnedReward?: (reward: { amount: number; type: string }) => void;
  onAdDismissed?: () => void;
  onAdFailedToShow?: (error: Error) => void;
}

export interface FeedAdProps {
  index: number;
  interval?: number;
  placement?: AdPlacement;
  size?: AdSize;
}

export interface AdMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalRevenue: number;
  impressionsByType: Record<AdType, number>;
  clicksByType: Record<AdType, number>;
  revenueByType: Record<AdType, number>;
}

export interface AdError {
  code: number;
  message: string;
  domain?: string;
}

// Test ad unit IDs from Google
export const TEST_AD_UNITS = {
  banner: {
    ios: "ca-app-pub-3940256099942544/2934735716",
    android: "ca-app-pub-3940256099942544/6300978111",
  },
  interstitial: {
    ios: "ca-app-pub-3940256099942544/4411468910",
    android: "ca-app-pub-3940256099942544/1033173712",
  },
  rewarded: {
    ios: "ca-app-pub-3940256099942544/1712485313",
    android: "ca-app-pub-3940256099942544/5224354917",
  },
} as const;
