/**
 * BannerAd Component
 * Displays banner ads with proper consent and premium checks
 */

import React, { useEffect, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { adService } from "../services/adService";
import type { BannerAdProps, AdConfig } from "../types";

// Dynamic import for native module
let BannerAd: any = null;
let BannerAdSize: any = null;

const loadAdMobModule = async () => {
  if (Platform.OS === "web" || adService.isExpoGo()) {
    return false;
  }

  try {
    const module = await import("react-native-google-mobile-ads");
    BannerAd = (module as any).BannerAd;
    BannerAdSize = (module as any).BannerAdSize;
    return true;
  } catch (error) {
    console.warn("AdMob module not available:", error);
    return false;
  }
};

interface BannerAdComponentProps extends BannerAdProps {
  config: AdConfig;
  isPremium: boolean;
  hasConsent: boolean;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  visible = true,
  size = "banner",
  placement = "home-feed",
  config,
  isPremium,
  hasConsent,
  onAdLoaded,
  onAdFailedToLoad,
  onAdOpened,
  onAdClosed,
}) => {
  const [adError, setAdError] = useState<string | null>(null);
  const [moduleLoaded, setModuleLoaded] = useState(false);

  // Get ad unit ID from service
  const adUnitId = adService.getAdUnitId("banner", config);

  useEffect(() => {
    loadAdMobModule().then((loaded) => {
      setModuleLoaded(loaded);
    });
  }, []);

  // Don't show ads if:
  // - Not visible
  // - User is premium
  // - No consent
  // - No ad unit ID
  // - Ads disabled in config
  if (!visible || isPremium || !hasConsent || !adUnitId || !config.enabled) {
    return null;
  }

  // Demo mode for Expo Go
  if (adService.isExpoGo()) {
    return (
      <View style={styles.demoBanner}>
        <Text style={styles.demoText}>
          Banner Ad - {placement} ({config.testMode ? "Test Mode" : "Production"})
        </Text>
        <Text style={styles.demoSubtext}>Requires development build</Text>
      </View>
    );
  }

  // Loading state
  if (!moduleLoaded || !BannerAd || !BannerAdSize) {
    return (
      <View style={styles.loadingBanner}>
        <Text style={styles.loadingText}>Loading ad...</Text>
      </View>
    );
  }

  // Map size to AdMob size
  const getSizeConstant = () => {
    switch (size) {
      case "large":
        return BannerAdSize.LARGE_BANNER;
      case "medium":
        return BannerAdSize.MEDIUM_RECTANGLE;
      case "full-banner":
        return BannerAdSize.FULL_BANNER;
      case "leaderboard":
        return BannerAdSize.LEADERBOARD;
      case "banner":
      default:
        return BannerAdSize.BANNER;
    }
  };

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={getSizeConstant()}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !hasConsent,
        }}
        onAdLoaded={() => {
          console.log(`Banner ad loaded - ${placement}`);
          setAdError(null);
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error: any) => {
          console.error(`Banner ad failed to load - ${placement}:`, error);
          const errorMessage = error.message || "Failed to load ad";
          setAdError(errorMessage);
          onAdFailedToLoad?.(new Error(errorMessage));
        }}
        onAdOpened={() => {
          console.log(`Banner ad opened - ${placement}`);
          onAdOpened?.();
        }}
        onAdClosed={() => {
          console.log(`Banner ad closed - ${placement}`);
          onAdClosed?.();
        }}
      />
      {adError && __DEV__ && <Text style={styles.errorText}>Ad Error: {adError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    minHeight: 50,
  },
  demoBanner: {
    height: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 5,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  demoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  demoSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  loadingBanner: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 12,
    color: "#999",
  },
  errorText: {
    fontSize: 10,
    color: "red",
    marginTop: 5,
    textAlign: "center",
  },
});
