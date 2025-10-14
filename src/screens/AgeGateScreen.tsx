/**
 * Age Gate Screen
 * MANDATORY 18+ age verification for App Store compliance
 * Required for App Store Guideline 4.0 - Design (Age Ratings)
 *
 * This screen MUST be shown on first app launch and cannot be bypassed.
 * Users must confirm they are 18+ to access the app.
 */

import React, { useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const AGE_VERIFICATION_KEY = "age_verified_v1";

interface AgeGateScreenProps {
  onVerified: () => void;
}

export default function AgeGateScreen({ onVerified }: AgeGateScreenProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation values
  const checkboxScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleCheckboxPress = () => {
    checkboxScale.value = withSequence(withSpring(0.8, { damping: 10 }), withSpring(1, { damping: 10 }));
    setIsConfirmed(!isConfirmed);
  };

  const handleContinue = async () => {
    if (!isConfirmed) {
      Alert.alert("Age Verification Required", "You must confirm that you are 18 years or older to use this app.", [
        { text: "OK" },
      ]);
      return;
    }

    setIsProcessing(true);
    buttonScale.value = withSpring(0.95);

    try {
      // Save age verification to AsyncStorage
      await AsyncStorage.setItem(
        AGE_VERIFICATION_KEY,
        JSON.stringify({
          verified: true,
          timestamp: new Date().toISOString(),
          version: "1.0",
        }),
      );

      // Small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      buttonScale.value = withSpring(1);
      onVerified();
    } catch (error) {
      console.error("Failed to save age verification:", error);
      Alert.alert("Error", "Failed to save your verification. Please try again.", [
        { text: "OK", onPress: () => setIsProcessing(false) },
      ]);
      buttonScale.value = withSpring(1);
    }
  };

  const handleExit = () => {
    Alert.alert(
      "Age Requirement",
      "This app is only available for users 18 years and older. You must confirm your age to continue.",
      [{ text: "OK" }],
    );
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#000000", "#1a0a0a", "#000000"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Icon */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-red-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="warning" size={48} color="#FFFFFF" />
            </View>

            <Text className="text-white text-32 font-bold text-center mb-3">Age Verification Required</Text>

            <Text className="text-gray-400 text-17 text-center leading-6">
              This app contains mature content and is only available for users 18 years and older
            </Text>
          </View>

          {/* Content Warning Box */}
          <View className="bg-red-900 bg-opacity-20 border-2 border-red-500 rounded-3xl p-6 mb-8">
            <View className="flex-row items-start mb-4">
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <View className="flex-1 ml-3">
                <Text className="text-red-400 text-18 font-bold mb-2">Mature Content Warning</Text>
                <Text className="text-red-300 text-15 leading-6">
                  This app allows users to share anonymous confessions which may contain:
                </Text>
              </View>
            </View>

            <View className="space-y-3 ml-1">
              <ContentWarningItem text="Mature themes and language" />
              <ContentWarningItem text="User-generated content" />
              <ContentWarningItem text="Sensitive topics and discussions" />
              <ContentWarningItem text="Anonymous video and text posts" />
            </View>
          </View>

          {/* Age Confirmation Checkbox */}
          <Pressable onPress={handleCheckboxPress} className="flex-row items-start mb-8" disabled={isProcessing}>
            <Animated.View
              style={[checkboxAnimatedStyle]}
              className={`w-8 h-8 rounded-lg border-2 items-center justify-center mr-4 mt-1 ${
                isConfirmed ? "bg-blue-500 border-blue-500" : "border-gray-600"
              }`}
            >
              {isConfirmed && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            </Animated.View>

            <View className="flex-1">
              <Text className="text-white text-18 font-semibold leading-7">
                I confirm that I am 18 years of age or older
              </Text>
              <Text className="text-gray-400 text-14 mt-2 leading-5">
                By checking this box, you certify that you meet the minimum age requirement to use this application
              </Text>
            </View>
          </Pressable>

          {/* Continue Button */}
          <Animated.View style={[buttonAnimatedStyle]}>
            <Pressable
              onPress={handleContinue}
              disabled={!isConfirmed || isProcessing}
              className={`rounded-2xl py-5 items-center mb-4 ${
                isConfirmed && !isProcessing ? "bg-blue-500" : "bg-gray-800"
              }`}
            >
              <Text className={`text-18 font-bold ${isConfirmed && !isProcessing ? "text-white" : "text-gray-500"}`}>
                {isProcessing ? "Verifying..." : "Continue"}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Exit Button */}
          <Pressable onPress={handleExit} disabled={isProcessing} className="py-4 items-center">
            <Text className="text-gray-400 text-16">I am under 18</Text>
          </Pressable>

          {/* Legal Notice */}
          <View className="mt-8 mb-4">
            <Text className="text-gray-500 text-13 text-center leading-5">
              By continuing, you acknowledge that you are of legal age to view mature content in your jurisdiction and
              agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ContentWarningItem({ text }: { text: string }) {
  return (
    <View className="flex-row items-center">
      <View className="w-2 h-2 bg-red-400 rounded-full mr-3" />
      <Text className="text-red-200 text-15 flex-1">{text}</Text>
    </View>
  );
}

/**
 * Check if user has completed age verification
 * Returns true if verified, false otherwise
 */
export async function checkAgeVerification(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(AGE_VERIFICATION_KEY);
    if (!value) return false;

    const data = JSON.parse(value);
    return data.verified === true;
  } catch (error) {
    console.error("Failed to check age verification:", error);
    return false;
  }
}

/**
 * Clear age verification (for testing purposes only)
 * DO NOT expose this in production UI
 */
export async function clearAgeVerification(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AGE_VERIFICATION_KEY);
  } catch (error) {
    console.error("Failed to clear age verification:", error);
  }
}
