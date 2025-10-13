import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { AppState, Platform, LogBox } from "react-native";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Audio from "expo-audio";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";

// Import stores and utilities
import { useAuthStore, cleanupAuthListener } from "../src/state/authStore";
import { useConfessionStore, cleanupConfessionSubscriptions } from "../src/state/confessionStore";
import { cleanupNotificationSubscriptions } from "../src/state/notificationStore";

// Import contexts and error boundaries
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { ToastProvider } from "../src/contexts/ToastContext";
import RetryBanner from "../src/components/RetryBanner";
import LoadingSpinner from "../src/components/LoadingSpinner";

// Import shared initialization
import { initializeApp, loadUserData, setupGlobalErrorHandlers } from "../src/initialization/appInitializer";
import { supabase } from "../src/lib/supabase";
import { stopNetworkWatcher } from "../src/lib/offlineQueue";

// Global CSS
import "../global.css";

// Suppress known warnings (these are harmless internal Skia warnings with New Architecture)
LogBox.ignoreLogs([
  "<Canvas onLayout={onLayout} /> is not supported on the new architecture",
  "Canvas onLayout",
  "new architecture",
  "is not supported on the new architecture",
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Setup global error handlers once at app startup
setupGlobalErrorHandlers();

// Export error boundary from expo-router
export { ErrorBoundary } from "expo-router";

// Configure unstable settings
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function useProtectedRoute(user: any) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to auth if not logged in
      router.replace("/(auth)/onboarding");
    } else if (user && !user.isOnboarded && !inAuthGroup) {
      // Redirect to onboarding if not onboarded
      router.replace("/(auth)/onboarding");
    } else if (user && user.isOnboarded && inAuthGroup) {
      // Redirect to tabs if authenticated and onboarded
      router.replace("/(tabs)");
    }
  }, [user, segments, router]);
}

function RootLayoutContent() {
  const { user, checkAuthState } = useAuthStore();
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadUserPreferences = useConfessionStore((state) => state.loadUserPreferences);
  const [isInitializing, setIsInitializing] = useState(true);

  // Protected route logic
  useProtectedRoute(user);

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
      const MAX_INIT_TIME = 15000;
      initTimeout = setTimeout(() => {
        if (!mounted) return;
        console.warn("[_layout.tsx] Initialization timeout - forcing app to show");
        setIsInitializing(false);
        SplashScreen.hideAsync().catch((e) => console.error("Failed to hide splash:", e));
      }, MAX_INIT_TIME);

      try {
        // Step 1: Initialize app services (shared logic)
        const initResult = await initializeApp();
        if (!initResult.success && !__DEV__) {
          console.error("[_layout.tsx] Critical initialization failure:", initResult.errors);
        }

        // Step 2: Load user data
        const userDataResult = await loadUserData(checkAuthState, loadUserPreferences, loadConfessions);
        if (!userDataResult.success) {
          console.warn("[_layout.tsx] User data loading incomplete:", userDataResult.warnings);
        }

        console.log("[_layout.tsx] Initialization completed");
      } catch (error) {
        console.error("[_layout.tsx] Initialization failed:", error);
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
            console.error("[_layout.tsx] Error hiding splash screen:", error);
          }
        }
      }
    };

    runInitialization();

    // Deep linking for auth callbacks
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
        console.log('[_layout.tsx] Cleanup completed - all listeners and timers cleared');
      }
    };
  }, [checkAuthState, loadConfessions, loadUserPreferences]);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView
          style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}
        >
          <LoadingSpinner size={48} color="#1D9BF0" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#000000",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerShadowVisible: false,
        animationTypeForReplace: "push",
        gestureEnabled: true,
        animation: "default",
        contentStyle: {
          backgroundColor: "#000000",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="video-record"
        options={{
          title: "Record Video",
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="video-preview"
        options={{
          title: "Preview Video",
          headerShown: true,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="secret-detail"
        options={{
          title: "Secret",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="video-player"
        options={{
          title: "Video",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="saved"
        options={{
          title: "Saved Secrets",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="my-secrets"
        options={{
          title: "My Secrets",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          title: "Toxic Confessions Plus",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="webview"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <RootLayoutContent />
              <RetryBanner />
            </ToastProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
