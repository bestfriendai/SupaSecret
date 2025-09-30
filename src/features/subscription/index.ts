/**
 * Subscription Feature Module
 * Centralized exports for subscription functionality
 */

// Service
export { SubscriptionService } from './services/subscriptionService';

// Store
export { useSubscriptionStore } from './store/subscriptionStore';

// Hook
export { useSubscription } from './hooks/useSubscription';

// Components
export { PaywallModal } from './components/PaywallModal';

// Screens
export { PaywallScreen } from './screens/PaywallScreen';
export { SubscriptionManagementScreen } from './screens/SubscriptionManagementScreen';

// Types
export type {
  RevenueCatCustomerInfo,
  RevenueCatEntitlement,
  RevenueCatOfferings,
  RevenueCatOffering,
  RevenueCatPackage,
  RevenueCatProduct,
  RevenueCatProductPrice,
  RevenueCatPurchaseResult,
  MockPurchaseResult,
  RevenueCatCustomerResult,
  SubscriptionTier,
  SubscriptionStatus,
  PurchaseError,
} from './types';

export { PurchaseErrorType } from './types';
