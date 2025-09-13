import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Audio from "expo-audio";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAuthStore, cleanupAuthListener, setupAuthListener } from "./src/state/authStore";
import {
  useConfessionStore,
  cleanupConfessionSubscriptions,
  setupConfessionSubscriptions,
} from "./src/state/confessionStore";
import { cleanupNotificationSubscriptions, setupNotificationSubscriptions } from "./src/state/notificationStore";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ToastProvider } from "./src/contexts/ToastContext";
import RetryBanner from "./src/components/RetryBanner";
import { offlineQueue } from "./src/utils/offlineQueue";
import { initializeServices } from "./src/services/ServiceInitializer";
import { checkEnvironment } from "./src/utils/environmentCheck";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  // Debug: Log component render with provider hierarchy
  if (__DEV__) {
    console.log(`[App] Component rendering at ${new Date().toISOString()}`);
    console.log("[App] Provider hierarchy: SafeAreaProvider > ErrorBoundary > GestureHandlerRootView > ToastProvider > BottomSheetModalProvider > AppNavigator");
  }

  // Store hooks must be called unconditionally at the top level
  const checkAuthState = useAuthStore((state) => state.checkAuthState);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadUserPreferences = useConfessionStore((state) => state.loadUserPreferences);

  if (__DEV__) {
    console.log("[App] Store hooks initialized successfully");
    console.log("[App] useAuthStore, useConfessionStore hooks ready for touch event handling");
  }

  useEffect(() => {
    if (__DEV__) {
      console.log(`[App] useEffect running at ${new Date().toISOString()}`);
    }

    const initializeApp = async () => {
      try {
        if (__DEV__) {
          console.log("[App] Starting app initialization with touch event system checks...");
        }

        // Check environment and log dependency availability
        try {
          checkEnvironment();
          if (__DEV__) {
            console.log("[App] Environment check completed - touch handlers should be available");
          }
        } catch (error) {
          console.error("❌ Environment check failed:", error);
          // Continue initialization even if environment check fails
        }

        // Configure audio session for video playback
        try {
          await Audio.setAudioModeAsync({
            allowsRecording: false,
            shouldPlayInBackground: false,
            playsInSilentMode: true,
            interruptionModeAndroid: "duckOthers",
          });
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to configure audio session:", error);
          }
          // Continue initialization even if audio setup fails
        }

        // Set up Supabase subscriptions with error handling
        try {
          setupAuthListener();
          setupConfessionSubscriptions();
          setupNotificationSubscriptions();
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to setup subscriptions:", error);
          }
          // Continue initialization even if subscriptions fail
        }

        // Initialize all production services
        const serviceResult = await initializeServices();
        if (!serviceResult.success) {
          console.error("Some services failed to initialize:", serviceResult.errors);
        }
        if (serviceResult.warnings.length > 0) {
          console.warn("Service initialization warnings:", serviceResult.warnings);
        }

        // Initialize auth state and load initial data
        try {
          await checkAuthState();
          await loadConfessions();
          await loadUserPreferences();
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to load initial data:", error);
          }
          // Continue initialization even if data loading fails
        }

        if (__DEV__) {
          console.log("🚀 App initialization complete with audio session configured and subscriptions set up");
          console.log("[App] Touch event system fully initialized and ready for user interactions");
        }
      } catch (error) {
        console.error("❌ App initialization failed:", error);
        // Set app-level error state or show user-friendly message
        // For now, we'll continue with graceful degradation
      }
    };

    initializeApp();

    // Cleanup function to unsubscribe from all Supabase listeners and offline queue
    // Wrap each cleanup call in safe try/catch to ensure all cleanups are attempted
    return () => {
      const safeCleanup = (cleanupFn: () => void, name: string) => {
        try {
          cleanupFn();
        } catch (error) {
          console.error(`❌ Cleanup failed for ${name}:`, error);
        }
      };

      safeCleanup(cleanupAuthListener, "auth listener");
      safeCleanup(cleanupConfessionSubscriptions, "confession subscriptions");
      safeCleanup(cleanupNotificationSubscriptions, "notification subscriptions");
      safeCleanup(() => offlineQueue.cleanup(), "offline queue");

      if (__DEV__) {
        console.log("🧹 App cleanup: All Supabase subscriptions and offline queue cleaned up");
      }
    };
  }, [checkAuthState, loadConfessions, loadUserPreferences]);

  // Log component render information in useEffect to avoid render-phase side effects
  useEffect(() => {
    if (__DEV__) {
      console.log("[App] Rendering App JSX with provider hierarchy for touch event handling...");
      console.log("[App] GestureHandlerRootView rendered with touch debugging");
      console.log("[App] ToastProvider rendered - checking for touch interference");
      console.log("[App] RetryBanner rendered with pointerEvents='none'");
      console.log("[App] BottomSheetModalProvider rendered - potential touch event interceptor");
    }
  });

  // Debug: Add error boundary with detailed logging
  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // Log to crash analytics in production
          console.error("App-level error:", error, errorInfo);

          // Safely handle error properties with type checking
          if (error instanceof Error) {
            console.error("[DEBUG] Error boundary caught:", error.message);
            console.error("[DEBUG] Error stack:", error.stack);
          } else {
            console.error("[DEBUG] Error boundary caught unknown error:", error);
          }

          if (__DEV__) {
            console.error("[DEBUG] Error info:", JSON.stringify(errorInfo, null, 2));
          }
        }}
        resetOnPropsChange={true}
      >
        <GestureHandlerRootView 
          className="flex-1"
        >
          <ToastProvider>
            <RetryBanner />
            <BottomSheetModalProvider>
              <AppNavigator />
            </BottomSheetModalProvider>
          </ToastProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
