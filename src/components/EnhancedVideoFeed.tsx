import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import { BlurView } from "expo-blur";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { format } from "date-fns";
import { PreferenceAwareHaptics } from "../utils/haptics";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
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
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import AnimatedActionButton from "./AnimatedActionButton";
import PullToRefreshOverlay from "./PullToRefreshOverlay";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import ReportModal from "./ReportModal";
import VideoProgressIndicator from "./VideoProgressIndicator";
import TikTokCaptionsOverlay from "./TikTokCaptionsOverlay";
import VideoSkeleton from "./VideoSkeleton";
import VideoGuidanceOverlay from "./VideoGuidanceOverlay";
import VideoControls from "./VideoControls";
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
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const userPreferences = useConfessionStore((state) => state.userPreferences);
  const updateVideoAnalytics = useConfessionStore((state) => state.updateVideoAnalytics);
  const videoConfessions = confessions.filter((c) => c.type === "video") as VideoItem[];

  const { saveConfession, unsaveConfession, isSaved } = useSavedStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(userPreferences.captions_default);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const commentSheetRef = useRef<BottomSheetModal | null>(null);
  const shareSheetRef = useRef<BottomSheetModal | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Animated values
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const actionButtonsTranslateX = useSharedValue(0);

  // Video players management
  const videoPlayers = useVideoPlayers(videoConfessions);

  // Track if this tab is currently focused
  const isFocused = useIsFocused();

  // Handle tab focus changes for video playback control
  useEffect(() => {
    if (isFocused) {
      // Tab is focused - force unmute videos for video tab auto-play behavior
      videoPlayers.updateMuteState(true);
      if (videoConfessions.length > 0) {
        videoPlayers.playVideo(currentIndex);
      }
    } else {
      // Tab is not focused - pause all videos to save resources and improve UX
      videoPlayers.pauseAll();
    }
  }, [isFocused, videoPlayers, videoConfessions.length, currentIndex]);

  // Handle screen focus for initial setup (when navigating to this screen)
  // We intentionally avoid depending on currentIndex here to prevent re-triggering on index changes.
  useFocusEffect(
    useCallback(
      () => {
        // Initial setup when screen gains focus
        if (videoConfessions.length > 0 && currentIndex === 0) {
          setCurrentIndex(0);
        }
        return () => {
          // Cleanup when screen loses focus (navigating away from screen entirely)
          videoPlayers.pauseAll();
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [videoPlayers, videoConfessions.length],
    ),
  );

  // Reference current video and player for use across effects/render
  const currentVideo = videoConfessions[currentIndex];
  const currentPlayer = videoPlayers.getPlayer(currentIndex);

  // Ensure autoplay when player becomes available
  useEffect(() => {
    if (currentPlayer && !currentPlayer.playing) {
      videoPlayers.playVideo(currentIndex);
    }
  }, [currentPlayer, currentIndex, videoPlayers]);

  // Handle video changes with cleanup
  useEffect(() => {
    if (videoConfessions.length > 0 && isFocused) {
      videoPlayers.playVideo(currentIndex);
    }

    // Cleanup function to prevent memory leaks
    // Always pause previous videos instead of conditionalizing on isFocused
    return () => {
      videoPlayers.pauseAll();
    };
  }, [currentIndex, videoPlayers, videoConfessions.length, isFocused]);

  const changeVideo = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= videoConfessions.length) return;

      // Show loading state for new video
      setIsVideoLoading(true);

      // Pause current and play new
      videoPlayers.pauseVideo(currentIndex);
      videoPlayers.playVideo(newIndex);

      setCurrentIndex(newIndex);

      // Hide loading state after a short delay (video should be preloaded)
      setTimeout(() => setIsVideoLoading(false), 300);

      // Haptic feedback
      PreferenceAwareHaptics.impactAsync();
    },
    [currentIndex, videoConfessions.length, videoPlayers],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadConfessions();            // <-- real fetch
    } finally {
      setIsRefreshing(false);
    }
    PreferenceAwareHaptics.impactAsync();
  }, [loadConfessions]);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      // Apply speed to current video player
      const player = videoPlayers.getPlayer(currentIndex);
      if (player) {
        player.playbackRate = speed;
      }
    },
    [currentIndex, videoPlayers],
  );

  const handleCaptionsToggle = useCallback((enabled: boolean) => {
    setCaptionsEnabled(enabled);
  }, []);

  // Track video progress
  const trackVideoProgress = useCallback(
    (videoId: string, currentTime: number, duration: number) => {
      if (duration > 0) {
        const progress = Math.min(currentTime / duration, 1);
        const analytics = {
          watchTime: currentTime,
          completionRate: progress,
          watchProgress: progress,
          totalDuration: duration,
          lastWatched: Date.now(),
          interactions: 1,
          watchSessions: 1,
        };

        updateVideoAnalytics(videoId, analytics);
      }
    },
    [updateVideoAnalytics],
  );

  // Set up progress tracking for current video with proper cleanup
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const player = videoPlayers.getPlayer(currentIndex);
    if (player && currentVideo && isFocused) {
      interval = setInterval(() => {
        try {
          // Check if player is still valid before accessing properties
          if (player && player.currentTime !== undefined && player.duration !== undefined) {
            trackVideoProgress(currentVideo.id, player.currentTime, player.duration);
          }
        } catch (error) {
          // Clear interval if player is no longer valid
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          if (__DEV__) {
            console.warn("Video progress tracking error:", error);
          }
        }
      }, 2000); // Reduced frequency to improve performance
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [currentIndex, currentVideo, videoPlayers, trackVideoProgress, isFocused]);

  // Cleanup on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Ensure all videos are stopped and cleaned up
      videoPlayers.stopAll();
      videoPlayers.cleanup();
    };
  }, [videoPlayers]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      overlayOpacity.value = withTiming(0.7, { duration: 200 });
    })
    .onUpdate((event) => {
      "worklet";
      translateY.value = event.translationY;

      // Update pull distance for refresh indicator - throttled to reduce JS bridge calls
      if (event.translationY > 0 && currentIndex === 0) {
        const pullValue = Math.min(event.translationY, 120);
        if (pullValue % 5 === 0) {
          // Throttle updates to every 5 pixels
          runOnJS(setPullDistance)(pullValue);
        }
      }

      // Scale effect based on swipe distance - optimized with worklet
      const scaleValue = interpolate(Math.abs(event.translationY), [0, screenHeight / 2], [1, 0.9], "clamp");
      scale.value = scaleValue;

      // Action buttons slide effect - optimized with worklet
      actionButtonsTranslateX.value = interpolate(event.translationX, [-100, 0, 100], [20, 0, -20], "clamp");
    })
    .onEnd((event) => {
      "worklet";
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
      heartScale.value = withSequence(withTiming(1.2, { duration: 200 }), withTiming(0, { duration: 300 }));
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(100, withTiming(0, { duration: 300 })),
      );

      runOnJS(() => {
        toggleLike(videoConfessions[currentIndex]?.id);
        PreferenceAwareHaptics.impactAsync();
      })();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(setShowControls)(!showControls);

      // Auto-hide controls after 3 seconds
      if (!showControls) {
        setTimeout(() => runOnJS(setShowControls)(false), 3000);
      }
    });

  const composedGestures = Gesture.Simultaneous(panGesture, Gesture.Exclusive(doubleTapGesture, singleTapGesture));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
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
        <Text className="text-white text-20 font-bold mt-4 text-center">No Video Secrets Yet</Text>
        <Text className="text-gray-500 text-15 mt-2 text-center px-6">
          Video confessions will appear here when they are shared
        </Text>
        <Pressable
          className="bg-blue-500 rounded-full px-6 py-3 mt-6 touch-target"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Go back to previous screen"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // currentVideo/currentPlayer are defined above

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar hidden />
      <View className="flex-1 bg-black">
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[{ flex: 1 }, containerStyle]}>
            {/* Video Player */}
            {currentPlayer ? (
              <>
                <VideoView player={currentPlayer} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
                {/* Visual privacy overlay in Expo Go */}
                <BlurView intensity={16} tint="dark" style={{ position: "absolute", inset: 0 }} pointerEvents="none" />
              </>
            ) : (
              <View className="flex-1 items-center justify-center bg-black">
                <Ionicons name="videocam-outline" size={48} color="#8B98A5" />
                <Text className="text-gray-400 mt-2">Preparing video…</Text>
              </View>
            )}

            {/* Video Loading Skeleton */}
            <VideoSkeleton isVisible={isVideoLoading} />

            {/* Video Controls */}
            <VideoControls
              isVisible={showControls}
              onSpeedChange={handleSpeedChange}
              onCaptionsToggle={handleCaptionsToggle}
              captionsEnabled={captionsEnabled}
              hasTranscription={!!currentVideo.transcription}
            />

            {/* Pull to Refresh Indicator */}
            <PullToRefreshOverlay
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              threshold={80}
              context="videos"
              onRefreshComplete={() => PreferenceAwareHaptics.impactAsync()}
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
                heartAnimationStyle,
              ]}
            >
              <Ionicons name="heart" size={80} color="#FF3040" />
            </Animated.View>

            {/* Top Overlay */}
            <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }, overlayStyle]}>
              <SafeAreaView>
                <View className="flex-row items-center justify-between px-4 py-2">
                  <Pressable
                    className="bg-black/50 rounded-full p-2 touch-target"
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                  </Pressable>

                  <View className="flex-row items-center space-x-2">
                    <View className="bg-black/50 rounded-full px-3 py-1">
                      <Text className="text-white text-13 font-medium">
                        {currentIndex + 1}/{videoConfessions.length}
                      </Text>
                    </View>

                    {/* CC Toggle */}
                    {currentVideo.transcription && (
                      <Pressable
                        className={`rounded-full px-2 py-1 ${captionsEnabled ? "bg-blue-500" : "bg-black/50"}`}
                        onPress={() => {
                          setCaptionsEnabled(!captionsEnabled);
                          PreferenceAwareHaptics.impactAsync();
                        }}
                      >
                        <Text className={`text-11 font-medium ${captionsEnabled ? "text-white" : "text-gray-300"}`}>
                          CC
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    className="bg-black/50 rounded-full p-2 touch-target"
                    accessibilityRole="button"
                    accessibilityLabel="More options"
                  >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </SafeAreaView>
            </Animated.View>

            {/* Right Side Actions */}
            <Animated.View style={[{ position: "absolute", right: 16, bottom: 120, zIndex: 10 }, actionButtonsStyle]}>
              <View className="items-center space-y-6">
                <AnimatedActionButton
                  icon={currentVideo.isLiked ? "heart" : "heart-outline"}
                  label="Like"
                  count={currentVideo.likes || 0}
                  isActive={currentVideo.isLiked}
                  onPress={() => {
                    toggleLike(currentVideo.id);
                    PreferenceAwareHaptics.impactAsync();
                  }}
                />

                <AnimatedActionButton
                  icon="chatbubble-outline"
                  label="Reply"
                  onPress={() => {
                    const ref = commentSheetRef.current;
                    if (ref && typeof ref.present === "function") ref.present();
                    PreferenceAwareHaptics.impactAsync();
                  }}
                />

                <AnimatedActionButton
                  icon="share-outline"
                  label="Share"
                  onPress={() => {
                    const ref = shareSheetRef.current;
                    if (ref && typeof ref.present === "function") ref.present();
                    PreferenceAwareHaptics.impactAsync();
                  }}
                />

                <AnimatedActionButton
                  icon={isSaved(currentVideo.id) ? "bookmark" : "bookmark-outline"}
                  label="Save"
                  isActive={isSaved(currentVideo.id)}
                  onPress={() => {
                    if (isSaved(currentVideo.id)) {
                      unsaveConfession(currentVideo.id);
                    } else {
                      saveConfession(currentVideo.id);
                    }
                    PreferenceAwareHaptics.impactAsync();
                  }}
                />

                <AnimatedActionButton
                  icon="flag-outline"
                  label="Report"
                  onPress={() => {
                    setReportModalVisible(true);
                    PreferenceAwareHaptics.impactAsync();
                  }}
                />
              </View>
            </Animated.View>

            {/* Bottom Overlay */}
            <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 60, zIndex: 10 }, overlayStyle]}>
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

                  {/* TikTok-style Captions */}
                  {currentVideo.transcription && captionsEnabled && (
                    <View className="bg-black/50 rounded-2xl px-3 py-2 mb-2">
                      <TikTokCaptionsOverlay
                        text={currentVideo.transcription}
                        currentTime={currentPlayer?.currentTime || 0}
                        duration={currentPlayer?.duration || 1}
                      />
                    </View>
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
                PreferenceAwareHaptics.impactAsync();
              }}
              accessibilityRole="button"
              accessibilityLabel={currentPlayer?.playing ? "Pause video" : "Play video"}
              accessibilityHint="Double tap to play or pause the video"
            />
          </Animated.View>
        </GestureDetector>

        {/* Comment Bottom Sheet */}
        <EnhancedCommentBottomSheet bottomSheetModalRef={commentSheetRef} confessionId={currentVideo.id} />

        {/* Share Bottom Sheet */}
        <EnhancedShareBottomSheet
          bottomSheetModalRef={shareSheetRef}
          confessionId={currentVideo.id}
          confessionText={currentVideo.transcription || currentVideo.content}
        />

        {/* Report Modal */}
        <ReportModal
          isVisible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          confessionId={currentVideo.id}
          contentType="confession"
        />

        {/* First-time User Guidance */}
        <VideoGuidanceOverlay isVisible={showGuidance} onDismiss={() => setShowGuidance(false)} />
      </View>
    </GestureHandlerRootView>
  );
}
