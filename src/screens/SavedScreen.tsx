import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useReplyStore } from "../state/replyStore";
import { format } from "date-fns";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import HashtagText from "../components/HashtagText";

export default function SavedScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const confessions = useConfessionStore((state) => state.confessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const { savedConfessionIds, unsaveConfession } = useSavedStore();
  const { getRepliesForConfession } = useReplyStore();
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();

  // Filter confessions to only show saved ones
  const savedConfessions = useMemo(() => {
    return confessions.filter(confession => savedConfessionIds.includes(confession.id));
  }, [confessions, savedConfessionIds]);

  const handleToggleLike = async (confessionId: string) => {
    await toggleLike(confessionId);
    impactAsync();
  };

  const handleSecretPress = (confessionId: string) => {
    impactAsync();
    navigation.navigate('SecretDetail', { confessionId });
  };

  const handleUnsave = (confessionId: string) => {
    impactAsync();
    unsaveConfession(confessionId);
  };

  const renderConfession = ({ item: confession }: { item: any }) => {
    const replies = getRepliesForConfession(confession.id);
    const replyCount = replies.length;

    return (
      <Pressable
        className="bg-gray-900 mx-4 mb-4 rounded-2xl p-4"
        onPress={() => handleSecretPress(confession.id)}
      >
        <View className="space-y-3">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
                <Ionicons name="person" size={16} color="white" />
              </View>
              <Text className="text-gray-400 text-13 ml-2">Anonymous</Text>
              <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
              <Text className="text-gray-400 text-13">
                {format(new Date(confession.timestamp), "MMM d")}
              </Text>
            </View>
            <Pressable onPress={() => handleUnsave(confession.id)}>
              <Ionicons name="bookmark" size={18} color="#1D9BF0" />
            </Pressable>
          </View>

          {/* Content */}
          <HashtagText 
            text={confession.content} 
            className="text-white text-15 leading-5"
            numberOfLines={6}
          />

          {/* Video indicator */}
          {confession.type === 'video' && (
            <View className="flex-row items-center">
              <Ionicons name="videocam" size={14} color="#1D9BF0" />
              <Text className="text-blue-400 text-13 ml-1">Video confession</Text>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-row items-center space-x-6">
              <Pressable
                className="flex-row items-center"
                onPress={() => handleToggleLike(confession.id)}
              >
                <Ionicons
                  name={confession.isLiked ? "heart" : "heart-outline"}
                  size={18}
                  color={confession.isLiked ? "#EF4444" : "#8B98A5"}
                />
                <Text className="text-gray-400 text-13 ml-1">
                  {confession.likes || 0}
                </Text>
              </Pressable>
              
              <Pressable className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={16} color="#8B98A5" />
                <Text className="text-gray-400 text-13 ml-1">{replyCount}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-4">
        <Ionicons name="bookmark-outline" size={32} color="#8B98A5" />
      </View>
      <Text className="text-white text-18 font-semibold mb-2 text-center">
        No Saved Secrets
      </Text>
      <Text className="text-gray-400 text-15 text-center leading-5">
        Tap the bookmark icon on any secret to save it here for later reading.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-800">
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-18 font-semibold">Saved Secrets</Text>
        <View className="w-6" />
      </View>

      {/* Content */}
      {savedConfessions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlashList
          data={savedConfessions}
          renderItem={renderConfession}
          keyExtractor={(item) => item.id}
          estimatedItemSize={200}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
