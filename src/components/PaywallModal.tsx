import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { RevenueCatService } from "../services/RevenueCatService";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Benefit {
  icon: IoniconsName;
  text: string;
}

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, onPurchaseSuccess }) => {
  const { isLoading, error, purchaseSubscription, restorePurchases, clearError } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  const mockOfferings = RevenueCatService.getMockOfferings();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handlePurchase = async () => {
    try {
      const success = await purchaseSubscription(selectedPlan);
      if (success) {
        onPurchaseSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Purchase failed:", error);
    }
  };

  const handleRestore = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        onPurchaseSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Restore failed:", error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: "#1F2937",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingBottom: 40,
            paddingHorizontal: 24,
            maxHeight: "80%",
          }}
        >
          {/* Header */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}
          >
            <View>
              <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "bold" }}>Go Premium</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                🎯 Demo Mode - Real purchases in dev build
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Benefits */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: "#F3F4F6", fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
                Premium Features
              </Text>

              {(
                [
                  { icon: "ban-outline" as IoniconsName, text: "No ads" },
                  { icon: "videocam-outline" as IoniconsName, text: "Unlimited video recordings" },
                  { icon: "musical-notes-outline" as IoniconsName, text: "Advanced voice effects" },
                  { icon: "headset-outline" as IoniconsName, text: "Priority support" },
                ] as Benefit[]
              ).map((benefit, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <View
                    style={{
                      backgroundColor: "#10B981",
                      borderRadius: 12,
                      padding: 8,
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={benefit.icon || "checkmark-outline"} size={16} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: "#F3F4F6", fontSize: 16 }}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            {/* Pricing Plans */}
            <View style={{ marginBottom: 24 }}>
              {mockOfferings.map((offering) => (
                <Pressable
                  key={offering.id}
                  onPress={() => setSelectedPlan(offering.id as "monthly" | "annual")}
                  style={{
                    backgroundColor: selectedPlan === offering.id ? "#1D4ED8" : "#374151",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 2,
                    borderColor: selectedPlan === offering.id ? "#3B82F6" : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}>{offering.name}</Text>
                        {offering.isPopular && (
                          <View
                            style={{
                              backgroundColor: "#F59E0B",
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              marginLeft: 8,
                            }}
                          >
                            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600" }}>POPULAR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: "#9CA3AF", fontSize: 16 }}>{offering.price}</Text>
                      {offering.id === "annual" && (
                        <Text style={{ color: "#10B981", fontSize: 12, marginTop: 2 }}>Save 33%</Text>
                      )}
                    </View>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selectedPlan === offering.id ? "#3B82F6" : "#6B7280",
                        backgroundColor: selectedPlan === offering.id ? "#3B82F6" : "transparent",
                      }}
                    >
                      {selectedPlan === offering.id && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#FFFFFF",
                            alignSelf: "center",
                            marginTop: 4,
                          }}
                        />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Error Message */}
            {error && (
              <View
                style={{
                  backgroundColor: "#DC2626",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, textAlign: "center" }}>{error}</Text>
              </View>
            )}

            {/* Purchase Button */}
            <Pressable
              onPress={handlePurchase}
              disabled={isLoading}
              style={{
                backgroundColor: "#10B981",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600", textAlign: "center" }}>
                  Start Premium
                </Text>
              )}
            </Pressable>

            {/* Restore Button */}
            <Pressable onPress={handleRestore} disabled={isLoading} style={{ padding: 12 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center" }}>Restore Purchases</Text>
            </Pressable>

            {/* Terms */}
            <Text
              style={{
                color: "#6B7280",
                fontSize: 12,
                textAlign: "center",
                lineHeight: 16,
                marginTop: 16,
              }}
            >
              Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the
              current period.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
