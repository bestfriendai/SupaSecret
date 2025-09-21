import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View, ActivityIndicator } from "react-native";
import { VideoView, type VideoPlayer, type VideoPlayerStatus } from "expo-video";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  FadeIn,
  FadeOut,
  type SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { format, isValid } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";

import { useConfessionStore } from "../state/confessionStore";
import { VideoDataService } from "../services/VideoDataService";
import VideoInteractionOverlay from "./VideoInteractionOverlay";
import type { Confession } from "../types/confession";
import { isOnline, enqueue } from "../lib/offlineQueue";
import { normalizeVideoError } from "../types/videoErrors";
import type { VideoItemProps } from "../types/videoComponents";

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

const sanitizeUri = (uri?: string | null) => {
  if (!uri) {
    return "";
  }
  return uri.trim();
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function UnifiedVideoItem({
  confession,
  isActive,
  shouldPreload = false,
  onClose,
  videoPlayer,
  muted,
  onToggleMute,
  isPlaying,
  onRegisterLikeHandler,
  progressY,
  onSingleTap,
  onDoubleTap,
  networkStatus = true,
  variant = "tiktok",
}: VideoItemProps) {
  const toggleLike = useConfessionStore((state) => state.toggleLike);

  const [isLiked, setIsLiked] = useState(Boolean(confession.isLiked));
  const [likesCount, setLikesCount] = useState(confession.likes || 0);
  const [viewsCount, setViewsCount] = useState(confession.views || 0);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const likeInFlightRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const videoLoadedRef = useRef(false);

  const heartScale = useSharedValue(0.5);
  const heartOpacity = useSharedValue(0);
  const lastTapTime = useSharedValue(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapScale = useSharedValue(1);
  const muteButtonScale = useSharedValue(1);
  const closeButtonScale = useSharedValue(1);

  useEffect(() => {
    if (!videoPlayer) {
      return undefined;
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
          console.warn("UnifiedVideoItem: Video status error", error.message);
        }
      }
    };

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

  const description = useMemo(() => {
    return (confession.transcription && confession.transcription.trim()) || confession.content;
  }, [confession.content, confession.transcription]);

  const videoUri = useMemo(() => sanitizeUri(confession.videoUri), [confession.videoUri]);
  const timestampLabel = useMemo(() => formatTimestamp(confession.timestamp), [confession.timestamp]);

  useEffect(() => {
    setIsLiked(Boolean(confession.isLiked));
    setLikesCount(confession.likes || 0);
    setViewsCount(confession.views || 0);
  }, [confession.id, confession.isLiked, confession.likes, confession.views]);

  // Track view when video becomes active
  useEffect(() => {
    if (isActive && !viewTrackedRef.current && networkStatus) {
      viewTrackedRef.current = true;
      VideoDataService.updateVideoViews(confession.id).then((newViews) => {
        if (newViews !== null) {
          setViewsCount(newViews);
        }
      });
    } else if (!isActive) {
      viewTrackedRef.current = false;
    }
  }, [isActive, confession.id, networkStatus]);

  // Handle video load completion
  useEffect(() => {
    if (isActive && videoPlayer) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        videoLoadedRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActive, videoPlayer]);

  // Cleanup tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    };
  }, []);

  const triggerHeartAnimation = useCallback(() => {
    heartOpacity.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 }));
    heartScale.value = withSequence(
      withSpring(1.6, { damping: 10, stiffness: 200 }),
      withTiming(0.8, { duration: 300 }),
    );
  }, [heartOpacity, heartScale]);

  const handleLike = useCallback(async () => {
    if (likeInFlightRef.current) {
      return;
    }
    likeInFlightRef.current = true;

    const wasLiked = isLiked;
    const nextLiked = !wasLiked;

    // Optimistic update
    setIsLiked(nextLiked);
    setLikesCount((prev) => prev + (nextLiked ? 1 : -1));

    try {
      triggerHeartAnimation();
      Haptics.impactAsync(nextLiked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );

      if (networkStatus) {
        await toggleLike(confession.id);
        VideoDataService.updateVideoLikes(confession.id, nextLiked);
      } else {
        // Queue for offline processing
        enqueue("video.like", {
          confessionId: confession.id,
          isLiked: nextLiked,
          timestamp: Date.now(),
        });
      }
    } catch (error: unknown) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount((prev) => prev + (wasLiked ? 1 : -1));
      const err = normalizeVideoError(error);
      console.error("UnifiedVideoItem: failed to toggle like", err);
    } finally {
      likeInFlightRef.current = false;
    }
  }, [confession.id, isLiked, toggleLike, triggerHeartAnimation, networkStatus]);

  const handleLikeFromOverlay = useCallback(
    (liked: boolean) => {
      setIsLiked(liked);
      setLikesCount((prev) => prev + (liked ? 1 : -1));
      if (liked) {
        triggerHeartAnimation();
      }
    },
    [triggerHeartAnimation],
  );

  const handleMuteToggle = useCallback(() => {
    muteButtonScale.value = withSequence(
      withSpring(0.8, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 }),
    );
    onToggleMute();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [onToggleMute, muteButtonScale]);

  const handleClose = useCallback(() => {
    closeButtonScale.value = withSequence(
      withSpring(0.8, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onClose?.();
  }, [onClose, closeButtonScale]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const muteButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: muteButtonScale.value }],
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeButtonScale.value }],
  }));

  useEffect(() => {
    if (isActive) {
      onRegisterLikeHandler(handleLike);
      return () => onRegisterLikeHandler(null);
    }
    onRegisterLikeHandler(null);
    return undefined;
  }, [handleLike, isActive, onRegisterLikeHandler]);

  const handleSingleTapJS = useCallback(() => {
    onSingleTap?.();
  }, [onSingleTap]);

  const handleDoubleTapJS = useCallback(() => {
    onDoubleTap?.();
  }, [onDoubleTap]);

  const handleTapEvaluation = useCallback(
    (timestamp: number) => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }

      const timeSinceLastTap = timestamp - lastTapTime.value;

      if (timeSinceLastTap < DOUBLE_TAP_MAX_DELAY) {
        handleDoubleTapJS();
        lastTapTime.value = 0;
      } else {
        lastTapTime.value = timestamp;
        tapTimeoutRef.current = setTimeout(() => {
          handleSingleTapJS();
          tapTimeoutRef.current = null;
        }, DOUBLE_TAP_MAX_DELAY);
      }
    },
    [handleDoubleTapJS, handleSingleTapJS, lastTapTime],
  );

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .maxDistance(10)
    .onStart(() => {
      tapScale.value = withSequence(withTiming(0.98, { duration: 80 }), withTiming(1, { duration: 80 }));
    })
    .onEnd(() => {
      runOnJS(handleTapEvaluation)(Date.now());
    });

  const videoWrapperAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  const infoOverlayStyle = useAnimatedStyle(() => {
    if (!progressY) {
      return { opacity: 1 };
    }
    const opacity = interpolate(Math.abs(progressY.value), [0, 0.1, 0.3], [1, 0.8, 0.4]);
    return { opacity };
  });

  const playPauseOverlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isPlaying ? 0 : 1, { duration: 200 }),
    transform: [{ scale: withSpring(isPlaying ? 0.8 : 1, { damping: 15, stiffness: 200 }) }],
  }));

  if (!videoUri) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="videocam-off-outline" size={48} color="#666666" />
          <Text style={styles.errorText}>Video unavailable</Text>
          <Text style={styles.errorSubtext}>This video cannot be played</Text>
        </View>
      </View>
    );
  }

  if (videoError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6666" />
          <Text style={styles.errorText}>Failed to load video</Text>
          <Pressable style={styles.retryButton} onPress={() => setVideoError(false)} accessibilityRole="button">
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Variant-specific rendering can be added here
  const renderVariantSpecificUI = () => {
    if (variant === "enhanced") {
      // Add enhanced-specific UI elements
      return null;
    }
    return null;
  };

  return (
    <View style={styles.container} accessibilityLabel="Video confession">
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[styles.videoWrapper, videoWrapperAnimatedStyle]}>
          {isActive && videoPlayer ? (
            <>
              <VideoView
                player={videoPlayer}
                style={styles.video}
                contentFit="cover"
                fullscreenOptions={{ enable: false }}
                allowsPictureInPicture={false}
                nativeControls={false}
              />

              {isLoading && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  style={styles.loadingOverlay}
                >
                  <ActivityIndicator size="large" color="#ffffff" />
                </Animated.View>
              )}
            </>
          ) : (
            <View style={styles.inactivePlaceholder}>
              <LinearGradient colors={["#1a1a1a", "#0a0a0a"]} style={styles.gradientBackground} />
              <Ionicons name="play-circle" size={56} color="#4d4d4d" />
              <Text style={styles.placeholderText}>Swipe to play</Text>
            </View>
          )}

          <Animated.View pointerEvents="none" style={[styles.heartOverlay, heartAnimatedStyle]}>
            <Ionicons name="heart" size={100} color="#FF3040" />
          </Animated.View>

          {!isPlaying && isActive && !isLoading && (
            <Animated.View style={[styles.playOverlay, playPauseOverlayStyle]} pointerEvents="none">
              <View style={styles.playButton}>
                <Ionicons name="play" size={40} color="#ffffff" />
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <Animated.View style={[styles.infoOverlay, infoOverlayStyle]} pointerEvents="box-none">
        <View style={styles.textColumn}>
          <View style={styles.userRow}>
            <Text style={styles.usernameText}>{FALLBACK_USERNAME}</Text>
            {!networkStatus && (
              <View style={styles.offlineBadge}>
                <Ionicons name="wifi-outline" size={12} color="#ff6666" />
              </View>
            )}
          </View>
          <Text style={styles.descriptionText} numberOfLines={3} accessibilityRole="text">
            {description}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.timestampText}>{timestampLabel}</Text>
            <View style={styles.statsRow}>
              <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.statText}>{viewsCount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <VideoInteractionOverlay
        confession={confession}
        onLike={handleLikeFromOverlay}
        isVisible={isActive}
        onViewUpdate={() => {}}
        style={styles.interactionOverlay}
      />

      <AnimatedPressable
        style={[styles.muteButton, muteButtonAnimatedStyle]}
        onPress={handleMuteToggle}
        accessibilityRole="button"
        accessibilityLabel={muted ? "Unmute video" : "Mute video"}
        hitSlop={12}
      >
        <View style={styles.controlButton}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color="#ffffff" />
        </View>
      </AnimatedPressable>

      {onClose && (
        <AnimatedPressable
          style={[styles.closeButton, closeButtonAnimatedStyle]}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close video feed"
          hitSlop={12}
        >
          <View style={styles.controlButton}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </View>
        </AnimatedPressable>
      )}

      {renderVariantSpecificUI()}
    </View>
  );
}

const styles = {
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000000",
  },
  videoWrapper: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  inactivePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  gradientBackground: {
    position: "absolute" as const,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  placeholderText: {
    color: "#808080",
    marginTop: 16,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  loadingOverlay: {
    position: "absolute" as const,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  heartOverlay: {
    position: "absolute" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  playOverlay: {
    position: "absolute" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bottomGradient: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  infoOverlay: {
    position: "absolute" as const,
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    paddingHorizontal: 16,
  },
  textColumn: {
    flex: 1,
    paddingRight: 16,
  },
  userRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  usernameText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  offlineBadge: {
    backgroundColor: "rgba(255,102,102,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  descriptionText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: 8,
  },
  timestampText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  statText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  interactionOverlay: {
    position: "absolute" as const,
    right: 0,
    bottom: 100,
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 22,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  muteButton: {
    position: "absolute" as const,
    top: 60,
    right: 16,
  },
  closeButton: {
    position: "absolute" as const,
    top: 60,
    left: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  errorText: {
    color: "#ffffff",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  errorSubtext: {
    color: "#999999",
    marginTop: 8,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#333333",
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600" as const,
  },
};
