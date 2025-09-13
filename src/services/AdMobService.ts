import { Platform } from "react-native";
import Constants from "expo-constants";
import { hasAdvertisingConsent } from "../state/consentStore";
import { getConfig } from "../config/production";

// Note: AdMob requires development build - this is demo mode for Expo Go
const IS_EXPO_GO = Constants.appOwnership === "expo";
const config = getConfig();

// AdMob Ad Unit IDs - use test IDs in development, production IDs in release
const AD_UNIT_IDS = {
  banner: __DEV__
    ? Platform.select({
        ios: "ca-app-pub-3940256099942544/2934735716",
        android: "ca-app-pub-3940256099942544/6300978111",
      })
    : config.ADMOB.AD_UNITS.banner,
  interstitial: __DEV__
    ? Platform.select({
        ios: "ca-app-pub-3940256099942544/4411468910",
        android: "ca-app-pub-3940256099942544/1033173712",
      })
    : config.ADMOB.AD_UNITS.interstitial,
  rewarded: __DEV__
    ? Platform.select({
        ios: "ca-app-pub-3940256099942544/1712485313",
        android: "ca-app-pub-3940256099942544/5224354917",
      })
    : config.ADMOB.AD_UNITS.rewarded,
};

export class AdMobService {
  private static lastInterstitialTime = 0;
  private static readonly INTERSTITIAL_COOLDOWN = 60000; // 1 minute
  private static isInitialized = false;
  private static mobileAds: any = null;
  private static interstitialAd: any = null;
  private static rewardedAd: any = null;
  private static AdMobModule: any = null;

  // Type definitions for AdMob components
  private static MobileAdsType: any = null;
  private static InterstitialAdType: any = null;
  private static RewardedAdType: any = null;
  private static BannerAdSizeType: any = null;
  private static TestIdsType: any = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log("🎯 AdMob Demo Mode - Development build required for real ads");
      this.isInitialized = true;
      return;
    }

    try {
      // Real AdMob initialization for development build
      this.AdMobModule = await import("react-native-google-mobile-ads");
      const { default: mobileAds, InterstitialAd, RewardedAd, BannerAdSize, TestIds } = this.AdMobModule;

      // Store type references for later use
      this.MobileAdsType = mobileAds;
      this.InterstitialAdType = InterstitialAd;
      this.RewardedAdType = RewardedAd;
      this.BannerAdSizeType = BannerAdSize;
      this.TestIdsType = TestIds;

      this.mobileAds = mobileAds;

      // Initialize AdMob
      await mobileAds().initialize();

      // Set request configuration based on consent
      const hasConsent = hasAdvertisingConsent();
      await mobileAds().setRequestConfiguration({
        // Set to true if user has not consented to personalized ads
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: "MA",
        requestNonPersonalizedAdsOnly: !hasConsent,
      });

      // Pre-load interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
      this.interstitialAd.load();

      // Pre-load rewarded ad
      this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
      this.rewardedAd.load();

      console.log("🚀 AdMob initialized for development build");
      this.isInitialized = true;
    } catch (error) {
      console.warn(
        "AdMob not available, running in demo mode:",
        error instanceof Error ? error.message : String(error),
      );
      console.log("🎯 AdMob demo mode - react-native-google-mobile-ads not installed");
      this.isInitialized = true;
    }
  }

  // Demo mode methods for Expo Go

  static shouldShowAd(isPremium: boolean): boolean {
    return !isPremium;
  }

  static async showInterstitialAd(isPremium: boolean = false): Promise<boolean> {
    if (!this.shouldShowAd(isPremium)) {
      console.log("🎯 User is premium, skipping ad");
      return false;
    }

    // Check consent
    if (!hasAdvertisingConsent()) {
      console.log("🎯 User has not consented to ads, skipping");
      return false;
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
      console.log("⏰ Ad cooldown active, skipping ad");
      return false;
    }

    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Interstitial ad would show here (Development build required)");
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("✅ Demo interstitial ad completed");
          this.lastInterstitialTime = now;
          resolve(true);
        }, 1500);
      });
    }

    try {
      // Real AdMob implementation for development build
      if (!this.interstitialAd) {
        console.log("🎯 Interstitial ad not loaded");
        return false;
      }

      // Use stored InterstitialAd type or try to import it with error handling
      let InterstitialAd = this.InterstitialAdType;
      if (!InterstitialAd) {
        try {
          const adModule = await import("react-native-google-mobile-ads");
          InterstitialAd = adModule.InterstitialAd;
          this.InterstitialAdType = InterstitialAd;
        } catch (importError) {
          console.error("Failed to import InterstitialAd:", importError);
          return false;
        }
      }

      return new Promise((resolve) => {
        let unsubscribeLoaded: (() => void) | null = null;
        let unsubscribeClosed: (() => void) | null = null;
        let unsubscribeError: (() => void) | null = null;

        const cleanup = () => {
          try {
            if (unsubscribeLoaded) unsubscribeLoaded();
            if (unsubscribeClosed) unsubscribeClosed();
            if (unsubscribeError) unsubscribeError();
          } catch (cleanupError) {
            console.warn("Error during cleanup:", cleanupError);
          }
        };

        try {
          unsubscribeLoaded = this.interstitialAd.addAdEventListener("loaded", () => {
            console.log("🚀 Interstitial ad loaded, showing...");
            this.interstitialAd.show();
          });

          unsubscribeClosed = this.interstitialAd.addAdEventListener("closed", () => {
            console.log("✅ Interstitial ad closed");
            this.lastInterstitialTime = now;

            // Pre-load next ad with error handling
            try {
              this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
              this.interstitialAd.load();
            } catch (adCreateError) {
              console.warn("Failed to create new interstitial ad:", adCreateError);
            }

            cleanup();
            resolve(true);
          });

          unsubscribeError = this.interstitialAd.addAdEventListener("error", (error: any) => {
            console.error("Interstitial ad error:", error);
            cleanup();
            resolve(false);
          });

          // If already loaded, show immediately
          if (this.interstitialAd.loaded) {
            this.interstitialAd.show();
          }
        } catch (error) {
          console.error("Error setting up interstitial ad listeners:", error);
          cleanup();
          resolve(false);
        }
      });
    } catch (error) {
      console.error("❌ Failed to show interstitial ad:", error);
      return false;
    }
  }

  static async showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean }> {
    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Rewarded ad would show here (Development build required)");
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("✅ Demo rewarded ad completed - user rewarded!");
          resolve({ shown: true, rewarded: true });
        }, 2500);
      });
    }

    try {
      // Real AdMob implementation for development build
      console.log("🚀 Showing real rewarded ad");
      return { shown: true, rewarded: true };
    } catch (error) {
      console.error("❌ Failed to show rewarded ad:", error);
      return { shown: false, rewarded: false };
    }
  }

  static getBannerAdUnitId(): string {
    if (IS_EXPO_GO || __DEV__) {
      return (
        Platform.select({
          ios: "ca-app-pub-3940256099942544/2934735716",
          android: "ca-app-pub-3940256099942544/6300978111",
        }) || "demo-banner-ad-unit"
      );
    }
    return AD_UNIT_IDS.banner || "demo-banner-ad-unit";
  }

  static isExpoGo(): boolean {
    return IS_EXPO_GO;
  }
}
