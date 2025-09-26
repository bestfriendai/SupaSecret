import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  Text,
  View,
  Pressable,
  AppState,
} from "react-native";
import { FlatList } from "react-native";
import type { ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";

import { ErrorBoundary } from "./ErrorBoundary";
import OptimizedVideoItem from "./OptimizedVideoItem";
import VideoFeedSkeleton from "./VideoFeedSkeleton";
import NetworkStatusIndicator from "./NetworkStatusIndicator";
import SimpleCommentModal from "./SimpleCommentModal";
import { Share } from "react-native";
import { generateConfessionLink, generateShareMessage } from "../utils/links";
import { VideoDataService } from "../services/VideoDataService";
import { useConfessionStore } from "../state/confessionStore";
import type { Confession } from "../types/confession";
import { useConfessionStore } from "../state/confessionStore";
import { isOnline, setOnline } from "../lib/offlineQueue";
import { VideoLoadError } from "../types/videoErrors";

interface OptimizedTikTokVideoFeedProps {
  onClose?: () => void;
  initialIndex?: number;
}

interface VideoLoadResult {
  success: boolean;
  videos: Confession[];
  error?: VideoLoadError;
  shouldRetry: boolean;
}

// Single video player approach - only one player at a time
const FALLBACK_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const _MAX_RETRY_ATTEMPTS = 3;

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 120,
  waitForInteraction: false,
};

