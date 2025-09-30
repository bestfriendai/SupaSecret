/**
 * RevenueCat Subscription Types
 * Based on react-native-purchases v9.4.2
 */

export interface RevenueCatCustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, RevenueCatEntitlement>;
    all: Record<string, RevenueCatEntitlement>;
  };
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  originalAppUserId: string;
  requestDate: string;
}

export interface RevenueCatEntitlement {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  latestPurchaseDate: string;
  originalPurchaseDate: string;
  expirationDate: string | null;
  productIdentifier: string;
  billingIssueDetectedAt: string | null;
  ownershipType: 'PURCHASED' | 'FAMILY_SHARED';
  periodType: 'normal' | 'trial' | 'intro';
  store: 'app_store' | 'play_store' | 'stripe' | 'promotional';
  unsubscribeDetectedAt: string | null;
}

export interface RevenueCatOfferings {
  current: RevenueCatOffering | null;
  all: Record<string, RevenueCatOffering>;
}

export interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, any>;
  packages: RevenueCatPackage[];
  availablePackages: RevenueCatPackage[]; // Alias for packages
}

export interface RevenueCatPackage {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL' | 'WEEKLY' | 'LIFETIME' | 'CUSTOM';
  product: RevenueCatProduct;
  offeringIdentifier: string;
}

export interface RevenueCatProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  introPrice: RevenueCatProductPrice | null;
  subscriptionPeriod?: string;
}

export interface RevenueCatProductPrice {
  price: number;
  priceString: string;
  currencyCode: string;
  period: string;
  periodUnit: string;
  cycles: number;
}

export interface RevenueCatPurchaseResult {
  customerInfo: RevenueCatCustomerInfo;
  productIdentifier: string;
}

export interface MockPurchaseResult {
  mockCustomerInfo: boolean;
}

export type RevenueCatCustomerResult = RevenueCatCustomerInfo | MockPurchaseResult | null;

/**
 * App-specific subscription types
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

export interface SubscriptionStatus {
  status: 'active' | 'expired' | 'billing_issue' | 'free' | 'trial';
  tier: 'free' | 'plus' | 'premium';
  expiresAt: string | null;
  willRenew: boolean;
  billingIssue: boolean;
  productId: string | null;
  inTrialPeriod: boolean;
}

export enum PurchaseErrorType {
  USER_CANCELLED = 'USER_CANCELLED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  INVALID_PURCHASE = 'INVALID_PURCHASE',
  NOT_ALLOWED = 'NOT_ALLOWED',
  ALREADY_OWNED = 'ALREADY_OWNED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORE_ERROR = 'STORE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface PurchaseError {
  type: PurchaseErrorType;
  message: string;
  shouldRetry: boolean;
  userFriendlyMessage: string;
}
