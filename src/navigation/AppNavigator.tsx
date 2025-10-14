import React, { useEffect, useState, useCallback } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ErrorState } from "../components/ErrorState";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import CreateConfessionScreen from "../screens/CreateConfessionScreen";
import VideoRecordScreen from "../screens/VideoRecordScreen";
import VideoPreviewScreen from "../screens/VideoPreviewScreen";
import SettingsScreen from "../screens/SettingsScreen";
import MySecretsScreen from "../screens/MySecretsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VideoFeedScreen from "../screens/VideoFeedScreen";
import VideoPlayerScreen from "../screens/VideoPlayerScreen";
import TrendingScreen from "../screens/TrendingScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import SignUpScreen from "../screens/SignUpScreen";
import SignInScreen from "../screens/SignInScreen";
import SecretDetailScreen from "../screens/SecretDetailScreen";
import SavedScreen from "../screens/SavedScreen";
import PaywallScreen from "../screens/PaywallScreen";
import WebViewScreen from "../screens/WebViewScreen";
import AgeGateScreen, { checkAgeVerification } from "../screens/AgeGateScreen";
import { useAuthStore } from "../state/authStore";
import { useGlobalVideoStore } from "../state/globalVideoStore";

import AppHeader from "../components/AppHeader";
import { linking } from "./linking";

import { ProcessedVideo } from "../services/IAnonymiser";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoRecord: undefined;
  VideoPreview: { processedVideo: ProcessedVideo };
  SecretDetail: { confessionId: string };
  VideoPlayer: { confessionId: string };
  Saved: undefined;
  Settings: undefined;
  EditProfile: undefined;
  MySecrets: undefined;
  Paywall: { feature?: string; source?: string };
  WebView: { url: string; title: string };
  AuthStack: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  SignIn: undefined;
};

