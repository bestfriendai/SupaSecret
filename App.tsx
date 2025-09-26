import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { supabase } from "./src/lib/supabase";
import * as Linking from "expo-linking";
import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { View, Text, Pressable } from "react-native";
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
import "./src/utils/hermesTestUtils"; // Auto-run Hermes compatibility tests

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
// import { OPENAI_API_KEY } from '@env'; // Removed - not needed
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
    // AppState listener for session refresh
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (Platform.OS !== "web" && nextAppState === "active") {
        supabase.auth.startAutoRefresh();
      } else if (Platform.OS !== "web") {
        supabase.auth.stopAutoRefresh();
      }
    });

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

    // Deep linking for auth callbacks (magic links, OAuth, etc.)
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url.includes("auth/callback") || url.includes("/auth/v1/verify")) {
        const { queryParams } = Linking.parse(url);
        if (!queryParams) return;
        const { token_hash, type, error_description } = queryParams;
        if (error_description) {
          console.error("Auth error:", error_description);
          return;
        }
        if (token_hash && type) {
          const tokenHashStr = Array.isArray(token_hash) ? token_hash[0] : token_hash;
          const typeStr = Array.isArray(type) ? type[0] : type;
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHashStr,
            type: typeStr as any,
          });
          if (error) console.error("Verify OTP error:", error);
          else console.log("Auth verified successfully");
        }
      }
    };

    // Add listener
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Cleanup
    return () => {
      subscription?.remove();
      linkingSubscription?.remove();
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
        <GestureHandlerRootView
          style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}
        >
          {/* Simple loading indicator - can be replaced with a splash screen */}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Enhanced error logging for Hermes issues
        if (__DEV__) {
          console.group("🚨 App-Level Error Boundary");
          console.error("Error:", error);
          console.error("Error Info:", errorInfo);
          console.error("Stack:", error.stack);
          console.groupEnd();
        }
      }}
      resetOnPropsChange={true}
      fallback={(error, errorInfo) => (
        <SafeAreaProvider>
          <GestureHandlerRootView
            style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000", padding: 20 }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 18, textAlign: "center", marginBottom: 20 }}>
                App encountered an error and needs to restart
              </Text>
              <Text style={{ color: "#666", fontSize: 14, textAlign: "center", marginBottom: 30 }}>
                {error.message}
              </Text>
              <Pressable
                style={{ backgroundColor: "#007AFF", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                onPress={() => {
                  // Force app reload for Hermes issues
                  if (typeof window !== "undefined" && window.location) {
                    window.location.reload();
                  }
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Reload App</Text>
              </Pressable>
            </View>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      )}
    >
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
