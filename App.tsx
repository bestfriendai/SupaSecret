import React, { useEffect, useState } from "react";
import "./global.css";
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
  const checkAuthState = useAuthStore((state) => state.checkAuthState);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadUserPreferences = useConfessionStore((state) => state.loadUserPreferences);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (__DEV__) {
          console.log("[App] Starting app initialization...");
        }

        // Check environment variables
        checkEnvironment();

        // Initialize services
        await initializeServices();

        // Set up audio session
        await Audio.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        // Set up auth listener
        setupAuthListener();

        // Set up store subscriptions
        setupConfessionSubscriptions();
        setupNotificationSubscriptions();

        // Check auth state first
        await checkAuthState();

        // Load user preferences before confessions (ensures store is initialized)
        try {
          await loadUserPreferences();
        } catch (error) {
          console.error("[App] Failed to load user preferences:", error);
          // Continue with default preferences
        }

        // Load confessions after preferences are set
        await loadConfessions();

        // Offline queue starts automatically

        if (__DEV__) {
          console.log("[App] App initialization completed successfully");
        }
      } catch (error) {
        console.error("[App] App initialization failed:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      cleanupAuthListener();
      cleanupConfessionSubscriptions();
      cleanupNotificationSubscriptions();
      // Offline queue cleanup is handled automatically
    };
  }, [checkAuthState, loadConfessions, loadUserPreferences]);

  // Show a simple loading screen while initializing
  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          {/* Simple loading indicator - can be replaced with a splash screen */}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ToastProvider>
              <AppNavigator />
              <RetryBanner />
            </ToastProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
