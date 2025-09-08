import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from "../state/authStore";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useNotificationStore } from "../state/notificationStore";
import SegmentedTabs, { TabItem } from "../components/SegmentedTabs";
import { AvatarService, validateImage } from "../services/AvatarService";
import { useMediaPermissions } from "../hooks/useMediaPermissions";
import SettingsScreen from "./SettingsScreen";
import SavedScreen from "./SavedScreen";
import MySecretsScreen from "./MySecretsScreen";
import NotificationsScreen from "./NotificationsScreen";
import { useToastHelpers } from "../contexts/ToastContext";
import { format } from "date-fns";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateUser } = useAuthStore();
  const { userConfessions, loadUserConfessions } = useConfessionStore();
  const { savedConfessionIds } = useSavedStore();
  const { unreadCount, getUnreadCount } = useNotificationStore();
  const { showSuccess, showError } = useToastHelpers();
  const { requestMediaLibraryPermission, permissionState } = useMediaPermissions();

  const [activeTab, setActiveTab] = useState("posts");
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserConfessions();
      getUnreadCount();
    }, [loadUserConfessions, getUnreadCount])
  );

  // Avatar upload functionality
  const handleAvatarPress = async () => {
    try {
      // Request media library permission
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return; // Permission alert is handled by the hook
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        exif: false, // Don't include EXIF data for privacy
      });

      if (!result.canceled && result.assets[0]) {
        await updateAvatarImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Avatar selection error:', error);
      showError('Failed to select image. Please try again.');
    }
  };

  const updateAvatarImage = async (imageUri: string) => {
    if (!user?.id) {
      showError('User not found. Please sign in again.');
      return;
    }

    try {
      setIsAvatarLoading(true);
      setAvatarUploadProgress(0);

      // Validate image first
      const validation = await validateImage(imageUri);
      if (!validation.valid) {
        showError(validation.error || 'Invalid image selected');
        return;
      }

      // Upload avatar with progress tracking
      const newAvatarUrl = await AvatarService.updateAvatar(
        imageUri,
        user.id,
        user.avatar_url || undefined,
        {
          onProgress: (progress) => {
            setAvatarUploadProgress(progress);
          },
        }
      );

      // Update user profile in auth store
      await updateUser({
        avatar_url: newAvatarUrl,
      });

      showSuccess('Avatar updated successfully!');
    } catch (error) {
      console.error('Avatar update error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to update avatar. Please try again.';
      showError(errorMessage);
    } finally {
      setIsAvatarLoading(false);
      setAvatarUploadProgress(0);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              showSuccess('You have been signed out successfully.');
            } catch (error) {
              showError('Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Calculate user stats
  const userConfessionsCount = userConfessions.length;
  const totalLikes = userConfessions.reduce((sum, c) => sum + (c.likes || 0), 0);
  const memberSince = user?.createdAt ? new Date(user.createdAt) : new Date();

  // Get display name with fallbacks
  const displayName = user?.username ||
                     user?.email?.split('@')[0] ||
                     'Anonymous User';

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
        {/* Profile Header - Improved */}
        <View className="items-center mb-4">
          {/* Avatar with Upload Functionality */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={isAvatarLoading}
            className="relative mb-3"
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            <View className="w-16 h-16 rounded-full overflow-hidden">
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-16 h-16"
                  style={{ resizeMode: 'cover' }}
                />
              ) : (
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  className="w-16 h-16 items-center justify-center"
                >
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </LinearGradient>
              )}

              {/* Loading overlay with progress */}
              {isAvatarLoading && (
                <View className="absolute inset-0 bg-black/70 items-center justify-center">
                  <View className="items-center">
                    <ActivityIndicator color="#3B82F6" size="small" />
                    {avatarUploadProgress > 0 && (
                      <Text className="text-white text-xs mt-1">
                        {Math.round(avatarUploadProgress)}%
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Edit Icon */}
            <View className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-black">
              <Ionicons
                name={isAvatarLoading ? "hourglass" : "camera"}
                size={12}
                color="#FFFFFF"
              />
            </View>
          </Pressable>

          {/* User Info - Enhanced */}
          <View className="items-center mb-2">
            <Text className="text-white text-18 font-bold mb-1">
              {displayName}
            </Text>
            <Text className="text-gray-400 text-13 mb-1">
              Member since {format(memberSince, 'MMMM yyyy')}
            </Text>

            {/* Anonymity Badge */}
            <View className="bg-green-500/20 border border-green-500 rounded-full px-2 py-0.5">
              <Text className="text-green-400 text-11 font-medium">
                Anonymous Profile
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Stats Grid */}
        <View className="flex-row justify-between mb-4">
          <Pressable
            className="flex-1 bg-gray-900/50 rounded-xl p-3 mr-1.5 border border-gray-800/40"
            onPress={() => setActiveTab("posts")}
            accessibilityRole="button"
            accessibilityLabel={`View your ${userConfessionsCount} secrets`}
          >
            <View className="items-center">
              <View className="w-8 h-8 bg-blue-500/20 rounded-full items-center justify-center mb-2">
                <Ionicons name="document-text" size={16} color="#3B82F6" />
              </View>
              <Text className="text-white text-16 font-bold">{userConfessionsCount}</Text>
              <Text className="text-gray-400 text-11">Secrets</Text>
            </View>
          </Pressable>

          <Pressable
            className="flex-1 bg-gray-900/50 rounded-xl p-3 mx-0.5 border border-gray-800/40"
            onPress={() => setActiveTab("saved")}
            accessibilityRole="button"
            accessibilityLabel={`View your ${savedConfessionIds.length} saved secrets`}
          >
            <View className="items-center">
              <View className="w-8 h-8 bg-purple-500/20 rounded-full items-center justify-center mb-2">
                <Ionicons name="bookmark" size={16} color="#8B5CF6" />
              </View>
              <Text className="text-white text-16 font-bold">{savedConfessionIds.length}</Text>
              <Text className="text-gray-400 text-11">Saved</Text>
            </View>
          </Pressable>

          <View className="flex-1 bg-gray-900/50 rounded-xl p-3 ml-1.5 border border-gray-800/40">
            <View className="items-center">
              <View className="w-8 h-8 bg-red-500/20 rounded-full items-center justify-center mb-2">
                <Ionicons name="heart" size={16} color="#EF4444" />
              </View>
              <Text className="text-white text-16 font-bold">{totalLikes}</Text>
              <Text className="text-gray-400 text-11">Total Likes</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-between mb-3">
          <Pressable
            className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-4 mr-2"
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
              <Text className="text-red-400 text-13 font-medium ml-2">Sign Out</Text>
            </View>
          </Pressable>

          <Pressable
            className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg py-2 px-4 ml-2"
            onPress={() => setActiveTab("settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="settings-outline" size={16} color="#3B82F6" />
              <Text className="text-blue-400 text-13 font-medium ml-2">Settings</Text>
            </View>
          </Pressable>
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
