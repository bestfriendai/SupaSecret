import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { VideoView, VideoPlayer, VideoPlayerStatus } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { format, isValid } from "date-fns";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useConfessionStore } from "../state/confessionStore";
import { VideoDataService } from "../services/VideoDataService";
import type { Confession } from "../types/confession";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";
import { TikTokCaptions, TIKTOK_CAPTION_STYLES, type CaptionSegment } from "./TikTokCaptions";
import { VideoWatermark } from "./VideoWatermark";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("screen");

// Responsive spacing based on screen size
const getResponsiveBottomSpacing = () => {
  if (SCREEN_HEIGHT < 700) {
    return { content: 140, actions: 80, closeButton: 50 };
  } else if (SCREEN_HEIGHT < 800) {
    return { content: 160, actions: 90, closeButton: 54 };
  } else if (SCREEN_HEIGHT < 900) {
    return { content: 180, actions: 100, closeButton: 60 };
  } else {
    return { content: 200, actions: 120, closeButton: 64 };
  }
};

const FALLBACK_USERNAME = "@anonymous";
const DOUBLE_TAP_MAX_DELAY = 280;

const formatTimestamp = (timestamp: string | number) => {
  const ts = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const date = new Date(ts);
  if (!isValid(date)) {
    return "Just now";
  }
  return format(date, "MMM d, h:mm a");
};

