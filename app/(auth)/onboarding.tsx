import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AuthButton from "@/src/features/auth/components/AuthButton";

export default function OnboardingScreen() {
  const handleGetStarted = () => {
    router.push("/(auth)/sign-up");
  };

  const handleSignIn = () => {
    router.push("/(auth)/sign-in");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 32 }}>
        {/* Logo/Icon */}
        <View style={{ alignItems: "center", marginTop: 60, marginBottom: 40 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#3B82F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="eye-off" size={50} color="#FFFFFF" />
          </View>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 60 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 32,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Toxic Confessions
          </Text>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Share your secrets anonymously in a safe space. Your confessions are never linked to your
            identity.
          </Text>
        </View>

        {/* Features */}
        <View style={{ marginBottom: 60 }}>
          {[
            { icon: "shield-checkmark", title: "100% Anonymous", description: "Your identity is never revealed" },
            { icon: "lock-closed", title: "Secure & Private", description: "End-to-end encryption for all data" },
            { icon: "people", title: "Community Support", description: "Connect with others who understand" },
          ].map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#1F2937",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Ionicons name={feature.icon as any} size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
                  {feature.title}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={{ marginTop: "auto" }}>
          <AuthButton title="Get Started" onPress={handleGetStarted} leftIcon="rocket" />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            <Text style={{ color: "#9CA3AF", fontSize: 15 }}>Already have an account? </Text>
            <Pressable onPress={handleSignIn}>
              <Text style={{ color: "#3B82F6", fontSize: 15, fontWeight: "600" }}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
