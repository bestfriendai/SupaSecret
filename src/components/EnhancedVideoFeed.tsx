import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import AnimatedActionButton from "./AnimatedActionButton";
import PullToRefresh from "./PullToRefresh";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import VideoProgressIndicator from "./VideoProgressIndicator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useVideoPlayers } from "../hooks/useVideoPlayers";

const { height: screenHeight } = Dimensions.get("window");
const SWIPE_THRESHOLD = 50;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

interface VideoItem {
  id: string;
  type: string;
  content: string;
  videoUri?: string;
  transcription?: string;
  isAnonymous: boolean;
  timestamp: number;
  likes?: number;
  isLiked?: boolean;
}

interface EnhancedVideoFeedProps {
  onClose: () => void;
}

export default function EnhancedVideoFeed({ onClose }: EnhancedVideoFeedProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const videoConfessions = confessions.filter((c) => c.type === "video") as VideoItem[];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const commentSheetRef = useRef<BottomSheetModal | null>(null);
  const shareSheetRef = useRef<BottomSheetModal | null>(null);
  
  // Animated values
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const actionButtonsTranslateX = useSharedValue(0);
  
  // Video players management
  const videoPlayers = useVideoPlayers(videoConfessions);

  // Handle screen focus for audio management
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - unmute videos
      videoPlayers.unmuteAll();
      
      return () => {
        // Screen is blurred - mute all videos but keep playing
        videoPlayers.muteAll();
      };
    }, [videoPlayers])
  );

  // Handle video changes
  useEffect(() => {
    if (videoConfessions.length > 0) {
      videoPlayers.playVideo(currentIndex);
    }
  }, [currentIndex, videoPlayers, videoConfessions.length]);

  const changeVideo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= videoConfessions.length) return;
    
    // Pause current and play new
    videoPlayers.pauseVideo(currentIndex);
    videoPlayers.playVideo(newIndex);
    
    setCurrentIndex(newIndex);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentIndex, videoConfessions.length, videoPlayers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      overlayOpacity.value = withTiming(0.7, { duration: 200 });
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
      
      // Update pull distance for refresh indicator
      if (event.translationY > 0 && currentIndex === 0) {
        runOnJS(setPullDistance)(event.translationY);
      }
      
      // Scale effect based on swipe distance
      const scaleValue = interpolate(
        Math.abs(event.translationY),
        [0, screenHeight / 2],
        [1, 0.9],
        "clamp"
      );
      scale.value = scaleValue;
      
      // Action buttons slide effect
      actionButtonsTranslateX.value = interpolate(
        event.translationX,
        [-100, 0, 100],
        [20, 0, -20],
        "clamp"
      );
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationY) > SWIPE_THRESHOLD;
      const shouldRefresh = event.translationY > 80 && currentIndex === 0;
      
      if (shouldRefresh) {
        runOnJS(handleRefresh)();
      } else if (shouldSwipe) {
        if (event.translationY > 0) {
          // Swipe down - previous video
          if (currentIndex > 0) {
            runOnJS(changeVideo)(currentIndex - 1);
          }
        } else {
          // Swipe up - next video
          if (currentIndex < videoConfessions.length - 1) {
            runOnJS(changeVideo)(currentIndex + 1);
          }
        }
      }
      
      // Reset animations
      translateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      overlayOpacity.value = withTiming(1, { duration: 300 });
      actionButtonsTranslateX.value = withSpring(0, SPRING_CONFIG);
      runOnJS(setPullDistance)(0);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // Heart animation
      heartScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(0, { duration: 300 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(100, withTiming(0, { duration: 300 }))
      );
      
      runOnJS(() => {
        toggleLike(videoConfessions[currentIndex]?.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      })();
    });

  const composedGestures = Gesture.Simultaneous(panGesture, doubleTapGesture);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const heartAnimationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const actionButtonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: actionButtonsTranslateX.value }],
  }));

  if (videoConfessions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Ionicons name="videocam-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-20 font-bold mt-4 text-center">
          No Video Secrets Yet
        </Text>
        <Text className="text-gray-500 text-15 mt-2 text-center px-6">
          Video confessions will appear here when they are shared
        </Text>
        <Pressable
          className="bg-blue-500 rounded-full px-6 py-3 mt-6"
          onPress={onClose}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentVideo = videoConfessions[currentIndex];
  const currentPlayer = videoPlayers.getPlayer(currentIndex);

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar hidden />
      <View className="flex-1 bg-black">
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[{ flex: 1 }, containerStyle]}>
            {/* Video Player */}
            {currentPlayer && (
              <VideoView
                player={currentPlayer}
                style={{ flex: 1 }}
                contentFit="cover"
                nativeControls={false}
              />
            )}

            {/* Pull to Refresh Indicator */}
            <PullToRefresh
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              threshold={80}
            />

            {/* Heart Animation Overlay */}
            <Animated.View 
              style={[
                {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: -40,
                  marginLeft: -40,
                  zIndex: 100,
                },
                heartAnimationStyle
              ]}
            >
              <Ionicons name="heart" size={80} color="#FF3040" />
            </Animated.View>

            {/* Top Overlay */}
            <Animated.View 
              style={[
                { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
                overlayStyle
              ]}
            >
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
                      {currentIndex + 1}/{videoConfessions.length}
                    </Text>
                  </View>
                  
                  <Pressable className="bg-black/50 rounded-full p-2">
                    <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </SafeAreaView>
            </Animated.View>

            {/* Right Side Actions */}
            <Animated.View 
              style={[
                { position: "absolute", right: 16, bottom: 120, zIndex: 10 },
                actionButtonsStyle
              ]}
            >
              <View className="items-center space-y-6">
                <AnimatedActionButton
                  icon={currentVideo.isLiked ? "heart" : "heart-outline"}
                  label="Like"
                  count={currentVideo.likes || 0}
                  isActive={currentVideo.isLiked}
                  onPress={() => {
                    toggleLike(currentVideo.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
                
                <AnimatedActionButton
                  icon="chatbubble-outline"
                  label="Reply"
                  onPress={() => {
                    commentSheetRef.current?.present();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                />
                
                <AnimatedActionButton
                  icon="share-outline"
                  label="Share"
                  onPress={() => {
                    shareSheetRef.current?.present();
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
            </Animated.View>

            {/* Bottom Overlay */}
            <Animated.View 
              style={[
                { position: "absolute", bottom: 0, left: 0, right: 60, zIndex: 10 },
                overlayStyle
              ]}
            >
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
                          {format(new Date(currentVideo.timestamp), "MMM d")}
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
                  {currentVideo.transcription && (
                    <Text className="text-white text-15 leading-5 mb-2">
                      {currentVideo.transcription}
                    </Text>
                  )}
                  
                  {/* Video Info */}
                  <View className="flex-row items-center">
                    <Ionicons name="videocam" size={14} color="#1D9BF0" />
                    <Text className="text-blue-400 text-13 ml-1">Video confession</Text>
                  </View>
                </View>
              </SafeAreaView>
            </Animated.View>

            {/* Video Progress Indicator */}
            <VideoProgressIndicator
              currentTime={currentPlayer?.currentTime || 0}
              duration={currentPlayer?.duration || 0}
              isVisible={true}
            />

            {/* Tap to Play/Pause */}
            <Pressable
              className="absolute inset-0 z-5"
              onPress={() => {
                if (currentPlayer?.playing) {
                  videoPlayers.pauseVideo(currentIndex);
                } else {
                  videoPlayers.playVideo(currentIndex);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </Animated.View>
        </GestureDetector>

        {/* Comment Bottom Sheet */}
        <EnhancedCommentBottomSheet
          bottomSheetModalRef={commentSheetRef}
        />

        {/* Share Bottom Sheet */}
        <EnhancedShareBottomSheet
          bottomSheetModalRef={shareSheetRef}
          confessionId={currentVideo.id}
          confessionText={currentVideo.transcription || currentVideo.content}
        />
      </View>
    </GestureHandlerRootView>
  );
}