// Helper function to extract plain text from transcription JSON
const extractTranscriptionText = (transcription: string | null | undefined): string => {
  if (!transcription) return "";

  try {
    // Try to parse as JSON (caption segments format)
    const parsed = JSON.parse(transcription);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Extract text from all segments
      return parsed.map((seg: any) => seg.text).join(" ");
    }
  } catch {
    // If parsing fails, it's already plain text
  }

  return transcription;
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
  const insets = useSafeAreaInsets();
  const spacing = getResponsiveBottomSpacing();

  const [isLiked, setIsLiked] = useState(Boolean(confession.isLiked));
  const [likesCount, setLikesCount] = useState(confession.likes || 0);
  const [viewsCount, setViewsCount] = useState(confession.views || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const likeInFlightRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const lastTapRef = useRef(0);

  // Caption state
  const [captionSegments, setCaptionSegments] = useState<CaptionSegment[]>([]);
  const [currentCaptionSegment, setCurrentCaptionSegment] = useState<CaptionSegment | null>(null);
  const [showCaptions] = useState(true);

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

  // Parse transcription into caption segments
  useEffect(() => {
    if (!confession.transcription) {
      setCaptionSegments([]);
      return;
    }

    try {
      // Try to parse as JSON (from AssemblyAI format with word-level timing)
      const parsed = JSON.parse(confession.transcription);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Already in segment format with word-level timing
        setCaptionSegments(parsed);
      } else {
        // Convert plain text to segments (fallback)
        const words = confession.transcription.split(" ");
        const segments: CaptionSegment[] = [];
        const wordsPerSegment = 8;

        for (let i = 0; i < words.length; i += wordsPerSegment) {
          const segmentWords = words.slice(i, i + wordsPerSegment);
          const startTime = (i / words.length) * (videoPlayer?.duration || 30);
          const endTime = ((i + wordsPerSegment) / words.length) * (videoPlayer?.duration || 30);

          segments.push({
            id: `segment_${i}`,
            text: segmentWords.join(" "),
            startTime,
            endTime,
            isComplete: true,
            words: segmentWords.map((word, idx) => ({
              word,
              startTime: startTime + (idx * (endTime - startTime)) / segmentWords.length,
              endTime: startTime + ((idx + 1) * (endTime - startTime)) / segmentWords.length,
              confidence: 1.0,
              isComplete: true,
            })),
          });
        }

        setCaptionSegments(segments);
      }
    } catch (error) {
      // Plain text transcription - convert to segments (fallback)
      const words = confession.transcription.split(" ");
      const segments: CaptionSegment[] = [];
      const wordsPerSegment = 8;

      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segmentWords = words.slice(i, i + wordsPerSegment);
        const startTime = (i / words.length) * (videoPlayer?.duration || 30);
        const endTime = ((i + wordsPerSegment) / words.length) * (videoPlayer?.duration || 30);

        segments.push({
          id: `segment_${i}`,
          text: segmentWords.join(" "),
          startTime,
          endTime,
          isComplete: true,
          words: segmentWords.map((word, idx) => ({
            word,
            startTime: startTime + (idx * (endTime - startTime)) / segmentWords.length,
            endTime: startTime + ((idx + 1) * (endTime - startTime)) / segmentWords.length,
            confidence: 1.0,
            isComplete: true,
          })),
        });
      }

      setCaptionSegments(segments);
    }
  }, [confession.transcription, videoPlayer?.duration]);

  // Sync captions with video playback
  useEffect(() => {
    if (!showCaptions || captionSegments.length === 0 || !videoPlayer || !isActive) {
      setCurrentCaptionSegment(null);
      return;
    }

    const interval = setInterval(() => {
      const currentTime = videoPlayer.currentTime;
      const segment = captionSegments.find(
        (seg) => currentTime >= seg.startTime && currentTime <= (seg.endTime || seg.startTime + 3),
      );
      setCurrentCaptionSegment(segment || null);
    }, 100); // Update every 100ms for smooth caption sync

    return () => clearInterval(interval);
  }, [showCaptions, captionSegments, videoPlayer, isActive]);

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
  // SharedValues for props to use in worklets
  const isActiveShared = useSharedValue(isActive);
  const isPlayingShared = useSharedValue(isPlaying);
  const isLoadingShared = useSharedValue(isLoading);

  useEffect(() => {
    isActiveShared.value = isActive;
    isPlayingShared.value = isPlaying;
    isLoadingShared.value = isLoading;
  }, [isActive, isPlaying, isLoading, isActiveShared, isPlayingShared, isLoadingShared]);

  // Animated styles
  const likeButtonStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: likeScale.value }],
    };
  });

  const heartAnimationStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: heartOpacity.value,
      transform: [{ scale: heartScale.value }],
    };
  });

  const playButtonOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: withTiming(isActiveShared.value && !isPlayingShared.value && !isLoadingShared.value ? 1 : 0, {
        duration: 300,
      }),
    };
  });

  const loadingOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: withTiming(isLoadingShared.value ? 1 : 0, { duration: 300 }),
    };
  });

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <AnimatedPressable style={styles.videoContainer} onPress={handleDoubleTap}>
        {isActive && videoPlayer && !videoError ? (
          <VideoView
            style={styles.video}
            player={videoPlayer}
            contentFit="cover"
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

      {/* TikTok-style Captions */}
      {showCaptions && captionSegments.length > 0 && isActive && (
        <TikTokCaptions
          segments={captionSegments}
          currentSegment={currentCaptionSegment}
          style={TIKTOK_CAPTION_STYLES[0]}
          position="bottom"
        />
      )}

      {/* Watermark Overlay - Always visible on every video */}
      <VideoWatermark position="top-right" size="small" />

      {/* Content Overlay */}
      <View style={styles.contentOverlay}>
        {/* Close Button */}
        {onClose && (
          <Pressable
            style={[styles.closeButton, { top: Math.max(spacing.closeButton, insets.top + 10) }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
        )}

        {/* Bottom Content */}
        <View style={[styles.bottomContent, { paddingBottom: Math.max(spacing.content, insets.bottom + 120) }]}>
          {/* Left Content */}
          <View style={styles.leftContent}>
            <Text style={styles.username}>{FALLBACK_USERNAME}</Text>
            <Text style={styles.content} numberOfLines={2}>
              {extractTranscriptionText(confession.transcription) || confession.content}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.timestamp}>{formatTimestamp(confession.timestamp)}</Text>
              <View style={styles.viewsRow}>
                <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.viewsText}>{viewsCount.toLocaleString()} views</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Actions - Positioned Absolutely */}
        <View style={[styles.rightActions, { bottom: Math.max(spacing.actions, insets.bottom + 80) }]}>
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
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_WIDTH < 375 ? 16 : 20,
  },
  leftContent: {
    maxWidth: "70%",
  },
  username: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: "400",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timestamp: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "500",
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "500",
  },
  rightActions: {
    position: "absolute",
    right: SCREEN_WIDTH < 375 ? 12 : 15,
    alignItems: "center",
    gap: SCREEN_HEIGHT < 700 ? 16 : 20,
    zIndex: 150,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
    minWidth: SCREEN_WIDTH < 375 ? 44 : 48,
    paddingVertical: SCREEN_HEIGHT < 700 ? 4 : 6,
  },
  actionText: {
    color: "#ffffff",
    fontSize: SCREEN_WIDTH < 375 ? 11 : 12,
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
