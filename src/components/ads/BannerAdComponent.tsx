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
    loadAdMobModule()
      .then((loaded) => {
        if (__DEV__) {
          console.log(`📱 AdMob Banner Component [${placement}]`);
          console.log(`  ✓ Module loaded: ${loaded}`);
          console.log(`  ✓ Ad Unit ID: ${adUnitId || 'MISSING'}`);
          console.log(`  ✓ Has Consent: ${hasConsent}`);
          console.log(`  ✓ Is Premium: ${isPremium}`);
          console.log(`  ✓ Platform: ${Platform.OS}`);
          console.log(`  ✓ Is Expo Go: ${AdMobService.isExpoGo()}`);
        }
        setModuleLoaded(loaded);
      })
      .catch((error) => {
        console.error("❌ Failed to load AdMob module:", error);
        setModuleLoaded(false);
      });
  }, []);

  if (isPremium) {
    if (__DEV__) {
      console.log(`🚫 Ad hidden: User is premium`);
    }
    return null;
  }

  if (!hasConsent) {
    if (__DEV__) {
      console.log(`🚫 Ad hidden: No advertising consent`);
    }
    return null;
  }

  if (!adUnitId) {
    if (__DEV__) {
      console.error(`❌ Ad Unit ID missing for ${placement}`);
    }
    return null;
  }

  // Demo ad for Expo Go
  if (AdMobService.isExpoGo()) {
    const adHeight = size === "large" ? 250 : size === "medium" ? 100 : 50;
    return (
      <View
        style={[
          {
            alignItems: "center",
            marginVertical: 0,
            backgroundColor: "transparent",
            borderRadius: 8,
            overflow: "hidden",
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 9, color: "#666", marginBottom: 6, marginTop: 4 }}>SPONSORED</Text>
        <View
          style={{
            width: "100%",
            height: adHeight,
            backgroundColor: "#0a0a0a",
            borderRadius: 6,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 4,
            borderWidth: 1,
            borderColor: "#2a2a2a",
          }}
        >
          <Text style={{ fontSize: 15, color: "#9333EA", marginBottom: 4, fontWeight: "600" }}>
            📱 Toxic Confessions Premium
          </Text>
          <Text style={{ fontSize: 11, color: "#666", textAlign: "center" }}>Demo Ad - Dev build for real ads</Text>
        </View>
      </View>
    );
  }

  // Loading state while module loads
  if (!moduleLoaded || !BannerAd || !BannerAdSize) {
    return (
      <View
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            minHeight: 50,
            backgroundColor: "transparent",
          },
          style,
        ]}
      >
        <Text style={{ fontSize: 11, color: "#444" }}>Loading ad...</Text>
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
  if (__DEV__) {
    console.log(`🎯 Rendering real AdMob banner: size=${size}, unitId=${adUnitId}`);
  }

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
          marginVertical: 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 9, color: "#666", marginBottom: 6, marginTop: 4 }}>SPONSORED</Text>
      <BannerAd
        unitId={adUnitId}
        size={getBannerSize()}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !hasConsent,
        }}
        onAdLoaded={() => {
          if (__DEV__) console.log("✅ Banner ad loaded successfully");
          setAdError(null);
        }}
        onAdFailedToLoad={(error: any) => {
          if (__DEV__) console.error("❌ Banner ad failed to load:", error);
          setAdError(error?.message || "Failed to load ad");
        }}
        onAdOpened={() => {
          if (__DEV__) console.log("👆 Banner ad opened");
        }}
        onAdClosed={() => {
          if (__DEV__) console.log("👇 Banner ad closed");
        }}
      />
      {adError && __DEV__ && (
        <Text style={{ fontSize: 10, color: "#ff6b6b", marginTop: 5, textAlign: "center" }}>{adError}</Text>
      )}
    </View>
  );
};
