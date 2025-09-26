import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { getConfig } from "../config/production";
import { withSupabaseConfig } from "../lib/supabase";
import { withSupabaseRetry } from "../lib/supabase";

// Type definitions for RevenueCat
interface RevenueCatCustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, any>;
  };
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  originalAppUserId: string;
  requestDate: string;
}

interface RevenueCatOfferings {
  current: RevenueCatOffering | null;
  all: Record<string, RevenueCatOffering>;
}

interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, any>;
  packages: RevenueCatPackage[];
}

interface RevenueCatPackage {
  identifier: string;
  packageType: string;
  product: RevenueCatProduct;
  offeringIdentifier: string;
}

interface RevenueCatProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  introPrice: RevenueCatProductPrice | null;
}

interface RevenueCatProductPrice {
  price: number;
  priceString: string;
  currencyCode: string;
  period: string;
  periodUnit: string;
  cycles: number;
}

type RevenueCatPurchaseResult = {
  customerInfo: RevenueCatCustomerInfo;
  productIdentifier: string;
};

type MockPurchaseResult = {
  mockCustomerInfo: boolean;
};

type RevenueCatCustomerResult = RevenueCatCustomerInfo | MockPurchaseResult | null;

// Check if running in Expo Go
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
const config = getConfig();

// RevenueCat API Key from configuration
const REVENUECAT_API_KEY = config.REVENUECAT.API_KEY;

// Lazy load RevenueCat to prevent Expo Go crashes
let Purchases: {
  configure: (config: { apiKey: string; appUserID: string | null }) => Promise<void>;
  setLogLevel: (level: string) => Promise<void>;
  getOfferings: () => Promise<RevenueCatOfferings>;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<RevenueCatPurchaseResult>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
  logIn: (userID: string) => Promise<void>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
} | null = null;

let _CustomerInfo: any = null;
let _PurchasesOffering: any = null;
let _PurchasesPackage: any = null;

const loadRevenueCat = async () => {
  if (!Purchases && !IS_EXPO_GO) {
    try {
      const RevenueCatModule = await import("react-native-purchases");
      Purchases = RevenueCatModule.default as any;
      // Types are exported separately in v9+
      _CustomerInfo = {} as any;
      _PurchasesOffering = {} as any;
      _PurchasesPackage = {} as any;
      if (__DEV__) {
        console.log("🚀 RevenueCat module loaded successfully");
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("RevenueCat not available, running in demo mode:", (error as Error)?.message || String(error));
        console.log("🎯 RevenueCat demo mode - react-native-purchases not installed");
      }
    }
  }
};

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

export class RevenueCatService {
  private static isInitialized = false;

