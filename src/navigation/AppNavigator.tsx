import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import CreateConfessionScreen from "../screens/CreateConfessionScreen";
import VideoRecordScreen from "../screens/VideoRecordScreen";
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
import { useAuthStore } from "../state/authStore";
import { useGlobalVideoStore } from "../state/globalVideoStore";

import AppHeader from "../components/AppHeader";
import { linking } from "./linking";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoRecord: undefined;
  SecretDetail: { confessionId: string };
  VideoPlayer: { confessionId: string };
  Saved: undefined;
  Settings: undefined;
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

function AuthStackNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  // Determine initial route based on auth state
  const getInitialRouteName = (): keyof AuthStackParamList => {
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
        animationTypeForReplace: 'push',
        gestureDirection: 'horizontal',
        // detachInactiveScreens removed - not supported in current version
        // sceneContainerStyle removed - not supported in current version
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
        tabPress: (e) => {
          // Prevent default behavior if needed
          // e.preventDefault();
        },
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
          height: 60,
          paddingBottom: 8,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarBadgeStyle: {
          backgroundColor: '#F91880',
          color: '#FFFFFF',
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
          title: "Toxic Confessions",
          header: () => <AppHeader title="Toxic Confessions" showTrendingBar={true} />,
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

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkAuthState } = useAuthStore();

  useEffect(() => {
    if (__DEV__) {
      console.log("[AppNavigator] Mount useEffect - calling checkAuthState");
    }
    checkAuthState();
  }, [checkAuthState]);

  if (__DEV__) {
    console.log("[AppNavigator] Rendering - current state:", {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userId: user?.id,
    });
  }

  // Show loading screen while checking auth state
  if (isLoading) {
    if (__DEV__) {
      console.log("[AppNavigator] SHOWING LOADING SCREEN - isLoading is true");
    }
    return (
      <View style={{ flex: 1, backgroundColor: "black", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1D9BF0" />
      </View>
    );
  }

  // Determine which stack to show
  // Show auth stack if: not authenticated OR authenticated but not onboarded
  const shouldShowAuth = !isAuthenticated || (isAuthenticated && user && !user.isOnboarded);

  if (__DEV__) {
    console.log("[AppNavigator] Navigation decision:", {
      isAuthenticated,
      user: user ? `${user.email} (onboarded: ${user.isOnboarded})` : null,
      shouldShowAuth,
      reason: !isAuthenticated
        ? "not authenticated"
        : isAuthenticated && user && !user.isOnboarded
          ? "not onboarded"
          : "fully authenticated",
    });
  }

  if (__DEV__) {
    if (shouldShowAuth) {
      console.log("[AppNavigator] RENDERING AUTH STACK - user needs authentication/onboarding");
    } else {
      console.log("[AppNavigator] RENDERING MAIN TABS - user is fully authenticated");
    }
  }

  return (
    <NavigationContainer
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
      fallback={<View style={{ flex: 1, backgroundColor: '#000000' }} />}
      onReady={() => {
        if (__DEV__) {
          console.log("🧭 Navigation container ready");
        }
      }}
      onStateChange={(state) => {
        if (__DEV__) {
          console.log("🧭 Navigation state changed:", state?.routes[state?.index]?.name);
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
          animationTypeForReplace: 'push',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
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
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
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
                animation: 'fade',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }}
            />
            <Stack.Screen
              name="Saved"
              component={SavedScreen}
              options={{
                title: "Saved Secrets",
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
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
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
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
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                gestureDirection: 'vertical',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
