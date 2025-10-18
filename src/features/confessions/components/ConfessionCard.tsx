import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { Confession } from "../types/confession.types";

// Efficient time ago formatter (doesn't cause re-renders)
function getTimeAgo(timestamp: string | number): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

interface ConfessionCardProps {
  confession: Confession;
  replyCount?: number;
  isSaved?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onReport?: () => void;
  onMoreActions?: () => void;
}

export function ConfessionCard({
  confession,
  replyCount = 0,
  isSaved = false,
  onPress,
  onLike,
  onReport,
  onMoreActions,
}: ConfessionCardProps) {
  return (
    <Pressable className="border-b border-gray-800 px-4 py-3" onPress={onPress}>
      {/* Header with avatar and info */}
      <View className="flex-row items-start mb-3">
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3 overflow-hidden">
          <Image
            source={require("../../../../assets/logo.png")}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-white font-bold text-15">Anonymous</Text>
            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
            <Text className="text-gray-500 text-15">{getTimeAgo(confession.timestamp)}</Text>
            <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
            <View className="flex-row items-center">
              <Ionicons name={confession.type === "video" ? "videocam" : "document-text"} size={14} color="#1D9BF0" />
              <Text className="text-blue-400 text-13 ml-1">{confession.type === "video" ? "Video" : "Text"}</Text>
            </View>
          </View>

          {/* Content */}
          {confession.type === "text" ? (
            <Text className="text-white text-15 leading-5 mb-3">{confession.content}</Text>
          ) : (
            <View>
              {confession.transcription && (
                <Text className="text-white text-15 leading-5 mb-3">
                  {(() => {
                    // Extract plain text from JSON caption segments or use as-is if plain text
                    try {
                      const parsed = JSON.parse(confession.transcription);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                        // Extract text from caption segments
                        return parsed.map((seg: any) => seg.text).join(" ");
                      }
                    } catch {
                      // Already plain text, use as-is
                    }
                    return confession.transcription;
                  })()}
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
            <View className="flex-row items-center gap-6">
              <Pressable
                className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
                onPress={onLike}
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
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={18} color="#8B98A5" />
                <Text className="text-gray-500 text-13 ml-1">{replyCount}</Text>
              </View>
              <Pressable
                className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
                onPress={onReport}
              >
                <Ionicons name="flag-outline" size={16} color="#8B98A5" />
              </Pressable>
            </View>
            <Pressable
              className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
              onPress={onMoreActions}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isSaved ? "#F59E0B" : "#8B98A5"}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
