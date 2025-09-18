import React, { useState } from "react";
import { View, Text, Pressable, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import NetInfo from "@react-native-community/netinfo";

import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import { useAuthStore } from "../state/authStore";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";
import { getButtonA11yProps } from "../utils/accessibility";
import { validateEmail, sendPasswordReset, AuthError } from "../utils/auth";
import { useToastHelpers } from "../contexts/ToastContext";

import { safeGoBackFromAuth } from "../utils/navigation";
import type { AuthStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, isLoading, clearError } = useAuthStore();
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const { showSuccess, showError } = useToastHelpers();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);

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

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert("Network Error", "No internet connection. Please check your network and try again.", [
        { text: "OK" },
      ]);
      return;
    }

    try {
      if (__DEV__) {
        console.log("🔍 Attempting sign in with:", formData.email);
      }
      await signIn(formData, rememberMe);
      impactAsync();
      showSuccess("Welcome back! You have successfully signed in.");
      // Navigation will be handled by the auth state change
    } catch (error) {
      if (__DEV__) {
        console.log("🔍 Sign in error caught:", error);
      }
      notificationAsync();

      // Handle specific error types with Alert
      let errorTitle = "Sign In Error";
      let errorMessage = "Sign in failed. Please try again.";
      let buttons: any[] = [{ text: "OK" }];

      if (error instanceof AuthError) {
        switch (error.code) {
          case "INVALID_CREDENTIALS":
            errorTitle = "Invalid Credentials";
            errorMessage = "Wrong email or password. Please check and try again.";
            break;
          case "USER_NOT_FOUND":
            errorTitle = "Account Not Found";
            errorMessage = "No account found with this email. Would you like to sign up?";
            buttons = [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Up",
                onPress: () => navigation.navigate("SignUp"),
              },
            ];
            break;
          case "EMAIL_NOT_CONFIRMED":
            errorTitle = "Email Not Verified";
            errorMessage = "Please check your email and click the confirmation link before signing in.";
            break;
          case "TOO_MANY_REQUESTS":
            errorTitle = "Too Many Attempts";
            errorMessage = "Too many sign-in attempts. Please wait a few minutes and try again.";
            break;
          case "NETWORK_ERROR":
            errorTitle = "Network Error";
            errorMessage = "Please check your internet connection and try again.";
            break;
          case "MISSING_EMAIL":
          case "INVALID_EMAIL":
            errorTitle = "Invalid Email";
            errorMessage = error.message;
            break;
          case "MISSING_PASSWORD":
            errorTitle = "Missing Password";
            errorMessage = error.message;
            break;
          default:
            errorTitle = "Sign In Failed";
            errorMessage = error.message || "An unexpected error occurred. Please try again.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Show Alert instead of toast
      Alert.alert(errorTitle, errorMessage, buttons);
    }
  };

  const handleSignUp = () => {
    navigation.navigate("SignUp");
    impactAsync();
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      showError("Please enter your email address first");
      return;
    }

    if (!validateEmail(formData.email)) {
      showError("Please enter a valid email address");
      return;
    }

    try {
      setIsPasswordResetLoading(true);
      await sendPasswordReset(formData.email);
      showSuccess("Password reset link sent! Check your inbox.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset email";
      showError(message);
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScreenKeyboardWrapper className="flex-1" scrollable={true}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable
            onPress={() => safeGoBackFromAuth(navigation)}
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
            <View className="flex-row items-center">
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: "#374151", true: "#3B82F6" }}
                thumbColor={rememberMe ? "#FFFFFF" : "#9CA3AF"}
                accessibilityLabel="Remember me for future sign-ins"
                accessibilityRole="switch"
              />
              <Text className="text-gray-400 text-14 ml-3">Remember me</Text>
            </View>

            <Pressable
              onPress={handleForgotPassword}
              disabled={isPasswordResetLoading}
              accessibilityRole="button"
              accessibilityLabel="Reset password"
            >
              <Text className={`text-14 font-medium ${isPasswordResetLoading ? "text-gray-500" : "text-blue-400"}`}>
                {isPasswordResetLoading ? "Sending..." : "Forgot Password?"}
              </Text>
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

          {/* Social Sign In Placeholder - Hidden for now */}
          {/*
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
              */}

          {/* Sign Up Link */}
          <View className="flex-row items-center justify-center">
            <Text className="text-gray-400 text-15">Don't have an account? </Text>
            <Pressable onPress={handleSignUp} {...getButtonA11yProps("Sign Up", "Double tap to go to sign up screen")}>
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
    </SafeAreaView>
  );
}
