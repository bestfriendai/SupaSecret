import React, { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useConfessionStore } from "../state/confessionStore";
import AnimatedActionButton from "./AnimatedActionButton";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

const { height: screenHeight } = Dimensions.get("window");

interface EnhancedVideoItemProps {
  confession: any;
  player: any;
  isActive: boolean;
  onClose: () => void;
}

export default function EnhancedVideoItem({
  confession,
  player,
  isActive,
  onClose,
}: EnhancedVideoItemProps) {
  const toggleLike = useConfessionStore((state) => state.toggleLike);

  return (
    <View style={{ height: screenHeight }} className="bg-black">
      {/* Video Player */}
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Top Overlay */}
      <View className="absolute top-0 left-0 right-0 z-10">
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Pressable
              className="bg-black/50 rounded-full p-2"
              onPress={onClose}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            
            <View className="bg-black/50 rounded-full px-3 py-1">
              <Text className="text-white text-13 font-medium">
                Video Secret
              </Text>
            </View>
            
            <Pressable className="bg-black/50 rounded-full p-2">
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      {/* Right Side Actions */}
      <View className="absolute right-4 bottom-32 z-10">
        <View className="items-center space-y-6">
          <AnimatedActionButton
            icon={confession.isLiked ? "heart" : "heart-outline"}
            label="Like"
            count={confession.likes || 0}
            isActive={confession.isLiked}
            onPress={() => {
              toggleLike(confession.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          
          <AnimatedActionButton
            icon="chatbubble-outline"
            label="Reply"
            onPress={() => {
              // Present comment sheet from parent feed; placeholder for item usage
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          
          <AnimatedActionButton
            icon="share-outline"
            label="Share"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          
          <AnimatedActionButton
            icon="bookmark-outline"
            label="Save"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>
      </View>

      {/* Bottom Overlay */}
      <View className="absolute bottom-0 left-0 right-16 z-10">
        <SafeAreaView>
          <View className="px-4 pb-4">
            {/* User Info */}
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={16} color="#8B98A5" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-15">Anonymous</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <Text className="text-gray-400 text-13">
                    {format(new Date(confession.timestamp), "MMM d")}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="eye-off" size={12} color="#10B981" />
                  <Text className="text-green-500 text-11 ml-1">Face blurred</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <Ionicons name="volume-off" size={12} color="#10B981" />
                  <Text className="text-green-500 text-11 ml-1">Voice changed</Text>
                </View>
              </View>
            </View>

            {/* Transcription */}
            {confession.transcription && (
              <Text className="text-white text-15 leading-5 mb-2">
                {confession.transcription}
              </Text>
            )}
            
            {/* Video Info */}
            <View className="flex-row items-center">
              <Ionicons name="videocam" size={14} color="#1D9BF0" />
              <Text className="text-blue-400 text-13 ml-1">Video confession</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tap to Play/Pause */}
      <Pressable
        className="absolute inset-0 z-5"
        onPress={() => {
          if (player?.playing) {
            player.pause();
          } else {
            player?.play();
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />

      {/* Bottom Sheets */}
      
    </View>
  );
}