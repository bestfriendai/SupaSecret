import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useNotificationStore } from "../state/notificationStore";
import SettingsScreen from "./SettingsScreen";
import SavedScreen from "./SavedScreen";
import MySecretsScreen from "./MySecretsScreen";
import NotificationsScreen from "./NotificationsScreen";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { userConfessions, loadUserConfessions } = useConfessionStore();
  const { savedConfessionIds } = useSavedStore();
  const { unreadCount, getUnreadCount } = useNotificationStore();

  const [activeTab, setActiveTab] = useState("posts");

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserConfessions();
      getUnreadCount();
    }, [loadUserConfessions, getUnreadCount]),
  );

  // Management tabs - clean and focused
  const managementTabs = [
    {
      id: "posts",
      label: "Secrets",
      icon: "document-text" as const,
      count: userConfessions.length
    },
    {
      id: "saved",
      label: "Saved",
      icon: "bookmark" as const,
      count: savedConfessionIds.length
    },
    {
      id: "notifications",
      label: "Alerts",
      icon: "notifications" as const,
      badge: unreadCount
    },
    {
      id: "settings",
      label: "Settings",
      icon: "settings" as const
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "posts":
        return <MySecretsScreen />;
      case "saved":
        return <SavedScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <MySecretsScreen />;
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Tab Bar - starts right at top */}
      <View
        className="bg-black px-3 pb-1"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row bg-gray-900 rounded-2xl p-1">
          {managementTabs.map((tab, index) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 ${index > 0 ? 'ml-1' : ''}`}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View className={`px-3 py-3 rounded-xl items-center ${
                activeTab === tab.id
                  ? "bg-blue-500 shadow-lg"
                  : "bg-transparent"
              }`}>
                <View className="relative flex-row items-center justify-center mb-1">
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={activeTab === tab.id ? "#FFFFFF" : "#9CA3AF"}
                  />
                  {/* Count Badge */}
                  {tab.count !== undefined && tab.count > 0 && (
                    <View className="absolute -top-2 -right-2 bg-red-500 rounded-full px-1.5 py-0.5 min-w-[18px] items-center">
                      <Text className="text-white text-9 font-bold">
                        {tab.count > 99 ? "99+" : String(tab.count)}
                      </Text>
                    </View>
                  )}
                  {/* Notification Badge */}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <View className="absolute -top-2 -right-2 bg-red-500 rounded-full px-1.5 py-0.5 min-w-[18px] items-center">
                      <Text className="text-white text-9 font-bold">
                        {tab.badge > 99 ? "99+" : String(tab.badge)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className={`text-11 font-semibold ${
                  activeTab === tab.id ? "text-white" : "text-gray-400"
                }`}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content Area - no gap */}
      <View className="flex-1 bg-black">
        {renderTabContent()}
      </View>
    </View>
  );
}
