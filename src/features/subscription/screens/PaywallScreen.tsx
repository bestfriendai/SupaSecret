/**
 * Paywall Screen Component
 * Full-screen paywall for subscription purchases
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../hooks/useSubscription";
import type { RevenueCatPackage } from "../types";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "../../../constants/urls";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Feature {
  icon: IoniconsName;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: "remove-circle" as IoniconsName,
    title: "Ad-Free Experience",
    description: "No interruptions while browsing",
  },
  {
    icon: "videocam" as IoniconsName,
    title: "Longer Videos",
    description: "Upload videos up to 5 minutes",
  },
  {
    icon: "diamond" as IoniconsName,
    title: "4K Quality",
    description: "Crystal clear video uploads",
  },
  {
    icon: "bookmark" as IoniconsName,
    title: "Unlimited Saves",
    description: "Save as many secrets as you want",
  },
  {
    icon: "filter" as IoniconsName,
    title: "Advanced Filters",
    description: "Filter by date, type, and more",
  },
  {
    icon: "flash" as IoniconsName,
    title: "Priority Processing",
    description: "Faster video processing",
  },
  {
    icon: "color-palette" as IoniconsName,
    title: "Custom Themes",
    description: "Personalize your app",
  },
  {
    icon: "rocket" as IoniconsName,
    title: "Early Access",
    description: "New features first",
  },
];

export function PaywallScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isLoading, error, purchaseSubscription, restorePurchases, clearError, getOfferings } = useSubscription();

  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RevenueCatPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, clearError]);

  const loadOfferings = async () => {
    setLoadingOfferings(true);
    try {
      console.log("📦 Loading RevenueCat offerings...");
      const offerings = await getOfferings();

      if (!offerings) {
        console.warn("⚠️ No offerings returned (likely Expo Go or demo mode)");
        // Don't show alerts - just log and return empty state
        return;
      }

      if (offerings?.current) {
        const availablePackages = offerings.current.availablePackages || [];
        console.log(`📦 Found ${availablePackages.length} packages`);

        if (availablePackages.length === 0) {
          console.warn("⚠️ No subscription packages available");
          // Don't show alert - the UI will display a message
        } else {
          console.log("✅ Packages loaded successfully:", availablePackages.map(p => p.identifier));
          setPackages(availablePackages);

          // Auto-select annual (most popular) or first package
          const annualPackage = availablePackages.find(
            (pkg) => pkg.packageType === "ANNUAL" || pkg.identifier.includes("annual"),
          );
          setSelectedPackage(annualPackage || availablePackages[0] || null);
        }
      } else {
        console.warn("⚠️ No current offering available");
        // Don't show alert - the UI will display a message
      }
    } catch (error) {
      console.error("❌ Failed to load offerings:", error);
      // Don't show alert - let the UI handle the error state gracefully
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      // Error will be displayed in the UI via error state
      return;
    }

    try {
      const success = await purchaseSubscription(selectedPackage);

      if (success) {
        // Navigate back immediately on success - don't show alert during review
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          (navigation as any).navigate("Home");
        }
      }
      // Errors are handled by the store and displayed in the UI
    } catch (err) {
      console.error("Purchase error:", err);
      // Error will be displayed in the UI via error state
    }
  }, [selectedPackage, purchaseSubscription, navigation]);

  const handleRestore = useCallback(async () => {
    try {
      await restorePurchases();
      // Success or error will be displayed in the UI via error state
      // Don't show alerts during review
    } catch (err) {
      console.error("Restore failed:", err);
      // Error will be displayed in the UI via error state
    }
  }, [restorePurchases]);

  const isAnnual = (pkg: RevenueCatPackage) => pkg.packageType === "ANNUAL" || pkg.identifier.includes("annual");

  const getMonthlyEquivalent = (pkg: RevenueCatPackage) => {
    if (isAnnual(pkg)) {
      const monthlyPrice = pkg.product.price / 12;
      return `$${monthlyPrice.toFixed(2)}/month`;
    }
    return null;
  };

  const getSavingsText = (pkg: RevenueCatPackage) => {
    if (isAnnual(pkg)) {
      const monthlyPackage = packages.find((p) => p.packageType === "MONTHLY" || p.identifier.includes("monthly"));
      if (monthlyPackage) {
        const yearlyMonthly = pkg.product.price / 12;
        const savings = ((monthlyPackage.product.price - yearlyMonthly) / monthlyPackage.product.price) * 100;
        return `Save ${Math.round(savings)}%`;
      }
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
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
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                (navigation as any).navigate("Home");
              }
            }}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", marginBottom: 24 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
            Unlock Premium
          </Text>
          <Text style={{ color: "#9CA3AF", fontSize: 16, textAlign: "center" }}>
            Get the most out of your anonymous confessions
          </Text>
        </View>

        {/* Features */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#3B82F6",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Ionicons name={feature.icon} size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>{feature.title}</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Plans */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 24 }}>
            Choose Your Plan
          </Text>

          {loadingOfferings ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: "#9CA3AF", marginTop: 12 }}>Loading plans...</Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center", paddingHorizontal: 20 }}>
              <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
              <Text style={{ color: "#FFFFFF", marginTop: 16, textAlign: "center", fontSize: 16, fontWeight: "600" }}>
                Subscription Options Unavailable
              </Text>
              <Text style={{ color: "#9CA3AF", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                We're having trouble loading subscription options at the moment. This may be temporary.
                {"\n\n"}
                Please check your internet connection and try again, or contact support if the issue persists.
              </Text>
              <Pressable
                onPress={loadOfferings}
                style={{
                  marginTop: 20,
                  backgroundColor: "#3B82F6",
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const savings = getSavingsText(pkg);
              const monthlyEquivalent = getMonthlyEquivalent(pkg);
              const annual = isAnnual(pkg);

              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => setSelectedPackage(pkg)}
                  style={{
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 2,
                    backgroundColor: isSelected ? "#1E3A8A" : "#1F2937",
                    borderColor: isSelected ? "#3B82F6" : "#374151",
                    position: "relative",
                  }}
                >
                  {annual && (
                    <View
                      style={{
                        position: "absolute",
                        top: -8,
                        left: 16,
                        backgroundColor: "#3B82F6",
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>POPULAR</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>{pkg.product.title}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>{pkg.product.description}</Text>
                      {savings && (
                        <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "500", marginTop: 4 }}>
                          {savings}
                        </Text>
                      )}
                    </View>

                    <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>
                        {pkg.product.priceString}
                      </Text>
                      {monthlyEquivalent && (
                        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>{monthlyEquivalent}</Text>
                      )}
                    </View>

                    <View style={{ marginLeft: 12 }}>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSelected ? "#3B82F6" : "#6B7280"}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: "#DC2626",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, textAlign: "center" }}>{error}</Text>
            </View>
          </View>
        )}

        {/* Purchase Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPackage || isLoading || packages.length === 0}
            style={{
              backgroundColor: !selectedPackage || isLoading || packages.length === 0 ? "#374151" : "#3B82F6",
              borderRadius: 12,
              padding: 16,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Start Free Trial
              </Text>
            )}
          </Pressable>

          <Text style={{ color: "#6B7280", fontSize: 11, textAlign: "center", marginTop: 8 }}>
            7-day free trial, then auto-renews. Cancel anytime.
          </Text>
        </View>

        {/* Restore Purchases */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Pressable onPress={handleRestore} disabled={isLoading} style={{ paddingVertical: 12 }}>
            <Text style={{ color: "#3B82F6", fontSize: 14, textAlign: "center" }}>Restore Purchases</Text>
          </Pressable>
        </View>

        {/* Terms and Privacy Policy Links - Required by App Store Guideline 3.1.2 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text
            style={{
              color: "#4B5563",
              fontSize: 11,
              textAlign: "center",
              lineHeight: 16,
            }}
          >
            By subscribing, you agree to our{" "}
            <Text
              style={{ color: "#3B82F6", textDecorationLine: "underline" }}
              onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={{ color: "#3B82F6", textDecorationLine: "underline" }}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            >
              Privacy Policy
            </Text>
            . Subscriptions auto-renew unless cancelled 24 hours before the end of the current period.
          </Text>
        </View>

        {/* Subscription Details - Required by App Store Guideline 3.1.2 */}
        {selectedPackage && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{ backgroundColor: "#1F2937", borderRadius: 12, padding: 16 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 8, fontWeight: "600" }}>
                SUBSCRIPTION DETAILS
              </Text>
              <Text style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 20 }}>
                • Title: {selectedPackage.product.title}
                {"\n"}• Duration: {selectedPackage.product.subscriptionPeriod || "Annual"}
                {"\n"}• Price: {selectedPackage.product.priceString}
                {"\n"}• Auto-renews unless cancelled
                {"\n"}• Manage in App Store settings
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
