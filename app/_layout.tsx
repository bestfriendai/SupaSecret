import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { AppState, Platform, LogBox } from "react-native";
import { Slot, SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Audio from "expo-audio";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";

// Import stores and utilities
import { useAuthStore, cleanupAuthListener, setupAuthListener } from "../src/state/authStore";
import {
  useConfessionStore,
  cleanupConfessionSubscriptions,
  setupConfessionSubscriptions,
} from "../src/state/confessionStore";
import { cleanupNotificationSubscriptions, setupNotificationSubscriptions } from "../src/state/notificationStore";

// Import contexts and error boundaries
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { ToastProvider } from "../src/contexts/ToastContext";
import RetryBanner from "../src/components/RetryBanner";
import LoadingSpinner from "../src/components/LoadingSpinner";

// Import services
import { initializeServices } from "../src/services/ServiceInitializer";
import { checkEnvironment } from "../src/utils/environmentCheck";
import { supabase } from "../src/lib/supabase";

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

// Export error boundary from expo-router
export { ErrorBoundary } from "expo-router";

// Configure unstable settings
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Debug initialization function
const debugInitializeApp = async () => {
  try {
    console.log("[DEBUG] Starting minimal app initialization...");

    // Step 1: Check environment
    console.log("[DEBUG] Step 1: Checking environment...");
    checkEnvironment();

    // Step 2: Initialize services (with error handling)
    console.log("[DEBUG] Step 2: Initializing services...");
    try {
      await initializeServices();
      console.log("[DEBUG] Services initialized successfully");
    } catch (serviceError) {
      console.error("[DEBUG] Service initialization failed:", serviceError);
      // Continue anyway for debugging
    }

    // Step 3: Set up audio session
    console.log("[DEBUG] Step 3: Setting up audio...");
    try {
      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      console.log("[DEBUG] Audio setup successful");
    } catch (audioError) {
      console.error("[DEBUG] Audio setup failed:", audioError);
    }

    console.log("[DEBUG] Minimal initialization completed");
  } catch (error) {
    console.error("[DEBUG] Initialization error:", error);
    throw error;
  }
};

function useProtectedRoute(user: any) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

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
  const { isAuthenticated, user, checkAuthState } = useAuthStore();
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadUserPreferences = useConfessionStore((state) => state.loadUserPreferences);
  const [isInitializing, setIsInitializing] = useState(true);

  // Protected route logic
  useProtectedRoute(user);

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
      const MAX_INIT_TIME = 15000;
      const initTimeout = setTimeout(() => {
        console.warn("[DEBUG] Initialization taking too long, forcing app to show");
        setIsInitializing(false);
        SplashScreen.hideAsync().catch((e) => console.error("Failed to hide splash:", e));
      }, MAX_INIT_TIME);

      try {
        if (__DEV__) {
          console.log("[App] Starting simplified app initialization...");
        }

        // Use the debug initialization function
        await debugInitializeApp();

        // Set up auth listener
        console.log("[DEBUG] Step 4: Setting up auth listener...");
        try {
          setupAuthListener();
          console.log("[DEBUG] Auth listener setup successful");
        } catch (authError) {
          console.error("[DEBUG] Auth listener setup failed:", authError);
        }

        // Set up store subscriptions
        console.log("[DEBUG] Step 5: Setting up store subscriptions...");
        try {
          setupConfessionSubscriptions();
          setupNotificationSubscriptions();
          console.log("[DEBUG] Store subscriptions setup successful");
        } catch (storeError) {
          console.error("[DEBUG] Store subscriptions setup failed:", storeError);
        }

        // Check auth state first
        console.log("[DEBUG] Step 6: Checking auth state...");
        try {
          await checkAuthState();
          console.log("[DEBUG] Auth state check successful");
        } catch (authStateError) {
          console.error("[DEBUG] Auth state check failed:", authStateError);
        }

        // Load user preferences before confessions
        console.log("[DEBUG] Step 7: Loading user preferences...");
        try {
          await loadUserPreferences();
          console.log("[DEBUG] User preferences loaded successfully");
        } catch (error) {
          console.error("[DEBUG] Failed to load user preferences:", error);
        }

        // Load confessions after preferences are set
        console.log("[DEBUG] Step 8: Loading confessions...");
        try {
          await loadConfessions();
          console.log("[DEBUG] Confessions loaded successfully");
        } catch (confessionError) {
          console.error("[DEBUG] Failed to load confessions:", confessionError);
        }

        console.log("[DEBUG] App initialization completed successfully");
      } catch (error) {
        console.error("[DEBUG] App initialization failed:", error);
      } finally {
        clearTimeout(initTimeout);
        setIsInitializing(false);

        try {
          await SplashScreen.hideAsync();
          console.log("[DEBUG] Splash screen hidden successfully");
        } catch (error) {
          console.error("[DEBUG] Error hiding splash screen:", error);
        }
      }
    };

    initializeApp();

    // Deep linking for auth callbacks
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
      if (url) handleDeepLink({ url });
    });

    // Cleanup
    return () => {
      subscription?.remove();
      linkingSubscription?.remove();
      cleanupAuthListener();
      cleanupConfessionSubscriptions();
      cleanupNotificationSubscriptions();
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
          headerShown: true,
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
