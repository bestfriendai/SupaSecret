/**
 * useInterstitialAd Hook
 * Provides easy access to interstitial ads with automatic cooldown management
 */

import { useCallback, useRef } from 'react';
import { adService } from '../services/adService';
import type { AdConfig, InterstitialAdOptions } from '../types';

interface UseInterstitialAdParams {
  config: AdConfig;
  isPremium: boolean;
}

export const useInterstitialAd = ({ config, isPremium }: UseInterstitialAdParams) => {
  const isShowingRef = useRef(false);

  const showAd = useCallback(
    async (options: InterstitialAdOptions = {}): Promise<boolean> => {
      // Prevent multiple simultaneous ad requests
      if (isShowingRef.current) {
        console.log('Interstitial ad already showing');
        return false;
      }

      try {
        isShowingRef.current = true;

        const result = await adService.showInterstitial(config, {
          skipIfPremium: isPremium,
          ...options,
          onAdDismissed: () => {
            isShowingRef.current = false;
            options.onAdDismissed?.();
          },
          onAdFailedToShow: (error) => {
            isShowingRef.current = false;
            options.onAdFailedToShow?.(error);
          },
        });

        return result;
      } catch (error) {
        isShowingRef.current = false;
        console.error('Failed to show interstitial ad:', error);
        return false;
      }
    },
    [config, isPremium]
  );

  return {
    showAd,
    isShowing: isShowingRef.current,
  };
};
