import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { usePreferenceAwareHaptics } from "../utils/haptics";

import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import { useAuthStore } from "../state/authStore";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";
import { getButtonA11yProps } from "../utils/accessibility";
import { validateEmail } from "../utils/auth";

type NavigationProp = NativeStackNavigationProp<any>;

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, isLoading, clearError } = useAuthStore();
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [rememberMe, setRememberMe] = useState(false);

  const showMessage = (message: string, type: "success" | "error") => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {
      email: "",
      password: "",
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
    }

    setFormErrors(errors);
    return !Object.values(errors).some((error) => error !== "");
  };

  const handleSignIn = async () => {
    clearError();

    if (!validateForm()) {
      notificationAsync();
      return;
    }

    try {
      if (__DEV__) {
        console.log("🔍 Attempting sign in with:", formData.email);
      }
      await signIn(formData);
      notificationAsync();
      // Navigation will be handled by the auth state change
    } catch (error) {
      if (__DEV__) {
        console.log("🔍 Sign in error caught:", error);
      }
      notificationAsync();
      if (error instanceof Error) {
        if (__DEV__) {
          console.log("🔍 Showing error modal:", error.message);
        }
        showMessage(error.message, "error");
      }
    }
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
    impactAsync();
  };

  const handleForgotPassword = () => {
    showMessage("Password reset functionality will be available soon.", "error");
  };

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
              <Text className="text-white text-18 font-semibold">Sign In</Text>
              <View className="w-10" />
            </View>

            {/* Content */}
            <View className="flex-1 px-6 py-8">
              {/* Welcome Text */}
              <View className="mb-8">
                <Text className="text-white text-28 font-bold mb-2">Welcome Back</Text>
                <Text className="text-gray-400 text-16 leading-6">
                  Sign in to your account to continue sharing and connecting anonymously.
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
                  label="Password"
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: "" });
                    }
                  }}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoComplete="password"
                  leftIcon="lock-closed"
                  error={formErrors.password}
                />
              </View>

              {/* Remember Me & Forgot Password */}
              <View className="flex-row items-center justify-between mb-6">
                <Pressable className="flex-row items-center" onPress={() => setRememberMe(!rememberMe)}>
                  <View
                    className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                      rememberMe ? "bg-blue-500 border-blue-500" : "border-gray-600"
                    }`}
                  >
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text className="text-gray-400 text-14">Remember me</Text>
                </Pressable>

                <Pressable onPress={handleForgotPassword}>
                  <Text className="text-blue-400 text-14 font-medium">Forgot Password?</Text>
                </Pressable>
              </View>

              {/* Sign In Button */}
              <AuthButton
                title="Sign In"
                onPress={handleSignIn}
                loading={isLoading}
                disabled={isLoading}
                leftIcon="log-in"
              />

              {/* Divider */}
              <View className="flex-row items-center my-8">
                <View className="flex-1 h-px bg-gray-700" />
                <Text className="text-gray-500 text-14 mx-4">or</Text>
                <View className="flex-1 h-px bg-gray-700" />
              </View>

              {/* Social Sign In Placeholder */}
              <View className="space-y-3 mb-6">
                <AuthButton
                  title="Continue with Apple"
                  onPress={() => showMessage("Apple Sign In will be available soon.", "error")}
                  variant="outline"
                  leftIcon="logo-apple"
                  disabled
                />
                <AuthButton
                  title="Continue with Google"
                  onPress={() => showMessage("Google Sign In will be available soon.", "error")}
                  variant="outline"
                  leftIcon="logo-google"
                  disabled
                />
              </View>

              {/* Sign Up Link */}
              <View className="flex-row items-center justify-center">
                <Text className="text-gray-400 text-15">Don't have an account? </Text>
                <Pressable
                  onPress={handleSignUp}
                  {...getButtonA11yProps(
                    'Sign Up',
                    'Double tap to go to sign up screen'
                  )}
                >
                  <Text className="text-blue-400 text-15 font-semibold">Sign Up</Text>
                </Pressable>
              </View>

              {/* Privacy Notice */}
              <View className="mt-8 p-4 bg-gray-900 rounded-2xl">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text className="text-green-400 text-14 font-medium ml-2">Secure Sign In</Text>
                </View>
                <Text className="text-gray-400 text-13 leading-4">
                  Your login credentials are encrypted and secure. We never store your password in plain text.
                </Text>
              </View>
            </View>
          </ScreenKeyboardWrapper>

        {/* Custom Modal */}
        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <View className="flex-1 bg-black/50 items-center justify-center px-6">
            <View className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <Ionicons
                  name={modalType === "success" ? "checkmark-circle" : "alert-circle"}
                  size={48}
                  color={modalType === "success" ? "#10B981" : "#EF4444"}
                />
              </View>
              <Text className="text-white text-16 text-center mb-6 leading-5">{modalMessage}</Text>
              <Pressable className="bg-blue-500 rounded-full py-3 px-6" onPress={() => setShowModal(false)}>
                <Text className="text-white font-semibold text-center">OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}
