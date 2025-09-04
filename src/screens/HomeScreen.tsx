import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConfessionStore } from "../state/confessionStore";
import { format } from "date-fns";

export default function HomeScreen() {
  const confessions = useConfessionStore((state) => state.confessions);
  const insets = useSafeAreaInsets();

  const renderConfession = (confession: any) => (
    <View key={confession.id} className="mx-4 mb-4 bg-gray-900/50 rounded-2xl border border-gray-800/50 overflow-hidden">
      {/* Header with avatar and info */}
      <View className="flex-row items-center p-4 pb-3">
        <View className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={18} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-16">Anonymous</Text>
            <View className="w-1.5 h-1.5 bg-gray-500 rounded-full mx-2" />
            <Text className="text-gray-400 text-14">
              {format(new Date(confession.timestamp), "MMM d")}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <View className={`px-2 py-1 rounded-full mr-2 ${
              confession.type === "video" ? "bg-red-500/20" : "bg-blue-500/20"
            }`}>
              <View className="flex-row items-center">
                <Ionicons 
                  name={confession.type === "video" ? "videocam" : "document-text"} 
                  size={12} 
                  color={confession.type === "video" ? "#FF0050" : "#1D9BF0"} 
                />
                <Text className={`text-12 ml-1 font-medium ${
                  confession.type === "video" ? "text-red-400" : "text-blue-400"
                }`}>
                  {confession.type === "video" ? "Video" : "Text"}
                </Text>
              </View>
            </View>
            {confession.type === "video" && (
              <View className="bg-green-500/20 px-2 py-1 rounded-full">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text className="text-green-400 text-11 ml-1 font-medium">Protected</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {/* Content */}
      <View className="px-4 pb-3">
        {confession.type === "text" ? (
          <Text className="text-white text-15 leading-6 font-medium">
            {confession.content}
          </Text>
        ) : (
          <View>
            {confession.transcription && (
              <Text className="text-white text-15 leading-6 mb-3 font-medium">
                {confession.transcription}
              </Text>
            )}
            <View className="bg-black/30 border border-gray-700/50 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center mr-3">
                    <Ionicons name="play" size={18} color="#FF0050" />
                  </View>
                  <View>
                    <Text className="text-white text-14 font-semibold">Video confession</Text>
                    <Text className="text-gray-400 text-12">Tap to watch</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="eye-off" size={16} color="#10B981" />
                  <Text className="text-green-400 text-12 ml-1">Anonymous</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
      
      {/* Action buttons */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-800/50">
        <Pressable className="flex-row items-center flex-1 justify-center py-2">
          <Ionicons name="chatbubble-outline" size={20} color="#8B98A5" />
          <Text className="text-gray-400 text-14 ml-2 font-medium">Reply</Text>
        </Pressable>
        <View className="w-px h-6 bg-gray-800" />
        <Pressable className="flex-row items-center flex-1 justify-center py-2">
          <Ionicons name="share-outline" size={20} color="#8B98A5" />
          <Text className="text-gray-400 text-14 ml-2 font-medium">Share</Text>
        </Pressable>
        <View className="w-px h-6 bg-gray-800" />
        <Pressable className="flex-row items-center flex-1 justify-center py-2">
          <Ionicons name="heart-outline" size={20} color="#8B98A5" />
          <Text className="text-gray-400 text-14 ml-2 font-medium">Like</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Enhanced TikTok-style Header */}
      <View className="px-4 py-4 border-b border-gray-800/50">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full items-center justify-center mr-3">
              <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-white text-22 font-black tracking-tight">
                Secrets
              </Text>
              <Text className="text-gray-400 text-12 font-medium">
                Anonymous confessions
              </Text>
            </View>
          </View>
          <View className="flex-row items-center space-x-3">
            <Pressable className="p-2.5 bg-gray-800/50 rounded-full">
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable className="p-2.5 bg-gray-800/50 rounded-full">
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
      
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {confessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <View className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-white text-22 font-black text-center mb-3">
              No secrets shared yet
            </Text>
            <Text className="text-gray-400 text-16 text-center leading-6 max-w-sm">
              Be the first to share an anonymous confession with the community
            </Text>
            <Pressable className="bg-gradient-to-r from-pink-500 to-red-500 rounded-full px-8 py-4 mt-8">
              <Text className="text-white font-bold text-16">Share Your Secret</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {confessions.map(renderConfession)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}