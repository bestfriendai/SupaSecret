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
import VideoFeedScreen from "../screens/VideoFeedScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import SignUpScreen from "../screens/SignUpScreen";
import SignInScreen from "../screens/SignInScreen";
import SecretDetailScreen from "../screens/SecretDetailScreen";
import { useAuthStore } from "../state/authStore";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoRecord: undefined;
  SecretDetail: { confessionId: string };
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
  Settings: undefined;
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
      return "Onboarding"; // Fallback to onboarding
    }
  };

  return (
    <AuthStack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Videos") {
            iconName = focused ? "videocam" : "videocam-outline";
          } else if (route.name === "Create") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
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
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: "Secrets" }}
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedScreen}
        options={{ title: "Videos" }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateConfessionScreen}
        options={{ title: "Compose" }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkAuthState } = useAuthStore();

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#1D9BF0" />
      </View>
    );
  }

  // Determine which stack to show
  // Show auth stack if: not authenticated OR authenticated but not onboarded
  const shouldShowAuth = !isAuthenticated || (isAuthenticated && user && !user.isOnboarded);

  // Debug logging (remove in production)
  if (__DEV__) {
    console.log('🔍 Navigation state:', {
      isAuthenticated,
      user: user ? `${user.email} (onboarded: ${user.isOnboarded})` : null,
      shouldShowAuth,
      reason: !isAuthenticated ? 'not authenticated' :
              (isAuthenticated && user && !user.isOnboarded) ? 'not onboarded' : 'fully authenticated'
    });
  }

  return (
    <NavigationContainer
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
        }}
      >
        {shouldShowAuth ? (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthStackNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="VideoRecord"
              component={VideoRecordScreen}
              options={{
                title: "Record Video",
                presentation: "modal"
              }}
            />
            <Stack.Screen
              name="SecretDetail"
              component={SecretDetailScreen}
              options={{
                title: "Secret",
                headerShown: false
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}