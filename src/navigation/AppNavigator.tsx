import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "../screens/HomeScreen";
import CreateConfessionScreen from "../screens/CreateConfessionScreen";
import VideoRecordScreen from "../screens/VideoRecordScreen";
import SettingsScreen from "../screens/SettingsScreen";
import VideoFeedScreen from "../screens/VideoFeedScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoRecord: undefined;
};

export type TabParamList = {
  Home: undefined;
  Videos: undefined;
  Create: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Videos") {
            iconName = focused ? "play" : "play-outline";
          } else if (route.name === "Create") {
            iconName = focused ? "add" : "add-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          if (route.name === "Create") {
            return (
              <View className="w-12 h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-full items-center justify-center shadow-lg">
                <Ionicons name={iconName} size={24} color="#FFFFFF" />
              </View>
            );
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: "#FF0050",
        tabBarInactiveTintColor: "#8B98A5",
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          borderTopWidth: 0.5,
          height: 90,
          paddingBottom: 25,
          paddingTop: 15,
        },
        headerStyle: {
          backgroundColor: "#000000",
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: "Secrets",
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 22,
          }
        }}
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedScreen}
        options={{ 
          title: "Videos",
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateConfessionScreen}
        options={{ 
          title: "Create",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
          }
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          title: "Profile",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
          }
        }}
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