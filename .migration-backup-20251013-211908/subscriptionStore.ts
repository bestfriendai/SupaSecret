import { create } from "zustand";
import { persist } from "zustand/middleware";
// Demo mode - no native imports for Expo Go
// import { CustomerInfo } from 'react-native-purchases';
import { RevenueCatService } from "../services/RevenueCatService";

interface SubscriptionState {
  isPremium: boolean;
  customerInfo: any | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
  setPremium: (premium: boolean) => void; // For demo mode
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      customerInfo: null,
      isLoading: false,
      error: null,

      checkSubscriptionStatus: async () => {
        set({ isLoading: true, error: null });

        try {
          const customerInfo = await RevenueCatService.getCustomerInfo();
          const isPremium = await RevenueCatService.isUserPremium();

          set({
            customerInfo,
            isPremium,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      purchaseSubscription: async (packageId: string) => {
        set({ isLoading: true, error: null });

        try {
          console.log("🎯 Demo: Simulating subscription purchase...");

          // Simulate purchase process
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const customerInfo = await RevenueCatService.purchasePackage({ identifier: packageId } as any);
          const isPremium = await RevenueCatService.isUserPremium();

          set({
            customerInfo,
            isPremium,
            isLoading: false,
          });

          console.log("✅ Demo purchase completed!");
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Purchase failed",
            isLoading: false,
          });
          return false;
        }
      },

      restorePurchases: async () => {
        set({ isLoading: true, error: null });

        try {
          const customerInfo = await RevenueCatService.restorePurchases();
          const isPremium = await RevenueCatService.isUserPremium();

          set({
            customerInfo,
            isPremium,
            isLoading: false,
          });

          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Restore failed",
            isLoading: false,
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),

      setPremium: (premium: boolean) => set({ isPremium: premium }),
    }),
    {
      name: "subscription-storage",
      partialize: (state) => ({
        isPremium: state.isPremium,
        // customerInfo removed to avoid persisting PII - will be re-fetched at runtime
      }),
    },
  ),
);
