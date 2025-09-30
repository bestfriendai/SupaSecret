/**
 * Ads Feature Module
 * Centralized exports for AdMob integration
 *
 * Usage:
 * ```tsx
 * import { adService, BannerAdComponent, useInterstitialAd } from '@/features/ads';
 * ```
 */

// Services
export { adService, AdService } from './services/adService';
export {
  createAdConfig,
  validateAdConfig,
  isValidAdUnitId,
  getAdUnitIdForPlatform,
  logAdConfig,
} from './services/adConfig';

// Components
export { BannerAdComponent } from './components/BannerAd';
export { FeedAdComponent } from './components/FeedAd';
export { OptimizedFeedAd, shouldShowAdAtIndex } from './components/OptimizedFeedAd';

// Hooks
export { useInterstitialAd } from './hooks/useInterstitialAd';
export { useRewardedAd } from './hooks/useRewardedAd';

// Types
export type {
  AdPlacement,
  AdSize,
  AdType,
  AdConfig,
  AdRequestOptions,
  BannerAdProps,
  InterstitialAdOptions,
  RewardedAdResult,
  RewardedAdOptions,
  FeedAdProps,
  AdMetrics,
  AdError,
} from './types';

export { TEST_AD_UNITS } from './types';
