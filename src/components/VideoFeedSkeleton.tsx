import React, { useEffect, useMemo } from "react";
import { View, Dimensions, StyleSheet, ScrollView, AccessibilityInfo, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInUp,
} from "react-native-reanimated";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type FeedLoadingState = "initial" | "pullToRefresh" | "loadMore";
type Orientation = "portrait" | "landscape";

interface VideoFeedSkeletonProps {
  isVisible: boolean;
  state?: FeedLoadingState;
  itemCount?: number;
  orientation?: Orientation;
  showNetworkStatus?: boolean;
  showErrorIndicator?: boolean;
  animationTiming?: {
    fade?: number;
    stagger?: number;
    shimmer?: number;
  };
  onAnimationComplete?: () => void;
}

interface FeedItemSkeletonProps {
  index: number;
  delay: number;
  orientation: Orientation;
}

const FeedItemSkeleton: React.FC<FeedItemSkeletonProps> = ({ index, delay, orientation }) => {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    scale.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const isLandscape = orientation === "landscape";
  const itemHeight = isLandscape ? screenHeight * 0.8 : screenHeight;
  const itemWidth = isLandscape ? screenWidth * 0.6 : screenWidth;

  return (
    <Animated.View style={[styles.feedItem, { height: itemHeight, width: itemWidth }, animatedStyle]}>
      <View style={styles.videoBackground} />

      <View style={styles.videoThumbnailContainer}>
        <Animated.View style={styles.videoThumbnailPlaceholder} />
      </View>

      <View style={styles.overlayContainer}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar} />
            <View style={styles.followButton} />
          </View>
        </View>

        <View style={styles.sideActions}>
          <View style={styles.actionItem}>
            <View style={styles.actionIcon} />
            <View style={styles.actionCount} />
          </View>
          <View style={styles.actionItem}>
            <View style={styles.actionIcon} />
            <View style={styles.actionCount} />
          </View>
          <View style={styles.actionItem}>
            <View style={styles.actionIcon} />
            <View style={styles.actionCount} />
          </View>
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, styles.shareIcon]} />
          </View>
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, styles.musicIcon]} />
          </View>
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.captionContainer}>
            <View style={[styles.textPlaceholder, { width: "85%" }]} />
            <View style={[styles.textPlaceholder, { width: "70%" }]} />
            <View style={[styles.textPlaceholder, { width: "50%", opacity: 0.6 }]} />
          </View>

          <View style={styles.musicInfo}>
            <View style={styles.musicIconSmall} />
            <View style={[styles.textPlaceholder, { width: 150, height: 12 }]} />
          </View>
        </View>
      </View>

      <View style={styles.videoControlsOverlay}>
        <View style={styles.playPauseButton} />
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function VideoFeedSkeleton({
  isVisible,
  state = "initial",
  itemCount,
  orientation = "portrait",
  showNetworkStatus = false,
  showErrorIndicator = false,
  animationTiming = {},
  onAnimationComplete,
}: VideoFeedSkeletonProps) {
  const { fade = 300, stagger = 80, shimmer = 1800 } = animationTiming;

  const shimmerTranslateX = useSharedValue(-screenWidth);
  const pulseOpacity = useSharedValue(0.4);
  const refreshRotation = useSharedValue(0);
  const loadMoreScale = useSharedValue(1);

  const calculatedItemCount = useMemo(() => {
    if (itemCount) return itemCount;
    if (state === "loadMore") return 1;
    if (state === "pullToRefresh") return 2;
    return orientation === "landscape" ? 2 : 1;
  }, [itemCount, state, orientation]);

  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (isVisible) {
      if (!reduceMotion) {
        shimmerTranslateX.value = withRepeat(
          withTiming(screenWidth * 2, { duration: shimmer, easing: Easing.linear }),
          -1,
          false,
        );

        pulseOpacity.value = withRepeat(
          withSequence(withTiming(0.7, { duration: 1000 }), withTiming(0.4, { duration: 1000 })),
          -1,
          false,
        );
      } else {
        // Simple fade for reduced motion
        shimmerTranslateX.value = 0;
        pulseOpacity.value = withTiming(0.6, { duration: 300 });
      }

      if (state === "pullToRefresh") {
        refreshRotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
      }

      if (state === "loadMore") {
        loadMoreScale.value = withRepeat(
          withSequence(withTiming(1.2, { duration: 600 }), withTiming(1, { duration: 600 })),
          -1,
          false,
        );
      }

      AccessibilityInfo.announceForAccessibility(`Loading ${state === "pullToRefresh" ? "new" : ""} video feed`);

      if (onAnimationComplete) {
        const timer = setTimeout(onAnimationComplete, calculatedItemCount * stagger + fade);
        return () => clearTimeout(timer);
      }
    } else {
      cancelAnimation(shimmerTranslateX);
      cancelAnimation(pulseOpacity);
      cancelAnimation(refreshRotation);
      cancelAnimation(loadMoreScale);
      shimmerTranslateX.value = -screenWidth;
      pulseOpacity.value = 0.4;
      refreshRotation.value = 0;
      loadMoreScale.value = 1;
    }

    return () => {
      cancelAnimation(shimmerTranslateX);
      cancelAnimation(pulseOpacity);
      cancelAnimation(refreshRotation);
      cancelAnimation(loadMoreScale);
    };
  }, [isVisible, state, shimmer, fade, stagger, calculatedItemCount]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible ? 1 : 0, { duration: fade }),
  }));

  const refreshStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const loadMoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadMoreScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      entering={FadeIn.duration(fade)}
      exiting={FadeOut.duration(fade)}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading video feed"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.85)" }]} />
      )}

      <View style={styles.shimmerLayer}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>

      {state === "pullToRefresh" && (
        <Animated.View style={[styles.pullToRefreshIndicator, refreshStyle]}>
          <View style={styles.refreshIcon} />
        </Animated.View>
      )}

      {showNetworkStatus && (
        <Animated.View style={[styles.networkStatusBar, pulseStyle]}>
          <View style={styles.networkStatusDot} />
          <View style={[styles.textPlaceholder, { width: 120, height: 12 }]} />
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        horizontal={orientation === "landscape"}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {Array.from({ length: calculatedItemCount }).map((_, index) => (
          <FeedItemSkeleton
            key={`feed-skeleton-${index}`}
            index={index}
            delay={index * stagger}
            orientation={orientation}
          />
        ))}
      </ScrollView>

      {state === "loadMore" && (
        <Animated.View style={[styles.loadMoreContainer, loadMoreStyle]}>
          <View style={styles.loadMoreDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      )}

      {showErrorIndicator && (
        <Animated.View style={[styles.errorOverlay, pulseStyle]}>
          <View style={styles.errorIconContainer}>
            <View style={styles.errorIcon} />
          </View>
          <View style={[styles.textPlaceholder, { width: 250, marginVertical: 12 }]} />
          <View style={styles.retryButton}>
            <View style={[styles.textPlaceholder, { width: 60, height: 14 }]} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    zIndex: 100,
  },
  shimmerLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: screenWidth * 0.6,
    height: screenHeight * 1.2,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    transform: [{ skewX: "-25deg" }],
  },
  pullToRefreshIndicator: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 101,
  },
  refreshIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  networkStatusBar: {
    position: "absolute",
    top: 50,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    zIndex: 102,
  },
  networkStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FCD34D",
    marginRight: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  feedItem: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  videoThumbnailContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  userInfo: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 80,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  followButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    marginLeft: -12,
    marginTop: 16,
  },
  sideActions: {
    position: "absolute",
    bottom: 100,
    right: 16,
    alignItems: "center",
  },
  actionItem: {
    alignItems: "center",
    marginBottom: 20,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 4,
  },
  shareIcon: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  musicIcon: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    transform: [{ rotate: "15deg" }],
  },
  actionCount: {
    width: 36,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bottomContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 80,
  },
  captionContainer: {
    marginBottom: 12,
  },
  textPlaceholder: {
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    marginBottom: 6,
  },
  musicInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  musicIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginRight: 8,
  },
  videoControlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  playPauseButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginLeft: -30,
    marginTop: -30,
    opacity: 0.5,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  progressFill: {
    width: "30%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  loadMoreContainer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  loadMoreDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 4,
  },
  errorOverlay: {
    position: "absolute",
    top: "35%",
    alignSelf: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
});
