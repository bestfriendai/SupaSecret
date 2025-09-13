import React, { useRef, useState, useEffect, useMemo } from "react";
import { View, Dimensions, Pressable, Text, Alert, ScrollView, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import {
  announceSlideChange,
  announceOnboardingComplete,
  announceOnboardingSkipped,
  announceForAccessibility,
  getAccessibilityState,
  accessibleHapticFeedback
} from "../utils/accessibility";

import OnboardingSlide from "../components/OnboardingSlide";
import ProgressIndicator from "../components/ProgressIndicator";
import AuthButton from "../components/AuthButton";
import { OnboardingSlide as OnboardingSlideType } from "../types/auth";
import { useAuthStore } from "../state/authStore";
import { useOnboardingAnimation } from "../hooks/useOnboardingAnimation";
import {
  getOnboardingSlides,
  trackOnboardingEvent,
  validateOnboardingState,
  handleOnboardingError,
  getOnboardingConfig
} from "../utils/onboardingHelpers";

const { width: screenWidth } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<any>;
// Remove custom type, use ScrollView directly

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setOnboarded, isAuthenticated } = useAuthStore();
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const flatListRef = useRef<FlatList<OnboardingSlideType> | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);


  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessibilityState, setAccessibilityState] = useState({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
  });
  const scrollX = useSharedValue(0);

  // Get onboarding data and configuration
  const onboardingSlides = useMemo(() => getOnboardingSlides(), []);
  const config = useMemo(() => getOnboardingConfig(), []);

  // Modern animation hooks
  const {
    skipButtonStyle,
    slideContainerStyle,
    buttonAnimatedStyle,
    animateButtonPress,
    animateSlideTransition,
  } = useOnboardingAnimation({
    totalSlides: onboardingSlides.length,
    currentIndex,
    scrollX,
  });

  // Initialize accessibility state and track onboarding start
  useEffect(() => {
    const initializeAccessibility = async () => {
      const a11yState = await getAccessibilityState();
      setAccessibilityState({
        isScreenReaderEnabled: a11yState.isScreenReaderEnabled,
        isReduceMotionEnabled: a11yState.isReduceMotionEnabled,
      });
    };

    initializeAccessibility();

    trackOnboardingEvent('onboarding_started', {
      userAuthenticated: isAuthenticated,
      hasUser: !!user,
    });
  }, []);

  // Announce slide changes for screen readers
  useEffect(() => {
    if (accessibilityState.isScreenReaderEnabled) {
      const currentSlide = onboardingSlides[currentIndex];
      announceSlideChange(currentIndex, onboardingSlides.length, currentSlide.title);
    }
  }, [currentIndex, accessibilityState.isScreenReaderEnabled]);

  // Regular scroll handler for ScrollView
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    console.log('📜 Scroll event - offsetX:', offsetX, 'calculated index:', Math.round(offsetX / screenWidth));
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    console.log('🛑 Momentum end - offsetX:', offsetX, 'calculated index:', index, 'current index:', currentIndex);

    // Only update if it's different from current index and within valid range
    if (index !== currentIndex && index >= 0 && index < onboardingSlides.length) {
      console.log('🔄 Updating index from', currentIndex, 'to', index);
      setCurrentIndex(index);
      animateSlideTransition();
      accessibleHapticFeedback('light');
    } else {
      console.log('⏸️ Index unchanged, staying at:', currentIndex);
    }
  };

  // Add effect to handle programmatic scrolling - disabled to prevent conflicts
  // useEffect(() => {
  //   // Ensure the current index is visible when it changes
  //   console.log('🎯 Effect: ensure index', currentIndex, 'is visible');
  //   if (flatListRef.current && !isScrollingProgrammatically.current) {
  //     scrollToIndex(currentIndex);
  //   }
  // }, [currentIndex, screenWidth]);




  const handleNext = () => {
    console.log('🔥 NEXT PRESSED - Current:', currentIndex, 'Total slides:', onboardingSlides.length);
    const nextIndex = currentIndex + 1;

    if (nextIndex < onboardingSlides.length) {
      console.log('✅ Going to slide:', nextIndex, 'FlatList ref present?', !!flatListRef.current);

      if (!flatListRef.current) {
        console.error('❌ FlatList ref is null, cannot scroll');
        return;
      }

      // Calculate target position
      const targetX = nextIndex * screenWidth;
      console.log('📐 Target scroll position:', targetX, 'for index:', nextIndex);

      try {
        // Direct scroll without delays or flags - keep it simple
        flatListRef.current.scrollToOffset({
          offset: targetX,
          animated: true
        });

        console.log('✅ Scroll command sent successfully');

        // Update state after scroll command
        setCurrentIndex(nextIndex);

        // Track slide progression
        trackOnboardingEvent('onboarding_slide_viewed', {
          slideIndex: nextIndex,
          slideTitle: onboardingSlides[nextIndex].title,
        });

        // Animate button press
        animateButtonPress();

        // Haptic feedback
        impactAsync();

      } catch (error) {
        console.error('❌ Scroll failed:', error);
      }

    } else {
      console.log('🏁 Last slide - calling handleGetStarted');
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    trackOnboardingEvent('onboarding_skipped', {
      currentSlide: currentIndex,
      totalSlides: onboardingSlides.length,
    });

    if (accessibilityState.isScreenReaderEnabled) {
      announceOnboardingSkipped();
    }

    navigation.navigate("SignUp");
    accessibleHapticFeedback('light');
  };

  const handleGetStarted = async () => {
    if (isProcessing) return; // Prevent double-tap

    setIsProcessing(true);
    setError(null);

    try {
      animateButtonPress();

      // Validate onboarding state
      const validation = validateOnboardingState(user, isAuthenticated);

      trackOnboardingEvent('onboarding_get_started_pressed', {
        userExists: !!user,
        isAuthenticated,
        validationReason: validation.reason,
      });

      if (user && user.id) {
        // User is authenticated but not onboarded - mark as onboarded
        await setOnboarded();
        trackOnboardingEvent('onboarding_completed', {
          userId: user.id,
          completionMethod: 'get_started',
        });

        if (accessibilityState.isScreenReaderEnabled) {
          announceOnboardingComplete();
        }

        accessibleHapticFeedback('success');
        // Navigation will be handled automatically by auth state change
      } else {
        // User needs to sign up first
        navigation.navigate("SignUp");
        accessibleHapticFeedback('light');
      }
    } catch (error) {
      const errorInfo = handleOnboardingError(error, 'get_started');
      Alert.alert(
        errorInfo.title,
        errorInfo.message,
        [{ text: "OK", onPress: () => setIsProcessing(false) }]
      );
      return;
    }

    setIsProcessing(false);
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
    impactAsync();
  };

  // Animation styles are now provided by useOnboardingAnimation hook

  const isLastSlide = currentIndex === onboardingSlides.length - 1;



  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="w-10" />
        <ProgressIndicator
          totalSlides={onboardingSlides.length}
          scrollX={scrollX}
          screenWidth={screenWidth}
          currentIndex={currentIndex}
          accessibilityLabel={`Onboarding progress: slide ${currentIndex + 1} of ${onboardingSlides.length}`}
        />
        <Animated.View style={skipButtonStyle}>
          <Pressable
            onPress={handleSkip}
            className="px-4 py-2 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityHint="Skip the introduction and go directly to sign up"
          >
            <Text className="text-gray-400 text-16 font-medium">Skip</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Slides */}
      <Animated.View style={[{ flex: 1 }, slideContainerStyle]}>
        <FlatList
          ref={flatListRef}
          data={onboardingSlides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <OnboardingSlide slide={item} index={index} scrollX={scrollX} config={config} />
          )}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
          decelerationRate="fast"
          initialScrollIndex={0}
          accessibilityRole="none"
          accessibilityLabel={`Onboarding slides, ${onboardingSlides.length} slides total`}
          accessibilityHint="Swipe left or right to navigate between slides"
          accessibilityActions={[
            { name: 'increment', label: 'Next slide' },
            { name: 'decrement', label: 'Previous slide' },
          ]}
          onAccessibilityAction={(event) => {
            switch (event.nativeEvent.actionName) {
              case 'increment':
                if (currentIndex < onboardingSlides.length - 1) {
                  handleNext();
                }
                break;
              case 'decrement':
                if (currentIndex > 0 && flatListRef.current) {
                  const prevIndex = currentIndex - 1;
                  const targetX = prevIndex * screenWidth;

                  try {
                    flatListRef.current.scrollToOffset({
                      offset: targetX,
                      animated: true
                    });
                    setCurrentIndex(prevIndex);
                  } catch (error) {
                    console.error('❌ Accessibility decrement scroll failed:', error);
                  }
                }
                break;
            }
          }}
        />
      </Animated.View>

      {/* Error Display */}
      {error && (
        <View
          style={{
            marginHorizontal: 24,
            marginBottom: 16,
            padding: 16,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${error}`}
        >
          <Text
            style={{
              color: '#EF4444',
              fontSize: 14,
              fontWeight: '500',
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Bottom Actions */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
      >
        {isLastSlide ? (
          <Animated.View style={[{ gap: 16 }, buttonAnimatedStyle]}>
            <AuthButton
              title="Get Started"
              onPress={handleGetStarted}
              leftIcon="rocket"
              variant="primary"
              loading={isProcessing}
              disabled={isProcessing}
              accessibilityLabel="Get started with Toxic Confessions"
              accessibilityHint="Create your account or complete onboarding"
            />
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-400 text-15">Already have an account? </Text>
              <Pressable
                onPress={handleSignIn}
                className="px-2 py-1 rounded"
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
                disabled={isProcessing}
              >
                <Text className={`text-15 font-semibold ${isProcessing ? 'text-gray-600' : 'text-blue-400'}`}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (currentIndex > 0 && flatListRef.current) {
                  const prevIndex = currentIndex - 1;
                  const targetX = prevIndex * screenWidth;

                  try {
                    flatListRef.current.scrollToOffset({
                      offset: targetX,
                      animated: true
                    });
                    setCurrentIndex(prevIndex);
                    impactAsync();
                  } catch (error) {
                    console.error('❌ Back button scroll failed:', error);
                  }
                }
              }}
              className="flex-row items-center px-4 py-3 rounded-full"
              disabled={currentIndex === 0}
              accessibilityRole="button"
              accessibilityLabel="Go to previous slide"
              accessibilityState={{ disabled: currentIndex === 0 }}
            >
              <Ionicons name="chevron-back" size={20} color={currentIndex === 0 ? "#4B5563" : "#8B98A5"} />
              <Text className={`ml-2 text-16 font-medium ${currentIndex === 0 ? "text-gray-600" : "text-gray-400"}`}>
                Back
              </Text>
            </Pressable>

            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleNext}
                className="rounded-full flex-row items-center justify-center px-6 py-3 bg-blue-500 active:bg-blue-600"
                accessibilityRole="button"
                accessibilityLabel="Go to next slide"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-white text-16 font-semibold">Next</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
