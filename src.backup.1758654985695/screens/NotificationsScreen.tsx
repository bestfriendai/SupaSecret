import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Alert, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationStore } from "../state/notificationStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { formatDistanceToNow } from "date-fns";
import type { GroupedNotification } from "../types/notification";
import NotificationSkeleton from "../components/NotificationSkeleton";
import { getButtonA11yProps } from "../utils/accessibility";
import { useDebouncedRefresh } from "../utils/consolidatedUtils";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();
  const [refreshing, setRefreshing] = useState(false);

  const {
    groupedNotifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotificationStore();

  // Debounced refresh functionality
  const refresh = useDebouncedRefresh(loadNotifications, 1000);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (notification: GroupedNotification) => {
      if (notification.is_read) return;

      try {
        // Mark all notifications in the group as read
        await Promise.all(notification.notifications.filter((n) => !n.read_at).map((n) => markAsRead(n.id)));
        impactAsync();
      } catch {
        Alert.alert("Error", "Failed to mark notification as read");
      }
    },
    [markAsRead, impactAsync],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    try {
      await markAllAsRead();
      impactAsync();
    } catch {
      Alert.alert("Error", "Failed to mark all as read");
    }
  }, [markAllAsRead, unreadCount, impactAsync]);

  const handleClearAll = useCallback(async () => {
    if (groupedNotifications.length === 0) return;

    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllNotifications();
              impactAsync();
            } catch {
              Alert.alert("Error", "Failed to clear notifications");
            }
          },
        },
      ],
    );
  }, [groupedNotifications.length, clearAllNotifications, impactAsync]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return "heart";
      case "reply":
        return "chatbubble";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like":
        return "#EF4444";
      case "reply":
        return "#3B82F6";
      default:
        return "#8B98A5";
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: GroupedNotification }) => {
      const timeAgo = formatDistanceToNow(new Date(item.latest_created_at), { addSuffix: true });
      const isUnread = !item.is_read;

      return (
        <Pressable
          className={`bg-gray-900 rounded-lg p-4 mb-3 mx-4 ${isUnread ? "border-l-4 border-blue-500" : ""}`}
          onPress={() => handleMarkAsRead(item)}
        >
          <View className="flex-row items-start">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${getNotificationColor(item.type)}20` }}
            >
              <Ionicons name={getNotificationIcon(item.type)} size={20} color={getNotificationColor(item.type)} />
            </View>

            <View className="flex-1">
              <View className="flex-row justify-between items-start mb-1">
                <Text className={`text-15 ${isUnread ? "text-white font-semibold" : "text-gray-300"}`}>
                  {item.message}
                  {item.count > 1 && (
                    <Text className="text-blue-400 font-medium">
                      {" "}
                      and {String(item.count - 1)} other{item.count > 2 ? "s" : ""}
                    </Text>
                  )}
                </Text>

                {isUnread && <View className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1" />}
              </View>

              <Text className="text-gray-500 text-12">{timeAgo}</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [handleMarkAsRead],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center p-6">
        <Ionicons name="notifications-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-18 font-bold mt-4 text-center">No notifications yet</Text>
        <Text className="text-gray-500 text-14 mt-2 text-center">
          You'll see likes and replies to your secrets here
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        style={{
          paddingTop: 0,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-20 font-bold">Notifications</Text>
            {unreadCount > 0 && <Text className="text-blue-400 text-12 mt-1">{String(unreadCount)} unread</Text>}
          </View>

          <View className="flex-row">
            {unreadCount > 0 && (
              <Pressable
                onPress={handleMarkAllAsRead}
                className="bg-blue-600 px-3 py-2 rounded-lg mr-2"
                {...getButtonA11yProps(
                  `Mark all ${unreadCount} notifications as read`,
                  "Double tap to mark all notifications as read",
                )}
              >
                <Text className="text-white text-12 font-medium">Mark All Read</Text>
              </Pressable>
            )}

            {groupedNotifications.length > 0 && (
              <Pressable
                onPress={handleClearAll}
                className="bg-gray-700 px-3 py-2 rounded-lg"
                {...getButtonA11yProps("Clear all notifications", "Double tap to clear all notifications")}
              >
                <Text className="text-white text-12 font-medium">Clear All</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-red-900 mx-4 mt-4 p-3 rounded-lg">
          <Text className="text-red-200 text-14">{error}</Text>
        </View>
      )}

      {/* Notifications List */}
      <FlashList
        data={groupedNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 16 }}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" colors={["#1D9BF0"]} />
        }
        // FlashList v2 performance props
      />
    </View>
  );
}
