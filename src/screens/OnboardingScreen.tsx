import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { View, Dimensions, Pressable, Text, Alert, ScrollView, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<any>;
// Remove custom type, use ScrollView directly

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setOnboarded, isAuthenticated } = useAuthStore();
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const flatListRef = useRef<FlatList<OnboardingSlideType> | null>(null);

  // State management with better bounds
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessibilityState, setAccessibilityState] = useState({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollX = useSharedValue(0);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get onboarding data and configuration with error handling
  const onboardingSlides = useMemo(() => {
    try {
      return getOnboardingSlides();
    } catch (err) {
      console.error('Failed to get onboarding slides:', err);
      return [];
    }
  }, []);

  const config = useMemo(() => {
    try {
      return getOnboardingConfig();
    } catch (err) {
      console.error('Failed to get onboarding config:', err);
      return {};
    }
  }, []);

  // Bounds checking helpers
  const isValidIndex = useCallback((index: number): boolean => {
    return index >= 0 && index < onboardingSlides.length && onboardingSlides.length > 0;
  }, [onboardingSlides.length]);

  const clampIndex = useCallback((index: number): number => {
    if (onboardingSlides.length === 0) return 0;
    return Math.max(0, Math.min(index, onboardingSlides.length - 1));
  }, [onboardingSlides.length]);

  // Additional safety checks
  const canNavigateNext = useCallback(() => {
    return isValidIndex(currentIndex + 1) && !isProcessing && !isScrolling;
  }, [currentIndex, isValidIndex, isProcessing, isScrolling]);

  const canNavigateBack = useCallback(() => {
    return currentIndex > 0 && !isProcessing && !isScrolling;
  }, [currentIndex, isProcessing, isScrolling]);

  const isOnLastSlide = useCallback(() => {
    return onboardingSlides.length > 0 && currentIndex === onboardingSlides.length - 1;
  }, [currentIndex, onboardingSlides.length]);

  const isFirstSlide = useCallback(() => {
    return currentIndex === 0;
  }, [currentIndex]);

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
      try {
        const a11yState = await getAccessibilityState();
        setAccessibilityState({
          isScreenReaderEnabled: a11yState.isScreenReaderEnabled,
          isReduceMotionEnabled: a11yState.isReduceMotionEnabled,
        });

        // Announce screen reader support
        if (a11yState.isScreenReaderEnabled) {
          setTimeout(() => {
            announceForAccessibility(`Onboarding screen with ${onboardingSlides.length} slides. Use swipe gestures or navigation buttons to continue.`);
          }, 500);
        }
      } catch (error) {
        console.warn('Failed to initialize accessibility:', error);
      }
    };

    initializeAccessibility();

    trackOnboardingEvent('onboarding_started', {
      userAuthenticated: isAuthenticated,
      hasUser: !!user,
      totalSlides: onboardingSlides.length,
      timestamp: new Date().toISOString(),
    });
  }, [onboardingSlides.length, isAuthenticated, user]);

  // Enhanced slide change announcements for screen readers
  useEffect(() => {
    if (accessibilityState.isScreenReaderEnabled && isValidIndex(currentIndex)) {
      const currentSlide = onboardingSlides[currentIndex];
      const progress = `${currentIndex + 1} of ${onboardingSlides.length}`;
      const message = `${currentSlide.title}. ${currentSlide.subtitle}. ${progress}`;

      announceSlideChange(currentIndex, onboardingSlides.length, currentSlide.title);

      // Additional context for screen readers
      setTimeout(() => {
        if (isOnLastSlide()) {
          announceForAccessibility('Last slide. Tap Get Started to complete onboarding.');
        } else {
          announceForAccessibility('Swipe left or tap Next to continue.');
        }
      }, 1000);
    }
  }, [currentIndex, accessibilityState.isScreenReaderEnabled, isValidIndex, onboardingSlides, isOnLastSlide]);

  // Robust scroll handler with debouncing
  const handleScroll = useCallback((event: any) => {
    if (isScrolling) return;

    const now = Date.now();
    const offsetX = event.nativeEvent.contentOffset.x;

    // Debounce scroll events to prevent performance issues
    if (now - lastScrollTimeRef.current < 100) {
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
      scrollDebounceTimerRef.current = setTimeout(() => {
        scrollX.value = offsetX;
        lastScrollTimeRef.current = now;
      }, 100);
      return;
    }

    scrollX.value = offsetX;
    lastScrollTimeRef.current = now;
  }, [isScrolling, scrollX]);

  // Handle scroll begin
  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);
  }, []);

  // Handle scroll end
  const handleScrollEnd = useCallback(() => {
    setIsScrolling(false);
  }, []);

  // Improved momentum scroll end handler
  const handleMomentumScrollEnd = useCallback((event: any) => {
    setIsScrolling(false);
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);

    if (isValidIndex(index) && index !== currentIndex) {
      setCurrentIndex(index);
      animateSlideTransition();
      accessibleHapticFeedback('light');

      // Track slide change
      trackOnboardingEvent('onboarding_slide_changed', {
        fromIndex: currentIndex,
        toIndex: index,
        scrollMethod: 'gesture',
      });
    }
  }, [currentIndex, isValidIndex, animateSlideTransition, accessibleHapticFeedback, trackOnboardingEvent]);

  // Optimized scrollToIndex with bounds checking and error handling
  const scrollToIndexSafely = useCallback((index: number, animated: boolean = true) => {
    const clampedIndex = clampIndex(index);
    const targetX = clampedIndex * screenWidth;

    if (clampedIndex !== index) {
      console.warn(`Index ${index} out of bounds, clamped to ${clampedIndex}`);
    }

    let attempts = 0;
    const maxAttempts = 10;

    const tryScroll = () => {
      const list = flatListRef.current;
      if (list && isValidIndex(clampedIndex)) {
        try {
          // Try scrollToOffset first (more reliable)
          if (typeof list.scrollToOffset === 'function') {
            list.scrollToOffset({ offset: targetX, animated });
            return;
          }
          // Fallback to scrollToIndex
          if (typeof list.scrollToIndex === 'function') {
            list.scrollToIndex({ index: clampedIndex, animated, viewPosition: 0 });
            return;
          }
        } catch (err) {
          console.warn('Scroll attempt failed, retrying:', err);
        }
      }

      // Fallback to ScrollView
      const scrollView = scrollViewRef.current;
      if (scrollView && typeof scrollView.scrollTo === 'function') {
        try {
          scrollView.scrollTo({ x: targetX, y: 0, animated });
          return;
        } catch (err) {
          console.warn('ScrollView scroll failed:', err);
        }
      }

      if (attempts < maxAttempts) {
        attempts += 1;
        requestAnimationFrame(tryScroll);
      } else {
        console.error(`Failed to scroll to index ${clampedIndex} after ${maxAttempts} attempts`);
        // Force update as last resort
        setCurrentIndex(clampedIndex);
      }
    };

    tryScroll();
  }, [clampIndex, isValidIndex, screenWidth]);


  // Improved navigation with bounds checking
  const handleNext = useCallback(() => {
    if (!canNavigateNext()) {
      // If we can't navigate forward and we're on the last slide, proceed to signup
      if (isOnLastSlide()) {
        handleGetStarted();
      }
      return;
    }

    const nextIndex = clampIndex(currentIndex + 1);
    setIsScrolling(true);
    setCurrentIndex(nextIndex);
    scrollToIndexSafely(nextIndex);
    animateButtonPress();

    // Track slide progression
    trackOnboardingEvent('onboarding_slide_viewed', {
      slideIndex: nextIndex,
      slideTitle: onboardingSlides[nextIndex]?.title || 'Unknown',
      navigationMethod: 'button',
    });

    // Reset scrolling state after animation
    setTimeout(() => setIsScrolling(false), 300);
  }, [canNavigateNext, isOnLastSlide, currentIndex, clampIndex, scrollToIndexSafely, animateButtonPress, trackOnboardingEvent, onboardingSlides, handleGetStarted]);

  // Improved skip handler
  const handleSkip = useCallback(() => {
    if (isProcessing || isScrolling) return;

    trackOnboardingEvent('onboarding_skipped', {
      currentSlide: currentIndex,
      totalSlides: onboardingSlides.length,
      skipReason: 'user_initiated',
    });

    if (accessibilityState.isScreenReaderEnabled) {
      announceOnboardingSkipped();
    }

    safeNavigate("SignUp");
    accessibleHapticFeedback('light');
  }, [isProcessing, isScrolling, currentIndex, onboardingSlides.length, accessibilityState.isScreenReaderEnabled, announceOnboardingSkipped, safeNavigate, accessibleHapticFeedback, trackOnboardingEvent]);

  // Enhanced error handling and navigation
  const handleGetStarted = useCallback(async () => {
    if (isProcessing || isScrolling) return;

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
        currentSlide: currentIndex,
      });

      if (user && user.id) {
        // User is authenticated but not onboarded
        await setOnboarded();

        trackOnboardingEvent('onboarding_completed', {
          userId: user.id,
          completionMethod: 'get_started',
          totalSlides: onboardingSlides.length,
        });

        if (accessibilityState.isScreenReaderEnabled) {
          announceOnboardingComplete();
        }

        accessibleHapticFeedback('success');
        // Navigation will be handled automatically by auth state change
      } else {
        // Navigate to SignUp
        trackOnboardingEvent('onboarding_navigate_to_signup', {
          reason: 'user_not_authenticated',
          currentSlide: currentIndex,
        });

        if (accessibilityState.isScreenReaderEnabled) {
          announceForAccessibility('Navigating to sign up screen');
        }

        safeNavigate("SignUp");
        accessibleHapticFeedback('light');
      }
    } catch (error) {
      const errorInfo = handleOnboardingError(error, 'get_started');
      setError(errorInfo.message);

      // Enhanced error feedback
      console.error('Onboarding Get Started failed:', {
        error,
        context: 'get_started',
        user: !!user,
        isAuthenticated,
        currentSlide: currentIndex,
      });

      Alert.alert(
        errorInfo.title,
        errorInfo.message,
        [
          {
            text: "Retry",
            onPress: () => {
              setIsProcessing(false);
              handleGetStarted();
            },
          },
          {
            text: "Cancel",
            onPress: () => setIsProcessing(false),
            style: "cancel",
          },
        ]
      );
      return;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isScrolling, user, isAuthenticated, animateButtonPress, validateOnboardingState, trackOnboardingEvent, onboardingSlides.length, setOnboarded, accessibilityState.isScreenReaderEnabled, announceOnboardingComplete, accessibleHapticFeedback, currentIndex, announceForAccessibility, navigation, handleOnboardingError]);

  // Improved back navigation with bounds checking
  const handleBack = useCallback(() => {
    if (!canNavigateBack()) return;

    const prevIndex = clampIndex(currentIndex - 1);
    setIsScrolling(true);
    setCurrentIndex(prevIndex);
    scrollToIndexSafely(prevIndex);
    impactAsync();

    trackOnboardingEvent('onboarding_back_pressed', {
      fromIndex: currentIndex,
      toIndex: prevIndex,
    });

    setTimeout(() => setIsScrolling(false), 300);
  }, [canNavigateBack, currentIndex, clampIndex, scrollToIndexSafely, impactAsync, trackOnboardingEvent]);

  // Sign in handler
  const handleSignIn = useCallback(() => {
    if (isProcessing) return;

    safeNavigate("SignIn");
    impactAsync();
  }, [isProcessing, safeNavigate, impactAsync]);

  // Sync currentIndex with scroll position
  useEffect(() => {
    if (!isScrolling && isValidIndex(currentIndex)) {
      scrollToIndexSafely(currentIndex, false);
    }
  }, [currentIndex, isValidIndex, scrollToIndexSafely, isScrolling]);

  // Comprehensive cleanup function
  useEffect(() => {
    return () => {
      // Clear all timers
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }

      // Cancel any pending animations
      if (scrollX) {
        scrollX.value = 0;
      }

      // Final cleanup event tracking
      trackOnboardingEvent('onboarding_screen_unmounted', {
        currentIndex,
        totalSlides: onboardingSlides.length,
        completionPercentage: Math.round((currentIndex + 1) / onboardingSlides.length * 100),
      });

      console.log('🧹 OnboardingScreen cleanup completed');
    };
  }, [currentIndex, onboardingSlides.length, scrollX, trackOnboardingEvent]);

  // Prevent navigation if there are unsaved changes
  const preventNavigation = useCallback(() => {
    if (isProcessing || isScrolling) {
      return true;
    }
    return false;
  }, [isProcessing, isScrolling]);

  // Enhanced navigation safety
  const safeNavigate = useCallback((screenName: string, params?: any) => {
    if (preventNavigation()) {
      console.warn('Navigation prevented: Processing or scrolling in progress');
      return;
    }

    try {
      navigation.navigate(screenName as any, params);

      trackOnboardingEvent('onboarding_navigation', {
        destination: screenName,
        currentIndex,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Navigation failed:', error);
      setError('Failed to navigate. Please try again.');
    }
  }, [navigation, preventNavigation, trackOnboardingEvent, currentIndex]);

  // Animation styles
  const isLastSlide = isOnLastSlide();



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
          accessibilityLabel={`Onboarding progress: ${currentIndex + 1} of ${onboardingSlides.length} slides completed`}
          accessibilityHint={`Slide ${currentIndex + 1} of ${onboardingSlides.length}. ${isOnLastSlide() ? 'Last slide' : 'Swipe to continue'}`}
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
          ref={flatListRef as any}
          data={onboardingSlides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <OnboardingSlide slide={item} index={index} scrollX={scrollX} config={config} />
          )}
          // Enhanced getItemLayout for better performance
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
          decelerationRate="fast"
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
          initialScrollIndex={currentIndex}
          // Enhanced accessibility
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
                if (currentIndex > 0) {
                  handleBack();
                }
                break;
            }
          }}
        />
      </Animated.View>

      {/* Enhanced Error Display */}
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
          accessibilityHint="Tap to dismiss this error message"
        >
          <View className="flex-row items-start">
            <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 12, marginTop: 2 }} />
            <View className="flex-1">
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 4,
                }}
              >
                Something went wrong
              </Text>
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {error}
              </Text>
              <Pressable
                onPress={() => setError(null)}
                className="mt-2"
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <Text
                  style={{
                    color: '#EF4444',
                    fontSize: 12,
                    fontWeight: '500',
                    textDecorationLine: 'underline',
                  }}
                >
                  Dismiss
                </Text>
              </Pressable>
            </View>
          </View>
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
              disabled={isProcessing || isScrolling}
              accessibilityLabel="Get started with Toxic Confessions"
              accessibilityHint="Complete onboarding and create your account"
            />
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-400 text-15">Already have an account? </Text>
              <Pressable
                onPress={handleSignIn}
                className="px-2 py-1 rounded"
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
                accessibilityHint="Already have an account? Sign in here"
                disabled={isProcessing || isScrolling}
              >
                <Text className={`text-15 font-semibold ${
                  isProcessing || isScrolling ? 'text-gray-600' : 'text-blue-400'
                }`}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={handleBack}
              className="flex-row items-center px-4 py-3 rounded-full"
              disabled={!canNavigateBack()}
              accessibilityRole="button"
              accessibilityLabel={isFirstSlide() ? "Cannot go back, already on first slide" : "Go to previous slide"}
              accessibilityHint={isFirstSlide() ? "You are on the first slide" : "Swipe right or tap to go to previous slide"}
              accessibilityState={{
                disabled: !canNavigateBack()
              }}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={!canNavigateBack() ? "#4B5563" : "#8B98A5"}
              />
              <Text className={`ml-2 text-16 font-medium ${
                !canNavigateBack() ? "text-gray-600" : "text-gray-400"
              }`}>
                Back
              </Text>
            </Pressable>

            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleNext}
                className="rounded-full flex-row items-center justify-center px-6 py-3 bg-blue-500 active:bg-blue-600 disabled:bg-blue-300"
                disabled={isProcessing || isScrolling}
                accessibilityRole="button"
                accessibilityLabel={isLastSlide ? "Get started with Toxic Confessions" : "Go to next slide"}
                accessibilityHint={isLastSlide ? "Complete onboarding and create account" : "Swipe left or tap to go to next slide"}
                accessibilityState={{ disabled: isProcessing || isScrolling }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-white text-16 font-semibold">
                  {isLastSlide ? "Get Started" : "Next"}
                </Text>
                <Ionicons
                  name={isLastSlide ? "rocket" : "chevron-forward"}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 8 }}
                />
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
