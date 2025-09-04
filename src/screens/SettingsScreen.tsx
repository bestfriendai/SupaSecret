import React from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
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
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-4 py-2 border-b border-gray-800">
        <Text className="text-white text-18 font-semibold">
          Settings
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Stats Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">
              Statistics
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Total Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">{confessions.length}</Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Text Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">
                  {confessions.filter(c => c.type === "text").length}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Video Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">
                  {confessions.filter(c => c.type === "video").length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">
              Privacy & Security
            </Text>
            <View className="space-y-4">
              <View className="flex-row items-center py-2">
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Anonymous Confessions</Text>
                  <Text className="text-gray-500 text-13">All posts are completely anonymous</Text>
                </View>
              </View>
              <View className="flex-row items-center py-2">
                <Ionicons name="eye-off" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Face Blur Protection</Text>
                  <Text className="text-gray-500 text-13">Video faces are automatically blurred</Text>
                </View>
              </View>
              <View className="flex-row items-center py-2">
                <Ionicons name="volume-off" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Voice Change</Text>
                  <Text className="text-gray-500 text-13">Video voices are automatically changed</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">
              About
            </Text>
            <View className="space-y-4">
              <Pressable className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
              <Pressable className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Terms of Service</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
              <Pressable className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Help & Support</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-4 py-6">
          <Text className="text-red-500 text-17 font-bold mb-4">
            Danger Zone
          </Text>
          <View className="bg-gray-900 border border-red-900 rounded-2xl p-4">
            <Text className="text-white text-15 font-medium mb-2">
              Clear All Confessions
            </Text>
            <Text className="text-gray-500 text-13 mb-4 leading-4">
              This will permanently delete all {confessions.length} confessions from your device. This action cannot be undone.
            </Text>
            <Pressable
              className="bg-red-600 rounded-full py-3 px-4 flex-row items-center justify-center"
              onPress={handleClearAll}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-15 ml-2">
                Clear All Confessions
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}