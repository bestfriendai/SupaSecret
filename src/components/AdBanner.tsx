import React, { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useFeatureAccess } from "./FeatureGate";
import { calculateAdFrequency } from "../utils/adFrequency";

interface AdBannerProps {
  placement: "home-feed" | "video-feed" | "trending";
  index?: number;
}

export default function AdBanner({ placement, index = 0 }: AdBannerProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { hasFeature } = useFeatureAccess();
  const [isVisible, setIsVisible] = useState(false);

  // Don't show ads for premium users
  const shouldShowAd = !hasFeature("adFree");

  useEffect(() => {
    if (!shouldShowAd) return;

    // Use shared utility for ad frequency calculation
    const freq = calculateAdFrequency(placement);
    const shouldShow = freq > 0 && index > 0 && index % freq === 0;

    setIsVisible(shouldShow);
  }, [shouldShowAd, placement, index]);

  const handleUpgradePress = () => {
    navigation.navigate("Paywall", {
      feature: "adFree",
      source: `ad-banner-${placement}`,
    });
  };

  if (!isVisible || !shouldShowAd) {
    return null;
  }

  return (
    <View className="bg-gray-900 rounded-lg mx-4 mb-3 p-4 border border-gray-800">
      {/* Ad Label */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-500 text-11 font-medium">SPONSORED</Text>
        <Pressable onPress={() => setIsVisible(false)}>
          <Ionicons name="close" size={16} color="#8B98A5" />
        </Pressable>
      </View>

      {/* Mock Ad Content */}
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-blue-600 rounded-lg items-center justify-center mr-3">
          <Ionicons name="star" size={20} color="#FFFFFF" />
        </View>

        <View className="flex-1">
          <Text className="text-white text-15 font-semibold mb-1">Tired of ads?</Text>
          <Text className="text-gray-400 text-13 mb-2">Upgrade to Toxic Confessions Plus for an ad-free experience</Text>

          <Pressable onPress={handleUpgradePress} className="bg-blue-600 rounded-lg py-2 px-4 self-start">
            <Text className="text-white text-12 font-medium">Learn More</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Hook for managing ad frequency and placement
export const useAdPlacement = () => {
  const { hasFeature } = useFeatureAccess();

  const shouldShowAd = (index: number, placement: string) => {
    // Use shared utility for ad frequency calculation
    const freq = calculateAdFrequency(placement);
    return !hasFeature("adFree") && freq > 0 && index > 0 && index % freq === 0;
  };

  return {
    shouldShowAd,
    isAdFree: hasFeature("adFree"),
  };
};
