import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

// Storage keys
const STORAGE_KEYS = {
  INTERACTION_COUNT: "review_interaction_count",
  LAST_PROMPT_DATE: "review_last_prompt_date",
  HAS_PROMPTED: "review_has_prompted",
  USER_DECLINED: "review_user_declined",
  POSITIVE_INTERACTIONS: "review_positive_interactions",
} as const;

// Configuration
const REVIEW_CONFIG = {
  MIN_INTERACTIONS: 5, // Minimum interactions before prompting
  MIN_POSITIVE_INTERACTIONS: 3, // Minimum positive interactions (likes, shares, etc.)
  DAYS_BETWEEN_PROMPTS: 30, // Days to wait between prompts if user declined
  DAYS_AFTER_INSTALL: 3, // Days to wait after app install before first prompt
} as const;

export interface ReviewPromptOptions {
  force?: boolean; // Force show prompt regardless of conditions
  onPromptShown?: () => void;
  onPromptDeclined?: () => void;
  onReviewCompleted?: () => void;
}

/**
 * Track user interactions for review prompting
 */
export class ReviewPromptManager {
  private static instance: ReviewPromptManager;

  static getInstance(): ReviewPromptManager {
    if (!ReviewPromptManager.instance) {
      ReviewPromptManager.instance = new ReviewPromptManager();
    }
    return ReviewPromptManager.instance;
  }

  /**
   * Track a general user interaction
   */
  async trackInteraction(): Promise<void> {
    try {
      const currentCount = await this.getInteractionCount();
      await AsyncStorage.setItem(STORAGE_KEYS.INTERACTION_COUNT, (currentCount + 1).toString());
    } catch (error) {
      console.warn("Failed to track interaction:", error);
    }
  }

  /**
   * Track a positive user interaction (like, share, successful post, etc.)
   */
  async trackPositiveInteraction(): Promise<void> {
    try {
      await this.trackInteraction();
      const currentCount = await this.getPositiveInteractionCount();
      await AsyncStorage.setItem(STORAGE_KEYS.POSITIVE_INTERACTIONS, (currentCount + 1).toString());
    } catch (error) {
      console.warn("Failed to track positive interaction:", error);
    }
  }

  /**
   * Get current interaction count
   */
  private async getInteractionCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.INTERACTION_COUNT);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current positive interaction count
   */
  private async getPositiveInteractionCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.POSITIVE_INTERACTIONS);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check if user has already been prompted
   */
  private async hasBeenPrompted(): Promise<boolean> {
    try {
      const hasPrompted = await AsyncStorage.getItem(STORAGE_KEYS.HAS_PROMPTED);
      return hasPrompted === "true";
    } catch {
      return false;
    }
  }

  /**
   * Check if user declined and when
   */
  private async getUserDeclinedInfo(): Promise<{ declined: boolean; date?: Date }> {
    try {
      const declined = await AsyncStorage.getItem(STORAGE_KEYS.USER_DECLINED);
      const lastPromptDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPT_DATE);

      return {
        declined: declined === "true",
        date: lastPromptDate ? new Date(lastPromptDate) : undefined,
      };
    } catch {
      return { declined: false };
    }
  }

  /**
   * Check if enough time has passed since last prompt
   */
  private async canPromptAgain(): Promise<boolean> {
    const { declined, date } = await this.getUserDeclinedInfo();

    if (!declined || !date) {
      return true;
    }

    const daysSinceLastPrompt = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastPrompt >= REVIEW_CONFIG.DAYS_BETWEEN_PROMPTS;
  }

  /**
   * Check if all conditions are met for showing review prompt
   */
  async shouldShowReviewPrompt(options: ReviewPromptOptions = {}): Promise<boolean> {
    if (options.force) {
      return true;
    }

    try {
      // Check if store review is available
      if (!(await StoreReview.isAvailableAsync())) {
        return false;
      }

      // Check interaction counts
      const interactionCount = await this.getInteractionCount();
      const positiveInteractionCount = await this.getPositiveInteractionCount();

      if (interactionCount < REVIEW_CONFIG.MIN_INTERACTIONS) {
        return false;
      }

      if (positiveInteractionCount < REVIEW_CONFIG.MIN_POSITIVE_INTERACTIONS) {
        return false;
      }

      // Check if user has already been prompted and completed review
      if (await this.hasBeenPrompted()) {
        return false;
      }

      // Check if enough time has passed since last prompt (if user declined)
      if (!(await this.canPromptAgain())) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Error checking review prompt conditions:", error);
      return false;
    }
  }

  /**
   * Show the review prompt
   */
  async showReviewPrompt(options: ReviewPromptOptions = {}): Promise<void> {
    try {
      if (!(await this.shouldShowReviewPrompt(options))) {
        return;
      }

      // Mark that we've shown the prompt
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_DATE, new Date().toISOString());
      options.onPromptShown?.();

      // Request review
      await StoreReview.requestReview();

      // Mark as prompted (assume user completed it)
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_PROMPTED, "true");
      options.onReviewCompleted?.();
    } catch (error) {
      if (__DEV__) {
        console.warn("Error showing review prompt:", error);
      }
      // Mark as declined if there was an error
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DECLINED, "true");
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_DATE, new Date().toISOString());
      options.onPromptDeclined?.();
    }
  }

  /**
   * Reset all review prompt data (useful for testing)
   */
  async resetReviewPromptData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.INTERACTION_COUNT),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_PROMPT_DATE),
        AsyncStorage.removeItem(STORAGE_KEYS.HAS_PROMPTED),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DECLINED),
        AsyncStorage.removeItem(STORAGE_KEYS.POSITIVE_INTERACTIONS),
      ]);
    } catch (error) {
      console.warn("Error resetting review prompt data:", error);
    }
  }

  /**
   * Get current review prompt stats (for debugging)
   */
  async getReviewPromptStats(): Promise<{
    interactionCount: number;
    positiveInteractionCount: number;
    hasBeenPrompted: boolean;
    canPrompt: boolean;
    lastPromptDate?: string;
  }> {
    const interactionCount = await this.getInteractionCount();
    const positiveInteractionCount = await this.getPositiveInteractionCount();
    const hasBeenPrompted = await this.hasBeenPrompted();
    const canPrompt = await this.shouldShowReviewPrompt();
    const { date } = await this.getUserDeclinedInfo();

    return {
      interactionCount,
      positiveInteractionCount,
      hasBeenPrompted,
      canPrompt,
      lastPromptDate: date?.toISOString(),
    };
  }
}

// Export singleton instance and convenience functions
export const reviewPromptManager = ReviewPromptManager.getInstance();

/**
 * Track a general user interaction
 */
export const trackInteraction = () => reviewPromptManager.trackInteraction();

/**
 * Track a positive user interaction (like, share, successful post, etc.)
 */
export const trackPositiveInteraction = () => reviewPromptManager.trackPositiveInteraction();

/**
 * Show review prompt if conditions are met
 */
export const showReviewPrompt = (options?: ReviewPromptOptions) => reviewPromptManager.showReviewPrompt(options);

/**
 * Check if review prompt should be shown
 */
export const shouldShowReviewPrompt = (options?: ReviewPromptOptions) =>
  reviewPromptManager.shouldShowReviewPrompt(options);

/**
 * React hook for review prompting
 */
export const useReviewPrompt = () => {
  return {
    trackInteraction,
    trackPositiveInteraction,
    showReviewPrompt,
    shouldShowReviewPrompt,
    getStats: () => reviewPromptManager.getReviewPromptStats(),
    reset: () => reviewPromptManager.resetReviewPromptData(),
  };
};
