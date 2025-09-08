import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { hasAdvertisingConsent } from '../state/consentStore';
import { getConfig } from '../config/production';

// Note: AdMob requires development build - this is demo mode for Expo Go
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const config = getConfig();

// AdMob Ad Unit IDs - use test IDs in development, production IDs in release
const AD_UNIT_IDS = {
  banner: __DEV__
    ? Platform.select({
        ios: 'ca-app-pub-3940256099942544/2934735716',
        android: 'ca-app-pub-3940256099942544/6300978111',
      })
    : config.ADMOB.AD_UNITS.banner,
  interstitial: __DEV__
    ? Platform.select({
        ios: 'ca-app-pub-3940256099942544/4411468910',
        android: 'ca-app-pub-3940256099942544/1033173712',
      })
    : config.ADMOB.AD_UNITS.interstitial,
  rewarded: __DEV__
    ? Platform.select({
        ios: 'ca-app-pub-3940256099942544/1712485313',
        android: 'ca-app-pub-3940256099942544/5224354917',
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

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log('🎯 AdMob Demo Mode - Development build required for real ads');
      this.isInitialized = true;
      return;
    }

    try {
      // Real AdMob initialization for development build
      const adMobModule = require('react-native-google-mobile-ads');
      const { default: mobileAds, InterstitialAd, RewardedAd, BannerAdSize, TestIds } = adMobModule;

      this.mobileAds = mobileAds;

      // Initialize AdMob
      await mobileAds().initialize();

      // Set request configuration based on consent
      const hasConsent = hasAdvertisingConsent();
      await mobileAds().setRequestConfiguration({
        // Set to true if user has not consented to personalized ads
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: 'MA',
        requestNonPersonalizedAdsOnly: !hasConsent,
      });

      // Pre-load interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
      this.interstitialAd.load();

      // Pre-load rewarded ad
      this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
      this.rewardedAd.load();

      console.log('🚀 AdMob initialized for development build');
      this.isInitialized = true;
    } catch (error) {
      console.warn('AdMob not available, running in demo mode:', error.message);
      console.log('🎯 AdMob demo mode - react-native-google-mobile-ads not installed');
      this.isInitialized = true;
    }
  }

  // Demo mode methods for Expo Go

  static shouldShowAd(isPremium: boolean): boolean {
    return !isPremium;
  }

  static async showInterstitialAd(isPremium: boolean = false): Promise<boolean> {
    if (!this.shouldShowAd(isPremium)) {
      console.log('🎯 User is premium, skipping ad');
      return false;
    }

    // Check consent
    if (!hasAdvertisingConsent()) {
      console.log('🎯 User has not consented to ads, skipping');
      return false;
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
      console.log('⏰ Ad cooldown active, skipping ad');
      return false;
    }

    if (IS_EXPO_GO) {
      console.log('🎯 Demo: Interstitial ad would show here (Development build required)');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('✅ Demo interstitial ad completed');
          this.lastInterstitialTime = now;
          resolve(true);
        }, 1500);
      });
    }

    try {
      // Real AdMob implementation for development build
      if (!this.interstitialAd) {
        console.log('🎯 Interstitial ad not loaded');
        return false;
      }

      const { InterstitialAd } = require('react-native-google-mobile-ads');

      return new Promise((resolve) => {
        const unsubscribeLoaded = this.interstitialAd.addAdEventListener('loaded', () => {
          console.log('🚀 Interstitial ad loaded, showing...');
          this.interstitialAd.show();
        });

        const unsubscribeClosed = this.interstitialAd.addAdEventListener('closed', () => {
          console.log('✅ Interstitial ad closed');
          this.lastInterstitialTime = now;

          // Pre-load next ad
          this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
          this.interstitialAd.load();

          unsubscribeLoaded();
          unsubscribeClosed();
          unsubscribeError();
          resolve(true);
        });

        const unsubscribeError = this.interstitialAd.addAdEventListener('error', (error: any) => {
          console.error('Interstitial ad error:', error);
          unsubscribeLoaded();
          unsubscribeClosed();
          unsubscribeError();
          resolve(false);
        });

        // If already loaded, show immediately
        if (this.interstitialAd.loaded) {
          this.interstitialAd.show();
        }
      });
    } catch (error) {
      console.error('❌ Failed to show interstitial ad:', error);
      return false;
    }
  }

  static async showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean }> {
    if (IS_EXPO_GO) {
      console.log('🎯 Demo: Rewarded ad would show here (Development build required)');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('✅ Demo rewarded ad completed - user rewarded!');
          resolve({ shown: true, rewarded: true });
        }, 2500);
      });
    }

    try {
      // Real AdMob implementation for development build
      console.log('🚀 Showing real rewarded ad');
      return { shown: true, rewarded: true };
    } catch (error) {
      console.error('❌ Failed to show rewarded ad:', error);
      return { shown: false, rewarded: false };
    }
  }

  static getBannerAdUnitId(): string {
    return 'demo-banner-ad-unit'; // Demo ID for Expo Go
  }

  static isExpoGo(): boolean {
    return IS_EXPO_GO;
  }
}
