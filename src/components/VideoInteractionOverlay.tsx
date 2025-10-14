import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  AccessibilityInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useReplyStore } from "../state/replyStore";
import { VideoDataService } from "../services/VideoDataService";
import { useAuthStore } from "../state/authStore";
import type { Confession } from "../types/confession";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import ReportModal from "./ReportModal";
import { VideoInteractionType } from "../types/videoInteractions";
import { normalizeVideoError, VideoErrorCode, VideoInteractionError } from "../types/videoErrors";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface VideoInteractionOverlayProps {
  confession: Confession;
  onLike?: (isLiked: boolean) => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: (isSaved: boolean) => void;
  onReport?: () => void;
  style?: StyleProp<ViewStyle>;
  isVisible?: boolean;
  onViewUpdate?: () => void;
}

interface InteractionState {
  isLoading: boolean;
  error: string | null;
}

const VideoInteractionOverlay = React.memo(function VideoInteractionOverlay({
  confession,
  onLike,
  onComment,
  onShare,
  onSave,
  onReport,
  style,
  isVisible = true,
  onViewUpdate,
}: VideoInteractionOverlayProps) {
  const user = useAuthStore((state) => state.user);
  const toggleLike = useConfessionStore((state) => state.toggleLike);

  // Only get the specific confession we need, not the entire array
  const currentConfession = useConfessionStore((state) => state.confessions.find((c) => c.id === confession.id));

  // Use proper Zustand selectors with useShallow to avoid infinite loops
  const {
    isSaved: checkIsSaved,
    saveConfession,
    unsaveConfession,
  } = useSavedStore(
    useShallow((state) => ({
      isSaved: state.isSaved,
      saveConfession: state.saveConfession,
      unsaveConfession: state.unsaveConfession,
    })),
  );

  const { getReplies, subscribeToReplies, unsubscribeFromReplies } = useReplyStore(
    useShallow((state) => ({
      getReplies: state.getRepliesForConfession,
      subscribeToReplies: state.subscribeToReplies,
      unsubscribeFromReplies: state.unsubscribeFromReplies,
    })),
  );

  // Use stable selectors with shallow comparison for arrays/objects
  const replies = useReplyStore(useShallow((state) => state.replies[confession.id] || []));
  const typingUsers = useReplyStore(useShallow((state) => state.typingUsers[confession.id] || []));
  const pagination = useReplyStore((state) => state.pagination[confession.id]);

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(confession.likes || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [showCommentIndicator, setShowCommentIndicator] = useState(false);
  const commentPulse = useSharedValue(1);
  const commentBadgeScale = useSharedValue(0);
  const [viewCount, setViewCount] = useState(confession.views || 0);

  const [showReportModal, setShowReportModal] = useState(false);

  // Bottom sheet refs
  const commentSheetRef = useRef<BottomSheetModal>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);

  const [likeState, setLikeState] = useState<InteractionState>({ isLoading: false, error: null });
  const [saveState, setSaveState] = useState<InteractionState>({ isLoading: false, error: null });

  const likeScale = useSharedValue(1);
  const likeRotation = useSharedValue(0);
  const saveScale = useSharedValue(1);
  const saveRotation = useSharedValue(0);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const reportScale = useSharedValue(1);

  const overlayOpacity = useSharedValue(isVisible ? 1 : 0);
  const overlayTranslateX = useSharedValue(0);

  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsLiked(Boolean(currentConfession?.isLiked));
      setLikeCount(typeof currentConfession?.likes === "number" ? currentConfession.likes : confession.likes || 0);
      setIsSaved(checkIsSaved(confession.id));
    }
  }, [user?.id, confession.id, currentConfession?.isLiked, currentConfession?.likes, confession.likes]);

  // Real-time comment count updates
  useEffect(() => {
    const totalCount = typeof pagination?.totalCount === "number" ? pagination.totalCount : replies.length;

    // Only update if count actually changed
    if (totalCount !== commentCount) {
      setCommentCount(totalCount);

      // Animate comment count changes (only for increases)
      if (totalCount > commentCount && commentCount > 0) {
        setHasNewComments(true);
        setShowCommentIndicator(true);

        // Pulse animation for new comments
        commentPulse.value = withSequence(
          withSpring(1.2, { damping: 4, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 }),
        );

        // Show badge animation
        commentBadgeScale.value = withSequence(
          withSpring(1, { damping: 8, stiffness: 300 }),
          withTiming(1, { duration: 3000 }),
          withTiming(0, { duration: 300 }),
        );

        // Hide indicator after 3 seconds
        setTimeout(() => {
          setShowCommentIndicator(false);
          setHasNewComments(false);
        }, 3500);
      }
    }
  }, [replies.length, pagination?.totalCount]);

  // Subscribe to real-time comment updates
  useEffect(() => {
    if (confession.id) {
      subscribeToReplies(confession.id);
      return () => unsubscribeFromReplies();
    }
    return undefined;
  }, [confession.id, subscribeToReplies, unsubscribeFromReplies]);

  // Typing indicator effect
  useEffect(() => {
    if (typingUsers.length > 0) {
      commentScale.value = withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 400 }));
    }
  }, [typingUsers]);

  useEffect(() => {
    overlayOpacity.value = withTiming(isVisible ? 1 : 0, { duration: 300 });
    overlayTranslateX.value = withTiming(isVisible ? 0 : 50, { duration: 300 });
  }, [isVisible]);

  useEffect(() => {
    if (!viewTracked && isVisible && confession.id) {
      setViewTracked(true);
      VideoDataService.updateVideoViews(confession.id).then((newCount) => {
        if (newCount !== null) {
          setViewCount(newCount);
        }
      });
      onViewUpdate?.();
    }
  }, [isVisible, confession.id, viewTracked, onViewUpdate]);

  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (Platform.OS === "ios") {
      switch (type) {
        case "light":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  }, []);

  const announceAction = useCallback((action: string) => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(action);
    }
  }, []);

  const handleLike = useCallback(async () => {
    if (!user?.id || likeState.isLoading) return;

    triggerHaptic("medium");

    setLikeState({ isLoading: true, error: null });

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount((prev: number) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

    likeScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    if (newLikedState) {
      likeRotation.value = withSequence(
        withTiming(-15, { duration: 100 }),
        withSpring(0, { damping: 8, stiffness: 150 }),
      );
    }

    try {
      await toggleLike(confession.id);
      const updateResult = await VideoDataService.updateVideoLikes(confession.id, newLikedState);

      if (updateResult !== null) {
        setLikeCount(updateResult);
      }

      onLike?.(newLikedState);
      announceAction(newLikedState ? "Liked" : "Unliked");
      setLikeState({ isLoading: false, error: null });
    } catch (e: unknown) {
      const err = normalizeVideoError(e);
      console.error("Error toggling like:", err);

      // Revert optimistic update
      setIsLiked(!newLikedState);
      setLikeCount((prev: number) => (!newLikedState ? prev + 1 : Math.max(0, prev - 1)));

      // Set error message based on error type
      let errorMessage = err.message;
      if (err.code === VideoErrorCode.NetworkError) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err.code === VideoErrorCode.RateLimitExceeded) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }

      setLikeState({ isLoading: false, error: errorMessage });
    }
  }, [user?.id, isLiked, confession.id, likeState.isLoading, toggleLike, onLike, triggerHaptic, announceAction]);

  const handleComment = useCallback(() => {
    if (!user?.id) return;

    triggerHaptic("light");

    commentScale.value = withSequence(
      withSpring(1.2, { damping: 5, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    // Clear new comment indicator
    if (hasNewComments) {
      setHasNewComments(false);
      setShowCommentIndicator(false);
      commentBadgeScale.value = withTiming(0, { duration: 200 });
    }

    // Track comment interaction with enhanced analytics
    VideoDataService.trackVideoEvent("comment_sheet_open", {
      confession_id: confession.id,
      comment_count: commentCount,
      has_new_comments: hasNewComments,
      typing_users_count: typingUsers.length,
      timestamp: Date.now(),
    });

    commentSheetRef.current?.present();
    onComment?.();
    announceAction(`Opening comments, ${commentCount} comments`);
  }, [
    user?.id,
    confession.id,
    commentCount,
    hasNewComments,
    typingUsers.length,
    onComment,
    triggerHaptic,
    announceAction,
  ]);

  const handleShare = useCallback(() => {
    triggerHaptic("light");

    shareScale.value = withSequence(
      withSpring(1.2, { damping: 5, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    // Track share interaction
    VideoDataService.trackVideoEvent(confession.id, {
      type: VideoInteractionType.Share,
      timestamp: Date.now(),
    });

    shareSheetRef.current?.present();
    onShare?.();
    announceAction("Opening share options");
  }, [confession.id, onShare, triggerHaptic, announceAction]);

  const handleSave = useCallback(async () => {
    if (!user?.id || saveState.isLoading) return;

    triggerHaptic("medium");

    setSaveState({ isLoading: true, error: null });

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    saveScale.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    if (newSavedState) {
      saveRotation.value = withSequence(
        withTiming(360, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      );
    }

    try {
      if (newSavedState) {
        await saveConfession(confession.id);
      } else {
        await unsaveConfession(confession.id);
      }

      // Track save interaction
      VideoDataService.trackVideoEvent(confession.id, {
        type: VideoInteractionType.Save,
        timestamp: Date.now(),
        metadata: { saved: newSavedState },
      });

      onSave?.(newSavedState);
      announceAction(newSavedState ? "Saved" : "Unsaved");
      setSaveState({ isLoading: false, error: null });
    } catch (e: unknown) {
      const err = normalizeVideoError(e);
      console.error("Error toggling save:", err);

      // Revert optimistic update
      setIsSaved(!newSavedState);

      // Set error message based on error type
      let errorMessage = err.message;
      if (err.code === VideoErrorCode.NetworkError) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err.code === VideoErrorCode.PermissionDenied) {
        errorMessage = "Permission denied. Please check your account settings.";
      } else if (err.code === VideoErrorCode.RateLimitExceeded) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }

      setSaveState({ isLoading: false, error: errorMessage });

      // Track error for analytics
      VideoDataService.trackVideoEvent(confession.id, {
        type: VideoInteractionType.Save,
        timestamp: Date.now(),
        metadata: {
          saved: newSavedState,
          error: true,
          errorCode: err.code,
          errorMessage: err.message,
        },
      });
    }
  }, [
    user?.id,
    isSaved,
    confession.id,
    saveState.isLoading,
    saveConfession,
    unsaveConfession,
    onSave,
    triggerHaptic,
    announceAction,
  ]);

  const handleReport = useCallback(() => {
    if (!user?.id) return;

    triggerHaptic("heavy");

    reportScale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 150 }),
    );

    // Track report/pause interaction for analytics
    VideoDataService.trackVideoEvent(confession.id, {
      type: "pause",
      timestamp: Date.now(),
      metadata: { reason: "report_open" },
    });

    setShowReportModal(true);
    onReport?.();
    announceAction("Opening report options");
  }, [user?.id, confession.id, onReport, triggerHaptic, announceAction]);

  const likeAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: likeScale.value }, { rotate: `${likeRotation.value}deg` }],
    };
  });

  const saveAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: saveScale.value }, { rotate: `${saveRotation.value}deg` }],
    };
  });

  const commentAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: interpolate(commentScale.value * commentPulse.value, [1, 1.4], [1, 1.2]) }],
    };
  });

  const commentBadgeAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: commentBadgeScale.value }],
      opacity: commentBadgeScale.value,
    };
  });

  const shareAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: shareScale.value }],
    };
  });

  const reportAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: reportScale.value }],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: overlayOpacity.value,
      transform: [{ translateX: overlayTranslateX.value }],
    };
  });

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  const renderInteractionButton = useCallback(
    (
      icon: string,
      count: number | null,
      isActive: boolean,
      onPress: () => void,
      animatedStyle: any,
      isLoading: boolean = false,
      accessibilityLabel: string,
    ) => (
      <AnimatedTouchableOpacity
        style={[styles.actionButton, animatedStyle]}
        onPress={onPress}
        disabled={isLoading}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={isActive ? "#ff4458" : "#fff"} />
        )}
        {count !== null && (
          <Text style={[styles.actionCount, isActive && styles.activeText]}>{formatCount(count)}</Text>
        )}
      </AnimatedTouchableOpacity>
    ),
    [formatCount],
  );

  return (
    <>
      <Animated.View style={[styles.container, overlayAnimatedStyle, style]} pointerEvents="box-none">
        <View style={styles.actionsContainer}>
          {renderInteractionButton(
            isLiked ? "heart" : "heart-outline",
            likeCount,
            isLiked,
            handleLike,
            likeAnimatedStyle,
            likeState.isLoading,
            `Like button, ${likeCount} likes`,
          )}

          <View>
            {renderInteractionButton(
              typingUsers.length > 0 ? "chatbubble-ellipses" : "chatbubble-outline",
              commentCount,
              hasNewComments,
              handleComment,
              commentAnimatedStyle,
              false,
              `Comment button, ${commentCount} comments${typingUsers.length > 0 ? ", someone is typing" : ""}`,
            )}

            {showCommentIndicator && (
              <Animated.View style={[styles.newCommentBadge, commentBadgeAnimatedStyle]}>
                <Text style={styles.newCommentText}>New</Text>
              </Animated.View>
            )}

            {typingUsers.length > 0 && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          {renderInteractionButton(
            "share-outline",
            null,
            false,
            handleShare,
            shareAnimatedStyle,
            false,
            "Share button",
          )}

          {renderInteractionButton(
            isSaved ? "bookmark" : "bookmark-outline",
            null,
            isSaved,
            handleSave,
            saveAnimatedStyle,
            saveState.isLoading,
            `Save button, ${isSaved ? "saved" : "not saved"}`,
          )}

          {renderInteractionButton(
            "flag-outline",
            null,
            false,
            handleReport,
            reportAnimatedStyle,
            false,
            "Report button",
          )}
        </View>

        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={16} color="#fff" />
          <Text style={styles.viewsText}>{formatCount(viewCount)} views</Text>
        </View>
      </Animated.View>

      <EnhancedCommentBottomSheet bottomSheetModalRef={commentSheetRef} confessionId={confession.id} />

      <EnhancedShareBottomSheet
        bottomSheetModalRef={shareSheetRef}
        confessionId={confession.id}
        confessionText={confession.transcription || confession.content}
      />

      {showReportModal && (
        <ReportModal
          isVisible={showReportModal}
          onClose={() => setShowReportModal(false)}
          confessionId={confession.id}
          contentType="confession"
        />
      )}
    </>
  );
});

export default VideoInteractionOverlay;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 0,
    bottom: 80,
    zIndex: 10,
  },
  actionsContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  actionButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  actionCount: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeText: {
    color: "#ff4458",
  },
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    alignSelf: "center",
  },
  viewsText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  newCommentBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#9333EA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newCommentText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  typingIndicator: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "rgba(147, 51, 234, 0.8)",
    borderRadius: 10,
    padding: 4,
  },
});
