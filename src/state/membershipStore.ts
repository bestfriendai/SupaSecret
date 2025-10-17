import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { MembershipState, MembershipTier, UserMembership, MembershipFeatures, MembershipPlan } from "../types/membership";
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
        set({ isLoading: true, error: null });
        try {
          const { SubscriptionService } = await import("../features/subscription/services/subscriptionService");
          await SubscriptionService.initialize();

          const offerings = await SubscriptionService.getOfferings();

          if (!offerings?.current) {
            console.warn("No RevenueCat offerings available, using default plans");
            set({ availablePlans: DEFAULT_PLANS, isLoading: false });
            return;
          }

          const packages = offerings.current.availablePackages || offerings.current.packages || [];

          if (packages.length === 0) {
            console.warn("No packages in current offering, using default plans");
            set({ availablePlans: DEFAULT_PLANS, isLoading: false });
            return;
          }

          // Convert RevenueCat packages to MembershipPlan format
          const plans: MembershipPlan[] = packages.map((pkg: any) => {
            const product = pkg.product;
            const priceNumber = product.price || 0;
            const priceInCents = Math.round(priceNumber * 100);

            // Determine interval from package identifier or product
            let interval: "month" | "year" = "month";
            const identifier = pkg.identifier.toLowerCase();
            if (identifier.includes("annual") || identifier.includes("year")) {
              interval = "year";
            }

            // Mark annual as popular
            const isPopular = interval === "year";

            return {
              id: pkg.identifier, // Use package identifier (e.g., $rc_monthly)
              tier: "plus" as MembershipTier,
              name: product.title || product.description || pkg.identifier,
              description:
                interval === "year"
                  ? "Save 50% with annual billing"
                  : "Monthly access to all premium features",
              price: priceInCents,
              currency: product.currencyCode || "USD",
              interval,
              features: PLUS_FEATURES,
              popular: isPopular,
            };
          });

          // Sort plans: monthly first, then annual
          plans.sort((a, b) => {
            if (a.interval === "month" && b.interval === "year") return -1;
            if (a.interval === "year" && b.interval === "month") return 1;
            return 0;
          });

          console.log("✅ Loaded", plans.length, "plans from RevenueCat");
          set({ availablePlans: plans, isLoading: false });
        } catch (error) {
          console.error("Failed to load plans from RevenueCat:", error);
          console.warn("Falling back to default plans");
          set({
            availablePlans: DEFAULT_PLANS,
            error: error instanceof Error ? error.message : "Failed to load plans",
            isLoading: false,
          });
        }
      },

      purchaseSubscription: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          const plan = get().availablePlans.find((p) => p.id === planId);
          if (!plan) {
            set({
              error: "The selected plan is not available at this time. Please try again later.",
              isLoading: false
            });
            return false;
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            set({
              error: "Please sign in to purchase a subscription.",
              isLoading: false
            });
            return false;
          }

          const { SubscriptionService } = await import("../features/subscription/services/subscriptionService");
          await SubscriptionService.initialize();

          const offerings = await SubscriptionService.getOfferings();
          if (!offerings?.current) {
            set({
              error: "Subscription options are currently unavailable. Please check your internet connection and try again.",
              isLoading: false
            });
            return false;
          }

          const pkg = offerings.current.packages.find((p: any) => p.identifier === planId);
          if (!pkg) {
            // Log for debugging but show user-friendly message
            console.warn(`Package ${planId} not found in offerings. Available packages:`,
              offerings.current.packages.map((p: any) => p.identifier));
            set({
              error: "This subscription option is temporarily unavailable. Please try another plan or contact support.",
              isLoading: false
            });
            return false;
          }

          const result = await SubscriptionService.purchasePackage(pkg);

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
        set({ isLoading: true, error: null });
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { SubscriptionService } = await import("../features/subscription/services/subscriptionService");
          await SubscriptionService.initialize();

          const customerInfo = await SubscriptionService.restorePurchases();

          if ("mockCustomerInfo" in customerInfo) {
            throw new Error("Cannot restore in demo mode. Please use a development build.");
          }

          const isPremium = Object.keys(customerInfo.entitlements.active).length > 0;

          if (isPremium) {
            const activeEntitlement: any = Object.values(customerInfo.entitlements.active)[0];
            const expiresAt = activeEntitlement?.expirationDate || null;

            const membership: UserMembership = {
              user_id: user.id,
              tier: "plus",
              plan_id: customerInfo.activeSubscriptions[0] || null,
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
              currentTier: "plus",
              membership,
              isLoading: false,
            });
          } else {
            // No active subscriptions found
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to restore purchases",
            isLoading: false,
          });
          throw error;
        }
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
