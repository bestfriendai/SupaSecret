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
    <View key={confession.id} className="bg-gray-800 rounded-xl p-4 mb-4 mx-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons 
            name={confession.type === "video" ? "videocam" : "document-text"} 
            size={16} 
            color="#8B5CF6" 
          />
          <Text className="text-purple-400 text-sm ml-2 font-medium">
            {confession.type === "video" ? "Video Secret" : "Text Secret"}
          </Text>
        </View>
        <Text className="text-gray-400 text-xs">
          {format(new Date(confession.timestamp), "MMM d, h:mm a")}
        </Text>
      </View>
      
      {confession.type === "text" ? (
        <Text className="text-gray-100 text-base leading-6">
          {confession.content}
        </Text>
      ) : (
        <View>
          {confession.transcription && (
            <Text className="text-gray-100 text-base leading-6 mb-3">
              {confession.transcription}
            </Text>
          )}
          <Pressable className="bg-gray-700 rounded-lg p-3 flex-row items-center">
            <Ionicons name="play-circle" size={24} color="#8B5CF6" />
            <Text className="text-gray-300 ml-2">Video confession (processed)</Text>
            <View className="ml-auto">
              <Ionicons name="eye-off" size={16} color="#6B7280" />
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-6">
          <Text className="text-white text-2xl font-bold mb-2">
            Everyone's Secret
          </Text>
          <Text className="text-gray-400 text-base mb-6">
            Anonymous confessions from the community
          </Text>
        </View>

        {confessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <Ionicons name="lock-closed-outline" size={64} color="#6B7280" />
            <Text className="text-gray-400 text-lg font-medium mt-4 text-center">
              No secrets shared yet
            </Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              Be the first to share an anonymous confession
            </Text>
          </View>
        ) : (
          <View className="pb-4">
            {confessions.map(renderConfession)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}