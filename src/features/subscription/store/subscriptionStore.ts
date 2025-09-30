/**
 * Subscription Store
 * Zustand store for managing subscription state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SubscriptionService } from '../services/subscriptionService';
import type {
  RevenueCatCustomerInfo,
  RevenueCatPackage,
  SubscriptionStatus,
  PurchaseErrorType,
} from '../types';

interface SubscriptionState {
  // State
  isPremium: boolean;
  customerInfo: RevenueCatCustomerInfo | null;
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  lastErrorType: PurchaseErrorType | null;

  // Actions
  checkSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (pkg: RevenueCatPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
  clearError: () => void;
  setPremium: (premium: boolean) => void; // For demo mode
  setUserID: (userID: string) => Promise<void>;
  logOut: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPremium: false,
      customerInfo: null,
      subscriptionStatus: null,
      isLoading: false,
      error: null,
      lastErrorType: null,

      /**
       * Check subscription status
       */
      checkSubscriptionStatus: async () => {
        set({ isLoading: true, error: null, lastErrorType: null });

        try {
          const [isPremium, subscriptionStatus] = await Promise.all([
            SubscriptionService.isUserPremium(),
            SubscriptionService.getSubscriptionStatus(),
          ]);

          const customerInfo = await SubscriptionService.getCustomerInfo();

          set({
            isPremium,
            subscriptionStatus,
            customerInfo:
              customerInfo && 'mockCustomerInfo' in customerInfo
                ? null
                : (customerInfo as RevenueCatCustomerInfo),
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      /**
       * Purchase a subscription
       */
      purchaseSubscription: async (pkg: RevenueCatPackage) => {
        set({ isLoading: true, error: null, lastErrorType: null });

        try {
          const result = await SubscriptionService.purchasePackage(pkg);

          // Handle mock result
          if ('mockCustomerInfo' in result) {
            set({ isPremium: true, isLoading: false });
            return true;
          }

          // Check if entitlement is active
          const isPremium = await SubscriptionService.isUserPremium();
          const subscriptionStatus = await SubscriptionService.getSubscriptionStatus();

          if (!isPremium) {
            throw new Error('Purchase completed but premium entitlement not active');
          }

          set({
            customerInfo: result.customerInfo,
            isPremium,
            subscriptionStatus,
            isLoading: false,
          });

          return true;
        } catch (error) {
          const purchaseError = SubscriptionService.handlePurchaseError(error);

          set({
            error:
              purchaseError.userFriendlyMessage ||
              (error instanceof Error ? error.message : 'Purchase failed'),
            lastErrorType: purchaseError.type,
            isLoading: false,
          });

          return false;
        }
      },

      /**
       * Restore previous purchases
       */
      restorePurchases: async () => {
        set({ isLoading: true, error: null, lastErrorType: null });

        try {
          const result = await SubscriptionService.restorePurchases();

          // Handle mock result
          if ('mockCustomerInfo' in result) {
            set({ isPremium: false, isLoading: false });
            return true;
          }

          const isPremium = await SubscriptionService.isUserPremium();
          const subscriptionStatus = await SubscriptionService.getSubscriptionStatus();

          set({
            customerInfo: result as RevenueCatCustomerInfo,
            isPremium,
            subscriptionStatus,
            isLoading: false,
          });

          return true;
        } catch (error) {
          const purchaseError = SubscriptionService.handlePurchaseError(error);

          set({
            error:
              purchaseError.userFriendlyMessage ||
              (error instanceof Error ? error.message : 'Restore failed'),
            lastErrorType: purchaseError.type,
            isLoading: false,
          });

          return false;
        }
      },

      /**
       * Refresh customer info
       */
      refreshCustomerInfo: async () => {
        try {
          const [isPremium, subscriptionStatus] = await Promise.all([
            SubscriptionService.isUserPremium(),
            SubscriptionService.getSubscriptionStatus(),
          ]);

          const customerInfo = await SubscriptionService.getCustomerInfo(true);

          set({
            isPremium,
            subscriptionStatus,
            customerInfo:
              customerInfo && 'mockCustomerInfo' in customerInfo
                ? null
                : (customerInfo as RevenueCatCustomerInfo),
          });
        } catch (error) {
          console.error('Failed to refresh customer info:', error);
        }
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null, lastErrorType: null }),

      /**
       * Set premium status (for demo mode)
       */
      setPremium: (premium: boolean) => set({ isPremium: premium }),

      /**
       * Set user ID for RevenueCat
       */
      setUserID: async (userID: string) => {
        try {
          await SubscriptionService.setUserID(userID);
          // Refresh subscription status after login
          await get().checkSubscriptionStatus();
        } catch (error) {
          console.error('Failed to set user ID:', error);
          throw error;
        }
      },

      /**
       * Log out user
       */
      logOut: async () => {
        try {
          await SubscriptionService.logOut();
          // Clear subscription state
          set({
            isPremium: false,
            customerInfo: null,
            subscriptionStatus: null,
            error: null,
            lastErrorType: null,
          });
        } catch (error) {
          console.error('Failed to log out:', error);
        }
      },
    }),
    {
      name: 'subscription-storage',
      partialize: (state) => ({
        isPremium: state.isPremium,
        // Don't persist customerInfo to avoid storing PII
        // It will be re-fetched at runtime
      }),
    }
  )
);
