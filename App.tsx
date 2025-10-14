console.log("[DIAG] App.tsx: Module loading started...");
import { useEffect, useState } from "react";
console.log("[DIAG] App.tsx: React imported");
import { AppState, Platform } from "react-native";
console.log("[DIAG] App.tsx: React Native imports completed");
console.log("[DIAG] App.tsx: About to import supabase...");
import { supabase } from "./src/lib/supabase";
console.log("[DIAG] App.tsx: Supabase imported successfully");
import { startNetworkWatcher, stopNetworkWatcher } from "./src/lib/offlineQueue";
console.log("[DIAG] App.tsx: offlineQueue imported successfully");
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { View, Text, Pressable } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAuthStore, cleanupAuthListener } from "./src/state/authStore";
import { useConfessionStore, cleanupConfessionSubscriptions } from "./src/state/confessionStore";
import { cleanupNotificationSubscriptions } from "./src/state/notificationStore";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ToastProvider } from "./src/contexts/ToastContext";
import RetryBanner from "./src/components/RetryBanner";
import { initializeApp, loadUserData, setupGlobalErrorHandlers } from "./src/initialization/appInitializer";
import "./src/utils/hermesTestUtils"; // Auto-run Hermes compatibility tests

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Setup global error handlers once at app startup
setupGlobalErrorHandlers();

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
    let mounted = true;
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    // AppState listener for session refresh
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (Platform.OS !== "web" && nextAppState === "active") {
        supabase.auth.startAutoRefresh();
      } else if (Platform.OS !== "web") {
        supabase.auth.stopAutoRefresh();
      }
    });

    const runInitialization = async () => {
      const MAX_INIT_TIME = 5000;
      initTimeout = setTimeout(() => {
        if (!mounted) return;
        console.warn("[App.tsx] Initialization timeout - forcing app to show");
        setIsInitializing(false);
        SplashScreen.hideAsync().catch((e) => console.error("Failed to hide splash:", e));
      }, MAX_INIT_TIME);

      try {
        // Step 1: Initialize app services (shared logic)
        const initResult = await initializeApp();
        if (!initResult.success && !__DEV__) {
          console.error("[App.tsx] Critical initialization failure:", initResult.errors);
        }

        // Step 2: Load user data
        const userDataResult = await loadUserData(checkAuthState, loadUserPreferences, loadConfessions);
        if (!userDataResult.success) {
          console.warn("[App.tsx] User data loading incomplete:", userDataResult.warnings);
        }

        console.log("[App.tsx] Initialization completed");
      } catch (error) {
        console.error("[App.tsx] Initialization failed:", error);
      } finally {
        if (initTimeout) {
          clearTimeout(initTimeout);
          initTimeout = null;
        }
        if (mounted) {
          setIsInitializing(false);

          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            console.error("[App.tsx] Error hiding splash screen:", error);
          }
        }
      }
    };

    runInitialization();

    // Deep linking for auth callbacks (magic links, OAuth, etc.)
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!mounted) return;
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
          const { error } = await supabase.auth.verifyOtp({
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
      if (url && mounted) handleDeepLink({ url });
    });

    // Cleanup
    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null;
      }
      subscription?.remove();
      linkingSubscription?.remove();
      cleanupAuthListener();
      cleanupConfessionSubscriptions();
      cleanupNotificationSubscriptions();
      stopNetworkWatcher();

      if (__DEV__) {
        console.log("[App.tsx] Cleanup completed - all listeners and timers cleared");
      }
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
      fallback={(error, _errorInfo) => (
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
