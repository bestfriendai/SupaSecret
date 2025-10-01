import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/features/auth";
import { validateEmail, sendPasswordReset, AuthError } from "@/src/features/auth";
import AuthInput from "@/src/features/auth/components/AuthInput";
import AuthButton from "@/src/features/auth/components/AuthButton";

export default function SignInScreen() {
  const { signIn, isLoading, clearError } = useAuth();

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
      return;
    }

    try {
      if (__DEV__) {
        console.log("🔍 Attempting sign in with:", formData.email);
      }
      await signIn(formData, rememberMe);
      // Navigation will be handled by protected routes
    } catch (error) {
      if (__DEV__) {
        console.log("🔍 Sign in error caught:", error);
      }

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
                onPress: () => router.push("/(auth)/sign-up"),
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
          default:
            errorTitle = "Sign In Failed";
            errorMessage = error.message || "An unexpected error occurred. Please try again.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage, buttons);
    }
  };

  const handleSignUp = () => {
    router.push("/(auth)/sign-up");
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert("Email Required", "Please enter your email address first");
      return;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    try {
      setIsPasswordResetLoading(true);
      await sendPasswordReset(formData.email);
      Alert.alert("Success", "Password reset link sent! Check your inbox.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send reset email";
      Alert.alert("Error", message);
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

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
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}>Sign In</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 32 }}>
            {/* Welcome Text */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
                Welcome Back
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 24 }}>
                Sign in to your account to continue sharing and connecting anonymously.
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: "#374151", true: "#3B82F6" }}
                  thumbColor={rememberMe ? "#FFFFFF" : "#9CA3AF"}
                />
                <Text style={{ color: "#9CA3AF", fontSize: 14, marginLeft: 12 }}>Remember me</Text>
              </View>

              <Pressable onPress={handleForgotPassword} disabled={isPasswordResetLoading}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: isPasswordResetLoading ? "#6B7280" : "#3B82F6",
                  }}
                >
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
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 32 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#374151" }} />
              <Text style={{ color: "#6B7280", fontSize: 14, marginHorizontal: 16 }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#374151" }} />
            </View>

            {/* Sign Up Link */}
            <View
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 15 }}>Don't have an account? </Text>
              <Pressable onPress={handleSignUp}>
                <Text style={{ color: "#3B82F6", fontSize: 15, fontWeight: "600" }}>Sign Up</Text>
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
                  Secure Sign In
                </Text>
              </View>
              <Text style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 18 }}>
                Your login credentials are encrypted and secure. We never store your password in plain
                text.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
