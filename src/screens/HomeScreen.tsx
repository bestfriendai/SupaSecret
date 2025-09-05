import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { useReplyStore } from "../state/replyStore";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const navigation = useNavigation();
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const isLoading = useConfessionStore((state) => state.isLoading);
  const { getRepliesForConfession, loadReplies } = useReplyStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Load replies for all confessions when component mounts
  useEffect(() => {
    confessions.forEach(confession => {
      loadReplies(confession.id);
    });
  }, [confessions, loadReplies]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadConfessions();
      // Reload replies for all confessions
      confessions.forEach(confession => {
        loadReplies(confession.id);
      });
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleLike = async (confessionId: string) => {
    await toggleLike(confessionId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSecretPress = (confessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SecretDetail', { confessionId });
  };

  const renderConfession = (confession: any) => {
    const replies = getRepliesForConfession(confession.id);

    return (
      <Pressable
        key={confession.id}
        className="border-b border-gray-800 px-4 py-3"
        onPress={() => handleSecretPress(confession.id)}
      >
      {/* Header with avatar and info */}
      <View className="flex-row items-start mb-3">
        <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={20} color="#8B98A5" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white font-bold text-15">Anonymous</Text>
            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
            <Text className="text-gray-500 text-15">
              {format(new Date(confession.timestamp), "MMM d")}
            </Text>
            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
            <View className="flex-row items-center">
              <Ionicons 
                name={confession.type === "video" ? "videocam" : "document-text"} 
                size={14} 
                color="#1D9BF0" 
              />
              <Text className="text-blue-400 text-13 ml-1">
                {confession.type === "video" ? "Video" : "Text"}
              </Text>
            </View>
          </View>
          
          {/* Content */}
          {confession.type === "text" ? (
            <Text className="text-white text-15 leading-5 mb-3">
              {confession.content}
            </Text>
          ) : (
            <View>
              {confession.transcription && (
                <Text className="text-white text-15 leading-5 mb-3">
                  {confession.transcription}
                </Text>
              )}
              <View className="bg-gray-900 border border-gray-700 rounded-2xl p-3 mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="play-circle" size={24} color="#1D9BF0" />
                  <Text className="text-gray-300 ml-2 text-13">Video confession</Text>
                  <View className="ml-auto flex-row items-center">
                    <Ionicons name="eye-off" size={14} color="#8B98A5" />
                    <Text className="text-gray-500 text-11 ml-1">Face blurred</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          
          {/* Action buttons */}
          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-row items-center">
              <Pressable
                className="flex-row items-center"
                onPress={() => handleToggleLike(confession.id)}
              >
                <Ionicons
                  name={confession.isLiked ? "heart" : "heart-outline"}
                  size={18}
                  color={confession.isLiked ? "#EF4444" : "#8B98A5"}
                />
                <Text className={`text-13 ml-1 ${confession.isLiked ? "text-red-400" : "text-gray-500"}`}>
                  {confession.likes || 0}
                </Text>
              </Pressable>
              <View className="flex-row items-center ml-6">
                <Ionicons name="chatbubble-outline" size={18} color="#8B98A5" />
                <Text className="text-gray-500 text-13 ml-1">
                  {replies.length}
                </Text>
              </View>
            </View>
            <Pressable className="flex-row items-center">
              <Ionicons name="bookmark-outline" size={18} color="#8B98A5" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1D9BF0"
            colors={["#1D9BF0"]}
          />
        }
      >
        {confessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <Ionicons name="lock-closed-outline" size={64} color="#8B98A5" />
            <Text className="text-white text-20 font-bold mt-6 text-center">
              No secrets shared yet
            </Text>
            <Text className="text-gray-500 text-15 mt-2 text-center leading-5">
              Be the first to share an anonymous confession with the community
            </Text>
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