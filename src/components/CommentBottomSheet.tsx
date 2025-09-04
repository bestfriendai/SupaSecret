import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface Comment {
  id: string;
  text: string;
  timestamp: number;
  likes: number;
  isLiked: boolean;
}

interface CommentBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  confessionId: string;
}

const SHEET_HEIGHT = 600;

export default function CommentBottomSheet({
  isVisible,
  onClose,
}: CommentBottomSheetProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      text: "I can totally relate to this. Thank you for sharing.",
      timestamp: Date.now() - 3600000,
      likes: 12,
      isLiked: false,
    },
    {
      id: "2", 
      text: "You're not alone in feeling this way. Stay strong! 💪",
      timestamp: Date.now() - 7200000,
      likes: 8,
      isLiked: true,
    },
    {
      id: "3",
      text: "This is so brave of you to share. Sending virtual hugs! 🤗",
      timestamp: Date.now() - 10800000,
      likes: 15,
      isLiked: false,
    },
  ]);
  const [newComment, setNewComment] = useState("");

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > SHEET_HEIGHT * 0.3) {
        translateY.value = withSpring(SHEET_HEIGHT);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        timestamp: Date.now(),
        likes: 0,
        isLiked: false,
      };
      setComments([comment, ...comments]);
      setNewComment("");
    }
  };

  const toggleCommentLike = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.likes + (comment.isLiked ? -1 : 1),
            }
          : comment
      )
    );
  };

  if (!isVisible) return null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "black",
          },
          backdropStyle,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: SHEET_HEIGHT,
              backgroundColor: "#1A1A1A",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          <View className="items-center py-3">
            <View className="w-10 h-1 bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-3 border-b border-gray-800">
            <Text className="text-white text-18 font-bold">
              {comments.length} Comments
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#8B98A5" />
            </Pressable>
          </View>

          {/* Comments List */}
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {comments.map((comment) => (
              <View key={comment.id} className="py-4 border-b border-gray-800">
                <View className="flex-row items-start">
                  <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={14} color="#8B98A5" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-white font-medium text-14">Anonymous</Text>
                      <Text className="text-gray-500 text-12 ml-2">
                        {format(new Date(comment.timestamp), "MMM d, h:mm a")}
                      </Text>
                    </View>
                    <Text className="text-white text-15 leading-5 mb-2">
                      {comment.text}
                    </Text>
                    <View className="flex-row items-center">
                      <Pressable
                        className="flex-row items-center mr-4"
                        onPress={() => toggleCommentLike(comment.id)}
                      >
                        <Ionicons
                          name={comment.isLiked ? "heart" : "heart-outline"}
                          size={16}
                          color={comment.isLiked ? "#FF3040" : "#8B98A5"}
                        />
                        <Text className="text-gray-400 text-12 ml-1">
                          {comment.likes}
                        </Text>
                      </Pressable>
                      <Pressable className="flex-row items-center">
                        <Ionicons name="chatbubble-outline" size={16} color="#8B98A5" />
                        <Text className="text-gray-400 text-12 ml-1">Reply</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Comment Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <SafeAreaView>
              <View className="flex-row items-center px-4 py-3 border-t border-gray-800">
                <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person" size={14} color="#8B98A5" />
                </View>
                <TextInput
                  className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white text-15 mr-3"
                  placeholder="Add a comment..."
                  placeholderTextColor="#8B98A5"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    newComment.trim() ? "bg-blue-500" : "bg-gray-700"
                  }`}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Ionicons
                    name="send"
                    size={16}
                    color={newComment.trim() ? "#FFFFFF" : "#8B98A5"}
                  />
                </Pressable>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}