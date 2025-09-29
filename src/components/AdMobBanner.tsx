import React, { useEffect, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { AdMobService } from "../services/AdMobService";
import { hasAdvertisingConsent } from "../state/consentStore";

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

interface AdMobBannerProps {
  visible?: boolean;
  testMode?: boolean;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ visible = true, testMode = __DEV__ }) => {
  const [adError, setAdError] = useState<string | null>(null);
  const [moduleLoaded, setModuleLoaded] = useState(false);

  // Get ad unit ID from AdMobService
  const adUnitId = AdMobService.getBannerAdUnitId();

  useEffect(() => {
    loadAdMobModule().then((loaded) => {
      setModuleLoaded(loaded);
    });
  }, []);

  // Check consent
  const hasConsent = hasAdvertisingConsent();

  if (!visible || !hasConsent || !adUnitId) {
    return null;
  }

  if (AdMobService.isExpoGo()) {
    return (
      <View style={styles.demoBanner}>
        <Text style={styles.demoText}>📱 AdMob Banner Ad ({testMode ? "Test Mode" : "Production"})</Text>
        <Text style={styles.demoSubtext}>Requires development build</Text>
      </View>
    );
  }

  if (!moduleLoaded || !BannerAd || !BannerAdSize) {
    return (
      <View style={styles.loadingBanner}>
        <Text style={styles.loadingText}>Loading ads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !hasConsent,
        }}
        onAdLoaded={() => {
          console.log("✅ Banner ad loaded");
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