export type TabParamList = {
  Home: undefined;
  Videos: undefined;
  Create: undefined;
  Trending: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Create navigation ref for v7
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Store the current auth route globally to persist across re-renders
let currentAuthRoute: keyof AuthStackParamList | null = null;

function AuthStackNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  // Determine initial route based on auth state
  const getInitialRouteName = (): keyof AuthStackParamList => {
    // If we have a current route (user navigated to SignIn/SignUp), preserve it
    if (currentAuthRoute) {
      return currentAuthRoute;
    }

    if (!isAuthenticated) {
      return "Onboarding"; // Show onboarding for unauthenticated users
    } else if (isAuthenticated && user && !user.isOnboarded) {
      return "Onboarding"; // Show onboarding for authenticated but not onboarded users
    } else {
      // This case should never be reached since authenticated + onboarded users
      // should be in MainTabs, not AuthStack. But if we get here, show SignIn as fallback
      return "SignIn";
    }
  };

  return (
    <AuthStack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animationTypeForReplace: "push",
        gestureDirection: "horizontal",
        // detachInactiveScreens removed - not supported in current version
        // sceneContainerStyle removed - not supported in current version
      }}
      screenListeners={{
        state: (e) => {
          const state = e.data.state;
          if (state && state.routes && state.index !== undefined) {
            const currentRoute = state.routes[state.index];
            // Track current route to persist it across re-renders
            currentAuthRoute = currentRoute.name as keyof AuthStackParamList;
            if (__DEV__) {
              console.log("[AuthStack] Current route:", currentAuthRoute);
            }
          }
        },
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { setCurrentTab } = useGlobalVideoStore();
  const insets = useSafeAreaInsets();

  // Global video pause handler
  const handleTabChange = (state: any) => {
    const currentRoute = state.routes[state.index];
    if (__DEV__) {
      console.log(`🎥 Tab changed to: ${currentRoute.name}`);
    }
    setCurrentTab(currentRoute.name);
  };

  return (
    <Tab.Navigator
      screenListeners={{
        state: (e) => {
          handleTabChange(e.data.state);
        },
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Videos") {
            iconName = focused ? "videocam" : "videocam-outline";
          } else if (route.name === "Create") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Trending") {
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: "#1D9BF0",
        tabBarInactiveTintColor: "#8B98A5",
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "#2F3336",
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 60 + insets.bottom : 60 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: Platform.OS === "ios" ? insets.bottom : insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarLabelStyle: {
          fontSize: 10,
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarBadgeStyle: {
          backgroundColor: "#F91880",
          color: "#FFFFFF",
        },
        headerStyle: {
          backgroundColor: "#000000",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
        },
        // headerBackTitleVisible removed - not supported in current version
        // detachInactiveScreens removed - not supported in current version
        // sceneContainerStyle removed - not supported in current version
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Secrets",
          header: () => <AppHeader title="Secrets" showTrendingBar={true} />,
        }}
      />
      <Tab.Screen
        name="Videos"
        component={VideoFeedScreen}
        options={{
          title: "Videos",
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateConfessionScreen}
        options={{
          title: "Compose",
          header: () => <AppHeader title="Compose" showTrendingBar={true} />,
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{
          title: "Trending",
          header: () => <AppHeader title="Trending" showTrendingBar={false} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          header: () => <AppHeader title="Profile" showTrendingBar={false} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Helper function for structured navigation logging
const logNavigationState = (context: string, state: any) => {
  if (!__DEV__) return;
  console.log(`[AppNavigator] ${context}:`, state);
};

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkAuthState } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean | null>(null);
  const AUTH_CHECK_TIMEOUT = 10000; // 10 seconds timeout

  // Check age verification on mount
  useEffect(() => {
    const checkAge = async () => {
      const verified = await checkAgeVerification();
      setIsAgeVerified(verified);
    };
    checkAge();
  }, []);

  // Handle age verification completion
  const handleAgeVerified = useCallback(async () => {
    setIsAgeVerified(true);
  }, []);

  // Robust initialization with timeout handling
  const initializeAuth = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Auth check timeout")), AUTH_CHECK_TIMEOUT);
    });

    try {
      await Promise.race([checkAuthState(), timeoutPromise]);
      setIsInitializing(false);
    } catch (error) {
      logNavigationState("Auth initialization failed", error);
      setInitError("Unable to verify authentication status. Please try again.");
      setIsInitializing(false);
    } finally {
      // Clear the timeout to prevent memory leaks and unhandled rejections
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [checkAuthState]);

  useEffect(() => {
    logNavigationState("Mount", { isAuthenticated, hasUser: !!user });
    initializeAuth();
  }, []);

  // Consolidated state logging
  useEffect(() => {
    if (!isInitializing) {
      logNavigationState("State Update", {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
        userId: user?.id,
        isOnboarded: user?.isOnboarded,
      });
    }
  }, [isAuthenticated, isLoading, user, isInitializing]);

  // Show age gate if not verified (BLOCKING - highest priority)
  if (isAgeVerified === false) {
    return <AgeGateScreen onVerified={handleAgeVerified} />;
  }

  // Show loading screen during age check or auth initialization
  if (isAgeVerified === null || isInitializing || isLoading) {
    logNavigationState("Loading", { isAgeVerified, isInitializing, isLoading });
    return (
      <View style={{ flex: 1, backgroundColor: "black", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner size={48} color="#1D9BF0" />
        <Text style={{ color: "#666", marginTop: 16, fontSize: 14 }}>
          {isInitializing ? "Initializing..." : "Loading..."}
        </Text>
      </View>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", padding: 20 }}>
        <ErrorState message={initError} onRetry={initializeAuth} type="auth" />
      </View>
    );
  }

  // Determine which stack to show with simplified logic
  const shouldShowAuth = !isAuthenticated || (user && !user.isOnboarded);

  logNavigationState("Navigation Decision", {
    shouldShowAuth,
    currentAuthRoute,
    reason: !isAuthenticated ? "not_authenticated" : user && !user.isOnboarded ? "needs_onboarding" : "authenticated",
  });

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={{
        dark: true,
        colors: {
          primary: "#1D9BF0",
          background: "#000000",
          card: "#000000",
          text: "#FFFFFF",
          border: "#2F3336",
          notification: "#F91880",
        },
        fonts: {
          regular: {
            fontFamily: "System",
            fontWeight: "400",
          },
          medium: {
            fontFamily: "System",
            fontWeight: "500",
          },
          bold: {
            fontFamily: "System",
            fontWeight: "700",
          },
          heavy: {
            fontFamily: "System",
            fontWeight: "900",
          },
        },
      }}
      fallback={<View style={{ flex: 1, backgroundColor: "#000000" }} />}
      onReady={() => {
        setIsNavigationReady(true);
        logNavigationState("Container Ready", { timestamp: Date.now() });
      }}
      onStateChange={(state) => {
        if (state?.routes && state?.index !== undefined) {
          logNavigationState("Route Changed", state.routes[state.index]?.name);
        }
      }}
    >
      <StatusBar style="light" />
      <Stack.Navigator
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
          // headerBackTitleVisible removed - not supported in current version
          animationTypeForReplace: "push",
          gestureEnabled: true,
          gestureDirection: "horizontal",
          // detachInactiveScreens removed - not supported in current version
          // sceneContainerStyle removed - not supported in current version
        }}
      >
        {shouldShowAuth ? (
          <Stack.Screen name="AuthStack" component={AuthStackNavigator} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="VideoRecord"
              component={VideoRecordScreen}
              options={{
                title: "Record Video",
                headerShown: true,
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="VideoPreview"
              component={VideoPreviewScreen}
              options={{
                title: "Preview Video",
                headerShown: true,
                animation: "slide_from_right",
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="SecretDetail"
              component={SecretDetailScreen}
              options={{
                title: "Secret",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="VideoPlayer"
              component={VideoPlayerScreen}
              options={{
                title: "Video",
                headerShown: false,
                animation: "fade",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="Saved"
              component={SavedScreen}
              options={{
                title: "Saved Secrets",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="MySecrets"
              component={MySecretsScreen}
              options={{
                title: "My Secrets",
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: "Settings",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{
                title: "Toxic Confessions Plus",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="WebView"
              component={WebViewScreen}
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
