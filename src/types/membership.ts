export type MembershipTier = "free" | "plus";

export interface MembershipFeatures {
  adFree: boolean;
  longerVideos: boolean; // Up to 5 minutes vs 1 minute
  higherQuality: boolean; // 4K vs 1080p
  unlimitedSaves: boolean; // vs 50 saves
  advancedFilters: boolean; // Date range, content type filters in My Secrets
  priorityProcessing: boolean; // Faster video processing
  customThemes: boolean; // App themes and icons
  earlyAccess: boolean; // New features first
}

export interface MembershipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  description: string;
  price: number; // In cents
  currency: string;
  interval: "month" | "year";
  features: MembershipFeatures;
  popular?: boolean;
}

export interface UserMembership {
  id?: string;
  user_id: string;
  tier: MembershipTier;
  plan_id: string | null;
  subscription_id: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipState {
  currentTier: MembershipTier;
  membership: UserMembership | null;
  availablePlans: MembershipPlan[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMembership: () => Promise<void>;
  loadAvailablePlans: () => Promise<void>;
  purchaseSubscription: (planId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  hasFeature: (feature: keyof MembershipFeatures) => boolean;
  clearError: () => void;

  // Alias for currentTier for backward compatibility
  readonly membershipTier: MembershipTier;
}

// Default feature sets
export const FREE_FEATURES: MembershipFeatures = {
  adFree: false,
  longerVideos: false,
  higherQuality: false,
  unlimitedSaves: false,
  advancedFilters: false,
  priorityProcessing: false,
  customThemes: false,
  earlyAccess: false,
};

export const PLUS_FEATURES: MembershipFeatures = {
  adFree: true,
  longerVideos: true,
  higherQuality: true,
  unlimitedSaves: true,
  advancedFilters: true,
  priorityProcessing: true,
  customThemes: true,
  earlyAccess: true,
};

// Default plans
export const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "supasecret_plus_monthly",
    tier: "plus",
    name: "SupaSecret Plus",
    description: "Unlock all premium features",
    price: 499, // $4.99
    currency: "USD",
    interval: "month",
    features: PLUS_FEATURES,
  },
  {
    id: "supasecret_plus_yearly",
    tier: "plus",
    name: "SupaSecret Plus (Annual)",
    description: "Save 50% with annual billing",
    price: 2999, // $29.99 (vs $59.88 monthly)
    currency: "USD",
    interval: "year",
    features: PLUS_FEATURES,
    popular: true,
  },
];
