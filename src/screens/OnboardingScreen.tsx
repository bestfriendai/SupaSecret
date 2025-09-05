import React, { useRef, useState } from "react";
import { View, Dimensions, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import OnboardingSlide from "../components/OnboardingSlide";
import ProgressIndicator from "../components/ProgressIndicator";
import AuthButton from "../components/AuthButton";
import { OnboardingSlide as OnboardingSlideType } from "../types/auth";
import { useAuthStore } from "../state/authStore";
import { debugAuthState } from "../utils/auth";

const { width: screenWidth } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<any>;

const onboardingSlides: OnboardingSlideType[] = [
  {
    id: "1",
    title: "Welcome to Secrets",
    subtitle: "Share Anonymously",
    description: "A safe space to share your thoughts, feelings, and experiences completely anonymously. No judgment, just understanding.",
    icon: "lock-closed",
    color: "#1D9BF0",
  },
  {
    id: "2",
    title: "Complete Privacy",
    subtitle: "Your Identity Protected",
    description: "Advanced face blur and voice change technology ensures your video confessions remain completely anonymous and secure.",
    icon: "shield-checkmark",
    color: "#10B981",
  },
  {
    id: "3",
    title: "Supportive Community",
    subtitle: "Connect & Support",
    description: "Like, comment, and share support with others anonymously. Build connections without revealing your identity.",
    icon: "people",
    color: "#8B5CF6",
  },
  {
    id: "4",
    title: "Ready to Begin?",
    subtitle: "Join the Community",
    description: "Create your account and start sharing your story. Remember, everything you share remains completely anonymous.",
    icon: "rocket",
    color: "#F59E0B",
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setOnboarded } = useAuthStore();
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / screenWidth);
      runOnJS(setCurrentIndex)(index);
    },
  });

  const handleNext = () => {
    if (currentIndex < onboardingSlides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    navigation.navigate("SignUp");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGetStarted = async () => {
    if (user) {
      // User is already signed up, mark as onboarded
      try {
        await setOnboarded();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("Error setting onboarded:", error);
      }
    } else {
      // User needs to sign up
      navigation.navigate("SignUp");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const skipButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [0, (onboardingSlides.length - 1) * screenWidth],
      [1, 0],
      "clamp"
    );
    return { opacity };
  });

  const isLastSlide = currentIndex === onboardingSlides.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={debugAuthState} className="px-2 py-1">
          <Text className="text-gray-500 text-12">Debug</Text>
        </Pressable>
        <ProgressIndicator
          totalSlides={onboardingSlides.length}
          scrollX={scrollX}
          screenWidth={screenWidth}
        />
        <Animated.View style={skipButtonStyle}>
          <Pressable onPress={handleSkip} className="px-4 py-2">
            <Text className="text-gray-400 text-16 font-medium">Skip</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Slides */}
      <View className="flex-1">
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          bounces={false}
          decelerationRate="fast"
        >
          {onboardingSlides.map((slide, index) => (
            <OnboardingSlide
              key={slide.id}
              slide={slide}
              index={index}
              scrollX={scrollX}
            />
          ))}
        </Animated.ScrollView>
      </View>

      {/* Bottom Actions */}
      <View className="px-6 pb-8">
        {isLastSlide ? (
          <View className="space-y-4">
            <AuthButton
              title="Get Started"
              onPress={handleGetStarted}
              leftIcon="rocket"
              variant="primary"
            />
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-400 text-15">Already have an account? </Text>
              <Pressable onPress={handleSignIn}>
                <Text className="text-blue-400 text-15 font-semibold">Sign In</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (currentIndex > 0) {
                  const prevIndex = currentIndex - 1;
                  scrollViewRef.current?.scrollTo({
                    x: prevIndex * screenWidth,
                    animated: true,
                  });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              className="flex-row items-center px-4 py-3"
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={currentIndex === 0 ? "#4B5563" : "#8B98A5"}
              />
              <Text
                className={`ml-2 text-16 font-medium ${
                  currentIndex === 0 ? "text-gray-600" : "text-gray-400"
                }`}
              >
                Back
              </Text>
            </Pressable>

            <AuthButton
              title="Next"
              onPress={handleNext}
              rightIcon="chevron-forward"
              variant="primary"
              fullWidth={false}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}