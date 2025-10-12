/**
 * Ad Configuration Builder
 * Helper functions to create and validate ad configurations
 */

import { Platform } from "react-native";
import type { AdConfig } from "../types";
import { TEST_AD_UNITS } from "../types";

/**
 * Get environment variable helper
 * Note: Using direct access to avoid dynamic env var access linting error
 */
const getEnvVar = (name: string, fallback?: string): string => {
  // Map of known environment variables to avoid dynamic access
  const envMap: Record<string, string | undefined> = {
    EXPO_PUBLIC_ADMOB_IOS_APP_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    EXPO_PUBLIC_ADMOB_IOS_BANNER_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
    EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
    EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
    EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
    EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
  };

  const value = envMap[name];
  return value || fallback || "";
};

/**
 * Validate ad unit ID format
 */
export const isValidAdUnitId = (id: string | undefined | null): boolean => {
  if (!id || typeof id !== "string") return false;
  return id.startsWith("ca-app-pub-") && id.includes("/");
};

/**
 * Create ad configuration from environment variables
 */
export const createAdConfig = (options?: { enabled?: boolean; testMode?: boolean; useTestAds?: boolean }): AdConfig => {
  const { enabled = true, testMode = __DEV__, useTestAds = false } = options || {};

  // Use test ads if specified or in development mode
  const shouldUseTestAds = useTestAds || testMode;

  return {
    enabled,
    testMode,
    appId: {
      ios: shouldUseTestAds
        ? "ca-app-pub-3940256099942544~1458002511" // Google test app ID
        : getEnvVar("EXPO_PUBLIC_ADMOB_IOS_APP_ID"),
      android: shouldUseTestAds
        ? "ca-app-pub-3940256099942544~3347511713" // Google test app ID
        : getEnvVar("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID"),
    },
    adUnits: {
      banner: shouldUseTestAds
        ? TEST_AD_UNITS.banner
        : {
            ios: getEnvVar("EXPO_PUBLIC_ADMOB_IOS_BANNER_ID"),
            android: getEnvVar("EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID"),
          },
      interstitial: shouldUseTestAds
        ? TEST_AD_UNITS.interstitial
        : {
            ios: getEnvVar("EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID"),
            android: getEnvVar("EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID"),
          },
      rewarded: shouldUseTestAds
        ? TEST_AD_UNITS.rewarded
        : {
            ios: getEnvVar("EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID"),
            android: getEnvVar("EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID"),
          },
    },
  };
};

/**
 * Validate ad configuration
 */
export const validateAdConfig = (config: AdConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if enabled
  if (!config.enabled) {
    return { valid: true, errors: ["Ads are disabled"] };
  }

  // Validate app IDs
  if (!config.appId.ios || !config.appId.android) {
    errors.push("Missing app IDs");
  }

  // Validate banner ad units
  const bannerId = Platform.select(config.adUnits.banner);
  if (!isValidAdUnitId(bannerId)) {
    errors.push("Invalid banner ad unit ID");
  }

  // Validate interstitial ad units
  const interstitialId = Platform.select(config.adUnits.interstitial);
  if (!isValidAdUnitId(interstitialId)) {
    errors.push("Invalid interstitial ad unit ID");
  }

  // Validate rewarded ad units
  const rewardedId = Platform.select(config.adUnits.rewarded);
  if (!isValidAdUnitId(rewardedId)) {
    errors.push("Invalid rewarded ad unit ID");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get platform-specific ad unit ID
 */
export const getAdUnitIdForPlatform = (adUnit: { ios: string; android: string }): string | undefined => {
  return Platform.select(adUnit);
};

/**
 * Log ad configuration (for debugging)
 */
export const logAdConfig = (config: AdConfig): void => {
  console.log("=== Ad Configuration ===");
  console.log("Enabled:", config.enabled);
  console.log("Test Mode:", config.testMode);
  console.log("App ID:", Platform.select(config.appId));
  console.log("Banner ID:", getAdUnitIdForPlatform(config.adUnits.banner));
  console.log("Interstitial ID:", getAdUnitIdForPlatform(config.adUnits.interstitial));
  console.log("Rewarded ID:", getAdUnitIdForPlatform(config.adUnits.rewarded));

  const validation = validateAdConfig(config);
  console.log("Valid:", validation.valid);
  if (!validation.valid) {
    console.log("Errors:", validation.errors);
  }
  console.log("=======================");
};
