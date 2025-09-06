import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useConfessionStore } from "../state/confessionStore";
import { useReplyStore } from "../state/replyStore";
import { useSavedStore } from "../state/savedStore";
import { format } from "date-fns";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import ReportModal from "../components/ReportModal";
import FeedActionSheet from "../components/FeedActionSheet";
import ConfessionSkeleton from "../components/ConfessionSkeleton";
import HashtagText from "../components/HashtagText";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadMoreConfessions = useConfessionStore((state) => state.loadMoreConfessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const isLoading = useConfessionStore((state) => state.isLoading);
  const isLoadingMore = useConfessionStore((state) => state.isLoadingMore);
  const hasMore = useConfessionStore((state) => state.hasMore);
  const { getRepliesForConfession, loadReplies } = useReplyStore();
  const { isSaved } = useSavedStore();
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingConfessionId, setReportingConfessionId] = useState<string | null>(null);
  const [selectedConfessionText, setSelectedConfessionText] = useState<string>("");
  const actionSheetRef = useRef<BottomSheetModal | null>(null);

  // Load replies for all confessions when component mounts
  useEffect(() => {
    confessions.forEach(confession => {
      loadReplies(confession.id);
    });
  }, [confessions, loadReplies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConfessions();
      // Reload replies for all confessions
      confessions.forEach(confession => {
        loadReplies(confession.id);
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Error refreshing:', error);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadConfessions, confessions, loadReplies]);

  const onEndReached = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      try {
        await loadMoreConfessions();
      } catch (error) {
        if (__DEV__) {
          console.error('Error loading more:', error);
        }
      }
    }
  }, [isLoadingMore, hasMore, loadMoreConfessions]);

  const handleToggleLike = async (confessionId: string) => {
    await toggleLike(confessionId);
    impactAsync();
  };

  const handleSecretPress = (confessionId: string) => {
    impactAsync();
    navigation.navigate('SecretDetail', { confessionId });
  };

  const handleReportPress = (confessionId: string, event: any) => {
    event.stopPropagation(); // Prevent navigation to detail screen
    setReportingConfessionId(confessionId);
    setReportModalVisible(true);
    impactAsync();
  };

  const handleActionSheetPress = (confessionId: string, confessionText: string, event: any) => {
    event.stopPropagation();
    setReportingConfessionId(confessionId);
    setSelectedConfessionText(confessionText);
    impactAsync();
    actionSheetRef.current?.present();
  };

  const handleReportModalClose = () => {
    setReportModalVisible(false);
    setReportingConfessionId(null);
  };

  const renderItem = useCallback(({ item: confession }: { item: any }) => {
    const replies = getRepliesForConfession(confession.id);

    return (
      <Pressable
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
            <HashtagText
              text={confession.content}
              className="text-white text-15 leading-5 mb-3"
            />
          ) : (
            <View>
              {confession.transcription && (
                <HashtagText
                  text={confession.transcription}
                  className="text-white text-15 leading-5 mb-3"
                />
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
              <Pressable
                className="flex-row items-center ml-6"
                onPress={(event) => handleReportPress(confession.id, event)}
              >
                <Ionicons name="flag-outline" size={16} color="#8B98A5" />
              </Pressable>
            </View>
            <Pressable
              className="flex-row items-center"
              onPress={(event) => handleActionSheetPress(confession.id, confession.content, event)}
            >
              <Ionicons
                name={isSaved(confession.id) ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isSaved(confession.id) ? "#F59E0B" : "#8B98A5"}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
  }, [getRepliesForConfession, handleSecretPress, handleToggleLike, handleReportPress, handleActionSheetPress, isSaved]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ConfessionSkeleton />
        <ConfessionSkeleton />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1">
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
          <ConfessionSkeleton />
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Ionicons name="lock-closed-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-20 font-bold mt-6 text-center">
          No secrets shared yet
        </Text>
        <Text className="text-gray-500 text-15 mt-2 text-center leading-5">
          Be the first to share an anonymous confession with the community
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View className="flex-1 bg-black">
      <FlashList
        data={confessions}
        renderItem={renderItem}
        estimatedItemSize={200}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={onRefresh}
        extraData={{ refreshing, isLoadingMore }}
      />

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={handleReportModalClose}
        confessionId={reportingConfessionId || undefined}
        contentType="confession"
      />

      {/* Feed Action Sheet */}
      {reportingConfessionId && (
        <FeedActionSheet
          confessionId={reportingConfessionId}
          confessionText={selectedConfessionText}
          bottomSheetModalRef={actionSheetRef}
        />
      )}
    </View>
  );
}