/**
 * RevenueCat Subscription Service
 *
 * This service handles all subscription-related operations including:
 * - SDK initialization
 * - Purchase flow
 * - Restore purchases
 * - Subscription status checking
 * - Error handling with retry logic
 *
 * Based on react-native-purchases v9.4.2 best practices
 */

import Constants from 'expo-constants';
import type {
  RevenueCatCustomerInfo,
  RevenueCatOfferings,
  RevenueCatPackage,
  RevenueCatPurchaseResult,
  RevenueCatCustomerResult,
  MockPurchaseResult,
  SubscriptionTier,
  SubscriptionStatus,
  PurchaseError,
} from '../types';
import { PurchaseErrorType } from '../types';

// Check if running in Expo Go
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Lazy load RevenueCat to prevent Expo Go crashes
let Purchases: {
  configure: (config: { apiKey: string; appUserID?: string | null }) => Promise<void>;
  setLogLevel: (level: string) => Promise<void>;
  getOfferings: () => Promise<RevenueCatOfferings>;
  purchasePackage: (pkg: RevenueCatPackage) => Promise<RevenueCatPurchaseResult>;
  restorePurchases: () => Promise<RevenueCatCustomerInfo>;
  logIn: (userID: string) => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  logOut: () => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
  getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
  setAttributes: (attributes: Record<string, string | null>) => Promise<void>;
  invalidateCustomerInfoCache: () => Promise<void>;
} | null = null;

// Configuration - will be provided by app config
let REVENUECAT_API_KEY: string | undefined;

