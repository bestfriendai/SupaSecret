import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type {
  MembershipState,
  MembershipTier,
  UserMembership,
  MembershipPlan,
  MembershipFeatures,
} from "../types/membership";
import { DEFAULT_PLANS, FREE_FEATURES, PLUS_FEATURES } from "../types/membership";

export const useMembershipStore = create<MembershipState>()(
  persist(
    (set, get) => ({
      currentTier: "free",
      membership: null,
      availablePlans: DEFAULT_PLANS,
      isLoading: false,
      error: null,

      loadMembership: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            set({ currentTier: "free", membership: null, isLoading: false });
            return;
          }

          const { data, error } = await supabase.from("user_memberships").select("*").eq("user_id", user.id).single();

          if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

          if (data) {
            // Check if membership is still active
            const isActive = !data.expires_at || new Date(data.expires_at) > new Date();
            const tier: MembershipTier = isActive ? data.tier : "free";

            set({
              currentTier: tier,
              membership: data,
              isLoading: false,
            });
          } else {
            set({
              currentTier: "free",
              membership: null,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load membership",
            isLoading: false,
          });
        }
      },

      loadAvailablePlans: async () => {
        // For now, use default plans
        // In a real implementation, this would fetch from Supabase or RevenueCat
        set({ availablePlans: DEFAULT_PLANS });
      },

      purchaseSubscription: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          // This is a placeholder implementation
          // In a real app, this would integrate with Expo IAP or RevenueCat

          const plan = get().availablePlans.find((p) => p.id === planId);
          if (!plan) throw new Error("Plan not found");

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          // Simulate purchase success for demo
          const expiresAt = new Date();
          if (plan.interval === "month") {
            // Add 30 days to avoid month boundary issues
            expiresAt.setTime(expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          } else {
            // Add 365 days for yearly subscription
            expiresAt.setTime(expiresAt.getTime() + 365 * 24 * 60 * 60 * 1000);
          }

          const membership: UserMembership = {
            user_id: user.id,
            tier: plan.tier,
            plan_id: planId,
            subscription_id: null, // Will be set by actual payment processor
            expires_at: expiresAt.toISOString(),
            auto_renew: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Store in database
          const { error } = await supabase.from("user_memberships").upsert(membership, { onConflict: "user_id" });

          if (error) throw error;

          set({
            currentTier: plan.tier,
            membership,
            isLoading: false,
          });

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
        // Placeholder for restore purchases
        // In a real implementation, this would check with the app store
        await get().loadMembership();
      },

      cancelSubscription: async () => {
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { error } = await supabase
            .from("user_memberships")
            .update({
              auto_renew: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (error) throw error;

          set((state) => ({
            membership: state.membership
              ? {
                  ...state.membership,
                  auto_renew: false,
                }
              : null,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to cancel subscription",
            isLoading: false,
          });
        }
      },

      hasFeature: (feature: keyof MembershipFeatures) => {
        const { currentTier } = get();

        if (currentTier === "free") {
          return FREE_FEATURES[feature];
        } else if (currentTier === "plus") {
          return PLUS_FEATURES[feature];
        }

        return false;
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "membership-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentTier: state.currentTier,
        membership: state.membership,
        availablePlans: state.availablePlans,
      }),
    },
  ),
);
