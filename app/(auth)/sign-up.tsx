import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/features/auth";
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  AuthError,
} from "@/src/features/auth";
import AuthInput from "@/src/features/auth/components/AuthInput";
import AuthButton from "@/src/features/auth/components/AuthButton";

export default function SignUpScreen() {
  const { signUp, isLoading, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateForm = () => {
    const errors = {
      email: "",
      password: "",
      confirmPassword: "",
    };

    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0];
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return !Object.values(errors).some((error) => error !== "");
  };

  const handleSignUp = async () => {
    clearError();

    if (!validateForm()) {
      return;
    }

    if (!agreedToTerms) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    try {
      await signUp(formData);
      // Navigation will be handled automatically by protected routes
    } catch (error) {
      if (error instanceof AuthError) {
        Alert.alert("Sign Up Error", error.message);
      } else if (error instanceof Error) {
        Alert.alert("Sign Up Error", error.message);
      }
    }
  };

  const handleSignIn = () => {
    router.push("/(auth)/sign-in");
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingVertical: 16,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: "#1F2937",
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}>
              Create Account
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 32 }}>
            {/* Welcome Text */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
                Join Toxic Confessions
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 24 }}>
                Create your account to start sharing anonymously and connect with others safely.
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 24 }}>
              <AuthInput
                label="Email Address"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (formErrors.email) {
                    setFormErrors({ ...formErrors, email: "" });
                  }
                }}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon="mail"
                error={formErrors.email}
              />

              <AuthInput
                label="Username (Optional)"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="Choose a username"
                autoComplete="username"
                leftIcon="person"
              />

              <View>
                <AuthInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: "" });
                    }
                  }}
                  placeholder="Create a strong password"
                  secureTextEntry
                  autoComplete="password"
                  leftIcon="lock-closed"
                  error={formErrors.password}
                />

                {/* Password Strength Indicator */}
                {formData.password.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Password Strength</Text>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {[1, 2, 3].map((level) => (
                        <View
                          key={level}
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor:
                              level <= passwordStrength.strength ? passwordStrength.color : "#374151",
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <AuthInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, confirmPassword: text });
                  if (formErrors.confirmPassword) {
                    setFormErrors({ ...formErrors, confirmPassword: "" });
                  }
                }}
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="password"
                leftIcon="lock-closed"
                error={formErrors.confirmPassword}
              />
            </View>

            {/* Terms Agreement */}
            <Pressable
              style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 24 }}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: agreedToTerms ? "#3B82F6" : "#4B5563",
                  backgroundColor: agreedToTerms ? "#3B82F6" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  marginTop: 2,
                }}
              >
                {agreedToTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 20 }}>
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </View>
            </Pressable>

            {/* Sign Up Button */}
            <AuthButton
              title="Create Account"
              onPress={handleSignUp}
              loading={isLoading}
              disabled={isLoading}
              leftIcon="person-add"
            />

            {/* Sign In Link */}
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

            {/* Privacy Notice */}
            <View
              style={{
                marginTop: 32,
                padding: 16,
                backgroundColor: "#1F2937",
                borderRadius: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={{ color: "#10B981", fontSize: 14, fontWeight: "500", marginLeft: 8 }}>
                  Your Privacy is Protected
                </Text>
              </View>
              <Text style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 18 }}>
                Your account is only used for app access. All confessions remain completely anonymous
                and are never linked to your profile.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