  private static sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Retry wrapper for purchases to handle transient failures
  private static async purchaseWithRetry(
    pkg: RevenueCatPackage,
    attempts = 3,
    baseDelay = 500,
  ): Promise<RevenueCatPurchaseResult | undefined> {
    for (let i = 0; i < attempts; i++) {
      try {
        // Add null check for Purchases
        if (!Purchases) {
          throw new Error("RevenueCat Purchases not initialized");
        }
        return await Purchases.purchasePackage(pkg);
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const userCanceled = msg.includes("cancel");
        const retryable = !userCanceled && (msg.includes("network") || msg.includes("timeout") || e?.code === 503);
        if (!retryable || i === attempts - 1) throw e;
        await RevenueCatService.sleep(baseDelay * Math.pow(2, i));
      }
    }
    return undefined;
  }

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log("🎯 RevenueCat Demo Mode - Development build required for real subscriptions");
      this.isInitialized = true;
      return;
    }

    try {
      // Runtime guard for API key to prevent null-key initialization
      if (!REVENUECAT_API_KEY) {
        console.warn("RevenueCat API key missing/invalid; skipping Purchases.configure (demo mode)");
        this.isInitialized = true;
        return;
      }
      await loadRevenueCat();

      if (!Purchases) {
        if (__DEV__) {
          console.log("🎯 RevenueCat not available, running in demo mode");
        }
        this.isInitialized = true;
        return;
      }

      // Configure RevenueCat
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: null, // Will be set when user logs in
      });

      // Set debug logs in development
      if (__DEV__) {
        await Purchases.setLogLevel("DEBUG");
      }

      if (__DEV__) {
        console.log("🚀 RevenueCat initialized for development build");
      }
      this.isInitialized = true;
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "RevenueCat initialization failed, running in demo mode:",
          (error as any)?.message || String(error),
        );
      }
      this.isInitialized = true;
    }
  }

  static async getOfferings(): Promise<RevenueCatOfferings | null> {
    await this.initialize();

    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Getting mock offerings");
      return null; // Demo mode
    }

    try {
      if (!Purchases) {
        throw new Error("RevenueCat not initialized");
      }

      const offerings = await Purchases.getOfferings();
      console.log("🚀 Retrieved RevenueCat offerings:", offerings);
      return offerings;
    } catch (error) {
      console.error("Failed to get offerings:", error);
      return null;
    }
  }

  static async purchasePackage(
    packageToPurchase: RevenueCatPackage,
  ): Promise<RevenueCatPurchaseResult | MockPurchaseResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      if (__DEV__) {
        console.log("🎯 Demo: Simulating purchase...");
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          if (__DEV__) {
            console.log("✅ Demo purchase completed successfully!");
          }
          resolve({ mockCustomerInfo: true });
        }, 2000);
      });
    }

    try {
      if (!Purchases) {
        throw new Error("RevenueCat not initialized");
      }

      if (__DEV__) {
        console.log("🚀 Purchasing package:", packageToPurchase);
      }
      const result = await this.purchaseWithRetry(packageToPurchase);
      // Handle undefined result
      if (!result) {
        throw new Error("Purchase result is undefined");
      }
      const customerInfo = result.customerInfo;
      const productIdentifier = result.productIdentifier;

      if (__DEV__) {
        console.log("✅ Purchase completed successfully!", { customerInfo, productIdentifier });
      }

      // Update subscription status in Supabase
      if (customerInfo) {
        await this.syncSubscriptionStatus(customerInfo);
      }

      return {
        customerInfo: customerInfo || ({} as RevenueCatCustomerInfo),
        productIdentifier: productIdentifier || "",
      };
    } catch (error) {
      if (__DEV__) {
        console.error("Purchase failed:", error);
      }
      throw error;
    }
  }

  static async restorePurchases(): Promise<RevenueCatCustomerInfo | MockPurchaseResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Simulating restore purchases...");
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("✅ Demo restore completed!");
          resolve({ mockCustomerInfo: true });
        }, 1500);
      });
    }

    try {
      if (!Purchases) {
        throw new Error("RevenueCat not initialized");
      }

      console.log("🚀 Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();

      console.log("✅ Restore completed!", customerInfo);

      // Update subscription status in Supabase
      await this.syncSubscriptionStatus(customerInfo);

      return customerInfo;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }

  // Sync subscription status with Supabase
  private static async syncSubscriptionStatus(customerInfo: RevenueCatCustomerInfo): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const activeSubscriptions = customerInfo.activeSubscriptions || [];
      const isPremium = activeSubscriptions.length > 0;

      // Update user subscription status in Supabase with offline queue support
      const { enqueue, isOnline } = await import("../lib/offlineQueue");
      const doUpsert = async () => {
        const { error } = await withSupabaseRetry(async () =>
          supabase.from("user_memberships").upsert({
            user_id: user.id,
            tier: isPremium ? "plus" : "free",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        );
        if (error) throw error;
      };

      if (!isOnline()) {
        enqueue("subscription.sync", {
          userId: user.id,
          isPremium,
          activeSubscriptions,
          customerInfo,
        });
        console.log("📦 Queued subscription sync (offline)");
        return;
      }

      try {
        // Fix withSupabaseConfig usage - it should wrap the operation
        await withSupabaseConfig(() => doUpsert());
        console.log("✅ Subscription status synced with Supabase");
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        if (/network|timeout|fetch|503|429/.test(msg)) {
          enqueue("subscription.sync", {
            userId: user.id,
            isPremium,
            activeSubscriptions,
            customerInfo,
          });
          console.log("📦 Queued subscription sync after network error");
        } else {
          throw e;
        }
      }
    } catch (error) {
      console.error("Failed to sync subscription status:", error);
    }
  }

  // Set user ID for RevenueCat
  static async setUserID(userID: string): Promise<void> {
    if (IS_EXPO_GO || !Purchases) return;

    try {
      await Purchases.logIn(userID);
      console.log("✅ RevenueCat user ID set:", userID);
    } catch (error) {
      console.error("Failed to set RevenueCat user ID:", error);
    }
  }

  // Get customer info
  static async getCustomerInfo(): Promise<RevenueCatCustomerResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      return { mockCustomerInfo: true };
    }

    try {
      if (!Purchases) {
        throw new Error("RevenueCat not initialized");
      }

      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error("Failed to get customer info:", error);
      return null;
    }
  }

  // Check if user has premium subscription
  static async isUserPremium(): Promise<boolean> {
    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Checking premium status (always free in demo)");
      return false; // Always free in demo mode
    }

    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo || "mockCustomerInfo" in customerInfo) {
        return false;
      }

      // Check for active entitlements
      const activeEntitlements = customerInfo.entitlements?.active || {};
      const hasActiveEntitlement = Object.keys(activeEntitlements).length > 0;

      // Also check active subscriptions as fallback
      const activeSubscriptions = customerInfo.activeSubscriptions || [];
      const hasActiveSubscription = activeSubscriptions.length > 0;

      return hasActiveEntitlement || hasActiveSubscription;
    } catch (error) {
      console.error("Failed to check premium status:", error);
      return false; // Default to free on error
    }
  }

  // Mock offerings for development
  static getMockOfferings(): SubscriptionTier[] {
    return [
      {
        id: "monthly",
        name: "Premium Monthly",
        price: "$4.99/month",
        features: ["No ads", "Unlimited video recordings", "Advanced voice effects", "Priority support"],
      },
      {
        id: "annual",
        name: "Premium Annual",
        price: "$39.99/year",
        features: ["No ads", "Unlimited video recordings", "Advanced voice effects", "Priority support", "Save 33%"],
        isPopular: true,
      },
    ];
  }

  // Unified access for subscription tiers in all envs
  static async getSubscriptionTiers(): Promise<SubscriptionTier[] | null> {
    if (IS_EXPO_GO) {
      return this.getMockOfferings();
    }
    try {
      const offerings = await this.getOfferings();
      if (!offerings || !offerings.current) return null;
      const pkgs = offerings.current.packages || [];
      const tiers: SubscriptionTier[] = pkgs.map((p) => ({
        id: p.identifier,
        name: p.product?.title || p.identifier,
        price: p.product?.priceString || "",
        features: [],
      }));
      return tiers.length ? tiers : null;
    } catch (e) {
      if (__DEV__) console.warn("getSubscriptionTiers failed:", e);
      return null;
    }
  }
}
