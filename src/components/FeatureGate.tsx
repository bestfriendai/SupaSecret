import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMembershipStore } from "../state/membershipStore";
import type { MembershipFeatures } from "../types/membership";

interface FeatureGateProps {
  feature: keyof MembershipFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradePress?: () => void;
  showUpgradePrompt?: boolean;
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  onUpgradePress,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { hasFeature } = useMembershipStore();
  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <View className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center mr-3">
          <Ionicons name="star" size={16} color="#FFFFFF" />
        </View>
        <Text className="text-white text-16 font-semibold">Premium Feature</Text>
      </View>

      <Text className="text-gray-400 text-14 mb-4">{getFeatureDescription(feature)}</Text>

      {onUpgradePress && (
        <Pressable onPress={onUpgradePress} className="bg-blue-600 rounded-lg py-3 px-4">
          <Text className="text-white text-14 font-semibold text-center">Upgrade to Plus</Text>
        </Pressable>
      )}
    </View>
  );
}

function getFeatureDescription(feature: keyof MembershipFeatures): string {
  switch (feature) {
    case "adFree":
      return "Enjoy Toxic Confessions without any ads for a cleaner experience.";
    case "longerVideos":
      return "Upload videos up to 5 minutes long instead of the 1-minute limit.";
    case "higherQuality":
      return "Upload and view videos in 4K quality for crystal clear confessions.";
    case "unlimitedSaves":
      return "Save unlimited secrets instead of the 50-item limit.";
    case "advancedFilters":
      return "Filter your secrets by date range, content type, and more.";
    case "priorityProcessing":
      return "Your videos get processed faster with priority queue access.";
    case "customThemes":
      return "Personalize your app with custom themes and app icons.";
    case "earlyAccess":
      return "Get early access to new features before they're released to everyone.";
    default:
      return "This feature requires Toxic Confessions Plus membership.";
  }
}

// Convenience components for common feature gates
export const AdFreeGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="adFree" {...props} />
);

export const LongerVideosGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="longerVideos" {...props} />
);

export const HigherQualityGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="higherQuality" {...props} />
);

export const UnlimitedSavesGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="unlimitedSaves" {...props} />
);

export const AdvancedFiltersGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="advancedFilters" {...props} />
);

export const CustomThemesGate: React.FC<Omit<FeatureGateProps, "feature">> = (props) => (
  <FeatureGate feature="customThemes" {...props} />
);

// Hook for checking features in components
export const useFeatureAccess = () => {
  const { hasFeature, currentTier } = useMembershipStore();

  return {
    hasFeature,
    currentTier,
    isPremium: currentTier === "plus",
    isFree: currentTier === "free",
  };
};
