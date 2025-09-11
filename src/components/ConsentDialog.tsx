/**
 * GDPR Consent Dialog Component
 * Displays consent options for analytics, advertising, and personalization
 */

import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useConsentStore, ConsentPreferences } from "../state/consentStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";

// Privacy Policy URL - replace with your actual privacy policy URL
const PRIVACY_POLICY_URL = "https://toxicconfessions.app/privacy";

interface ConsentDialogProps {
  visible: boolean;
  onClose: () => void;
  onAccept: (preferences: ConsentPreferences) => void;
  showSkip?: boolean;
}

const ConsentDialog: React.FC<ConsentDialogProps> = ({ visible, onClose, onAccept, showSkip = false }) => {
  const { updateConsent } = useConsentStore();
  const { impactAsync } = usePreferenceAwareHaptics();

  const [preferences, setPreferences] = useState<Partial<ConsentPreferences>>({
    analytics: false,
    advertising: false,
    personalization: false,
    essential: true,
  });

  const handleToggle = (key: keyof ConsentPreferences) => {
    if (key === "essential") return; // Cannot toggle essential

    impactAsync();
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcceptAll = async () => {
    impactAsync();
    const allConsent: ConsentPreferences = {
      analytics: true,
      advertising: true,
      personalization: true,
      essential: true,
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };

    await updateConsent(allConsent);
    onAccept(allConsent);
    onClose();
  };

  const handleAcceptSelected = async () => {
    impactAsync();
    const selectedConsent: ConsentPreferences = {
      analytics: preferences.analytics || false,
      advertising: preferences.advertising || false,
      personalization: preferences.personalization || false,
      essential: true,
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };

    await updateConsent(selectedConsent);
    onAccept(selectedConsent);
    onClose();
  };

  const handleRejectAll = async () => {
    impactAsync();
    const minimalConsent: ConsentPreferences = {
      analytics: false,
      advertising: false,
      personalization: false,
      essential: true,
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };

    await updateConsent(minimalConsent);
    onAccept(minimalConsent);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <View className="bg-gray-900 rounded-t-3xl max-h-4/5">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-800">
            <Text className="text-white text-20 font-bold">Privacy Preferences</Text>
            {showSkip && (
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Skip consent">
                <Text className="text-blue-400 text-16 font-medium">Skip</Text>
              </Pressable>
            )}
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Introduction */}
            <Text className="text-gray-300 text-16 leading-6 mb-6">
              We respect your privacy. Please choose which types of data processing you consent to. You can change these
              preferences at any time in Settings.
            </Text>

            {/* Essential Cookies */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white text-17 font-semibold">Essential</Text>
                <View className="w-12 h-6 bg-green-500 rounded-full items-center justify-center">
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              </View>
              <Text className="text-gray-400 text-14 leading-5">
                Required for the app to function properly. These cannot be disabled.
              </Text>
            </View>

            {/* Analytics */}
            <View className="mb-6">
              <Pressable
                className="flex-row items-center justify-between mb-2"
                onPress={() => handleToggle("analytics")}
                accessibilityRole="switch"
                accessibilityState={{ checked: preferences.analytics }}
              >
                <Text className="text-white text-17 font-semibold">Analytics</Text>
                <View
                  className={`w-12 h-6 rounded-full items-center justify-center ${
                    preferences.analytics ? "bg-blue-500" : "bg-gray-600"
                  }`}
                >
                  {preferences.analytics && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
              <Text className="text-gray-400 text-14 leading-5">
                Help us improve the app by sharing anonymous usage statistics.
              </Text>
            </View>

            {/* Advertising */}
            <View className="mb-6">
              <Pressable
                className="flex-row items-center justify-between mb-2"
                onPress={() => handleToggle("advertising")}
                accessibilityRole="switch"
                accessibilityState={{ checked: preferences.advertising }}
              >
                <Text className="text-white text-17 font-semibold">Advertising</Text>
                <View
                  className={`w-12 h-6 rounded-full items-center justify-center ${
                    preferences.advertising ? "bg-blue-500" : "bg-gray-600"
                  }`}
                >
                  {preferences.advertising && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
              <Text className="text-gray-400 text-14 leading-5">
                Show personalized ads based on your interests and app usage.
              </Text>
            </View>

            {/* Personalization */}
            <View className="mb-6">
              <Pressable
                className="flex-row items-center justify-between mb-2"
                onPress={() => handleToggle("personalization")}
                accessibilityRole="switch"
                accessibilityState={{ checked: preferences.personalization }}
              >
                <Text className="text-white text-17 font-semibold">Personalization</Text>
                <View
                  className={`w-12 h-6 rounded-full items-center justify-center ${
                    preferences.personalization ? "bg-blue-500" : "bg-gray-600"
                  }`}
                >
                  {preferences.personalization && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
              <Text className="text-gray-400 text-14 leading-5">
                Customize your experience with personalized content and recommendations.
              </Text>
            </View>

            {/* Privacy Policy Link */}
            <Pressable
              className="mb-6"
              onPress={async () => {
                try {
                  const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
                  if (canOpen) {
                    await Linking.openURL(PRIVACY_POLICY_URL);
                  } else {
                    Alert.alert("Unable to Open Link", "Please visit our website to view the privacy policy.", [
                      { text: "OK" },
                    ]);
                  }
                } catch (error) {
                  console.error("Failed to open privacy policy URL:", error);
                  Alert.alert("Error", "Unable to open privacy policy. Please try again later.", [{ text: "OK" }]);
                }
              }}
              role="button"
              accessibilityLabel="Read our Privacy Policy for more details"
            >
              <Text className="text-blue-400 text-14 underline">Read our Privacy Policy for more details</Text>
            </Pressable>
          </ScrollView>

          {/* Action Buttons */}
          <View className="p-6 border-t border-gray-800">
            <Pressable
              className="bg-blue-500 py-4 rounded-xl mb-3"
              onPress={handleAcceptAll}
              accessibilityRole="button"
              accessibilityLabel="Accept all preferences"
            >
              <Text className="text-white text-16 font-semibold text-center">Accept All</Text>
            </Pressable>

            <Pressable
              className="bg-gray-700 py-4 rounded-xl mb-3"
              onPress={handleAcceptSelected}
              accessibilityRole="button"
              accessibilityLabel="Accept selected preferences"
            >
              <Text className="text-white text-16 font-semibold text-center">Accept Selected</Text>
            </Pressable>

            <Pressable
              className="py-4"
              onPress={handleRejectAll}
              accessibilityRole="button"
              accessibilityLabel="Reject all optional preferences"
            >
              <Text className="text-gray-400 text-16 font-medium text-center">Reject All</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConsentDialog;
