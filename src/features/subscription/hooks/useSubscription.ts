/**
 * useSubscription Hook
 * Custom hook for accessing subscription functionality
 */

import { useEffect, useCallback } from "react";
import { useSubscriptionStore } from "../store/subscriptionStore";
import { SubscriptionService } from "../services/subscriptionService";
import type { RevenueCatPackage } from "../types";

export function useSubscription() {
  const {
    isPremium,
    customerInfo,
    subscriptionStatus,
    isLoading,
    error,
    lastErrorType,
    checkSubscriptionStatus,
    purchaseSubscription,
    restorePurchases,
    refreshCustomerInfo,
    clearError,
    setUserID,
    logOut,
  } = useSubscriptionStore();

  // Check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  // Purchase handler with error handling
  const handlePurchase = useCallback(
    async (pkg: RevenueCatPackage): Promise<boolean> => {
      try {
        return await purchaseSubscription(pkg);
      } catch (error) {
        console.error("Purchase error in hook:", error);
        return false;
      }
    },
    [purchaseSubscription],
  );

  // Restore handler with error handling
  const handleRestore = useCallback(async (): Promise<boolean> => {
    try {
      return await restorePurchases();
    } catch (error) {
      console.error("Restore error in hook:", error);
      return false;
    }
  }, [restorePurchases]);

  // Get offerings
  const getOfferings = useCallback(async () => {
    return await SubscriptionService.getOfferings();
  }, []);

  // Get subscription tiers
  const getSubscriptionTiers = useCallback(async () => {
    return await SubscriptionService.getSubscriptionTiers();
  }, []);

  return {
    // State
    isPremium,
    customerInfo,
    subscriptionStatus,
    isLoading,
    error,
    lastErrorType,

    // Actions
    checkSubscriptionStatus,
    purchaseSubscription: handlePurchase,
    restorePurchases: handleRestore,
    refreshCustomerInfo,
    clearError,
    setUserID,
    logOut,
    getOfferings,
    getSubscriptionTiers,

    // Computed
    isInTrial: subscriptionStatus?.inTrialPeriod || false,
    hasBillingIssue: subscriptionStatus?.billingIssue || false,
    willRenew: subscriptionStatus?.willRenew || false,
    expiresAt: subscriptionStatus?.expiresAt,
  };
}
