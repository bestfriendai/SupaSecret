import React, { useEffect, useState } from "react";
import { View, Text, StyleProp, ViewStyle, Platform } from "react-native";
import { useSubscriptionStore } from "../../features/subscription";
import { AdMobService } from "../../services/AdMobService";
import { hasAdvertisingConsent } from "../../state/consentStore";

interface BannerAdComponentProps {
  size?: "banner" | "large" | "medium";
  style?: StyleProp<ViewStyle>;
  placement?: "home-feed" | "video-feed" | "profile";
}

// Dynamic import for native module
let BannerAd: any = null;
let BannerAdSize: any = null;

const loadAdMobModule = async () => {
  if (Platform.OS === "web" || AdMobService.isExpoGo()) {
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

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  size = "banner",
  style,
  placement = "home-feed",
}) => {
  const { isPremium } = useSubscriptionStore();
  const [moduleLoaded, setModuleLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Get ad unit ID from AdMobService
  const adUnitId = AdMobService.getBannerAdUnitId();

  // Check consent
  const hasConsent = hasAdvertisingConsent();

  useEffect(() => {
    loadAdMobModule().then((loaded) => {
      setModuleLoaded(loaded);
    });
  }, []);

  if (isPremium || !hasConsent || !adUnitId) return null;

  // Demo ad for Expo Go
  if (AdMobService.isExpoGo()) {
    const adHeight = size === "large" ? 250 : size === "medium" ? 100 : 50;
    return (
      <View
        style={[
          {
            alignItems: "center",
            marginVertical: 10,
            backgroundColor: "#1a1a1a",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#333",
            overflow: "hidden",
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 10, color: "#666", marginBottom: 5, marginTop: 8 }}>Sponsored</Text>
        <View
          style={{
            width: "90%",
            height: adHeight,
            backgroundColor: "#2a2a2a",
            borderRadius: 6,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 16, color: "#4a9eff", marginBottom: 4 }}>📱 Toxic Confessions Premium</Text>
          <Text style={{ fontSize: 12, color: "#ccc", textAlign: "center" }}>
            Demo Ad - Real ads in dev build
          </Text>
        </View>
      </View>
    );
  }

  // Loading state while module loads
  if (!moduleLoaded || !BannerAd || !BannerAdSize) {
    return (
      <View style={[{ alignItems: "center", justifyContent: "center", minHeight: 50 }, style]}>
        <Text style={{ fontSize: 12, color: "#999" }}>Loading ads...</Text>
      </View>
    );
  }

  // Get appropriate banner size
  const getBannerSize = () => {
    if (size === "large") return BannerAdSize.LARGE_BANNER;
    if (size === "medium") return BannerAdSize.MEDIUM_RECTANGLE;
    return BannerAdSize.BANNER;
  };

  // Real AdMob banner ad
  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          marginVertical: 10,
        },
        style,
      ]}
    >
      <BannerAd
        unitId={adUnitId}
        size={getBannerSize()}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !hasConsent,
        }}
        onAdLoaded={() => {
          console.log("✅ Banner ad loaded successfully");
          setAdError(null);
        }}
        onAdFailedToLoad={(error: any) => {
          console.error("❌ Banner ad failed to load:", error);
          setAdError(error.message || "Failed to load ad");
        }}
        onAdOpened={() => {
          console.log("👆 Banner ad opened");
        }}
        onAdClosed={() => {
          console.log("👇 Banner ad closed");
        }}
      />
      {adError && __DEV__ && (
        <Text style={{ fontSize: 10, color: "red", marginTop: 5, textAlign: "center" }}>
          Ad Error: {adError}
        </Text>
      )}
    </View>
  );
};