export default function OptimizedTikTokVideoFeed({ onClose, initialIndex = 0 }: OptimizedTikTokVideoFeedProps) {
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList<Confession>>(null);
  const [videos, setVideos] = useState<Confession[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState(isOnline());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const scrollOffset = useSharedValue(0);
  const hasInitializedScroll = useRef(false);
  const loadingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const fallbackVideoIndex = useRef(0);

  const userPreferences = useConfessionStore((state) => state.userPreferences);
  const [muted, setMuted] = useState(!userPreferences.sound_enabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeIndexRef = useRef(activeIndex);

  // Comment state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // Single video player for current video only
  const activeSource = useMemo(() => {
    if (!videos.length || activeIndex < 0 || activeIndex >= videos.length) {
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    const video = videos[activeIndex];
    if (!video || typeof video !== "object" || !video.videoUri) {
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    return video.videoUri;
  }, [activeIndex, videos]);

  // Single video player instance
  const videoPlayer: VideoPlayer | null = useVideoPlayer(activeSource, (player) => {
    if (!player) {
      console.log("Video player is null for source:", activeSource);
      return;
    }

    try {
      player.loop = true;
      player.volume = muted ? 0 : 1;
      console.log("Video player configured for:", activeSource);
    } catch (error) {
      console.warn("Video player configuration error:", error);
    }
  });

  const videoPlayerRef = useRef<VideoPlayer | null>(null);

  useEffect(() => {
    videoPlayerRef.current = videoPlayer;
  }, [videoPlayer]);

  // Load videos with better error handling
  const hydrateVideos = useCallback(
    async (isRefresh = false, append = false) => {
      if (loadingRef.current && !append) {
        return;
      }

      loadingRef.current = true;
      setError(null);
      // Only show loading spinner if we don't have any videos yet
      if (!isRefresh && !append && videos.length === 0) {
        setIsLoading(true);
      }
      if (isRefresh) {
        setIsRefreshing(true);
      }

      try {
        const [confessions, trending] = await Promise.all([
          VideoDataService.fetchVideoConfessions(append ? 10 : 20),
          append ? Promise.resolve([]) : VideoDataService.fetchTrendingVideos(24, 10),
        ]);

        // Ensure both arrays are valid before spreading
        const safeConfessions = Array.isArray(confessions) ? confessions : [];
        const safeTrending = Array.isArray(trending) ? trending : [];

        const combined = [...safeTrending, ...safeConfessions].filter(
          (item) => item && typeof item === "object" && item.id && item.videoUri,
        );

        console.log("OptimizedTikTokVideoFeed: Raw confessions:", safeConfessions.length);
        console.log("OptimizedTikTokVideoFeed: Raw trending:", safeTrending.length);
        console.log("OptimizedTikTokVideoFeed: Combined after filter:", combined.length);
        console.log("OptimizedTikTokVideoFeed: Sample items:", combined.slice(0, 2));

        if (combined.length > 0) {
          setVideos((prevVideos) => {
            const dedupedMap = new Map<string, Confession>();

            // Add existing videos first if appending
            if (append) {
              for (const item of prevVideos) {
                if (item?.id) {
                  dedupedMap.set(item.id, item);
                }
              }
            }

            for (const item of combined) {
              dedupedMap.set(item.id, item);
            }

            const result = Array.from(dedupedMap.values());

            if (!append) {
              setActiveIndex((prev) => {
                if (isRefresh) return 0;
                return Math.min(prev, result.length - 1);
              });
              setIsPlaying(false);
            }

            console.log("OptimizedTikTokVideoFeed: Successfully loaded", result.length, "videos");
            return result;
          });

          VideoDataService.flushAllEvents();
          setRetryAttempts(0); // Reset retry attempts on success
          setError(null); // Clear any previous errors
        } else {
          const online = isOnline();
          const attemptNum = retryAttempts + 1;
          setRetryAttempts(attemptNum);
          console.log("OptimizedTikTokVideoFeed: No videos found, online:", online);
          setError(online ? "No videos available right now" : "No internet connection");
        }
      } catch (err) {
        console.error("OptimizedTikTokVideoFeed: failed to load videos", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [retryAttempts],
  );

  useEffect(() => {
    hydrateVideos(false);

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading && !videos.length) {
        console.log("OptimizedTikTokVideoFeed: Loading timeout reached");
        setIsLoading(false);
        setError("Loading took too long. Please try again.");
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(loadingTimeout);
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    setMuted(!userPreferences.sound_enabled);
  }, [userPreferences.sound_enabled]);

  useEffect(() => {
    if (!videoPlayer) return;

    try {
      videoPlayer.muted = muted;
      videoPlayer.volume = muted ? 0 : 1;
    } catch (error) {
      // Ignore disposal errors
    }
  }, [videoPlayer, muted]);

  const pausePlayer = useCallback(() => {
    if (!videoPlayer) return;

    try {
      videoPlayer.pause?.();
      setIsPlaying(false);
    } catch (error) {
      // Ignore disposal errors
    }
  }, [videoPlayer]);

  const playPlayer = useCallback(() => {
    if (!videoPlayer) return;

    try {
      videoPlayer.play?.();
      setIsPlaying(true);
    } catch (error) {
      // Ignore disposal errors
    }
  }, [videoPlayer]);

  useEffect(() => {
    if (!videoPlayer) return;

    if (!isFocused || !videos.length || appStateRef.current !== "active") {
      pausePlayer();
      return;
    }

    playPlayer();
  }, [videoPlayer, isFocused, videos.length, pausePlayer, playPlayer]);

  useEffect(() => {
    if (!videoPlayer || !isFocused || !videos.length || appStateRef.current !== "active") {
      return;
    }

    setIsPlaying(false);
    playPlayer();

    // Track video view
    const currentVideo = videos[activeIndex];
    if (currentVideo) {
      VideoDataService.updateVideoViews(currentVideo.id);
    }
  }, [activeIndex, videoPlayer, isFocused, videos.length, playPlayer]);

  useEffect(() => {
    if (!videos.length || hasInitializedScroll.current) {
      return;
    }

    hasInitializedScroll.current = true;
    if (initialIndex > 0) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [initialIndex, videos.length]);

  const handleRefresh = useCallback(() => {
    setOnline(true);
    hydrateVideos(true);
  }, [hydrateVideos]);

  const handleSingleTap = useCallback(() => {
    if (isPlaying) {
      pausePlayer();
    } else {
      playPlayer();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [isPlaying, pausePlayer, playPlayer]);

  const handleViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems?.length) return;

    const visibleItem = viewableItems.find((item) => item.isViewable && typeof item.index === "number");
    if (visibleItem && typeof visibleItem.index === "number" && visibleItem.index !== activeIndexRef.current) {
      setActiveIndex(visibleItem.index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  });

  // Handle comment press
  const handleCommentPress = useCallback(
    (confessionId: string) => {
      try {
        // Pause video when opening comments
        if (videoPlayer) {
          videoPlayer.pause();
          setIsPlaying(false);
        }

        setCurrentVideoId(confessionId);
        setCommentModalVisible(true);
      } catch (error) {
        console.error("Failed to open comments:", error);
      }
    },
    [videoPlayer],
  );

  const handleCloseComments = useCallback(() => {
    setCommentModalVisible(false);
    setCurrentVideoId(null);
  }, []);

  // Handle share press
  const handleSharePress = useCallback(async (confessionId: string, confessionText: string) => {
    try {
      const shareUrl = generateConfessionLink(confessionId);
      const shareMessage = generateShareMessage(confessionText, confessionId);

      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });

      // Track share event
      VideoDataService.trackVideoEvent(confessionId, {
        type: "share",
        timestamp: Date.now(),
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Confession; index: number }) => {
      const isItemActive = index === activeIndex && isFocused;

      return (
        <OptimizedVideoItem
          confession={item}
          isActive={isItemActive}
          videoPlayer={isItemActive ? videoPlayer : null}
          onClose={onClose}
          muted={muted}
          onToggleMute={() => setMuted((prev) => !prev)}
          isPlaying={isItemActive ? isPlaying : false}
          onSingleTap={handleSingleTap}
          onCommentPress={handleCommentPress}
          onSharePress={handleSharePress}
          networkStatus={networkStatus}
        />
      );
    },
    [
      activeIndex,
      isFocused,
      isPlaying,
      muted,
      onClose,
      videoPlayer,
      handleSingleTap,
      handleCommentPress,
      handleSharePress,
      networkStatus,
    ],
  );

  const errorOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(error && !videos.length ? 1 : 0, { duration: 300 }),
  }));

  console.log(
    "OptimizedTikTokVideoFeed render: isLoading=",
    isLoading,
    "videos.length=",
    videos.length,
    "error=",
    error,
  );

  // Show loading only if we have no videos AND we're actually loading
  if (isLoading && videos.length === 0) {
    return (
      <>
        <VideoFeedSkeleton
          isVisible={true}
          state="initial"
          showNetworkStatus={!networkStatus}
          animationTiming={{ fade: 400, stagger: 100 }}
        />
        <NetworkStatusIndicator
          position="top"
          minimalMode={false}
          persistentMode={!networkStatus}
          scrollOffset={scrollOffset}
          onRetry={handleRefresh}
        />
      </>
    );
  }

  if (error && !videos.length) {
    return (
      <>
        <VideoFeedSkeleton
          isVisible={true}
          state="initial"
          showErrorIndicator={true}
          showNetworkStatus={!networkStatus}
        />
        <Animated.View style={[styles.centeredContainer, errorOpacity]}>
          <StatusBar hidden />
          <Ionicons name="cloud-offline-outline" size={48} color="#ff6666" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.centeredText}>{error}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading videos"
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </Animated.View>
      </>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar hidden />
        <Ionicons name="videocam-off-outline" size={48} color="#555555" />
        <Text style={styles.centeredText}>No videos available right now</Text>
        <Text style={styles.centeredMeta}>Pull down to refresh</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary resetKeys={[videos.length, activeIndex]}>
      <View style={styles.feedContainer}>
        <StatusBar hidden />
        <FlatList
          ref={flatListRef}
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={handleViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfig}
          pagingEnabled
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              tintColor="#ffffff"
              colors={["#ffffff"]}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              progressViewOffset={20}
            />
          }
          ListFooterComponent={
            isRefreshing && videos.length > 0 ? (
              <ActivityIndicator color="#ffffff" style={styles.footerSpinner} />
            ) : null
          }
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />
        <NetworkStatusIndicator position="top" minimalMode={true} autoHideDelay={3000} scrollOffset={scrollOffset} />
      </View>

      {/* Comment Modal */}
      <SimpleCommentModal
        visible={commentModalVisible}
        onClose={handleCloseComments}
        confessionId={currentVideoId || ""}
      />
    </ErrorBoundary>
  );
}

const styles = {
  feedContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
  },
  centeredText: {
    color: "#ffffff",
    marginTop: 16,
    textAlign: "center" as const,
    fontSize: 16,
    fontWeight: "500" as const,
  },
  centeredMeta: {
    color: "#aaaaaa",
    marginTop: 8,
    textAlign: "center" as const,
    fontSize: 14,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700" as const,
    marginTop: 12,
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600" as const,
    fontSize: 16,
  },
  footerSpinner: {
    paddingVertical: 24,
  },
};
