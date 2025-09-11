import React, { useEffect, useCallback, useState } from "react";
import { View, Text, Pressable, RefreshControl } from "react-native";
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
import ConfessionSkeleton from "../components/ConfessionSkeleton";
import { useDebouncedRefresh } from "../utils/debounce";
import { safeGoBackFromModal } from "../utils/navigation";

export default function SavedScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const {
    savedConfessions,
    isLoading,
    isLoadingMore,
    hasMore,
    loadSavedConfessions,
    loadMoreSavedConfessions,
    unsaveConfession,
  } = useSavedStore();
  const { getRepliesForConfession } = useReplyStore();
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();
  const [refreshing, setRefreshing] = useState(false);

  // Debounced refresh functionality
  const { refresh } = useDebouncedRefresh(() => loadSavedConfessions(true), 1000);

  useEffect(() => {
    loadSavedConfessions();
  }, [loadSavedConfessions]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Load more handler
  const onEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMoreSavedConfessions();
    }
  }, [hasMore, isLoadingMore, loadMoreSavedConfessions]);

  const handleToggleLike = async (confessionId: string) => {
    await toggleLike(confessionId);
    impactAsync();
  };

  const handleSecretPress = (confessionId: string) => {
    impactAsync();
    navigation.navigate("SecretDetail", { confessionId });
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
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.8)",
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
        onPress={() => handleSecretPress(confession.id)}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderRadius: 8,
                padding: 6,
                marginRight: 8,
              }}
            >
              <Ionicons name="person" size={14} color="#3B82F6" />
            </View>
            <Text className="text-gray-400 text-12">Anonymous</Text>
            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
            <Text className="text-gray-400 text-12">{format(new Date(confession.timestamp), "MMM d")}</Text>
          </View>
          <Pressable
            onPress={() => handleUnsave(confession.id)}
            style={{
              backgroundColor: "rgba(29, 155, 240, 0.2)",
              borderRadius: 8,
              padding: 6,
            }}
          >
            <Ionicons name="bookmark" size={16} color="#1D9BF0" />
          </Pressable>
        </View>

        {/* Content */}
        <HashtagText text={confession.content} className="text-white text-15 leading-6 mb-3" numberOfLines={6} />

        {/* Video indicator */}
        {confession.type === "video" && (
          <View className="flex-row items-center mb-3">
            <View
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                borderRadius: 6,
                padding: 4,
                marginRight: 6,
              }}
            >
              <Ionicons name="videocam" size={12} color="#EF4444" />
            </View>
            <Text className="text-red-400 text-12">Video confession</Text>
          </View>
        )}

        {/* Actions */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-4">
            <Pressable className="flex-row items-center" onPress={() => handleToggleLike(confession.id)}>
              <View
                style={{
                  backgroundColor: confession.isLiked ? "rgba(239, 68, 68, 0.2)" : "rgba(139, 152, 165, 0.2)",
                  borderRadius: 6,
                  padding: 4,
                  marginRight: 6,
                }}
              >
                <Ionicons
                  name={confession.isLiked ? "heart" : "heart-outline"}
                  size={12}
                  color={confession.isLiked ? "#EF4444" : "#8B98A5"}
                />
              </View>
              <Text className="text-gray-400 text-12">{String(confession.likes || 0)}</Text>
            </Pressable>

            <Pressable className="flex-row items-center">
              <View
                style={{
                  backgroundColor: "rgba(139, 152, 165, 0.2)",
                  borderRadius: 6,
                  padding: 4,
                  marginRight: 6,
                }}
              >
                <Ionicons name="chatbubble-outline" size={12} color="#8B98A5" />
              </View>
              <Text className="text-gray-400 text-12">{replyCount}</Text>
            </Pressable>
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
      <Text className="text-white text-18 font-semibold mb-2 text-center">No Saved Secrets</Text>
      <Text className="text-gray-400 text-15 text-center leading-5">
        Tap the bookmark icon on any secret to save it here for later reading.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-0 border-b border-gray-800">
        <Pressable onPress={() => safeGoBackFromModal(navigation)}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white text-18 font-semibold">Saved Secrets</Text>
        <View className="w-6" />
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 pt-4">
          <ConfessionSkeleton />
          <ConfessionSkeleton />
          <ConfessionSkeleton />
        </View>
      ) : savedConfessions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlashList
          data={savedConfessions}
          renderItem={renderConfession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" colors={["#1D9BF0"]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4">
                <ConfessionSkeleton />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