export class SubscriptionService {
  private static isInitialized = false;
  private static customerInfoCache: {
    data: RevenueCatCustomerInfo | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Configure the service with API key
   */
  static configure(apiKey: string) {
    REVENUECAT_API_KEY = apiKey;
  }

  /**
   * Helper function to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Load RevenueCat module dynamically
   */
  private static async loadRevenueCat(): Promise<void> {
    if (!Purchases && !IS_EXPO_GO) {
      try {
        const RevenueCatModule = await import('react-native-purchases');
        Purchases = RevenueCatModule.default as any;
        if (__DEV__) {
          console.log('🚀 RevenueCat module loaded successfully');
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(
            'RevenueCat not available, running in demo mode:',
            (error as Error)?.message || String(error)
          );
        }
      }
    }
  }

  /**
   * Initialize RevenueCat SDK
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (IS_EXPO_GO) {
      console.log('🎯 RevenueCat Demo Mode - Development build required for real subscriptions');
      this.isInitialized = true;
      return;
    }

    try {
      // Runtime guard for API key
      if (!REVENUECAT_API_KEY) {
        console.warn('RevenueCat API key missing; skipping initialization (demo mode)');
        this.isInitialized = true;
        return;
      }

      await this.loadRevenueCat();

      if (!Purchases) {
        if (__DEV__) {
          console.log('🎯 RevenueCat not available, running in demo mode');
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
        await Purchases.setLogLevel('DEBUG');
      }

      if (__DEV__) {
        console.log('✅ RevenueCat initialized successfully');
      }
      this.isInitialized = true;
    } catch (error) {
      if (__DEV__) {
        console.warn(
          'RevenueCat initialization failed, running in demo mode:',
          (error as any)?.message || String(error)
        );
      }
      this.isInitialized = true;
    }
  }

  /**
   * Set user ID for RevenueCat
   */
  static async setUserID(userID: string): Promise<void> {
    if (IS_EXPO_GO || !Purchases) return;

    try {
      await Purchases.logIn(userID);
      console.log('✅ RevenueCat user ID set:', userID);
      // Invalidate cache after login
      this.customerInfoCache = { data: null, timestamp: 0 };
    } catch (error) {
      console.error('Failed to set RevenueCat user ID:', error);
      throw error;
    }
  }

  /**
   * Log out user from RevenueCat
   */
  static async logOut(): Promise<void> {
    if (IS_EXPO_GO || !Purchases) return;

    try {
      await Purchases.logOut();
      console.log('✅ RevenueCat user logged out');
      // Clear cache after logout
      this.customerInfoCache = { data: null, timestamp: 0 };
    } catch (error) {
      console.error('Failed to log out from RevenueCat:', error);
    }
  }

  /**
   * Get available offerings
   */
  static async getOfferings(): Promise<RevenueCatOfferings | null> {
    await this.initialize();

    if (IS_EXPO_GO) {
      console.log('🎯 Demo: Getting mock offerings');
      return null;
    }

    try {
      if (!Purchases) {
        throw new Error('RevenueCat not initialized');
      }

      const offerings = await Purchases.getOfferings();

      // Validate offerings
      if (!offerings || !offerings.current) {
        console.error('❌ No current offering returned from RevenueCat');
        console.error('Available offerings:', Object.keys(offerings?.all || {}));

        if (__DEV__) {
          console.warn('💡 Check: App Store Connect products have all metadata');
          console.warn('💡 Check: RevenueCat product IDs match exactly');
          console.warn('💡 Check: Paid Applications Agreement signed');
        }

        return offerings;
      }

      // Validate packages
      if (offerings.current.availablePackages.length === 0) {
        console.error('❌ Current offering has no packages');
      } else {
        console.log('✅ Found', offerings.current.availablePackages.length, 'packages');
        if (__DEV__) {
          offerings.current.availablePackages.forEach((pkg, idx) => {
            console.log(`  ${idx + 1}. ${pkg.identifier}:`, {
              productId: pkg.product.identifier,
              price: pkg.product.priceString,
              title: pkg.product.title,
            });
          });
        }
      }

      return offerings;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  /**
   * Retry wrapper for purchases to handle transient failures
   */
  private static async purchaseWithRetry(
    pkg: RevenueCatPackage,
    attempts = 3,
    baseDelay = 500
  ): Promise<RevenueCatPurchaseResult | undefined> {
    for (let i = 0; i < attempts; i++) {
      try {
        if (!Purchases) {
          throw new Error('RevenueCat Purchases not initialized');
        }
        return await Purchases.purchasePackage(pkg);
      } catch (e: any) {
        const msg = (e?.message || '').toLowerCase();
        const userCanceled = msg.includes('cancel');
        const retryable =
          !userCanceled &&
          (msg.includes('network') || msg.includes('timeout') || e?.code === 503);

        if (!retryable || i === attempts - 1) throw e;

        await this.sleep(baseDelay * Math.pow(2, i));
      }
    }
    return undefined;
  }

  /**
   * Purchase a subscription package
   */
  static async purchasePackage(
    packageToPurchase: RevenueCatPackage
  ): Promise<RevenueCatPurchaseResult | MockPurchaseResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      if (__DEV__) {
        console.log('🎯 Demo: Simulating purchase...');
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          if (__DEV__) {
            console.log('✅ Demo purchase completed successfully!');
          }
          resolve({ mockCustomerInfo: true });
        }, 2000);
      });
    }

    try {
      if (!Purchases) {
        throw new Error('RevenueCat not initialized');
      }

      if (__DEV__) {
        console.log('🚀 Purchasing package:', packageToPurchase.identifier);
      }

      const result = await this.purchaseWithRetry(packageToPurchase);

      if (!result) {
        throw new Error('Purchase result is undefined');
      }

      if (__DEV__) {
        console.log('✅ Purchase completed successfully!');
      }

      // Invalidate cache after purchase
      this.customerInfoCache = { data: null, timestamp: 0 };

      return {
        customerInfo: result.customerInfo || ({} as RevenueCatCustomerInfo),
        productIdentifier: result.productIdentifier || '',
      };
    } catch (error) {
      if (__DEV__) {
        console.error('Purchase failed:', error);
      }
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  static async restorePurchases(): Promise<RevenueCatCustomerInfo | MockPurchaseResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      console.log('🎯 Demo: Simulating restore purchases...');
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('✅ Demo restore completed!');
          resolve({ mockCustomerInfo: true });
        }, 1500);
      });
    }

    try {
      if (!Purchases) {
        throw new Error('RevenueCat not initialized');
      }

      console.log('🚀 Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Restore completed!');

      // Invalidate cache after restore
      this.customerInfoCache = { data: null, timestamp: 0 };

      return customerInfo;
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Get customer info with caching
   */
  static async getCustomerInfo(forceRefresh = false): Promise<RevenueCatCustomerResult> {
    await this.initialize();

    if (IS_EXPO_GO) {
      return { mockCustomerInfo: true };
    }

    // Check cache
    if (
      !forceRefresh &&
      this.customerInfoCache.data &&
      Date.now() - this.customerInfoCache.timestamp < this.CACHE_DURATION
    ) {
      return this.customerInfoCache.data;
    }

    try {
      if (!Purchases) {
        throw new Error('RevenueCat not initialized');
      }

      const customerInfo = await Purchases.getCustomerInfo();

      // Update cache
      this.customerInfoCache = {
        data: customerInfo,
        timestamp: Date.now(),
      };

      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Check if user has premium subscription
   */
  static async isUserPremium(): Promise<boolean> {
    if (IS_EXPO_GO) {
      return false;
    }

    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo || 'mockCustomerInfo' in customerInfo) {
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
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  /**
   * Get detailed subscription status
   */
  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await this.getCustomerInfo();

      if (!customerInfo || 'mockCustomerInfo' in customerInfo) {
        return {
          status: 'free',
          tier: 'free',
          expiresAt: null,
          willRenew: false,
          billingIssue: false,
          productId: null,
          inTrialPeriod: false,
        };
      }

      const entitlements = customerInfo.entitlements.active;
      const hasActive = Object.keys(entitlements).length > 0;

      if (!hasActive) {
        return {
          status: 'expired',
          tier: 'free',
          expiresAt: null,
          willRenew: false,
          billingIssue: false,
          productId: null,
          inTrialPeriod: false,
        };
      }

      const activeEntitlement = Object.values(entitlements)[0] as any;
      const billingIssue = activeEntitlement.billingIssueDetectedAt != null;
      const inTrialPeriod = activeEntitlement.periodType === 'trial';

      return {
        status: billingIssue
          ? 'billing_issue'
          : inTrialPeriod
          ? 'trial'
          : 'active',
        tier: 'plus',
        expiresAt: activeEntitlement.expirationDate,
        willRenew: activeEntitlement.willRenew,
        billingIssue,
        productId: activeEntitlement.productIdentifier,
        inTrialPeriod,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return {
        status: 'free',
        tier: 'free',
        expiresAt: null,
        willRenew: false,
        billingIssue: false,
        productId: null,
        inTrialPeriod: false,
      };
    }
  }

  /**
   * Handle purchase errors with proper categorization
   */
  static handlePurchaseError(error: any): PurchaseError {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code;

    // User cancelled
    if (errorMessage.includes('cancel') || errorCode === 1) {
      return {
        type: PurchaseErrorType.USER_CANCELLED,
        message: 'User cancelled the purchase',
        shouldRetry: false,
        userFriendlyMessage: '',
      };
    }

    // Payment pending (Google Play)
    if (errorMessage.includes('pending') || errorCode === 2) {
      return {
        type: PurchaseErrorType.PAYMENT_PENDING,
        message: 'Payment is pending',
        shouldRetry: false,
        userFriendlyMessage:
          'Your purchase is being processed. Please check back shortly.',
      };
    }

    // Invalid purchase
    if (errorMessage.includes('invalid') || errorCode === 3) {
      return {
        type: PurchaseErrorType.INVALID_PURCHASE,
        message: 'Invalid purchase',
        shouldRetry: false,
        userFriendlyMessage:
          'This purchase is not valid. Please try again or contact support.',
      };
    }

    // Not allowed (parental controls, etc.)
    if (errorMessage.includes('not allowed') || errorCode === 5) {
      return {
        type: PurchaseErrorType.NOT_ALLOWED,
        message: 'Purchase not allowed',
        shouldRetry: false,
        userFriendlyMessage:
          'Purchases are not allowed on this device. Check your device settings.',
      };
    }

    // Already owned
    if (errorMessage.includes('already') || errorCode === 7) {
      return {
        type: PurchaseErrorType.ALREADY_OWNED,
        message: 'Product already owned',
        shouldRetry: false,
        userFriendlyMessage:
          'You already own this subscription. Try restoring your purchases.',
      };
    }

    // Network error
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorCode === 503 ||
      errorCode === 504
    ) {
      return {
        type: PurchaseErrorType.NETWORK_ERROR,
        message: 'Network error',
        shouldRetry: true,
        userFriendlyMessage:
          'Network connection issue. Please check your internet and try again.',
      };
    }

    // Store error
    if (
      errorMessage.includes('store') ||
      errorMessage.includes('receipt') ||
      (errorCode >= 500 && errorCode < 600)
    ) {
      return {
        type: PurchaseErrorType.STORE_ERROR,
        message: 'Store error',
        shouldRetry: true,
        userFriendlyMessage:
          'App Store is temporarily unavailable. Please try again in a moment.',
      };
    }

    // Unknown error
    return {
      type: PurchaseErrorType.UNKNOWN,
      message: errorMessage || 'Unknown error',
      shouldRetry: false,
      userFriendlyMessage:
        'An unexpected error occurred. Please try again or contact support.',
    };
  }

  /**
   * Get mock offerings for development/demo
   */
  static getMockOfferings(): SubscriptionTier[] {
    return [
      {
        id: 'supasecret_plus_monthly',
        name: 'SupaSecret Plus Monthly',
        price: '$4.99/month',
        features: [
          'Ad-free experience',
          'Unlimited video recordings (up to 5 minutes)',
          'Higher quality video (4K)',
          'Unlimited saves',
          'Advanced filters',
          'Priority processing',
          'Custom themes',
          'Early access to new features',
        ],
      },
      {
        id: 'supasecret_plus_annual',
        name: 'SupaSecret Plus Annual',
        price: '$29.99/year',
        features: [
          'Ad-free experience',
          'Unlimited video recordings (up to 5 minutes)',
          'Higher quality video (4K)',
          'Unlimited saves',
          'Advanced filters',
          'Priority processing',
          'Custom themes',
          'Early access to new features',
          'Save 50%',
        ],
        isPopular: true,
      },
    ];
  }

  /**
   * Get subscription tiers from offerings or mock data
   */
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
        price: p.product?.priceString || '',
        features: [],
      }));

      return tiers.length ? tiers : null;
    } catch (e) {
      if (__DEV__) console.warn('getSubscriptionTiers failed:', e);
      return null;
    }
  }

  /**
   * Set custom attributes for user (for analytics/segmentation)
   */
  static async setUserAttributes(attributes: Record<string, string | null>): Promise<void> {
    if (IS_EXPO_GO || !Purchases) return;

    try {
      await Purchases.setAttributes(attributes);
      console.log('✅ User attributes set');
    } catch (error) {
      console.error('Failed to set user attributes:', error);
    }
  }

  /**
   * Invalidate customer info cache
   */
  static invalidateCache(): void {
    this.customerInfoCache = { data: null, timestamp: 0 };
  }
}
