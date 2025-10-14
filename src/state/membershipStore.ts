import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { RevenueCatMCPService } from "../services/RevenueCatMCPService";
import type { MembershipState, MembershipTier, UserMembership, MembershipFeatures } from "../types/membership";
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
            const tier: MembershipTier = isActive ? (data.tier as MembershipTier) : "free";

            set({
              currentTier: tier,
              membership: {
                ...data,
                tier: tier,
                auto_renew: data.auto_renew || false,
                created_at: data.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
              },
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
          const plan = get().availablePlans.find((p) => p.id === planId);
          if (!plan) throw new Error("Plan not found");

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { RevenueCatService } = await import("../services/RevenueCatService");
          await RevenueCatService.initialize();

          const offerings = await RevenueCatService.getOfferings();
          if (!offerings?.current) {
            throw new Error("No offerings available. Please configure RevenueCat products in the dashboard.");
          }

          const pkg = offerings.current.packages.find((p: any) => p.identifier === planId);
          if (!pkg) {
            throw new Error(`Package ${planId} not found in RevenueCat offerings`);
          }

          const result = await RevenueCatService.purchasePackage(pkg);

          if ("mockCustomerInfo" in result) {
            throw new Error("Cannot purchase in demo mode. Please use a development build.");
          }

          const customerInfo = result.customerInfo;
          const isPremium = Object.keys(customerInfo.entitlements.active).length > 0;

          if (!isPremium) {
            throw new Error("Purchase completed but premium entitlement not active");
          }

          const activeEntitlement: any = Object.values(customerInfo.entitlements.active)[0];
          const expiresAt = activeEntitlement?.expirationDate || null;

          const membership: UserMembership = {
            user_id: user.id,
            tier: plan.tier,
            plan_id: planId,
            subscription_id: customerInfo.originalAppUserId,
            expires_at: expiresAt,
            auto_renew: activeEntitlement?.willRenew !== false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from("user_memberships").upsert(membership, {
            onConflict: "user_id",
            ignoreDuplicates: false,
          });

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

      // Alias for currentTier for backward compatibility
      get membershipTier() {
        return get().currentTier;
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
