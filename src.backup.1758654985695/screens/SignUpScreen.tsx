import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { usePreferenceAwareHaptics } from "../utils/haptics";

import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import { AlertModal } from "../components/AnimatedModal";
import { getPrivacyPolicyUrlSync, getTermsOfServiceUrlSync } from "../constants/urls";
import { AuthStackParamList, RootStackParamList } from "../navigation/AppNavigator";
import { CompositeNavigationProp } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { validateEmail, validatePassword, getPasswordStrength } from "../utils/auth";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AuthStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Type-safe navigation helper
const navigateToWebView = (navigation: NavigationProp, url: string, title: string) => {
  // Try to navigate to parent first, then fallback to current navigator
  const parentNav = navigation.getParent();
  if (parentNav) {
    parentNav.navigate("WebView", { url, title });
  } else {
    // Fallback - this might not work depending on navigator structure
    (navigation as any).navigate("WebView", { url, title });
  }
};

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signUp, isLoading, clearError } = useAuthStore();
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();

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

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const showMessage = (message: string, type: "success" | "error") => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

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
      void notificationAsync();
      return;
    }

    if (!agreedToTerms) {
      showMessage("Please agree to the Terms of Service and Privacy Policy", "error");
      return;
    }

    try {
      await signUp(formData);
      void notificationAsync();
      // Navigation will be handled automatically by auth state change
    } catch (error) {
      void notificationAsync();
      if (error instanceof Error) {
        showMessage(error.message, "error");
      }
    }
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
    void impactAsync();
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScreenKeyboardWrapper className="flex-1" scrollable={true}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-900"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white text-18 font-semibold">Create Account</Text>
          <View className="w-10" />
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-8">
          {/* Welcome Text */}
          <View className="mb-8">
            <Text className="text-white text-28 font-bold mb-2">Join Toxic Confessions</Text>
            <Text className="text-gray-400 text-16 leading-6">
              Create your account to start sharing anonymously and connect with others safely.
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4 mb-6">
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
                <View className="mt-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-400 text-13">Password Strength</Text>
                    <Text className="text-13 font-medium" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                  <View className="flex-row space-x-1">
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        className="flex-1 h-2 rounded-full"
                        style={{
                          backgroundColor: level <= passwordStrength.strength ? passwordStrength.color : "#374151",
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
          <Pressable className="flex-row items-start mb-6" onPress={() => setAgreedToTerms(!agreedToTerms)}>
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 mt-0.5 ${
                agreedToTerms ? "bg-blue-500 border-blue-500" : "border-gray-600"
              }`}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-14 leading-5">
                I agree to the{" "}
                <Text
                  className="text-blue-400 underline"
                  onPress={() => navigateToWebView(navigation, getTermsOfServiceUrlSync(), "Terms of Service")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  className="text-blue-400 underline"
                  onPress={() => navigateToWebView(navigation, getPrivacyPolicyUrlSync(), "Privacy Policy")}
                >
                  Privacy Policy
                </Text>
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
          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-gray-400 text-15">Already have an account? </Text>
            <Pressable onPress={handleSignIn}>
              <Text className="text-blue-400 text-15 font-semibold">Sign In</Text>
            </Pressable>
          </View>

          {/* Privacy Notice */}
          <View className="mt-8 p-4 bg-gray-900 rounded-2xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text className="text-green-400 text-14 font-medium ml-2">Your Privacy is Protected</Text>
            </View>
            <Text className="text-gray-400 text-13 leading-4">
              Your account is only used for app access. All confessions remain completely anonymous and are never linked
              to your profile.
            </Text>
          </View>
        </View>
        {/* Animated Modal */}
        <AlertModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title={modalType === "success" ? "Success!" : "Error"}
          message={modalMessage}
          confirmText="OK"
        />
      </ScreenKeyboardWrapper>
    </SafeAreaView>
  );
}
