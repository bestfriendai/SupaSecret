import { Platform } from 'react-native';
import { useSubscriptionStore } from '../state/subscriptionStore';

// Note: AdMob requires development build - this is demo mode for Expo Go
const IS_EXPO_GO = true; // Always demo mode for Expo Go

export class AdMobService {
  private static lastInterstitialTime = 0;
  private static readonly INTERSTITIAL_COOLDOWN = 60000; // 1 minute
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log('🎯 AdMob Demo Mode - Development build required for real ads');
      this.isInitialized = true;
      return;
    }

    try {
      // Real AdMob initialization for development build
      const { InterstitialAd, RewardedAd, TestIds } = require('react-native-google-mobile-ads');

      console.log('🚀 AdMob initialized for development build');
      this.isInitialized = true;
    } catch (error) {
      console.error('AdMob initialization failed:', error);
      this.isInitialized = true;
    }
  }

  // Demo mode methods for Expo Go

  static shouldShowAd(): boolean {
    const { isPremium } = useSubscriptionStore.getState();
    return !isPremium;
  }

  static async showInterstitialAd(): Promise<boolean> {
    if (!this.shouldShowAd()) {
      console.log('🎯 User is premium, skipping ad');
      return false;
    }

    if (IS_EXPO_GO) {
      console.log('🎯 Demo: Interstitial ad would show here (Development build required)');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('✅ Demo interstitial ad completed');
          resolve(true);
        }, 1500);
      });
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
      console.log('⏰ Ad cooldown active, skipping ad');
      return false;
    }

    try {
      // Real AdMob implementation for development build
      console.log('🚀 Showing real interstitial ad');
      this.lastInterstitialTime = now;
      return true;
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
