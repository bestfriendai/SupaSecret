import React, { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { InlineCharacterCounter } from "./CharacterCounter";

interface Comment {
  id: string;
  text: string;
  timestamp: number;
  likes: number;
  isLiked: boolean;
  isAnonymous: boolean;
  anonymousId: string; // For consistent anonymous identity within session
}

interface EnhancedCommentBottomSheetProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
}

// Generate anonymous identity colors and shapes
const ANONYMOUS_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

const generateAnonymousId = () => {
  const color = ANONYMOUS_COLORS[Math.floor(Math.random() * ANONYMOUS_COLORS.length)];
  return color;
};

export default function EnhancedCommentBottomSheet({ bottomSheetModalRef }: EnhancedCommentBottomSheetProps) {
  const { impactAsync } = usePreferenceAwareHaptics();
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      text: "I can totally relate to this. Thank you for sharing your truth.",
      timestamp: Date.now() - 3600000,
      likes: 12,
      isLiked: false,
      isAnonymous: true,
      anonymousId: generateAnonymousId(),
    },
    {
      id: "2",
      text: "You're not alone in feeling this way. Stay strong! 💪",
      timestamp: Date.now() - 7200000,
      likes: 8,
      isLiked: true,
      isAnonymous: true,
      anonymousId: generateAnonymousId(),
    },
    {
      id: "3",
      text: "This is so brave of you to share. Sending virtual hugs! 🤗",
      timestamp: Date.now() - 10800000,
      likes: 15,
      isLiked: false,
      isAnonymous: true,
      anonymousId: generateAnonymousId(),
    },
  ]);
  const [newComment, setNewComment] = useState("");

  // Bottom sheet configuration
  const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

  // Backdrop component with blur effect
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    [],
  );

  const handleAddComment = useCallback(() => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        timestamp: Date.now(),
        likes: 0,
        isLiked: false,
        isAnonymous: true,
        anonymousId: generateAnonymousId(),
      };
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      impactAsync();
    }
  }, [newComment]);

  const toggleCommentLike = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.likes + (comment.isLiked ? -1 : 1),
            }
          : comment,
      ),
    );
    impactAsync();
  }, []);

  // Anonymous avatar component
  const AnonymousAvatar = ({ anonymousId }: { anonymousId: string }) => {
    return (
      <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: anonymousId }}>
        <View className="w-4 h-4 bg-white/30 rounded-full" />
      </View>
    );
  };

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <View className="py-4 px-4 border-b border-gray-800/50">
        <View className="flex-row items-start">
          <AnonymousAvatar anonymousId={item.anonymousId} />
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-white font-medium text-14">Anonymous</Text>
              <Text className="text-gray-500 text-12 ml-2">{format(new Date(item.timestamp), "MMM d, h:mm a")}</Text>
            </View>
            <Text className="text-white text-15 leading-5 mb-2">{item.text}</Text>
            <View className="flex-row items-center">
              <Pressable className="flex-row items-center mr-4" onPress={() => toggleCommentLike(item.id)}>
                <Ionicons
                  name={item.isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color={item.isLiked ? "#FF3040" : "#8B98A5"}
                />
                <Text className="text-gray-400 text-12 ml-1">{item.likes}</Text>
              </Pressable>
              <Pressable className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={16} color="#8B98A5" />
                <Text className="text-gray-400 text-12 ml-1">Reply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    ),
    [toggleCommentLike],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#1A1A1A" }}
      handleIndicatorStyle={{ backgroundColor: "#666" }}
    >
      <BottomSheetView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-gray-800">
          <Text className="text-white text-18 font-bold">{comments.length} Anonymous Comments</Text>
          <Pressable onPress={() => bottomSheetModalRef.current?.dismiss()}>
            <Ionicons name="close" size={24} color="#8B98A5" />
          </Pressable>
        </View>

        {/* Comments List */}
        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* Enhanced Comment Input */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <BlurView intensity={80} tint="dark" className="border-t border-gray-700">
            <View className="px-4 py-4 bg-gray-900/50">
              {/* Input Header */}
              <View className="flex-row items-center mb-3">
                <Ionicons name="chatbubble" size={16} color="#3B82F6" />
                <Text className="text-blue-400 text-14 font-medium ml-2">Write a comment</Text>
              </View>

              <View className="flex-row items-start">
                <AnonymousAvatar anonymousId={generateAnonymousId()} />
                <View className="flex-1 mr-3">
                  <BottomSheetTextInput
                    className="bg-gray-800 rounded-2xl px-4 py-3 text-white text-15 min-h-[44px] border border-gray-700"
                    placeholder="Share your thoughts anonymously..."
                    placeholderTextColor="#9CA3AF"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      textAlignVertical: 'top',
                    }}
                  />
                  {newComment.length > 400 && (
                    <InlineCharacterCounter
                      currentLength={newComment.length}
                      maxLength={500}
                      className="absolute -bottom-5 right-2 text-xs"
                    />
                  )}
                </View>
                <Pressable
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    newComment.trim() ? "bg-blue-500 shadow-lg" : "bg-gray-700"
                  }`}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                  style={{
                    shadowColor: newComment.trim() ? '#3B82F6' : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: newComment.trim() ? 3 : 0,
                  }}
                >
                  <Ionicons name="send" size={18} color={newComment.trim() ? "#FFFFFF" : "#8B98A5"} />
                </Pressable>
              </View>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
