import React, { useEffect, useMemo } from "react";
import { View, Dimensions, StyleSheet, AccessibilityInfo, Platform } from "react-native";
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
} from "react-native-reanimated";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type LoadingState = "initial" | "refresh" | "loadMore";
type VideoLayout = "tiktok" | "enhanced" | "list";

interface VideoSkeletonProps {
  isVisible: boolean;
  state?: LoadingState;
  layout?: VideoLayout;
  itemCount?: number;
  showNetworkIndicator?: boolean;
  showErrorPlaceholder?: boolean;
  onAnimationComplete?: () => void;
}

interface SkeletonItemProps {
  index: number;
  layout: VideoLayout;
  delay: number;
}

const SkeletonItem: React.FC<SkeletonItemProps> = ({ index, layout, delay }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    scale.value = withDelay(delay, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (layout === "tiktok") {
    return (
      <Animated.View style={[styles.tiktokItem, animatedStyle]}>
        <View style={styles.tiktokVideoPlaceholder} />

        <View style={styles.tiktokSidebar}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.actionButtonPlaceholder} />
          <View style={styles.actionButtonPlaceholder} />
          <View style={styles.actionButtonPlaceholder} />
        </View>

        <View style={styles.tiktokBottomContent}>
          <View style={[styles.textLine, { width: "80%" }]} />
          <View style={[styles.textLine, { width: "60%" }]} />
          <View style={[styles.textLine, { width: "40%", opacity: 0.7 }]} />
        </View>
      </Animated.View>
    );
  }

  if (layout === "enhanced") {
    return (
      <Animated.View style={[styles.enhancedItem, animatedStyle]}>
        <View style={styles.enhancedVideoContainer}>
          <View style={styles.thumbnailPlaceholder} />
          <View style={styles.playButtonPlaceholder} />
        </View>

        <View style={styles.enhancedControls}>
          <View style={styles.progressBarPlaceholder} />
          <View style={styles.controlButtonsContainer}>
            <View style={styles.smallButtonPlaceholder} />
            <View style={styles.smallButtonPlaceholder} />
            <View style={styles.smallButtonPlaceholder} />
          </View>
        </View>

        <View style={styles.enhancedMetadata}>
          <View style={[styles.textLine, { width: "70%" }]} />
          <View style={[styles.textLine, { width: "50%", height: 12 }]} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.listItem, animatedStyle]}>
      <View style={styles.listThumbnail} />
      <View style={styles.listContent}>
        <View style={[styles.textLine, { width: "90%" }]} />
        <View style={[styles.textLine, { width: "60%", height: 12 }]} />
        <View style={styles.listMetadata}>
          <View style={styles.metadataItem} />
          <View style={styles.metadataItem} />
          <View style={styles.metadataItem} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function VideoSkeleton({
  isVisible,
  state = "initial",
  layout = "tiktok",
  itemCount,
  showNetworkIndicator = false,
  showErrorPlaceholder = false,
  onAnimationComplete,
}: VideoSkeletonProps) {
  const shimmerTranslateX = useSharedValue(-screenWidth);
  const pulseOpacity = useSharedValue(0.3);
  const progressWidth = useSharedValue(0);

  const calculatedItemCount = useMemo(() => {
    if (itemCount) return itemCount;
    if (state === "loadMore") return 2;
    if (state === "refresh") return 3;
    if (layout === "list") return 5;
    return layout === "tiktok" ? 1 : 3;
  }, [itemCount, state, layout]);

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
          withTiming(screenWidth * 2, { duration: 1500, easing: Easing.linear }),
          -1,
          false,
        );

        pulseOpacity.value = withRepeat(
          withSequence(withTiming(0.6, { duration: 1000 }), withTiming(0.3, { duration: 1000 })),
          -1,
          false,
        );
      } else {
        // Simple fade for reduced motion
        shimmerTranslateX.value = 0;
        pulseOpacity.value = withTiming(0.5, { duration: 200 });
      }

      if (state === "refresh") {
        progressWidth.value = withTiming(100, {
          duration: 2000,
          easing: Easing.out(Easing.quad),
        });
      }

      const announceLoading = () => {
        AccessibilityInfo.announceForAccessibility(`Loading ${state === "refresh" ? "new" : ""} videos`);
      };
      announceLoading();

      if (onAnimationComplete) {
        const timer = setTimeout(onAnimationComplete, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      cancelAnimation(shimmerTranslateX);
      cancelAnimation(pulseOpacity);
      cancelAnimation(progressWidth);
      shimmerTranslateX.value = -screenWidth;
      pulseOpacity.value = 0.3;
      progressWidth.value = 0;
    }

    return () => {
      cancelAnimation(shimmerTranslateX);
      cancelAnimation(pulseOpacity);
      cancelAnimation(progressWidth);
    };
  }, [isVisible, state]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isVisible ? 1 : 0, { duration: 300 }),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading videos"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={layout === "tiktok" ? 20 : 10} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0, 0, 0, 0.9)" }]} />
      )}

      <View style={styles.shimmerContainer}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>

      {state === "refresh" && (
        <Animated.View style={styles.refreshIndicator}>
          <Animated.View style={[styles.progressBar, progressStyle]} />
        </Animated.View>
      )}

      {showNetworkIndicator && (
        <Animated.View style={[styles.networkIndicator, pulseStyle]}>
          <View style={styles.networkDot} />
          <View style={[styles.textLine, { width: 100, height: 10 }]} />
        </Animated.View>
      )}

      <View style={[styles.skeletonContent, layout === "list" && styles.listLayout]}>
        {Array.from({ length: calculatedItemCount }).map((_, index) => (
          <SkeletonItem key={`skeleton-${index}`} index={index} layout={layout} delay={index * 100} />
        ))}
      </View>

      {state === "loadMore" && (
        <View style={styles.loadMoreIndicator}>
          <Animated.View style={pulseStyle}>
            <View style={styles.loadMoreDot} />
            <View style={styles.loadMoreDot} />
            <View style={styles.loadMoreDot} />
          </Animated.View>
        </View>
      )}

      {showErrorPlaceholder && (
        <Animated.View style={[styles.errorPlaceholder, pulseStyle]}>
          <View style={styles.errorIcon} />
          <View style={[styles.textLine, { width: 200 }]} />
          <View style={styles.retryButtonPlaceholder} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1F2937",
    zIndex: 10,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: screenWidth * 0.5,
    height: screenHeight,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    transform: [{ skewX: "-20deg" }],
  },
  refreshIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#60A5FA",
  },
  networkIndicator: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    zIndex: 15,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FCD34D",
    marginRight: 8,
  },
  skeletonContent: {
    flex: 1,
  },
  listLayout: {
    paddingTop: 60,
  },
  tiktokItem: {
    width: screenWidth,
    height: screenHeight,
  },
  tiktokVideoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  tiktokSidebar: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionButtonPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 16,
  },
  tiktokBottomContent: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 80,
  },
  enhancedItem: {
    marginVertical: 10,
    marginHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  enhancedVideoContainer: {
    height: 200,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  playButtonPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  enhancedControls: {
    padding: 12,
  },
  progressBarPlaceholder: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    marginBottom: 12,
  },
  controlButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  smallButtonPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  enhancedMetadata: {
    padding: 12,
  },
  listItem: {
    flexDirection: "row",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  listThumbnail: {
    width: 120,
    height: 80,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 12,
  },
  listContent: {
    flex: 1,
    justifyContent: "center",
  },
  listMetadata: {
    flexDirection: "row",
    marginTop: 8,
  },
  metadataItem: {
    width: 40,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 12,
  },
  textLine: {
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    marginBottom: 8,
  },
  loadMoreIndicator: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
  },
  loadMoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 4,
  },
  errorPlaceholder: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    alignItems: "center",
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    marginBottom: 16,
  },
  retryButtonPlaceholder: {
    width: 120,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 16,
  },
});
