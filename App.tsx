import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Audio } from "expo-av";
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
  const checkAuthState = useAuthStore((state) => state.checkAuthState);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadUserPreferences = useConfessionStore((state) => state.loadUserPreferences);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check environment and log dependency availability
        try {
          checkEnvironment();
        } catch (error) {
          console.error("❌ Environment check failed:", error);
          // Continue initialization even if environment check fails
        }

        // Configure audio session for video playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Set up Supabase subscriptions
        setupAuthListener();
        setupConfessionSubscriptions();
        setupNotificationSubscriptions();

        // Initialize all production services
        const serviceResult = await initializeServices();
        if (!serviceResult.success) {
          console.error("Some services failed to initialize:", serviceResult.errors);
        }
        if (serviceResult.warnings.length > 0) {
          console.warn("Service initialization warnings:", serviceResult.warnings);
        }

        // Initialize auth state first
        await checkAuthState();

        // Load initial data
        await loadConfessions();
        await loadUserPreferences();

        if (__DEV__) {
          console.log("🚀 App initialization complete with audio session configured and subscriptions set up");
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

  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // Log to crash analytics in production
          console.error("App-level error:", error, errorInfo);
        }}
        resetOnPropsChange={true}
      >
        <GestureHandlerRootView className="flex-1">
          <ToastProvider>
            <BottomSheetModalProvider>
              <AppNavigator />
            </BottomSheetModalProvider>
          </ToastProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
