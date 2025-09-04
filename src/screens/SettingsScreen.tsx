import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConfessionStore } from "../state/confessionStore";

export default function SettingsScreen() {
  const { confessions, clearAllConfessions } = useConfessionStore();

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Confessions",
      `Are you sure you want to delete all ${confessions.length} confessions? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: () => {
            clearAllConfessions();
            Alert.alert("Success", "All confessions have been cleared.");
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="flex-1 px-4 py-6">
        <Text className="text-white text-2xl font-bold mb-2">
          Settings
        </Text>
        <Text className="text-gray-400 text-base mb-8">
          Manage your anonymous confession app
        </Text>

        <View className="space-y-4">
          {/* Stats Section */}
          <View className="bg-gray-800 rounded-xl p-4">
            <Text className="text-white text-lg font-semibold mb-3">
              Statistics
            </Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-300">Total Confessions</Text>
              <Text className="text-purple-400 font-medium">{confessions.length}</Text>
            </View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-300">Text Confessions</Text>
              <Text className="text-purple-400 font-medium">
                {confessions.filter(c => c.type === "text").length}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-300">Video Confessions</Text>
              <Text className="text-purple-400 font-medium">
                {confessions.filter(c => c.type === "video").length}
              </Text>
            </View>
          </View>

          {/* Privacy Section */}
          <View className="bg-gray-800 rounded-xl p-4">
            <Text className="text-white text-lg font-semibold mb-3">
              Privacy & Security
            </Text>
            <View className="flex-row items-center mb-3">
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text className="text-gray-300 ml-3 flex-1">
                All confessions are completely anonymous
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="eye-off" size={20} color="#10B981" />
              <Text className="text-gray-300 ml-3 flex-1">
                Video faces are automatically blurred
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="volume-off" size={20} color="#10B981" />
              <Text className="text-gray-300 ml-3 flex-1">
                Video voices are automatically changed
              </Text>
            </View>
          </View>

          {/* Danger Zone */}
          <View className="bg-red-900/20 border border-red-800 rounded-xl p-4">
            <Text className="text-red-400 text-lg font-semibold mb-3">
              Danger Zone
            </Text>
            <Text className="text-gray-300 text-sm mb-4">
              This action will permanently delete all confessions from your device. 
              This cannot be undone.
            </Text>
            <Pressable
              className="bg-red-600 rounded-lg p-3 flex-row items-center justify-center"
              onPress={handleClearAll}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">
                Clear All Confessions
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}