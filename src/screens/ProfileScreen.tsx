import React, { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useNotificationStore } from "../state/notificationStore";
import SegmentedTabs, { TabItem } from "../components/SegmentedTabs";
import SettingsScreen from "./SettingsScreen";
import SavedScreen from "./SavedScreen";
import MySecretsScreen from "./MySecretsScreen";
import NotificationsScreen from "./NotificationsScreen";
import { format } from "date-fns";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { userConfessions, loadUserConfessions } = useConfessionStore();
  const { savedConfessionIds } = useSavedStore();
  const { unreadCount, getUnreadCount } = useNotificationStore();
  const [activeTab, setActiveTab] = useState("posts");

  // Load user confessions and notification count when component mounts
  useEffect(() => {
    loadUserConfessions();
    getUnreadCount();
  }, [loadUserConfessions, getUnreadCount]);

  // Calculate user stats
  const userConfessionsCount = userConfessions.length;
  const totalLikes = userConfessions.reduce((sum, c) => sum + (c.likes || 0), 0);
  const memberSince = user?.createdAt ? new Date(user.createdAt) : new Date();

  const tabs: TabItem[] = [
    {
      id: "posts",
      label: "Posts",
      icon: "document-text",
    },
    {
      id: "saved",
      label: "Saved",
      icon: "bookmark",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications",
      badge: unreadCount,
    },
    {
      id: "settings",
      label: "Settings",
      icon: "settings",
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
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Avatar and basic info */}
        <View className="flex-row items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-gray-800 items-center justify-center mr-4">
            <Ionicons name="person" size={28} color="#8B98A5" />
          </View>

          <View className="flex-1">
            <Text className="text-white text-20 font-bold">Anonymous User</Text>
            <Text className="text-gray-500 text-14 mt-1">Member since {format(memberSince, "MMM yyyy")}</Text>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row justify-around mb-6">
          <View className="items-center">
            <Text className="text-white text-18 font-bold">{userConfessionsCount}</Text>
            <Text className="text-gray-500 text-12">Secrets</Text>
          </View>

          <View className="items-center">
            <Text className="text-white text-18 font-bold">{savedConfessionIds.length}</Text>
            <Text className="text-gray-500 text-12">Saved</Text>
          </View>

          <View className="items-center">
            <Text className="text-white text-18 font-bold">{totalLikes}</Text>
            <Text className="text-gray-500 text-12">Total Likes</Text>
          </View>
        </View>

        {/* Segmented Tabs */}
        <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {/* Tab Content */}
      <View className="flex-1">{renderTabContent()}</View>
    </View>
  );
}
