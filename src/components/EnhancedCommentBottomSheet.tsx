import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { PreferenceAwareHaptics } from "../utils/haptics";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { InlineCharacterCounter } from "./CharacterCounter";
import { sanitizeText } from "../utils/sanitize";
import { useReplyStore } from "../state/replyStore";

interface EnhancedCommentBottomSheetProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
  confessionId: string;
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

// Anonymous avatar component - moved outside to prevent recreation on every render
const AnonymousAvatar = React.memo(({ anonymousId }: { anonymousId: string }) => {
  return (
    <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: anonymousId }}>
      <View className="w-4 h-4 bg-white/30 rounded-full" />
    </View>
  );
});
AnonymousAvatar.displayName = "AnonymousAvatar";

const EnhancedCommentBottomSheet = React.memo(
  function EnhancedCommentBottomSheet(props: EnhancedCommentBottomSheetProps) {
    const { bottomSheetModalRef, confessionId } = props ?? ({} as any);

    // All hooks must be called before any early returns
    const [newComment, setNewComment] = useState("");

    // Generate stable anonymous ID for current user's input avatar
    const userAnonymousId = useMemo(() => generateAnonymousId(), []);

    // Store bindings - using simple selectors to avoid infinite loops
    const allReplies = useReplyStore((s) => s.replies);
    const allPagination = useReplyStore((s) => s.pagination);
    const loadReplies = useReplyStore((s) => s.loadReplies);
    const loadMoreReplies = useReplyStore((s) => s.loadMoreReplies);
    const addReply = useReplyStore((s) => s.addReply);
    const toggleReplyLike = useReplyStore((s) => s.toggleReplyLike);

    // Derive data from store state
    const replies = useMemo(() => allReplies[confessionId] ?? [], [allReplies, confessionId]);
    const page = useMemo(() => allPagination[confessionId], [allPagination, confessionId]);

    const initialLoadIdRef = useRef<string | null>(null);
    const loadRepliesStable = useCallback(
      async (id: string) => {
        try {
          await loadReplies(id);
        } catch {
          // Silently handle errors
        }
      },
      [loadReplies],
    );

    useEffect(() => {
      if (!confessionId) return;
      if (initialLoadIdRef.current === confessionId) return;

      initialLoadIdRef.current = confessionId;
      loadRepliesStable(confessionId);
    }, [confessionId, loadRepliesStable]);

    // Bottom sheet configuration
    const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

    // Backdrop component with blur effect
    const renderBackdrop = useCallback(
      (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
      [],
    );

    const handleAddComment = useCallback(async () => {
      const text = newComment.trim();
      if (!text) return;
      try {
        await addReply(confessionId, text, true);
        setNewComment("");
        PreferenceAwareHaptics.impactAsync();
      } catch {}
    }, [newComment, addReply, confessionId]);

    const toggleCommentLikeLocal = useCallback(
      (replyId: string) => {
        toggleReplyLike(replyId, confessionId);
        PreferenceAwareHaptics.impactAsync();
      },
      [toggleReplyLike, confessionId],
    );

    const getAnonColorForReply = useCallback((id: string, userId?: string) => {
      const key = userId || id;
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
      const index = Math.abs(hash) % ANONYMOUS_COLORS.length;
      return ANONYMOUS_COLORS[index];
    }, []);

    const renderComment = useCallback(
      ({
        item,
      }: {
        item: { id: string; timestamp: number; likes: number; isLiked?: boolean; userId?: string; content: string };
      }) => (
        <View className="py-4 px-4 border-b border-gray-800/50">
          <View className="flex-row items-start">
            <AnonymousAvatar anonymousId={getAnonColorForReply(item.id, item.userId)} />
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-white font-medium text-14">Anonymous</Text>
                <Text className="text-gray-500 text-12 ml-2">{format(new Date(item.timestamp), "MMM d, h:mm a")}</Text>
              </View>
              <Text className="text-white text-15 leading-5 mb-2">{sanitizeText(item.content)}</Text>
              <View className="flex-row items-center">
                <Pressable className="flex-row items-center mr-4" onPress={() => toggleCommentLikeLocal(item.id)}>
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
      [toggleCommentLikeLocal, getAnonColorForReply],
    );

    // Handle empty confessionId case after all hooks are called
    if (!confessionId || confessionId === "") {
      return (
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: "#1A1A1A" }}
          handleIndicatorStyle={{ backgroundColor: "#666" }}
        >
          <BottomSheetView className="flex-1 items-center justify-center">
            <Text className="text-gray-500 text-16">No confession selected</Text>
          </BottomSheetView>
        </BottomSheetModal>
      );
    }

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
            <Text className="text-white text-18 font-bold">{replies.length} Anonymous Comments</Text>
            <Pressable onPress={() => bottomSheetModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color="#8B98A5" />
            </Pressable>
          </View>

          {/* Comments List */}
          <BottomSheetFlatList
            data={replies}
            keyExtractor={(item: {
              id: string;
              timestamp: number;
              likes: number;
              isLiked?: boolean;
              userId?: string;
              content: string;
            }) => item.id}
            renderItem={renderComment}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            onEndReached={() => {
              if (page?.hasMore && !page?.isLoadingMore) {
                loadMoreReplies(confessionId);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              <View className="py-3 items-center justify-center">
                {page?.isLoadingMore ? (
                  <ActivityIndicator color="#8B98A5" />
                ) : page?.hasMore === false ? (
                  <Text className="text-gray-500 text-12">No more comments</Text>
                ) : null}
              </View>
            )}
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
                  <AnonymousAvatar anonymousId={userAnonymousId} />
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
                        textAlignVertical: "top",
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
                      shadowColor: newComment.trim() ? "#3B82F6" : "transparent",
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
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return prevProps.confessionId === nextProps.confessionId;
  },
);

export default EnhancedCommentBottomSheet;
