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
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#111827",
          borderTopColor: "#374151",
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: "#111827",
        },
        headerTintColor: "#F9FAFB",
        headerTitleStyle: {
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: "Everyone's Secret" }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateConfessionScreen}
        options={{ title: "Share Secret" }}
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
          primary: "#8B5CF6",
          background: "#0F172A",
          card: "#111827",
          text: "#F9FAFB",
          border: "#374151",
          notification: "#EF4444",
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
            backgroundColor: "#111827",
          },
          headerTintColor: "#F9FAFB",
          headerTitleStyle: {
            fontWeight: "600",
          },
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