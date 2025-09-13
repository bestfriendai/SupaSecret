import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { OnboardingSlide } from '../types/auth';

// Modern onboarding slides with improved content and accessibility
export const getOnboardingSlides = (): OnboardingSlide[] => [
  {
    id: "1",
    title: "Welcome to Toxic Confessions",
    subtitle: "Share Anonymously",
    description:
      "A safe space to share your thoughts, feelings, and experiences completely anonymously. No judgment, just understanding.",
    icon: "lock-closed",
    color: "#1D9BF0",
  },
  {
    id: "2",
    title: "Complete Privacy",
    subtitle: "Your Identity Protected",
    description:
      "Advanced face blur and voice change technology ensures your video confessions remain completely anonymous and secure.",
    icon: "shield-checkmark",
    color: "#10B981",
  },
  {
    id: "3",
    title: "Supportive Community",
    subtitle: "Connect & Support",
    description:
      "Like, comment, and share support with others anonymously. Build connections without revealing your identity.",
    icon: "people",
    color: "#8B5CF6",
  },
  {
    id: "4",
    title: "Ready to Begin?",
    subtitle: "Join the Community",
    description:
      "Create your account and start sharing your story. Remember, everything you share remains completely anonymous.",
    icon: "rocket",
    color: "#F59E0B",
  },
];

// Accessibility helpers for onboarding
export const getOnboardingA11yProps = (slideIndex: number, totalSlides: number, slideTitle: string) => ({
  accessibilityRole: 'tabpanel' as const,
  accessibilityLabel: `Slide ${slideIndex + 1} of ${totalSlides}: ${slideTitle}`,
  accessibilityHint: slideIndex === totalSlides - 1 
    ? 'Last slide. Tap Get Started to continue.' 
    : 'Swipe left to go to next slide or tap Next button.',
});

// Platform-specific onboarding configurations
export const getOnboardingConfig = () => {
  const isTablet = Device.deviceType === Device.DeviceType.TABLET;
  const isLargeScreen = Platform.select({
    ios: isTablet,
    android: isTablet,
    default: false,
  });

  return {
    slideSpacing: isLargeScreen ? 40 : 20,
    iconSize: isLargeScreen ? 60 : 48,
    iconContainerSize: isLargeScreen ? 140 : 120,
    titleFontSize: isLargeScreen ? 32 : 28,
    subtitleFontSize: isLargeScreen ? 22 : 18,
    descriptionFontSize: isLargeScreen ? 18 : 16,
    buttonHeight: isLargeScreen ? 56 : 48,
    progressDotSize: isLargeScreen ? 10 : 8,
    progressDotActiveSize: isLargeScreen ? 32 : 28,
  };
};

// Onboarding analytics helpers (using Expo SDK 54 features)
export const trackOnboardingEvent = async (eventName: string, properties?: Record<string, any>) => {
  try {
    const deviceInfo = {
      deviceType: Device.deviceType,
      deviceName: Device.deviceName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      appVersion: Application.nativeApplicationVersion,
      buildVersion: Application.nativeBuildVersion,
    };

    // In a real app, you would send this to your analytics service
    if (__DEV__) {
      console.log(`[Onboarding Analytics] ${eventName}`, {
        ...properties,
        ...deviceInfo,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Failed to track onboarding event:', error);
  }
};

// Onboarding completion helpers
export const getOnboardingCompletionData = () => ({
  completedAt: new Date().toISOString(),
  version: '2.0', // Modern onboarding version
  platform: Platform.OS,
  deviceType: Device.deviceType,
});

// Validation helpers
export const validateOnboardingState = (user: any, isAuthenticated: boolean) => {
  // Check if user should see onboarding
  if (!isAuthenticated) {
    return { shouldShowOnboarding: true, reason: 'not_authenticated' };
  }
  
  if (isAuthenticated && user && !user.isOnboarded) {
    return { shouldShowOnboarding: true, reason: 'not_onboarded' };
  }
  
  return { shouldShowOnboarding: false, reason: 'completed' };
};

// Error handling for onboarding
export const handleOnboardingError = (error: any, context: string) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  if (__DEV__) {
    console.error(`[Onboarding Error - ${context}]:`, error);
  }
  
  // Track error for analytics
  trackOnboardingEvent('onboarding_error', {
    context,
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  });
  
  return {
    title: 'Something went wrong',
    message: 'Please try again or contact support if the problem persists.',
    action: 'retry',
  };
};

// Performance optimization helpers
export const shouldUseReducedMotion = () => {
  // In a real app, you would check system accessibility settings
  // For now, we'll use a simple device-based heuristic
  return Device.deviceType === Device.DeviceType.UNKNOWN;
};

// Gesture configuration for onboarding
export const getGestureConfig = () => ({
  swipeThreshold: 50,
  swipeVelocityThreshold: 500,
  enableSwipeGestures: true,
  enablePanGestures: Platform.OS === 'ios', // iOS has better pan gesture support
});

// Theme configuration for onboarding
export const getOnboardingTheme = () => ({
  colors: {
    background: '#000000',
    surface: '#1A1A1A',
    primary: '#1D9BF0',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: {
      primary: '#FFFFFF',
      secondary: '#9CA3AF',
      tertiary: '#6B7280',
    },
    border: '#374151',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
});
