import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMembershipStore } from "../state/membershipStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import type { MembershipPlan } from "../types/membership";

interface PaywallScreenProps {
  route?: {
    params?: {
      feature?: string;
      source?: string;
    };
  };
}

export default function PaywallScreen({ route }: PaywallScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();

  const { availablePlans, isLoading, error, loadAvailablePlans, purchaseSubscription, restorePurchases } =
    useMembershipStore();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadAvailablePlans();
  }, [loadAvailablePlans]);

  // Auto-select the popular plan when plans are loaded
  useEffect(() => {
    if (availablePlans.length > 0) {
      const popularPlan = availablePlans.find((p) => p.popular);
      if (popularPlan) {
        setSelectedPlan(popularPlan.id);
      } else {
        setSelectedPlan(availablePlans[0].id);
      }
    }
  }, [availablePlans]);

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    impactAsync();
    try {
      const success = await purchaseSubscription(selectedPlan);

      if (success) {
        Alert.alert("Welcome to Plus!", "Your subscription is now active. Enjoy all premium features!", [
          {
            text: "Continue",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Purchase Failed", error || "Unable to complete purchase. Please try again.");
      }
    } catch (err) {
      Alert.alert("Purchase Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleRestore = async () => {
    impactAsync();
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert("Restore Complete", "Your purchases have been restored successfully.");
      } else {
        Alert.alert("No Purchases Found", "No previous purchases were found to restore.");
      }
    } catch (err) {
      Alert.alert("Restore Failed", "Unable to restore purchases. Please try again.");
    }
  };

  const formatPrice = (plan: MembershipPlan) => {
    const price = (plan.price / 100).toFixed(2);
    return `$${price}/${plan.interval}`;
  };

  const getSavingsText = (plan: MembershipPlan) => {
    if (plan.interval === "year") {
      const monthlyEquivalent = availablePlans.find((p) => p.interval === "month");
      if (monthlyEquivalent) {
        const yearlyMonthly = plan.price / 12;
        const savings = ((monthlyEquivalent.price - yearlyMonthly) / monthlyEquivalent.price) * 100;
        return `Save ${Math.round(savings)}%`;
      }
    }
    return null;
  };

  const features = [
    { icon: "remove-circle", title: "Ad-Free Experience", description: "No interruptions while browsing" },
    { icon: "videocam", title: "Longer Videos", description: "Upload videos up to 5 minutes" },
    { icon: "diamond", title: "4K Quality", description: "Crystal clear video uploads" },
    { icon: "bookmark", title: "Unlimited Saves", description: "Save as many secrets as you want" },
    { icon: "filter", title: "Advanced Filters", description: "Filter by date, type, and more" },
    { icon: "flash", title: "Priority Processing", description: "Faster video processing" },
    { icon: "color-palette", title: "Custom Themes", description: "Personalize your app" },
    { icon: "rocket", title: "Early Access", description: "New features first" },
  ];

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} className="w-8 h-8 items-center justify-center mb-6">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <Text className="text-white text-28 font-bold text-center mb-2">Unlock SupaSecret Plus</Text>
          <Text className="text-gray-400 text-16 text-center">Get the most out of your anonymous confessions</Text>
        </View>

        {/* Features */}
        <View className="px-20 mb-8">
          {features.map((feature, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center mr-4">
                <Ionicons name={feature.icon as any} size={16} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-15 font-semibold">{feature.title}</Text>
                <Text className="text-gray-400 text-13">{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Plans */}
        <View className="px-20 mb-8">
          <Text className="text-white text-20 font-bold text-center mb-6">Choose Your Plan</Text>

          {availablePlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const savings = getSavingsText(plan);

            return (
              <Pressable
                key={plan.id}
                onPress={() => {
                  setSelectedPlan(plan.id);
                  impactAsync();
                }}
                className={`rounded-lg p-4 mb-3 border-2 ${
                  isSelected ? "bg-blue-600/20 border-blue-500" : "bg-gray-900 border-gray-700"
                } ${plan.popular ? "relative" : ""}`}
              >
                {plan.popular && (
                  <View className="absolute -top-2 left-4 bg-blue-600 px-3 py-1 rounded-full">
                    <Text className="text-white text-11 font-bold">POPULAR</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-white text-16 font-semibold">{plan.name}</Text>
                    <Text className="text-gray-400 text-13">{plan.description}</Text>
                    {savings && <Text className="text-green-400 text-12 font-medium mt-1">{savings}</Text>}
                  </View>

                  <View className="items-end">
                    <Text className="text-white text-18 font-bold">{formatPrice(plan)}</Text>
                    {plan.interval === "year" && (
                      <Text className="text-gray-500 text-11">${(plan.price / 12 / 100).toFixed(2)}/month</Text>
                    )}
                  </View>

                  <View className="ml-3">
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#3B82F6" : "#8B98A5"}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Purchase Button */}
        <View className="px-20 mb-6">
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPlan || isLoading}
            className={`rounded-lg py-4 ${!selectedPlan || isLoading ? "bg-gray-700" : "bg-blue-600"}`}
          >
            <Text className="text-white text-16 font-semibold text-center">
              {isLoading ? "Processing..." : "Start Free Trial"}
            </Text>
          </Pressable>

          <Text className="text-gray-500 text-11 text-center mt-2">
            7-day free trial, then auto-renews. Cancel anytime.
          </Text>
        </View>

        {/* Restore Purchases */}
        <View className="px-20 mb-4">
          <Pressable onPress={handleRestore} className="py-3">
            <Text className="text-blue-400 text-14 text-center">Restore Purchases</Text>
          </Pressable>
        </View>

        {/* Terms */}
        <View className="px-20">
          <Text className="text-gray-600 text-11 text-center leading-4">
            By subscribing, you agree to our Terms of Service and Privacy Policy. Subscriptions auto-renew unless
            cancelled 24 hours before the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
