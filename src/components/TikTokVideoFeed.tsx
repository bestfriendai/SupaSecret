import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, RefreshControl, StatusBar, Text, View, Pressable, AppState } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";
import type { ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";

import { ErrorBoundary } from "./ErrorBoundary";
import TikTokVideoItem from "./TikTokVideoItem";
import { VideoDataService } from "../services/VideoDataService";
import { useConfessionStore } from "../state/confessionStore";
import type { Confession } from "../types/confession";
import { isDisposalError } from "../utils/videoErrors";
import { useVideoFeedGestures } from "../hooks/useVideoFeedGestures";
import { isOnline, setOnline } from "../lib/offlineQueue";

interface TikTokVideoFeedProps {
  onClose?: () => void;
  initialIndex?: number;
}

const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PRELOAD_OFFSET = 2;
const MAX_MEMORY_VIDEOS = 10;

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 120,
  waitForInteraction: false,
};

export default function TikTokVideoFeed({ onClose, initialIndex = 0 }: TikTokVideoFeedProps) {
  const isFocused = useIsFocused();
  const flashListRef = useRef<FlashListRef<Confession>>(null);
  const [videos, setVideos] = useState<Confession[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState(isOnline());
  const hasInitializedScroll = useRef(false);
  const loadingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const videoPlayersRef = useRef<Map<string, VideoPlayer>>(new Map());
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  const userPreferences = useConfessionStore((state) => state.userPreferences);
  const [muted, setMuted] = useState(!userPreferences.sound_enabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeIndexRef = useRef(activeIndex);
  const likeHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const loadMoreThreshold = useRef(3);

  const activeSource = useMemo(() => {
    if (!videos.length) {
      return FALLBACK_VIDEO;
    }

    const source = videos[activeIndex]?.videoUri ?? undefined;
    return source && source.length > 0 ? source : FALLBACK_VIDEO;
  }, [activeIndex, videos]);

  const videoPlayer: VideoPlayer | null = useVideoPlayer(activeSource, (player) => {
    if (!player) {
      return;
    }

    try {
      player.loop = true;
      player.volume = muted ? 0 : 1;
    } catch (error) {
      if (!isDisposalError(error)) {
        console.warn("TikTokVideoFeed: failed to configure player", error);
      }
    }
  });

  const videoPlayerRef = useRef<VideoPlayer | null>(null);
  useEffect(() => {
    videoPlayerRef.current = videoPlayer;
    if (videoPlayer && videos[activeIndex]) {
      videoPlayersRef.current.set(videos[activeIndex].id, videoPlayer);
    }
  }, [videoPlayer, activeIndex, videos]);

  // Memory cleanup for video players
  const cleanupUnusedPlayers = useCallback(() => {
    const currentId = videos[activeIndex]?.id;
    const keepIds = new Set<string>();

    // Keep current and nearby videos
    for (let i = Math.max(0, activeIndex - PRELOAD_OFFSET);
         i <= Math.min(videos.length - 1, activeIndex + PRELOAD_OFFSET);
         i++) {
      if (videos[i]) {
        keepIds.add(videos[i].id);
      }
    }

    // Clean up distant players
    for (const [id, player] of videoPlayersRef.current.entries()) {
      if (!keepIds.has(id)) {
        try {
          player.pause();
        } catch (error) {
          // Ignore disposal errors
        }
        videoPlayersRef.current.delete(id);
      }
    }
  }, [activeIndex, videos]);

  // Schedule cleanup when index changes
  useEffect(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    cleanupTimeoutRef.current = setTimeout(() => {
      cleanupUnusedPlayers();
    }, 2000);

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [activeIndex, cleanupUnusedPlayers]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to foreground
        setNetworkStatus(isOnline());
        if (videoPlayerRef.current && isFocused) {
          try {
            videoPlayerRef.current.play();
            setIsPlaying(true);
          } catch (error) {
            // Ignore errors
          }
        }
      } else if (appStateRef.current === "active" && nextAppState.match(/inactive|background/)) {
        // App going to background
        if (videoPlayerRef.current) {
          try {
            videoPlayerRef.current.pause();
            setIsPlaying(false);
          } catch (error) {
            // Ignore errors
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isFocused]);

  // Network monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const online = isOnline();
      setNetworkStatus((prev) => {
        if (online !== prev && online) {
          // Only load videos if we're coming back online and have no videos
          if (videos.length === 0) {
            hydrateVideos(false);
          }
        }
        return online;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [videos.length, hydrateVideos]);

  const hydrateVideos = useCallback(async (isRefresh = false, append = false) => {
    if (loadingRef.current && !append) {
      return;
    }

    loadingRef.current = true;
    setError(null);
    if (!isRefresh && !append) {
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

      setVideos((prevVideos) => {
        const dedupedMap = new Map<string, Confession>();

        // Add existing videos first if appending
        if (append) {
          for (const item of prevVideos) {
            if (item && item.id) {
              dedupedMap.set(item.id, item);
            }
          }
        }

        for (const item of [...trending, ...confessions]) {
          if (item && item.id) {
            dedupedMap.set(item.id, item);
          }
        }

        const combined = Array.from(dedupedMap.values()).filter((item) => item.videoUri);

        // Limit total videos for memory management
        const limited = combined.slice(0, MAX_MEMORY_VIDEOS);

        if (!limited.length && !append) {
          setActiveIndex(0);
          return [];
        } else {
          if (!append) {
            setActiveIndex((prev) => {
              if (isRefresh) {
                return 0;
              }
              return Math.min(prev, limited.length - 1);
            });
            setIsPlaying(false);
          }
          return limited;
        }
      });

      // Track successful load
      VideoDataService.flushAllEvents();
    } catch (err) {
      console.error("TikTokVideoFeed: failed to load videos", err);

      const online = isOnline();
      if (!online) {
        setError("You're offline. Videos will load when connection is restored.");
      } else {
        setError("We couldn't load new videos. Pull to refresh and try again.");
      }

      const player = videoPlayerRef.current;
      if (player) {
        try {
          player.pause?.();
        } catch (error) {
          if (!isDisposalError(error)) {
            console.warn("TikTokVideoFeed: pause after error failed", error);
          }
        }
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    hydrateVideos(false);
  }, [hydrateVideos]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;

    // Load more videos when approaching end
    if (activeIndex >= videos.length - loadMoreThreshold.current && !loadingRef.current) {
      hydrateVideos(false, true);
    }
  }, [activeIndex, videos.length, hydrateVideos]);

  useEffect(() => {
    setMuted(!userPreferences.sound_enabled);
  }, [userPreferences.sound_enabled]);

  useEffect(() => {
    if (!videoPlayer) {
      return;
    }

    try {
      videoPlayer.muted = muted;
      videoPlayer.volume = muted ? 0 : 1;
    } catch (error) {
      if (!isDisposalError(error)) {
        console.warn("TikTokVideoFeed: mute sync failed", error);
      }
    }
  }, [videoPlayer, muted]);

  const pausePlayer = useCallback(() => {
    if (!videoPlayer) {
      return;
    }

    try {
      videoPlayer.pause?.();
      setIsPlaying(false);
    } catch (error) {
      if (!isDisposalError(error)) {
        console.warn("TikTokVideoFeed: pause failed", error);
      }
    }
  }, [videoPlayer]);

  const playPlayer = useCallback(() => {
    if (!videoPlayer) {
      return;
    }

    try {
      videoPlayer.play?.();
      setIsPlaying(true);
    } catch (error) {
      if (!isDisposalError(error)) {
        console.warn("TikTokVideoFeed: play failed", error);
      }
    }
  }, [videoPlayer]);

  useEffect(() => {
    if (!videoPlayer) {
      return;
    }

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
        flashListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [initialIndex, videos.length]);

  const handleRefresh = useCallback(() => {
    setOnline(true); // Check connectivity on refresh
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

  const handleDoubleTap = useCallback(() => {
    const handler = likeHandlerRef.current;
    if (handler) {
      handler().catch(() => undefined);
    }
  }, []);

  const registerLikeHandler = useCallback((handler: (() => Promise<void>) | null) => {
    likeHandlerRef.current = handler;
  }, []);

  const {
    gestures: composedGestures,
    containerStyle: gestureContainerStyle,
    resetAnimations,
    progressY,
  } = useVideoFeedGestures({
    currentIndex: activeIndex,
    totalVideos: videos.length,
    onRefresh: videos.length ? handleRefresh : undefined,
    isLoading: isLoading,
  });

  useEffect(() => {
    return () => {
      resetAnimations();
      // Cleanup all players on unmount
      for (const player of videoPlayersRef.current.values()) {
        try {
          player.pause();
        } catch (error) {
          // Ignore errors
        }
      }
      videoPlayersRef.current.clear();
    };
  }, [resetAnimations]);

  const handleViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems?.length) {
        return;
      }

      const visibleItem = viewableItems.find((item) => item.isViewable && typeof item.index === "number");
      if (
        visibleItem &&
        typeof visibleItem.index === "number" &&
        visibleItem.index !== activeIndexRef.current
      ) {
        setActiveIndex(visibleItem.index);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
    },
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Confession; index: number }) => {
      const isItemActive = index === activeIndex && isFocused;
      const shouldPreload = Math.abs(index - activeIndex) <= PRELOAD_OFFSET;

      return (
        <TikTokVideoItem
          confession={item}
          isActive={isItemActive}
          shouldPreload={shouldPreload}
          videoPlayer={isItemActive ? videoPlayer : null}
          onClose={onClose}
          muted={muted}
          onToggleMute={() => setMuted((prev) => !prev)}
          isPlaying={isItemActive ? isPlaying : false}
          onRegisterLikeHandler={registerLikeHandler}
          progressY={progressY}
          onSingleTap={handleSingleTap}
          onDoubleTap={handleDoubleTap}
          networkStatus={networkStatus}
        />
      );
    },
    [activeIndex, isFocused, isPlaying, muted, onClose, registerLikeHandler, videoPlayer, progressY, handleSingleTap, handleDoubleTap, networkStatus],
  );

  const loadingOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(isLoading ? 1 : 0, { duration: 300 }),
  }));

  const errorOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(error && !videos.length ? 1 : 0, { duration: 300 }),
  }));

  if (isLoading && !videos.length) {
    return (
      <Animated.View style={[styles.centeredContainer, loadingOpacity]}>
        <StatusBar hidden />
        <ActivityIndicator color="#ffffff" size="large" />
        <Text style={styles.centeredText}>Loading videos…</Text>
        {!networkStatus && (
          <Text style={styles.offlineText}>You're offline</Text>
        )}
      </Animated.View>
    );
  }

  if (error && !videos.length) {
    return (
      <Animated.View style={[styles.centeredContainer, errorOpacity]}>
        <StatusBar hidden />
        <Ionicons name={networkStatus ? "alert-circle-outline" : "wifi-off"} size={48} color="#ff6666" />
        <Text style={styles.centeredText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={handleRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading videos"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </Animated.View>
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
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[styles.gestureContainer, gestureContainerStyle]}>
            <FlashList
              ref={flashListRef}
              data={videos}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              estimatedItemSize={SCREEN_HEIGHT}
              onViewableItemsChanged={handleViewableItemsChangedRef.current}
              viewabilityConfig={viewabilityConfig}
              pagingEnabled
              snapToInterval={SCREEN_HEIGHT}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              windowSize={5}
              initialNumToRender={2}
              maxToRenderPerBatch={2}
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
              getItemType={() => "video"}
              drawDistance={SCREEN_HEIGHT * 2}
            />

            {!networkStatus && (
              <Animated.View style={styles.offlineIndicator}>
                <Ionicons name="wifi-off" size={16} color="#ff6666" />
                <Text style={styles.offlineIndicatorText}>Offline</Text>
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </ErrorBoundary>
  );
}

const styles = {
  gestureContainer: {
    flex: 1,
  },
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
  offlineText: {
    color: "#ff6666",
    marginTop: 8,
    fontSize: 12,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#333333",
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600" as const,
    fontSize: 15,
  },
  footerSpinner: {
    paddingVertical: 24,
  },
  offlineIndicator: {
    position: "absolute" as const,
    top: 60,
    alignSelf: "center" as const,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  offlineIndicatorText: {
    color: "#ff6666",
    fontSize: 12,
    fontWeight: "600" as const,
  },
};