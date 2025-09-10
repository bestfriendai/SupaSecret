import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { getConfig } from "../config/production";

// Check if running in Expo Go
const IS_EXPO_GO = Constants.appOwnership === "expo";
const config = getConfig();

// RevenueCat API Key from configuration
const REVENUECAT_API_KEY = config.REVENUECAT.API_KEY;

// Lazy load RevenueCat to prevent Expo Go crashes
let Purchases: any = null;
let CustomerInfo: any = null;
let PurchasesOffering: any = null;
let PurchasesPackage: any = null;

const loadRevenueCat = async () => {
  if (!Purchases && !IS_EXPO_GO) {
    try {
      const RevenueCatModule = require("react-native-purchases");
      Purchases = RevenueCatModule.default;
      CustomerInfo = RevenueCatModule.CustomerInfo;
      PurchasesOffering = RevenueCatModule.PurchasesOffering;
      PurchasesPackage = RevenueCatModule.PurchasesPackage;
      console.log("🚀 RevenueCat module loaded successfully");
    } catch (error) {
      console.warn("RevenueCat not available, running in demo mode:", (error as any)?.message || String(error));
      console.log("🎯 RevenueCat demo mode - react-native-purchases not installed");
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

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log("🎯 RevenueCat Demo Mode - Development build required for real subscriptions");
      this.isInitialized = true;
      return;
    }

    try {
      await loadRevenueCat();

      if (!Purchases) {
        console.log("🎯 RevenueCat not available, running in demo mode");
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

      console.log("🚀 RevenueCat initialized for development build");
      this.isInitialized = true;
    } catch (error) {
      console.warn("RevenueCat initialization failed, running in demo mode:", (error as any)?.message || String(error));
      this.isInitialized = true;
    }
  }

  static async getOfferings(): Promise<any | null> {
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

  static async purchasePackage(packageToPurchase: any): Promise<any> {
    await this.initialize();

    if (IS_EXPO_GO) {
      console.log("🎯 Demo: Simulating purchase...");
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("✅ Demo purchase completed successfully!");
          resolve({ mockCustomerInfo: true });
        }, 2000);
      });
    }

    try {
      if (!Purchases) {
        throw new Error("RevenueCat not initialized");
      }

      console.log("🚀 Purchasing package:", packageToPurchase);
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);

      console.log("✅ Purchase completed successfully!", { customerInfo, productIdentifier });

      // Update subscription status in Supabase
      await this.syncSubscriptionStatus(customerInfo);

      return { customerInfo, productIdentifier };
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  static async restorePurchases(): Promise<any> {
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
  private static async syncSubscriptionStatus(customerInfo: any): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const activeSubscriptions = customerInfo.activeSubscriptions || [];
      const isPremium = activeSubscriptions.length > 0;

      // Update user subscription status in Supabase
      const { error } = await supabase.from("user_subscriptions" as any).upsert({
        user_id: user.id,
        is_premium: isPremium,
        subscription_ids: activeSubscriptions,
        customer_info: customerInfo,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to sync subscription status:", error);
      } else {
        console.log("✅ Subscription status synced with Supabase");
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
  static async getCustomerInfo(): Promise<any> {
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
      if (!customerInfo) {
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
}
