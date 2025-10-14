import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, ScrollView, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import AuthButton from "../components/AuthButton";
import { useAuthStore } from "../state/authStore";

type NavigationProp = NativeStackNavigationProp<any>;
const { width: screenWidth } = Dimensions.get("window");

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setOnboarded, isAuthenticated } = useAuthStore();
  const { impactAsync } = usePreferenceAwareHaptics();
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation values
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const featuresOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    logoRotation.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withSpring(0, { damping: 10, stiffness: 100 }),
    );

    // Animate text elements with delays
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    featuresOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    buttonScale.value = withDelay(800, withSpring(1, { damping: 15, stiffness: 100 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: logoScale.value }, { rotate: `${logoRotation.value}deg` }],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: titleOpacity.value,
      transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [20, 0]) }],
    };
  });

  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: subtitleOpacity.value,
      transform: [{ translateY: interpolate(subtitleOpacity.value, [0, 1], [20, 0]) }],
    };
  });

  const featuresAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: featuresOpacity.value,
      transform: [{ translateY: interpolate(featuresOpacity.value, [0, 1], [20, 0]) }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleGetStarted = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    impactAsync();

    try {
      if (user && user.id) {
        await setOnboarded();
      } else {
        navigation.navigate("SignUp");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.", [
        { text: "OK", onPress: () => setIsProcessing(false) },
      ]);
      return;
    }

    setIsProcessing(false);
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
    impactAsync();
  };

  const features = [
    {
      icon: "shield-checkmark",
      title: "100% Anonymous",
      subtitle: "No personal data required",
      color: "#3B82F6",
      bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
      icon: "videocam",
      title: "Video & Text",
      subtitle: "Share in your preferred format",
      color: "#A855F7",
      bgColor: "rgba(168, 85, 247, 0.1)",
    },
    {
      icon: "people",
      title: "Safe Community",
      subtitle: "Connect with understanding souls",
      color: "#10B981",
      bgColor: "rgba(16, 185, 129, 0.1)",
    },
  ];

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#000000", "#0A0A0A", "#000000"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Decorative Background Elements */}
      <View className="absolute top-20 -left-20 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl" />
      <View className="absolute bottom-40 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-6 py-8">
            {/* Logo Section with Glow Effect */}
            <View className="items-center mb-8">
              <Animated.View style={logoAnimatedStyle}>
                {/* Glow effect behind logo */}
                <View className="absolute -inset-8">
                  <View className="w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
                </View>

                {/* Logo with shadow */}
                <View
                  style={{
                    shadowColor: "#3B82F6",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 10,
                  }}
                >
                  <Image
                    source={require("../../assets/logo.png")}
                    style={{ width: 140, height: 140 }}
                    resizeMode="contain"
                  />
                </View>
              </Animated.View>
            </View>

            {/* Title with Gradient Text Effect */}
            <Animated.View style={titleAnimatedStyle}>
              <Text className="text-white text-36 font-bold text-center mb-2">Toxic Confessions</Text>
              <View className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4" />
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={subtitleAnimatedStyle}>
              <Text className="text-gray-300 text-17 text-center leading-6 mb-12 px-4">
                Share your deepest secrets anonymously.{"\n"}
                Find comfort in shared experiences.
              </Text>
            </Animated.View>

            {/* Features with Cards */}
            <Animated.View style={featuresAnimatedStyle} className="mb-12">
              {features.map((feature, index) => (
                <View
                  key={index}
                  className="mb-4"
                  style={{
                    opacity: 1,
                    transform: [{ translateX: 0 }],
                  }}
                >
                  <View className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800/50">
                    <View className="flex-row items-center">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{ backgroundColor: feature.bgColor }}
                      >
                        <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white text-16 font-semibold">{feature.title}</Text>
                        <Text className="text-gray-400 text-14 mt-1">{feature.subtitle}</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                  </View>
                </View>
              ))}
            </Animated.View>

            {/* Trust Indicators */}
            <View className="flex-row justify-center items-center mb-8 px-4">
              <View className="flex-row items-center bg-gray-900/50 rounded-full px-4 py-2">
                <Ionicons name="lock-closed" size={14} color="#10B981" />
                <Text className="text-gray-400 text-12 ml-2">End-to-end encrypted</Text>
              </View>
              <View className="mx-2 w-1 h-1 bg-gray-600 rounded-full" />
              <View className="flex-row items-center bg-gray-900/50 rounded-full px-4 py-2">
                <Ionicons name="eye-off" size={14} color="#10B981" />
                <Text className="text-gray-400 text-12 ml-2">No tracking</Text>
              </View>
            </View>

            {/* Bottom Actions with Animation */}
            <Animated.View style={buttonAnimatedStyle} className="mt-auto">
              {/* Get Started Button with Gradient */}
              <Pressable
                onPress={handleGetStarted}
                disabled={isProcessing}
                className="overflow-hidden rounded-2xl mb-4"
              >
                <LinearGradient
                  colors={isProcessing ? ["#1F2937", "#1F2937"] : ["#3B82F6", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="rocket" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className="text-white text-17 font-semibold">
                    {isProcessing ? "Processing..." : "Get Started"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Sign In Link */}
              <View className="flex-row items-center justify-center">
                <Text className="text-gray-400 text-15">Already have an account? </Text>
                <Pressable onPress={handleSignIn} className="px-2 py-1 rounded" disabled={isProcessing}>
                  <Text className={`text-15 font-semibold ${isProcessing ? "text-gray-600" : "text-blue-400"}`}>
                    Sign In
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
