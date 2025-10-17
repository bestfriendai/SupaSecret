import { SubscriptionService } from "../features/subscription/services/subscriptionService";
import { supabase } from "../lib/supabase";

// RevenueCat MCP Service for enhanced subscription management
export class RevenueCatMCPService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize the base RevenueCat service
      await SubscriptionService.initialize();

      console.log("🚀 RevenueCat MCP Service initialized");
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize RevenueCat MCP Service:", error);
      throw error;
    }
  }

  // Get detailed customer information with MCP enhancements
  static async getCustomerInfo() {
    await this.initialize();

    try {
      const customerInfo = await SubscriptionService.getCustomerInfo();

      if (!customerInfo || "mockCustomerInfo" in customerInfo) {
        return {
          success: false,
          error: "No customer info available",
          data: null,
        };
      }

      return {
        success: true,
        data: {
          ...customerInfo,
          // Add enhanced analytics data
          analytics: {
            totalSpent: this.calculateTotalSpent(customerInfo),
            subscriptionDuration: this.calculateSubscriptionDuration(customerInfo),
            purchaseHistory: await this.getPurchaseHistory(customerInfo.originalAppUserId),
          },
        },
      };
    } catch (error) {
      console.error("Failed to get customer info via MCP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  // Get offerings with enhanced metadata
  static async getEnhancedOfferings() {
    await this.initialize();

    try {
      const offerings = await SubscriptionService.getOfferings();

      if (!offerings) {
        return {
          success: false,
          error: "No offerings available",
          data: null,
        };
      }

      // Enhance offerings with additional metadata
      const enhancedOfferings = {
        ...offerings,
        metadata: {
          recommendedPackage: this.getRecommendedPackage(offerings),
          localizedPricing: await this.getLocalizationData(),
          promotionalOffers: await this.getPromotionalOffers(),
        },
      };

      return {
        success: true,
        data: enhancedOfferings,
      };
    } catch (error) {
      console.error("Failed to get enhanced offerings via MCP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  // Enhanced purchase with analytics tracking
  static async makePurchase(packageId: string, userId?: string) {
    await this.initialize();

    try {
      // Get user ID if not provided
      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Set user ID in RevenueCat
      await SubscriptionService.setUserID(userId);

      // Get offerings to find the package
      const offerings = await SubscriptionService.getOfferings();
      if (!offerings || !offerings.current) {
        console.warn("No offerings available for purchase");
        return {
          success: false,
          data: null,
          message: "Subscription options are currently unavailable",
        };
      }

      const packageToPurchase = offerings.current.packages.find((pkg) => pkg.identifier === packageId);
      if (!packageToPurchase) {
        console.warn(`Package ${packageId} not found. Available:`, offerings.current.packages.map(p => p.identifier));
        return {
          success: false,
          data: null,
          message: "The selected subscription plan is not available",
        };
      }

      // Make the purchase
      const result = await SubscriptionService.purchasePackage(packageToPurchase);

      // Track purchase analytics
      await this.trackPurchaseAnalytics(result, userId);

      return {
        success: true,
        data: result,
        message: "Purchase completed successfully",
      };
    } catch (error) {
      console.error("Failed to make purchase via MCP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  // Restore purchases with enhanced validation
  static async restorePurchases() {
    await this.initialize();

    try {
      const result = await SubscriptionService.restorePurchases();

      // Validate and sync with local database
      if (result && !("mockCustomerInfo" in result)) {
        await this.validateAndSyncMembership(result);
      }

      return {
        success: true,
        data: result,
        message: "Purchases restored successfully",
      };
    } catch (error) {
      console.error("Failed to restore purchases via MCP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  // Get subscription analytics
  static async getSubscriptionAnalytics(userId?: string) {
    await this.initialize();

    try {
      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const customerInfo = await SubscriptionService.getCustomerInfo();

      if (!customerInfo || "mockCustomerInfo" in customerInfo) {
        return {
          success: false,
          error: "No customer info available",
          data: null,
        };
      }

      const analytics = {
        userId,
        subscriptionStatus: this.getSubscriptionStatus(customerInfo),
        totalRevenue: this.calculateTotalSpent(customerInfo),
        subscriptionStartDate: this.getSubscriptionStartDate(customerInfo),
        nextBillingDate: this.getNextBillingDate(customerInfo),
        activeFeatures: this.getActiveFeatures(customerInfo),
        usageStats: await this.getUsageStats(userId),
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      console.error("Failed to get subscription analytics via MCP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  // Helper methods
  private static calculateTotalSpent(customerInfo: any): number {
    // This would typically be calculated from purchase history
    // For now, return a placeholder
    return 0;
  }

  private static calculateSubscriptionDuration(customerInfo: any): number {
    // Calculate subscription duration in days
    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    if (activeSubscriptions.length === 0) return 0;

    // Placeholder calculation
    return 30; // Default to 30 days
  }

  private static async getPurchaseHistory(userId: string): Promise<any[]> {
    // This would fetch purchase history from RevenueCat API
    // For now, return empty array
    return [];
  }

  private static getRecommendedPackage(offerings: any): string | null {
    // Logic to recommend the best package based on user behavior
    if (offerings.current && offerings.current.packages.length > 0) {
      return offerings.current.packages[0].identifier;
    }
    return null;
  }

  private static async getLocalizationData(): Promise<any> {
    // Get localized pricing and currency information
    return {
      currency: "USD",
      locale: "en-US",
    };
  }

  private static async getPromotionalOffers(): Promise<any[]> {
    // Get available promotional offers
    return [];
  }

  private static async trackPurchaseAnalytics(result: any, userId: string): Promise<void> {
    // Track purchase analytics
    console.log("Tracking purchase analytics for user:", userId, result);
  }

  private static async validateAndSyncMembership(customerInfo: any): Promise<void> {
    // Validate membership status and sync with local database
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    const isPremium = activeSubscriptions.length > 0;

    // Update user membership in Supabase
    await supabase.from("user_memberships").upsert(
      {
        user_id: user.id,
        tier: isPremium ? "plus" : "free",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      },
    );
  }

  private static getSubscriptionStatus(customerInfo: any): string {
    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    return activeSubscriptions.length > 0 ? "active" : "inactive";
  }

  private static getSubscriptionStartDate(customerInfo: any): string | null {
    // Get the start date of the current subscription
    return null; // Placeholder
  }

  private static getNextBillingDate(customerInfo: any): string | null {
    // Get the next billing date
    return null; // Placeholder
  }

  private static getActiveFeatures(customerInfo: any): string[] {
    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    const features = [];

    if (activeSubscriptions.length > 0) {
      features.push(
        "ad_free",
        "unlimited_video_recordings",
        "high_quality_video",
        "unlimited_saves",
        "advanced_filters",
        "priority_processing",
        "custom_themes",
        "early_access",
      );
    }

    return features;
  }

  private static async getUsageStats(userId: string): Promise<any> {
    // Get user usage statistics
    return {
      videosCreated: 0,
      storageUsed: 0,
      apiCalls: 0,
    };
  }
}
