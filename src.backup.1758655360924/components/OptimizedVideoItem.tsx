import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { VideoView, VideoPlayer, VideoPlayerStatus } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { format, isValid } from "date-fns";
import * as Haptics from "expo-haptics";

import { useConfessionStore } from "../state/confessionStore";
import { VideoDataService } from "../services/VideoDataService";
import type { Confession } from "../types/confession";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const FALLBACK_USERNAME = "@anonymous";
const DOUBLE_TAP_MAX_DELAY = 280;

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  if (!isValid(date)) {
    return "Just now";
  }
  return format(date, "MMM d, h:mm a");
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface OptimizedVideoItemProps {
  confession: Confession;
  isActive: boolean;
  onClose?: () => void;
  videoPlayer: VideoPlayer | null;
  muted: boolean;
  onToggleMute: () => void;
  isPlaying: boolean;
  onSingleTap?: () => void;
  onCommentPress?: (confessionId: string) => void;
  onSharePress?: (confessionId: string, confessionText: string) => void;
  networkStatus?: boolean;
}

export default function OptimizedVideoItem({
  confession,
  isActive,
  onClose,
  videoPlayer,
  muted,
  onToggleMute,
  isPlaying,
  onSingleTap,
  onCommentPress,
  onSharePress,
  networkStatus = true,
}: OptimizedVideoItemProps) {
  const toggleLike = useConfessionStore((state) => state.toggleLike);

  const [isLiked, setIsLiked] = useState(Boolean(confession.isLiked));
  const [likesCount, setLikesCount] = useState(confession.likes || 0);
  const [viewsCount, setViewsCount] = useState(confession.views || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const likeInFlightRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const lastTapRef = useRef(0);

  // Animation values
  const likeScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0.5);

  // Monitor player status to update loading/error state
  useEffect(() => {
    if (!videoPlayer) {
      return;
    }

    const applyStatus = (status: VideoPlayerStatus, error?: { message?: string }) => {
      if (status === "readyToPlay") {
        setIsLoading(false);
        setVideoError(false);
      } else if (status === "loading" || status === "idle") {
        setIsLoading(true);
      } else if (status === "error") {
        setIsLoading(false);
        setVideoError(true);
        if (__DEV__ && error?.message) {
          console.warn("OptimizedVideoItem: Video status error", error.message);
        }
      }
    };

    // Apply current status immediately
    applyStatus(videoPlayer.status as VideoPlayerStatus);

    const statusSubscription = videoPlayer.addListener("statusChange", ({ status, error }: any) => {
      applyStatus(status as VideoPlayerStatus, error);
    });

    const sourceSubscription = videoPlayer.addListener("sourceChange", () => {
      setIsLoading(true);
      setVideoError(false);
    });

    return () => {
      statusSubscription.remove();
      sourceSubscription.remove();
    };
  }, [videoPlayer]);

  // Track video view when it becomes active
  useEffect(() => {
    if (isActive && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      VideoDataService.updateVideoViews(confession.id);
      setViewsCount((prev) => prev + 1);
    } else if (!isActive) {
      viewTrackedRef.current = false;
    }
  }, [isActive, confession.id]);

  // Load comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const count = await VideoDataService.getCommentCount(confession.id);
        setCommentCount(count);
      } catch (error) {
        console.warn("Failed to load comment count:", error);
      }
    };

    loadCommentCount();
  }, [confession.id]);

  // Handle like action
  const handleLike = useCallback(async () => {
    if (likeInFlightRef.current) return;

    likeInFlightRef.current = true;
    const wasLiked = isLiked;
    const newLikedState = !wasLiked;
    const newLikesCount = wasLiked ? likesCount - 1 : likesCount + 1;

    // Optimistic update
    setIsLiked(newLikedState);
    setLikesCount(newLikesCount);

    // Animate like button
    likeScale.value = withSpring(1.2, { duration: 150 }, () => {
      likeScale.value = withSpring(1, { duration: 150 });
    });

    // Show heart animation for likes
    if (newLikedState) {
      heartOpacity.value = withTiming(1, { duration: 200 });
      heartScale.value = withSpring(1.5, { duration: 300 }, () => {
        heartOpacity.value = withTiming(0, { duration: 500 });
        heartScale.value = 0.5;
      });
    }

    try {
      if (offlineQueue.getNetworkStatus()) {
        await toggleLike(confession.id);
      } else {
        await offlineQueue.enqueue(
          newLikedState ? OFFLINE_ACTIONS.LIKE_CONFESSION : OFFLINE_ACTIONS.UNLIKE_CONFESSION,
          { confessionId: confession.id },
        );
      }

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } catch (error) {
      console.error("Failed to toggle like:", error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikesCount(likesCount);
    } finally {
      likeInFlightRef.current = false;
    }
  }, [isLiked, likesCount, confession.id, toggleLike, likeScale, heartOpacity, heartScale]);

  // Handle comment action
  const handleComment = useCallback(() => {
    if (onCommentPress) {
      onCommentPress(confession.id);
    }
  }, [onCommentPress, confession.id]);

  // Listen for comment updates to refresh count
  const _handleCommentUpdate = useCallback(() => {
    VideoDataService.getCommentCount(confession.id).then(setCommentCount);
  }, [confession.id]);

  // Handle share action
  const handleShare = useCallback(() => {
    if (onSharePress) {
      onSharePress(confession.id, confession.content);
    }
  }, [onSharePress, confession.id, confession.content]);

  // Handle double tap for like
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < DOUBLE_TAP_MAX_DELAY) {
      handleLike();
    } else if (onSingleTap) {
      // Delay single tap to allow for potential double tap
      setTimeout(() => {
        const timeSinceThisTap = Date.now() - lastTapRef.current;
        if (timeSinceThisTap >= DOUBLE_TAP_MAX_DELAY) {
          onSingleTap();
        }
      }, DOUBLE_TAP_MAX_DELAY);
    }
  }, [handleLike, onSingleTap]);

  // Video loading handlers
  // Animated styles
  const likeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const heartAnimationStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const playButtonOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isActive && !isPlaying && !isLoading ? 1 : 0, { duration: 300 }),
  }));

  const loadingOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isLoading ? 1 : 0, { duration: 300 }),
  }));

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <AnimatedPressable style={styles.videoContainer} onPress={handleDoubleTap}>
        {isActive && videoPlayer && !videoError ? (
          <VideoView
            style={styles.video}
            player={videoPlayer}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            fullscreenOptions={{ enable: false }}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={64} color="#666666" />
          </View>
        )}

        {/* Loading Indicator */}
        <Animated.View style={[styles.loadingContainer, loadingOpacity]}>
          <View style={styles.loadingSpinner} />
        </Animated.View>

        {/* Play Button */}
        <Animated.View style={[styles.playButtonContainer, playButtonOpacity]}>
          <Pressable style={styles.playButton} onPress={onSingleTap}>
            <Ionicons name="play" size={32} color="#ffffff" />
          </Pressable>
        </Animated.View>

        {/* Heart Animation */}
        <Animated.View style={[styles.heartAnimation, heartAnimationStyle]}>
          <Ionicons name="heart" size={80} color="#ff3040" />
        </Animated.View>

        {/* Video Overlay */}
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]} style={styles.overlay} />
      </AnimatedPressable>

      {/* Content Overlay */}
      <View style={styles.contentOverlay}>
        {/* Close Button */}
        {onClose && (
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        )}

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          {/* Left Content */}
          <View style={styles.leftContent}>
            <Text style={styles.username}>{FALLBACK_USERNAME}</Text>
            <Text style={styles.content} numberOfLines={3}>
              {confession.content}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(confession.timestamp)}</Text>
          </View>
        </View>

        {/* Right Actions - Positioned Absolutely */}
        <View style={styles.rightActions}>
          {/* Like Button */}
          <AnimatedPressable style={[styles.actionButton, likeButtonStyle]} onPress={handleLike}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#ff3040" : "#ffffff"} />
            <Text style={styles.actionText}>{likesCount}</Text>
          </AnimatedPressable>

          {/* Comment Button */}
          <Pressable style={styles.actionButton} onPress={handleComment}>
            <Ionicons name="chatbubble-outline" size={28} color="#ffffff" />
            <Text style={styles.actionText}>{commentCount}</Text>
          </Pressable>

          {/* Share Button */}
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="arrow-redo-outline" size={28} color="#ffffff" />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>

          {/* Views */}
          <View style={styles.actionButton}>
            <Ionicons name="eye-outline" size={28} color="#ffffff" />
            <Text style={styles.actionText}>{viewsCount}</Text>
          </View>

          {/* Mute Button */}
          <Pressable style={styles.actionButton} onPress={onToggleMute}>
            <Ionicons name={muted ? "volume-mute" : "volume-high"} size={28} color="#ffffff" />
          </Pressable>

          {/* Network Status */}
          {!networkStatus && (
            <View style={styles.actionButton}>
              <Ionicons name="cloud-offline-outline" size={24} color="#ff6666" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000000",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  contentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  leftContent: {
    maxWidth: "75%",
  },
  username: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  content: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: "400",
  },
  timestamp: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "400",
  },
  rightActions: {
    position: "absolute",
    right: 15,
    bottom: 100,
    alignItems: "center",
    gap: 20,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
    minWidth: 48,
    paddingVertical: 6,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#ffffff",
    borderTopColor: "transparent",
  },
  playButtonContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  heartAnimation: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
