/**
 * Terms Acceptance Screen
 * Required for App Store Guideline 1.2 - User Generated Content
 * Users must agree to terms before posting anonymous content
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL, HELP_SUPPORT_URL } from "../constants/urls";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TERMS_ACCEPTANCE_KEY = "terms_accepted_v1";

export default function TermsAcceptanceScreen() {
  const navigation = useNavigation();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!agreedToTerms || !agreedToAge) {
      Alert.alert("Agreement Required", "Please agree to all terms to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save acceptance to local storage
      await AsyncStorage.setItem(
        TERMS_ACCEPTANCE_KEY,
        JSON.stringify({
          accepted: true,
          timestamp: new Date().toISOString(),
          version: "1.0",
        }),
      );

      // Navigate to main app
      (navigation as any).replace("Home");
    } catch (error) {
      console.error("Failed to save terms acceptance:", error);
      Alert.alert("Error", "Failed to save your acceptance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLink = async (url: string, title: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Unable to Open", `Cannot open ${title}. Please try again later.`);
      }
    } catch (error) {
      console.error(`Failed to open ${title}:`, error);
      Alert.alert("Error", `Failed to open ${title}. Please try again.`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-6">
        {/* Header */}
        <View className="py-8">
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-4">
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-white text-28 font-bold text-center">Community Guidelines</Text>
            <Text className="text-gray-400 text-16 text-center mt-2">
              Please read and agree to our terms before continuing
            </Text>
          </View>
        </View>

        {/* Important Notice */}
        <View className="bg-red-900 bg-opacity-20 border border-red-500 rounded-2xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="warning" size={24} color="#EF4444" />
            <View className="flex-1 ml-3">
              <Text className="text-red-400 text-16 font-semibold mb-2">Zero Tolerance Policy</Text>
              <Text className="text-red-300 text-14 leading-5">
                We have a strict zero-tolerance policy for objectionable content and abusive behavior. Violations will
                result in immediate account suspension and content removal.
              </Text>
            </View>
          </View>
        </View>

        {/* Community Rules */}
        <View className="mb-6">
          <Text className="text-white text-20 font-bold mb-4">Community Rules</Text>

          <View className="space-y-4">
            <RuleItem
              icon="ban"
              title="No Hate Speech or Harassment"
              description="Content promoting hate, violence, or harassment against individuals or groups is strictly prohibited."
            />
            <RuleItem
              icon="alert-circle"
              title="No Inappropriate Content"
              description="Sexual content, graphic violence, or content harmful to minors is not allowed."
            />
            <RuleItem
              icon="chatbubble-ellipses"
              title="No Spam or Misinformation"
              description="Spam, scams, and deliberately false information are prohibited."
            />
            <RuleItem
              icon="shield"
              title="Respect Privacy"
              description="Do not share personal information about others without consent."
            />
          </View>
        </View>

        {/* Moderation Tools */}
        <View className="mb-6">
          <Text className="text-white text-20 font-bold mb-4">Your Safety Tools</Text>

          <View className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <SafetyFeature icon="flag" text="Report inappropriate content" />
            <SafetyFeature icon="eye-off" text="Block users you don't want to see" />
            <SafetyFeature icon="trash" text="Immediately remove posts from your feed" />
            <SafetyFeature icon="mail" text="Contact support for urgent issues" />
          </View>
        </View>

        {/* Contact Information */}
        <View className="mb-6">
          <Text className="text-white text-20 font-bold mb-4">Need Help?</Text>
          <Pressable
            onPress={() => openLink(HELP_SUPPORT_URL, "Help & Support")}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="help-circle" size={24} color="#3B82F6" />
              <Text className="text-white text-16 ml-3">Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8B98A5" />
          </Pressable>
        </View>

        {/* Agreement Checkboxes */}
        <View className="mb-6">
          <Pressable onPress={() => setAgreedToAge(!agreedToAge)} className="flex-row items-start mb-4">
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 mt-0.5 ${
                agreedToAge ? "bg-blue-500 border-blue-500" : "border-gray-600"
              }`}
            >
              {agreedToAge && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text className="text-gray-300 text-15 flex-1 leading-6">I confirm that I am 18 years or older</Text>
          </Pressable>

          <Pressable onPress={() => setAgreedToTerms(!agreedToTerms)} className="flex-row items-start">
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 mt-0.5 ${
                agreedToTerms ? "bg-blue-500 border-blue-500" : "border-gray-600"
              }`}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <View className="flex-1">
              <Text className="text-gray-300 text-15 leading-6">
                I agree to the{" "}
                <Text
                  className="text-blue-400 underline"
                  onPress={() => openLink(TERMS_OF_SERVICE_URL, "Terms of Service")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  className="text-blue-400 underline"
                  onPress={() => openLink(PRIVACY_POLICY_URL, "Privacy Policy")}
                >
                  Privacy Policy
                </Text>
                , and understand that objectionable content and abusive behavior will result in immediate account
                suspension
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Accept Button */}
        <Pressable
          onPress={handleAccept}
          disabled={!agreedToTerms || !agreedToAge || isSubmitting}
          className={`rounded-2xl py-4 items-center mb-8 ${
            agreedToTerms && agreedToAge && !isSubmitting ? "bg-blue-500" : "bg-gray-800"
          }`}
        >
          <Text
            className={`text-17 font-semibold ${
              agreedToTerms && agreedToAge && !isSubmitting ? "text-white" : "text-gray-500"
            }`}
          >
            {isSubmitting ? "Processing..." : "Accept and Continue"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RuleItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View className="flex-row items-start">
      <View className="w-10 h-10 bg-red-500 bg-opacity-20 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon as any} size={20} color="#EF4444" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-16 font-semibold mb-1">{title}</Text>
        <Text className="text-gray-400 text-14 leading-5">{description}</Text>
      </View>
    </View>
  );
}

function SafetyFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon as any} size={20} color="#10B981" />
      <Text className="text-gray-300 text-15 ml-3">{text}</Text>
    </View>
  );
}

// Export helper function to check if terms are accepted
export async function checkTermsAcceptance(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TERMS_ACCEPTANCE_KEY);
    if (!value) return false;

    const data = JSON.parse(value);
    return data.accepted === true;
  } catch (error) {
    console.error("Failed to check terms acceptance:", error);
    return false;
  }
}
