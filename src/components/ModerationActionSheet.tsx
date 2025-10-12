/**
 * Moderation Action Sheet
 * Provides user moderation actions: Report, Block User, Hide Content
 * Required for App Store Guideline 1.2 - User Generated Content
 */

import React from "react";
import { View, Text, Pressable, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModerationStore } from "../state/moderationStore";
import { usePreferenceAwareHaptics } from "../hooks/usePreferenceAwareHaptics";

interface ModerationActionSheetProps {
  isVisible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: "confession" | "reply";
  authorId?: string;
  onReport: () => void;
}

export default function ModerationActionSheet({
  isVisible,
  onClose,
  contentId,
  contentType,
  authorId,
  onReport,
}: ModerationActionSheetProps) {
  const { triggerMedium } = usePreferenceAwareHaptics();
  const { blockUser, hideContent, isUserBlocked } = useModerationStore();

  const handleBlockUser = async () => {
    if (!authorId) {
      Alert.alert("Error", "Cannot block this user");
      return;
    }

    if (isUserBlocked(authorId)) {
      Alert.alert("Already Blocked", "You have already blocked this user");
      onClose();
      return;
    }

    Alert.alert("Block User", "Are you sure you want to block this user? You won't see their content anymore.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await triggerMedium();
            await blockUser(authorId, "user_initiated_block");
            Alert.alert("User Blocked", "You will no longer see content from this user");
            onClose();
          } catch (error) {
            console.error("Failed to block user:", error);
            Alert.alert("Error", "Failed to block user. Please try again.");
          }
        },
      },
    ]);
  };

  const handleHideContent = async () => {
    Alert.alert(
      "Hide Post",
      "This will immediately remove this post from your feed. You can undo this later in settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide",
          style: "destructive",
          onPress: async () => {
            try {
              await triggerMedium();
              await hideContent(contentId, contentType, "user_initiated_hide");
              Alert.alert("Post Hidden", "This post has been removed from your feed");
              onClose();
            } catch (error) {
              console.error("Failed to hide content:", error);
              Alert.alert("Error", "Failed to hide content. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleReport = () => {
    triggerMedium();
    onClose();
    onReport();
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/70 justify-end" onPress={onClose}>
        <Pressable className="bg-gray-900 rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View className="px-6 py-4 border-b border-gray-800">
            <Text className="text-white text-18 font-bold">Moderation Options</Text>
            <Text className="text-gray-400 text-14 mt-1">Choose an action for this content</Text>
          </View>

          {/* Actions */}
          <View className="px-4 py-2">
            {/* Report */}
            <Pressable className="flex-row items-center py-4 px-2 active:bg-gray-800 rounded-xl" onPress={handleReport}>
              <View className="w-10 h-10 bg-red-500 bg-opacity-20 rounded-full items-center justify-center mr-4">
                <Ionicons name="flag" size={20} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-semibold">Report Content</Text>
                <Text className="text-gray-400 text-13 mt-0.5">Report for violating community guidelines</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>

            {/* Block User */}
            {authorId && (
              <Pressable
                className="flex-row items-center py-4 px-2 active:bg-gray-800 rounded-xl"
                onPress={handleBlockUser}
              >
                <View className="w-10 h-10 bg-orange-500 bg-opacity-20 rounded-full items-center justify-center mr-4">
                  <Ionicons name="ban" size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-16 font-semibold">Block User</Text>
                  <Text className="text-gray-400 text-13 mt-0.5">Stop seeing content from this user</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </Pressable>
            )}

            {/* Hide Content */}
            <Pressable
              className="flex-row items-center py-4 px-2 active:bg-gray-800 rounded-xl"
              onPress={handleHideContent}
            >
              <View className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-full items-center justify-center mr-4">
                <Ionicons name="eye-off" size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-semibold">Hide Post</Text>
                <Text className="text-gray-400 text-13 mt-0.5">Remove this post from your feed</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Cancel Button */}
          <View className="px-4 pb-6 pt-2">
            <Pressable className="bg-gray-800 rounded-xl py-4 items-center active:bg-gray-700" onPress={onClose}>
              <Text className="text-white text-16 font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
