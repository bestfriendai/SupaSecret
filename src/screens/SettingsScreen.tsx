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
      {/* Enhanced Header */}
      <View className="px-4 py-4 border-b border-gray-800/50">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-white text-22 font-black">
              Profile
            </Text>
            <Text className="text-gray-400 text-14 font-medium">
              Settings & privacy
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Stats Section - Enhanced */}
        <View className="mx-4 mt-4 mb-4 bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
          <View className="p-4">
            <Text className="text-white text-18 font-bold mb-4">
              Your Activity
            </Text>
            <View className="flex-row justify-between">
              <View className="flex-1 items-center p-4 bg-blue-500/10 rounded-xl mr-2">
                <Text className="text-blue-400 text-24 font-black">{confessions.length}</Text>
                <Text className="text-gray-300 text-13 font-medium text-center">Total Secrets</Text>
              </View>
              <View className="flex-1 items-center p-4 bg-green-500/10 rounded-xl mx-1">
                <Text className="text-green-400 text-24 font-black">
                  {confessions.filter(c => c.type === "text").length}
                </Text>
                <Text className="text-gray-300 text-13 font-medium text-center">Text</Text>
              </View>
              <View className="flex-1 items-center p-4 bg-red-500/10 rounded-xl ml-2">
                <Text className="text-red-400 text-24 font-black">
                  {confessions.filter(c => c.type === "video").length}
                </Text>
                <Text className="text-gray-300 text-13 font-medium text-center">Video</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Privacy Section - Enhanced */}
        <View className="mx-4 mb-4 bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
          <View className="p-4">
            <Text className="text-white text-18 font-bold mb-4">
              Privacy & Security
            </Text>
            <View className="space-y-4">
              <View className="flex-row items-center p-3 bg-green-500/10 rounded-xl">
                <View className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center">
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-semibold">Anonymous Confessions</Text>
                  <Text className="text-gray-400 text-13">All posts are completely anonymous</Text>
                </View>
              </View>
              <View className="flex-row items-center p-3 bg-blue-500/10 rounded-xl">
                <View className="w-10 h-10 bg-blue-500/20 rounded-full items-center justify-center">
                  <Ionicons name="eye-off" size={20} color="#3B82F6" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-semibold">Face Blur Protection</Text>
                  <Text className="text-gray-400 text-13">Video faces are automatically blurred</Text>
                </View>
              </View>
              <View className="flex-row items-center p-3 bg-purple-500/10 rounded-xl">
                <View className="w-10 h-10 bg-purple-500/20 rounded-full items-center justify-center">
                  <Ionicons name="volume-off" size={20} color="#8B5CF6" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-semibold">Voice Change</Text>
                  <Text className="text-gray-400 text-13">Video voices are automatically changed</Text>
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

        {/* Danger Zone - Enhanced */}
        <View className="mx-4 mb-6">
          <Text className="text-red-400 text-18 font-bold mb-4 px-2">
            Danger Zone
          </Text>
          <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="warning" size={20} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-bold">
                  Clear All Confessions
                </Text>
                <Text className="text-gray-400 text-13">
                  Permanently delete all {confessions.length} secrets
                </Text>
              </View>
            </View>
            <Text className="text-gray-400 text-14 mb-4 leading-5">
              This will permanently delete all confessions from your device. This action cannot be undone and all your anonymous secrets will be lost forever.
            </Text>
            <Pressable
              className="bg-red-500 rounded-full py-4 px-6 flex-row items-center justify-center"
              onPress={handleClearAll}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
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