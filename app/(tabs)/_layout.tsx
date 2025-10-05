import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalVideoStore } from "../../src/state/globalVideoStore";
import AppHeader from "../../src/components/AppHeader";

function TabBarIcon(props: { name: React.ComponentProps<typeof Ionicons>["name"]; color: string; focused: boolean }) {
  return <Ionicons name={props.name} size={24} color={props.color} />;
}

export default function TabLayout() {
  const { setCurrentTab } = useGlobalVideoStore();
  const insets = useSafeAreaInsets();

  // Global video pause handler
  const handleTabChange = (state: any) => {
    const currentRoute = state.routes[state.index];
    if (__DEV__) {
      console.log(`Tab changed to: ${currentRoute.name}`);
    }
    setCurrentTab(currentRoute.name);
  };

  return (
    <Tabs
      screenListeners={{
        state: (e) => {
          handleTabChange(e.data.state);
        },
      }}
      screenOptions={{
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Secrets",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
          header: () => <AppHeader title="Secrets" showTrendingBar={true} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: "Videos",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? "videocam" : "videocam-outline"} color={color} focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Compose",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? "add-circle" : "add-circle-outline"} color={color} focused={focused} />
          ),
          header: () => <AppHeader title="Compose" showTrendingBar={true} />,
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: "Trending",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? "stats-chart" : "stats-chart-outline"} color={color} focused={focused} />
          ),
          header: () => <AppHeader title="Trending" showTrendingBar={false} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ),
          header: () => <AppHeader title="Profile" showTrendingBar={false} />,
        }}
      />
    </Tabs>
  );
}
