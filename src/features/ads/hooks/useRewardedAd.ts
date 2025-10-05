/**
 * useRewardedAd Hook
 * Provides easy access to rewarded ads with reward callbacks
 */

import { useCallback, useRef, useState } from "react";
import { adService } from "../services/adService";
import type { AdConfig, RewardedAdOptions, RewardedAdResult } from "../types";

interface UseRewardedAdParams {
  config: AdConfig;
}

export const useRewardedAd = ({ config }: UseRewardedAdParams) => {
  const [isShowing, setIsShowing] = useState(false);
  const [lastReward, setLastReward] = useState<{ amount: number; type: string } | null>(null);

  const showAd = useCallback(
    async (options: RewardedAdOptions = {}): Promise<RewardedAdResult> => {
      // Prevent multiple simultaneous ad requests
      if (isShowing) {
        console.log("Rewarded ad already showing");
        return { shown: false, rewarded: false };
      }

      try {
        setIsShowing(true);

        const result = await adService.showRewarded(config, {
          ...options,
          onEarnedReward: (reward) => {
            console.log("User earned reward:", reward);
            setLastReward(reward);
            options.onEarnedReward?.(reward);
          },
          onAdDismissed: () => {
            setIsShowing(false);
            options.onAdDismissed?.();
          },
          onAdFailedToShow: (error) => {
            setIsShowing(false);
            options.onAdFailedToShow?.(error);
          },
        });

        return result;
      } catch (error) {
        setIsShowing(false);
        console.error("Failed to show rewarded ad:", error);
        return { shown: false, rewarded: false };
      }
    },
    [config, isShowing],
  );

  return {
    showAd,
    isShowing,
    lastReward,
  };
};
