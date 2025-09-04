import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "../screens/HomeScreen";
import CreateConfessionScreen from "../screens/CreateConfessionScreen";
import VideoRecordScreen from "../screens/VideoRecordScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoRecord: undefined;
};

export type TabParamList = {
  Home: undefined;
  Create: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Create") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
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
            fontWeight: "700",
            fontSize: 20,
          },
          headerShadowVisible: false,
        }}
      >
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}