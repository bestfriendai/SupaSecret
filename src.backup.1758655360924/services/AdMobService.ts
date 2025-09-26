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
  private static AdEventTypeConst: any = null;
  private static RewardedAdEventTypeConst: any = null;

  private static isValidAdUnit(id: any): boolean {
    return typeof id === "string" && id.startsWith("ca-app-pub-") && id.includes("/");
  }

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
      const {
        default: mobileAds,
        InterstitialAd,
        RewardedAd,
        BannerAdSize,
        TestIds,
        AdEventType,
        RewardedAdEventType,
      } = this.AdMobModule;

      // Store type references for later use
      this.MobileAdsType = mobileAds;
      this.InterstitialAdType = InterstitialAd;
      this.RewardedAdType = RewardedAd;
      this.BannerAdSizeType = BannerAdSize;
      this.TestIdsType = TestIds;
      this.AdEventTypeConst = AdEventType;
      this.RewardedAdEventTypeConst = RewardedAdEventType;

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

      // Pre-load interstitial ad (guard invalid unit)
      if (this.isValidAdUnit(AD_UNIT_IDS.interstitial)) {
        this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
        this.interstitialAd.load();
      } else {
        console.warn("AdMob interstitial unit invalid/missing; skipping preload (demo mode path)");
      }

      // Pre-load rewarded ad (guard invalid unit)
      if (this.isValidAdUnit(AD_UNIT_IDS.rewarded)) {
        this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
        this.rewardedAd.load();
      } else {
        console.warn("AdMob rewarded unit invalid/missing; skipping preload (demo mode path)");
      }

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
      const loaded = await this.ensureInterstitialLoaded();
      if (!loaded || !this.interstitialAd) return false;

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
          const AET = this.AdEventTypeConst || (this.AdMobModule && this.AdMobModule.AdEventType);
          unsubscribeLoaded = this.interstitialAd.addAdEventListener(AET?.LOADED || "loaded", () => {
            console.log("🚀 Interstitial ad loaded, showing...");
            this.interstitialAd.show();
          });

          unsubscribeClosed = this.interstitialAd.addAdEventListener(AET?.CLOSED || "closed", () => {
            console.log("✅ Interstitial ad closed");
            this.lastInterstitialTime = now;

            // Pre-load next ad with error handling
            try {
              if (this.isValidAdUnit(AD_UNIT_IDS.interstitial)) {
                this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
                this.interstitialAd.load();
              }
            } catch (adCreateError) {
              console.warn("Failed to create new interstitial ad:", adCreateError);
            }

            cleanup();
            resolve(true);
          });

          unsubscribeError = this.interstitialAd.addAdEventListener(AET?.ERROR || "error", async (error: any) => {
            console.error("Interstitial ad error:", error);
            // schedule reload with simple backoff and abort mechanism
            let aborted = false;
            const timeouts: NodeJS.Timeout[] = [];

            const abort = () => {
              aborted = true;
              timeouts.forEach(clearTimeout);
            };

            // Store original cleanup and create enhanced cleanup
            const originalCleanup = cleanup;
            const enhancedCleanup = () => {
              abort();
              originalCleanup();
            };

            try {
              for (let i = 0; i < 3 && !aborted; i++) {
                const timeout = setTimeout(() => {}, 500 * Math.pow(2, i));
                timeouts.push(timeout);
                await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
                if (aborted) break;

                try {
                  if (this.isValidAdUnit(AD_UNIT_IDS.interstitial)) {
                    this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
                    this.interstitialAd.load();
                  }
                  break;
                } catch {}
              }
            } catch {}
            enhancedCleanup();
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
      const ok = await this.ensureRewardedLoaded();
      if (!ok || !this.rewardedAd) return { shown: false, rewarded: false };

      return await new Promise((resolve) => {
        let rewarded = false;
        const RAET = this.RewardedAdEventTypeConst || (this.AdMobModule && this.AdMobModule.RewardedAdEventType);
        const unsubscribeEarned = this.rewardedAd.addAdEventListener(RAET?.EARNED_REWARD || "earned", () => {
          rewarded = true;
        });
        const finalize = (result: { shown: boolean; rewarded: boolean }) => {
          try {
            unsubscribeEarned?.();
            unsubscribeClosed?.();
            unsubscribeError?.();
          } catch {}
          resolve(result);
        };
        const AEType = this.AdEventTypeConst || (this.AdMobModule && this.AdMobModule.AdEventType);
        const unsubscribeClosed = this.rewardedAd.addAdEventListener(AEType?.CLOSED || "closed", () => {
          // preload next
          try {
            const { RewardedAd } = this.AdMobModule || {};
            if (RewardedAd) {
              if (this.isValidAdUnit(AD_UNIT_IDS.rewarded)) {
                this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
                this.rewardedAd.load();
              }
            }
          } catch {}
          finalize({ shown: true, rewarded });
        });
        const unsubscribeError = this.rewardedAd.addAdEventListener(AEType?.ERROR || "error", () => {
          // preload next after error
          try {
            const { RewardedAd } = this.AdMobModule || {};
            if (RewardedAd) {
              if (this.isValidAdUnit(AD_UNIT_IDS.rewarded)) {
                this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
                this.rewardedAd.load();
              }
            }
          } catch {}
          finalize({ shown: false, rewarded: false });
        });
        this.rewardedAd.show();
      });
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
    // In production, return empty string to hide banner when IDs are missing
    return this.isValidAdUnit(AD_UNIT_IDS.banner) ? (AD_UNIT_IDS.banner as string) : "";
  }

  static isExpoGo(): boolean {
    return IS_EXPO_GO;
  }

  private static async ensureInterstitialLoaded(retries = 3, base = 500) {
    if (IS_EXPO_GO) return true;
    const { InterstitialAd } = this.AdMobModule || (await import("react-native-google-mobile-ads"));
    for (let i = 0; i < retries; i++) {
      try {
        if (!this.interstitialAd) {
          if (!this.isValidAdUnit(AD_UNIT_IDS.interstitial)) return false;
          this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
        }
        if (!this.interstitialAd.loaded) {
          this.interstitialAd.load();
        }
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        if (this.interstitialAd.loaded) return true;
      } catch {
        // unused e
        if (i === retries - 1) return false;
        await new Promise((r) => setTimeout(r, base * Math.pow(2, i)));
      }
    }
    return false;
  }

  private static async ensureRewardedLoaded(retries = 3, base = 500) {
    if (IS_EXPO_GO) return true;
    const { RewardedAd } = this.AdMobModule || (await import("react-native-google-mobile-ads"));
    for (let i = 0; i < retries; i++) {
      try {
        if (!this.rewardedAd) {
          if (!this.isValidAdUnit(AD_UNIT_IDS.rewarded)) return false;
          this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
        }
        if (!this.rewardedAd.loaded) {
          this.rewardedAd.load();
        }
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        if (this.rewardedAd.loaded) return true;
      } catch {
        // unused e
        if (i === retries - 1) return false;
        await new Promise((r) => setTimeout(r, base * Math.pow(2, i)));
      }
    }
    return false;
  }
}
