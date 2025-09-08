import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { useConfessionStore } from "../state/confessionStore";
import { useReplyStore } from "../state/replyStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import ReportModal from "../components/ReportModal";
import HashtagText from "../components/HashtagText";
import { isValidForDatabase } from "../utils/uuid";
import { safeGoBackFromDetail } from "../utils/navigation";

type SecretDetailRouteProp = RouteProp<
  {
    SecretDetail: { confessionId: string };
  },
  "SecretDetail"
>;

export default function SecretDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<SecretDetailRouteProp>();
  const { confessionId } = route.params;
  const { impactAsync } = usePreferenceAwareHaptics();

  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingReplyId, setReportingReplyId] = useState<string | null>(null);

  const confessions = useConfessionStore((state) => state.confessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);

  const {
    loadReplies,
    addReply,
    toggleReplyLike,
    getRepliesForConfession,
    isLoading: repliesLoading,
    error: repliesError,
    clearError,
  } = useReplyStore();

  const confession = confessions.find((c) => c.id === confessionId);
  const replies = getRepliesForConfession(confessionId);

  useEffect(() => {
    if (confessionId) {
      loadReplies(confessionId).catch(error => {
        console.error('Failed to load replies in SecretDetailScreen:', error);
        // Don't show alert immediately, let the store handle the error state
      });
    }
  }, [confessionId, loadReplies]);

  useEffect(() => {
    if (repliesError) {
      console.error('Replies error:', repliesError);
      Alert.alert("Error Loading Replies", repliesError, [
        { text: "Retry", onPress: () => {
          clearError();
          loadReplies(confessionId);
        }},
        { text: "OK", onPress: () => clearError() }
      ]);
    }
  }, [repliesError, clearError, confessionId, loadReplies]);

  const handleAddReply = async () => {
    if (!newReply.trim() || isSubmitting) return;

    // Check if this is a sample confession
    if (!isValidForDatabase(confessionId)) {
      Alert.alert(
        "Sample Content",
        "This is sample content for demonstration. Replies can only be added to real confessions.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await addReply(confessionId, newReply.trim(), true);
      setNewReply("");
      impactAsync();
    } catch (error) {
      Alert.alert("Error", "Failed to add reply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    if (confession) {
      await toggleLike(confession.id);
      impactAsync();
    }
  };

  const handleToggleReplyLike = async (replyId: string) => {
    await toggleReplyLike(replyId, confessionId);
    impactAsync();
  };

  const handleReportConfession = () => {
    setReportingReplyId(null);
    setReportModalVisible(true);
    impactAsync();
  };

  const handleReportReply = (replyId: string) => {
    setReportingReplyId(replyId);
    setReportModalVisible(true);
    impactAsync();
  };

  const handleReportModalClose = () => {
    setReportModalVisible(false);
    setReportingReplyId(null);
  };

  if (!confession) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <Ionicons name="alert-circle-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-xl font-semibold mt-4">Secret Not Found</Text>
        <Text className="text-gray-400 text-base mt-2 text-center">
          This secret may have been deleted or doesn't exist.
        </Text>
        <Pressable className="bg-blue-500 rounded-full px-6 py-3 mt-6" onPress={() => safeGoBackFromDetail(navigation)}>
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
          <Pressable className="flex-row items-center" onPress={() => safeGoBackFromDetail(navigation)}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            <Text className="text-white text-lg font-semibold ml-2">Secret</Text>
          </Pressable>
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text className="text-green-400 text-sm ml-1">Anonymous</Text>
          </View>
        </View>

        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Secret Content */}
            <View className="px-4 py-6 border-b border-gray-800">
              <View className="flex-row items-start mb-4">
                <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person" size={20} color="#8B98A5" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-white font-bold text-16">Anonymous</Text>
                    <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                    <Text className="text-gray-500 text-14">
                      {format(new Date(confession.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </Text>
                  </View>

                  {confession.type === "text" ? (
                    <HashtagText text={confession.content} className="text-white text-16 leading-6 mb-4" />
                  ) : (
                    <View>
                      {confession.transcription && (
                        <HashtagText text={confession.transcription} className="text-white text-16 leading-6 mb-4" />
                      )}
                      <View className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="play-circle" size={32} color="#1D9BF0" />
                            <View className="ml-3">
                              <Text className="text-white font-medium text-15">Video Confession</Text>
                              <Text className="text-gray-400 text-13">Tap to play</Text>
                            </View>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="eye-off" size={16} color="#8B98A5" />
                            <Text className="text-gray-500 text-12 ml-1">Protected</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Interaction Buttons */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Pressable className="flex-row items-center" onPress={handleToggleLike}>
                        <Ionicons
                          name={confession.isLiked ? "heart" : "heart-outline"}
                          size={20}
                          color={confession.isLiked ? "#EF4444" : "#8B98A5"}
                        />
                        <Text className={`ml-2 text-14 ${confession.isLiked ? "text-red-400" : "text-gray-400"}`}>
                          {confession.likes || 0}
                        </Text>
                      </Pressable>

                      <View className="flex-row items-center ml-6">
                        <Ionicons name="chatbubble-outline" size={18} color="#8B98A5" />
                        <Text className="text-gray-400 text-14 ml-2">
                          {replies.length} {replies.length === 1 ? "reply" : "replies"}
                        </Text>
                      </View>
                    </View>

                    <Pressable className="flex-row items-center" onPress={handleReportConfession}>
                      <Ionicons name="flag-outline" size={18} color="#8B98A5" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* Replies Section */}
            <View className="px-4 py-4">
              <Text className="text-white text-18 font-bold mb-4">Replies ({replies.length})</Text>

              {repliesLoading && replies.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="refresh" size={32} color="#8B98A5" />
                  <Text className="text-gray-400 text-14 mt-2">Loading replies...</Text>
                </View>
              ) : replies.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="chatbubble-outline" size={48} color="#8B98A5" />
                  <Text className="text-gray-400 text-16 mt-3">No replies yet</Text>
                  <Text className="text-gray-500 text-14 mt-1">Be the first to reply!</Text>
                </View>
              ) : (
                replies.map((reply) => (
                  <View key={reply.id} className="mb-4 pb-4 border-b border-gray-800/50">
                    <View className="flex-row items-start">
                      <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-3">
                        <Ionicons name="person" size={14} color="#8B98A5" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-white font-medium text-14">Anonymous</Text>
                          <Text className="text-gray-500 text-12 ml-2">
                            {format(new Date(reply.timestamp), "MMM d, h:mm a")}
                          </Text>
                        </View>
                        <HashtagText text={reply.content} className="text-white text-15 leading-5 mb-2" />
                        <View className="flex-row items-center justify-between">
                          <Pressable className="flex-row items-center" onPress={() => handleToggleReplyLike(reply.id)}>
                            <Ionicons
                              name={reply.isLiked ? "heart" : "heart-outline"}
                              size={16}
                              color={reply.isLiked ? "#EF4444" : "#8B98A5"}
                            />
                            <Text className={`ml-1 text-12 ${reply.isLiked ? "text-red-400" : "text-gray-400"}`}>
                              {reply.likes}
                            </Text>
                          </Pressable>

                          <Pressable className="flex-row items-center" onPress={() => handleReportReply(reply.id)}>
                            <Ionicons name="flag-outline" size={14} color="#8B98A5" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Reply Input */}
          <View className="border-t border-gray-800 bg-black px-4 py-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={14} color="#8B98A5" />
              </View>
              <TextInput
                className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white text-15 mr-3"
                placeholder={
                  isValidForDatabase(confessionId)
                    ? "Add an anonymous reply..."
                    : "Sample content - replies disabled"
                }
                placeholderTextColor="#8B98A5"
                value={newReply}
                onChangeText={setNewReply}
                multiline
                maxLength={500}
                editable={isValidForDatabase(confessionId)}
              />
              <Pressable
                className={`rounded-full p-2 ${
                  newReply.trim() && !isSubmitting && isValidForDatabase(confessionId)
                    ? "bg-blue-500"
                    : "bg-gray-700"
                }`}
                onPress={handleAddReply}
                disabled={!newReply.trim() || isSubmitting || !isValidForDatabase(confessionId)}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    newReply.trim() && !isSubmitting && isValidForDatabase(confessionId)
                      ? "#FFFFFF"
                      : "#8B98A5"
                  }
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Report Modal */}
        <ReportModal
          isVisible={reportModalVisible}
          onClose={handleReportModalClose}
          confessionId={reportingReplyId ? undefined : confessionId}
          replyId={reportingReplyId || undefined}
          contentType={reportingReplyId ? "reply" : "confession"}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
