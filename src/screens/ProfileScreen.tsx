import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
      {/* Header with Gradient Background - More Compact */}
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        {/* Profile Header - Ultra Compact */}
        <View className="items-center mb-3">
          {/* Avatar - Smaller */}
          <View className="relative mb-2">
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              className="w-12 h-12 rounded-full items-center justify-center"
            >
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </LinearGradient>

            {/* Online Status Indicator - Smaller */}
            <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-black items-center justify-center">
              <View className="w-1 h-1 bg-white rounded-full" />
            </View>
          </View>

          {/* User Info - More Compact */}
          <Text className="text-white text-16 font-bold mb-0.5">Anonymous User</Text>
          <Text className="text-gray-400 text-12">Member since {format(memberSince, "MMM yyyy")}</Text>
        </View>

        {/* Ultra Compact Stats Cards */}
        <View className="flex-row justify-between mb-3">
          <View className="flex-1 bg-gray-900/40 rounded-lg p-2.5 mr-1 border border-gray-800/30">
            <View className="items-center">
              <View className="w-6 h-6 bg-blue-500/20 rounded-full items-center justify-center mb-1">
                <Ionicons name="document-text" size={12} color="#3B82F6" />
              </View>
              <Text className="text-white text-14 font-bold">{userConfessionsCount}</Text>
              <Text className="text-gray-400 text-10">Secrets</Text>
            </View>
          </View>

          <View className="flex-1 bg-gray-900/40 rounded-lg p-2.5 mx-0.5 border border-gray-800/30">
            <View className="items-center">
              <View className="w-6 h-6 bg-purple-500/20 rounded-full items-center justify-center mb-1">
                <Ionicons name="bookmark" size={12} color="#8B5CF6" />
              </View>
              <Text className="text-white text-14 font-bold">{savedConfessionIds.length}</Text>
              <Text className="text-gray-400 text-10">Saved</Text>
            </View>
          </View>

          <View className="flex-1 bg-gray-900/40 rounded-lg p-2.5 ml-1 border border-gray-800/30">
            <View className="items-center">
              <View className="w-6 h-6 bg-red-500/20 rounded-full items-center justify-center mb-1">
                <Ionicons name="heart" size={12} color="#EF4444" />
              </View>
              <Text className="text-white text-14 font-bold">{totalLikes}</Text>
              <Text className="text-gray-400 text-10">Total Likes</Text>
            </View>
          </View>
        </View>

        {/* Ultra Compact Segmented Tabs */}
        <View className="bg-gray-900/25 rounded-lg p-0.5 border border-gray-800/25">
          <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </View>
      </LinearGradient>

      {/* Tab Content */}
      <View className="flex-1">{renderTabContent()}</View>
    </View>
  );
}
