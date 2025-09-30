/**
 * AdMob Service
 * Handles all ad operations: initialization, loading, and displaying ads
 *
 * Features:
 * - Environment detection (Expo Go, Dev Build, Production)
 * - Consent management integration
 * - Premium user handling
 * - Ad cooldown management
 * - Error handling and retry logic
 * - Demo mode for development
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type {
  AdConfig,
  AdRequestOptions,
  InterstitialAdOptions,
  RewardedAdResult,
  RewardedAdOptions,
} from '../types';

// Type declarations for AdMob module
type AdMobModule = {
  default: () => any;
  InterstitialAd: any;
  RewardedAd: any;
  BannerAdSize: any;
  TestIds: any;
  AdEventType: any;
  RewardedAdEventType: any;
};

class AdService {
  private static instance: AdService;
  private initialized = false;
  private adMobModule: AdMobModule | null = null;
  private mobileAds: any = null;
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private lastInterstitialTime = 0;
  private readonly INTERSTITIAL_COOLDOWN = 60000; // 1 minute

  // Environment flags
  private readonly IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
  private readonly IS_WEB = Platform.OS === 'web';
  private readonly IS_DEV = __DEV__;

  private constructor() {}

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Check if ads are available in current environment
   */
  isAvailable(): boolean {
    return !this.IS_EXPO_GO && !this.IS_WEB;
  }

  /**
   * Check if running in Expo Go
   */
  isExpoGo(): boolean {
    return this.IS_EXPO_GO;
  }

  /**
   * Load AdMob module dynamically
   */
  private async loadAdMobModule(): Promise<AdMobModule | null> {
    if (this.IS_EXPO_GO || this.IS_WEB) {
      return null;
    }

    try {
      // @ts-ignore - react-native-google-mobile-ads is a native module
      const module = await import('react-native-google-mobile-ads');
      return module as AdMobModule;
    } catch (error) {
      console.warn('AdMob module not available:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Validate ad unit ID format
   */
  private isValidAdUnit(id: any): boolean {
    return typeof id === 'string' && id.startsWith('ca-app-pub-') && id.includes('/');
  }

  /**
   * Get ad unit ID for specific type
   */
  getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded', config: AdConfig): string | null {
    const adUnit = config.adUnits[type];
    const id = Platform.select({
      ios: adUnit.ios,
      android: adUnit.android,
    });

    if (!id || !this.isValidAdUnit(id)) {
      console.warn(`Invalid ${type} ad unit ID`);
      return null;
    }

    return id;
  }

  /**
   * Initialize AdMob
   */
  async initialize(config: AdConfig, hasConsent: boolean): Promise<void> {
    if (this.initialized) {
      console.log('AdMob already initialized');
      return;
    }

    if (!config.enabled) {
      console.log('AdMob disabled via config');
      this.initialized = true;
      return;
    }

    if (this.IS_EXPO_GO) {
      console.log('AdMob Demo Mode - Development build required for real ads');
      this.initialized = true;
      return;
    }

    try {
      // Load AdMob module
      this.adMobModule = await this.loadAdMobModule();
      if (!this.adMobModule) {
        console.warn('AdMob module not available, running in demo mode');
        this.initialized = true;
        return;
      }

      const { default: mobileAds, InterstitialAd, RewardedAd } = this.adMobModule;

      // Initialize AdMob
      await mobileAds().initialize();
      this.mobileAds = mobileAds;

      // Configure ad requests based on consent
      const requestConfig: AdRequestOptions = {
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: 'MA',
        requestNonPersonalizedAdsOnly: !hasConsent,
      };

      await mobileAds().setRequestConfiguration(requestConfig);

      // Pre-load interstitial ad
      const interstitialId = this.getAdUnitId('interstitial', config);
      if (interstitialId) {
        this.interstitialAd = InterstitialAd.createForAdRequest(interstitialId);
        this.interstitialAd.load();
      } else {
        console.warn('AdMob interstitial unit invalid/missing; skipping preload');
      }

      // Pre-load rewarded ad
      const rewardedId = this.getAdUnitId('rewarded', config);
      if (rewardedId) {
        this.rewardedAd = RewardedAd.createForAdRequest(rewardedId);
        this.rewardedAd.load();
      } else {
        console.warn('AdMob rewarded unit invalid/missing; skipping preload');
      }

      console.log('AdMob initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.warn(
        'AdMob initialization failed, running in demo mode:',
        error instanceof Error ? error.message : String(error)
      );
      this.initialized = true;
    }
  }

  /**
   * Check if ads should be shown based on premium status
   */
  shouldShowAd(isPremium: boolean): boolean {
    return !isPremium;
  }

  /**
   * Show interstitial ad
   */
  async showInterstitial(
    config: AdConfig,
    options: InterstitialAdOptions = {}
  ): Promise<boolean> {
    const { skipIfPremium = true, placement, onAdDismissed, onAdFailedToShow } = options;

    // Check if ads should be shown
    if (skipIfPremium && !this.shouldShowAd(!skipIfPremium)) {
      console.log('User is premium, skipping ad');
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
      console.log('Ad cooldown active, skipping ad');
      return false;
    }

    // Demo mode for Expo Go
    if (this.IS_EXPO_GO) {
      console.log('Demo: Interstitial ad would show here (Development build required)');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('Demo interstitial ad completed');
          this.lastInterstitialTime = now;
          onAdDismissed?.();
          resolve(true);
        }, 1500);
      });
    }

    try {
      // Ensure module is loaded
      if (!this.adMobModule) {
        this.adMobModule = await this.loadAdMobModule();
        if (!this.adMobModule) {
          onAdFailedToShow?.(new Error('AdMob module not available'));
          return false;
        }
      }

      const { InterstitialAd, AdEventType } = this.adMobModule;
      const loaded = await this.ensureInterstitialLoaded(config);

      if (!loaded || !this.interstitialAd) {
        onAdFailedToShow?.(new Error('Failed to load interstitial ad'));
        return false;
      }

      return new Promise((resolve) => {
        let unsubscribeLoaded: (() => void) | null = null;
        let unsubscribeClosed: (() => void) | null = null;
        let unsubscribeError: (() => void) | null = null;

        const cleanup = () => {
          try {
            unsubscribeLoaded?.();
            unsubscribeClosed?.();
            unsubscribeError?.();
          } catch (error) {
            console.warn('Error during cleanup:', error);
          }
        };

        try {
          const AET = AdEventType || { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' };

          unsubscribeLoaded = this.interstitialAd.addAdEventListener(AET.LOADED || 'loaded', () => {
            console.log('Interstitial ad loaded, showing...');
            this.interstitialAd.show();
          });

          unsubscribeClosed = this.interstitialAd.addAdEventListener(AET.CLOSED || 'closed', () => {
            console.log('Interstitial ad closed');
            this.lastInterstitialTime = now;

            // Pre-load next ad
            const interstitialId = this.getAdUnitId('interstitial', config);
            if (interstitialId) {
              try {
                this.interstitialAd = InterstitialAd.createForAdRequest(interstitialId);
                this.interstitialAd.load();
              } catch (error) {
                console.warn('Failed to create new interstitial ad:', error);
              }
            }

            cleanup();
            onAdDismissed?.();
            resolve(true);
          });

          unsubscribeError = this.interstitialAd.addAdEventListener(
            AET.ERROR || 'error',
            async (error: any) => {
              console.error('Interstitial ad error:', error);

              // Retry loading
              const interstitialId = this.getAdUnitId('interstitial', config);
              if (interstitialId) {
                try {
                  await new Promise((r) => setTimeout(r, 500));
                  this.interstitialAd = InterstitialAd.createForAdRequest(interstitialId);
                  this.interstitialAd.load();
                } catch (retryError) {
                  console.warn('Failed to retry loading interstitial ad:', retryError);
                }
              }

              cleanup();
              onAdFailedToShow?.(error);
              resolve(false);
            }
          );

          // If already loaded, show immediately
          if (this.interstitialAd.loaded) {
            this.interstitialAd.show();
          }
        } catch (error) {
          console.error('Error setting up interstitial ad listeners:', error);
          cleanup();
          onAdFailedToShow?.(error as Error);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      onAdFailedToShow?.(error as Error);
      return false;
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewarded(
    config: AdConfig,
    options: RewardedAdOptions = {}
  ): Promise<RewardedAdResult> {
    const { placement, onEarnedReward, onAdDismissed, onAdFailedToShow } = options;

    // Demo mode for Expo Go
    if (this.IS_EXPO_GO) {
      console.log('Demo: Rewarded ad would show here (Development build required)');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('Demo rewarded ad completed - user rewarded!');
          const reward = { amount: 1, type: 'coins' };
          onEarnedReward?.(reward);
          onAdDismissed?.();
          resolve({ shown: true, rewarded: true, rewardAmount: 1, rewardType: 'coins' });
        }, 2500);
      });
    }

    try {
      // Ensure module is loaded
      if (!this.adMobModule) {
        this.adMobModule = await this.loadAdMobModule();
        if (!this.adMobModule) {
          onAdFailedToShow?.(new Error('AdMob module not available'));
          return { shown: false, rewarded: false };
        }
      }

      const { RewardedAd, RewardedAdEventType, AdEventType } = this.adMobModule;
      const loaded = await this.ensureRewardedLoaded(config);

      if (!loaded || !this.rewardedAd) {
        onAdFailedToShow?.(new Error('Failed to load rewarded ad'));
        return { shown: false, rewarded: false };
      }

      return await new Promise((resolve) => {
        let rewarded = false;
        let rewardAmount = 0;
        let rewardType = '';

        const RAET = RewardedAdEventType || { EARNED_REWARD: 'earned' };
        const AEType = AdEventType || { CLOSED: 'closed', ERROR: 'error' };

        const unsubscribeEarned = this.rewardedAd.addAdEventListener(
          RAET.EARNED_REWARD || 'earned',
          (reward: any) => {
            rewarded = true;
            rewardAmount = reward?.amount || 1;
            rewardType = reward?.type || 'reward';
            onEarnedReward?.({ amount: rewardAmount, type: rewardType });
          }
        );

        const finalize = (result: RewardedAdResult) => {
          try {
            unsubscribeEarned?.();
            unsubscribeClosed?.();
            unsubscribeError?.();
          } catch (error) {
            console.warn('Error during cleanup:', error);
          }
          resolve(result);
        };

        const unsubscribeClosed = this.rewardedAd.addAdEventListener(AEType.CLOSED || 'closed', () => {
          console.log('Rewarded ad closed');

          // Pre-load next ad
          const rewardedId = this.getAdUnitId('rewarded', config);
          if (rewardedId) {
            try {
              this.rewardedAd = RewardedAd.createForAdRequest(rewardedId);
              this.rewardedAd.load();
            } catch (error) {
              console.warn('Failed to create new rewarded ad:', error);
            }
          }

          onAdDismissed?.();
          finalize({ shown: true, rewarded, rewardAmount, rewardType });
        });

        const unsubscribeError = this.rewardedAd.addAdEventListener(
          AEType.ERROR || 'error',
          (error: any) => {
            console.error('Rewarded ad error:', error);

            // Pre-load next ad after error
            const rewardedId = this.getAdUnitId('rewarded', config);
            if (rewardedId) {
              try {
                this.rewardedAd = RewardedAd.createForAdRequest(rewardedId);
                this.rewardedAd.load();
              } catch (retryError) {
                console.warn('Failed to retry loading rewarded ad:', retryError);
              }
            }

            onAdFailedToShow?.(error);
            finalize({ shown: false, rewarded: false });
          }
        );

        // Show the ad
        this.rewardedAd.show();
      });
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      onAdFailedToShow?.(error as Error);
      return { shown: false, rewarded: false };
    }
  }

  /**
   * Ensure interstitial ad is loaded
   */
  private async ensureInterstitialLoaded(config: AdConfig, retries = 3): Promise<boolean> {
    if (this.IS_EXPO_GO) return true;

    if (!this.adMobModule) {
      this.adMobModule = await this.loadAdMobModule();
      if (!this.adMobModule) return false;
    }

    const { InterstitialAd } = this.adMobModule;
    const interstitialId = this.getAdUnitId('interstitial', config);

    if (!interstitialId) return false;

    for (let i = 0; i < retries; i++) {
      try {
        if (!this.interstitialAd) {
          this.interstitialAd = InterstitialAd.createForAdRequest(interstitialId);
        }

        if (!this.interstitialAd.loaded) {
          this.interstitialAd.load();
        }

        await new Promise((r) => setTimeout(r, 500 * (i + 1)));

        if (this.interstitialAd.loaded) return true;
      } catch (error) {
        if (i === retries - 1) return false;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }

    return false;
  }

  /**
   * Ensure rewarded ad is loaded
   */
  private async ensureRewardedLoaded(config: AdConfig, retries = 3): Promise<boolean> {
    if (this.IS_EXPO_GO) return true;

    if (!this.adMobModule) {
      this.adMobModule = await this.loadAdMobModule();
      if (!this.adMobModule) return false;
    }

    const { RewardedAd } = this.adMobModule;
    const rewardedId = this.getAdUnitId('rewarded', config);

    if (!rewardedId) return false;

    for (let i = 0; i < retries; i++) {
      try {
        if (!this.rewardedAd) {
          this.rewardedAd = RewardedAd.createForAdRequest(rewardedId);
        }

        if (!this.rewardedAd.loaded) {
          this.rewardedAd.load();
        }

        await new Promise((r) => setTimeout(r, 500 * (i + 1)));

        if (this.rewardedAd.loaded) return true;
      } catch (error) {
        if (i === retries - 1) return false;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }

    return false;
  }

  /**
   * Get banner ad sizes
   */
  getBannerAdSize() {
    if (!this.adMobModule) return null;
    return this.adMobModule.BannerAdSize;
  }

  /**
   * Reset initialization state (for testing)
   */
  reset(): void {
    this.initialized = false;
    this.adMobModule = null;
    this.mobileAds = null;
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.lastInterstitialTime = 0;
  }
}

// Export singleton instance
export const adService = AdService.getInstance();

// Export class for testing
export { AdService };
