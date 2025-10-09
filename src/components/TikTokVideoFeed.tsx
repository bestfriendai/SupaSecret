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
import { FlashList } from "@shopify/flash-list";
import type { ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from "react-native-reanimated";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";
import NetInfo from "@react-native-community/netinfo";

import { ErrorBoundary } from "./ErrorBoundary";
import TikTokVideoItem from "./TikTokVideoItem";
import VideoFeedSkeleton from "./VideoFeedSkeleton";
import NetworkStatusIndicator from "./NetworkStatusIndicator";
import { VideoDataService } from "../services/VideoDataService";
import { useConfessionStore } from "../state/confessionStore";
import type { Confession } from "../types/confession";
import { useVideoFeedGestures } from "../hooks/useVideoFeedGestures";
import { isOnline, setOnline } from "../lib/offlineQueue";
import {
  VideoLoadError,
  VideoPlaybackError,
  VideoNetworkError,
  VideoErrorCode,
  VideoErrorSeverity,
  VideoErrorType,
  VideoError,
} from "../types/videoErrors";
import { createRetryableOperation, RetryConfig } from "../utils/retryLogic";
import { useGlobalVideoStore } from "../state/globalVideoStore";
import { videoErrorRecoveryService } from "../services/VideoErrorRecoveryService";
import { VideoErrorMessages, UserFriendlyError } from "../utils/videoErrorMessages";
import { videoQualitySelector } from "../services/VideoQualitySelector";
import { videoPerformanceConfig, DevicePerformanceTier, NetworkQualityTier } from "../config/videoPerformance";
import { videoCacheManager } from "../utils/videoCacheManager";
import { environmentDetector } from "../utils/environmentDetector";

interface TikTokVideoFeedProps {
  onClose?: () => void;
  initialIndex?: number;
}

interface VideoLoadResult {
  success: boolean;
  videos: Confession[];
  error?: VideoLoadError | VideoNetworkError;
  shouldRetry: boolean;
}

interface VideoPlayerState {
  player: VideoPlayer | null;
  error?: VideoPlaybackError;
  retryCount: number;
  lastRetryTime?: number;
}

// Enhanced fallback video sources with quality degradation
const FALLBACK_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DEFAULT_PRELOAD_OFFSET = 2;
const DEFAULT_MAX_MEMORY_VIDEOS = 10;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000;

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 120,
  waitForInteraction: false,
};

// Circuit breaker for repeated failures
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private isOpen = false;
  private resetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private threshold: number,
    private timeout: number,
  ) {}

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.open();
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.close();
  }

  private open(): void {
    this.isOpen = true;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.timeout);
  }

  private halfOpen(): void {
    this.isOpen = false;
    this.failureCount = Math.floor(this.failureCount / 2);
  }

  private close(): void {
    this.isOpen = false;
    this.failureCount = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  canAttempt(): boolean {
    return !this.isOpen;
  }

  getState(): "open" | "closed" | "half-open" {
    if (this.isOpen) return "open";
    if (this.failureCount > 0) return "half-open";
    return "closed";
  }
}

export default function TikTokVideoFeed({ onClose, initialIndex = 0 }: TikTokVideoFeedProps) {
  const isFocused = useIsFocused();
  const flashListRef = useRef<React.ElementRef<typeof FlashList<Confession>>>(null);
  const [videos, setVideos] = useState<Confession[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFriendlyError, setUserFriendlyError] = useState<UserFriendlyError | null>(null);
  const [networkStatus, setNetworkStatus] = useState(isOnline());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1);
  const [playbackSpeeds, setPlaybackSpeeds] = useState<Record<number, number>>({});
  const scrollOffset = useSharedValue(0);
  const hasInitializedScroll = useRef(false);
  const loadingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const videoPlayersRef = useRef<Map<string, VideoPlayerState>>(new Map());
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const circuitBreaker = useRef(new CircuitBreaker(CIRCUIT_BREAKER_THRESHOLD, CIRCUIT_BREAKER_TIMEOUT));
  const fallbackVideoIndex = useRef(0);

  // Device-aware configuration
  const [deviceTier, setDeviceTier] = useState<DevicePerformanceTier>(DevicePerformanceTier.MID);
  const [networkQualityTier, setNetworkQualityTier] = useState<NetworkQualityTier>(NetworkQualityTier.FAIR);
  const [currentVideoQuality, setCurrentVideoQuality] = useState<"360p" | "720p" | "1080p">("720p");
  const [preloadOffset, setPreloadOffset] = useState(DEFAULT_PRELOAD_OFFSET);
  const [maxMemoryVideos, setMaxMemoryVideos] = useState(DEFAULT_MAX_MEMORY_VIDEOS);
  const qualitySelectionCache = useRef<Map<string, any>>(new Map());
  const networkQualityMonitor = useRef<any>(null);

  const globalVideoStore = useGlobalVideoStore();
  const userPreferences = useConfessionStore((state) => state.userPreferences);
  const [muted, setMuted] = useState(!userPreferences.sound_enabled);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeIndexRef = useRef(activeIndex);
  const likeHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const loadMoreThreshold = useRef(3);

  // Enhanced video source with quality selection and fallback logic
  const activeSource = useMemo(() => {
    if (!videos.length || activeIndex < 0 || activeIndex >= videos.length) {
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    const video = videos[activeIndex];
    if (!video || typeof video !== "object") {
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    if (!video.videoUri || typeof video.videoUri !== "string") {
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    // Check if we've had errors with this video before
    const playerState = videoPlayersRef.current.get(video.id);
    if (playerState?.error && (playerState.retryCount || 0) >= MAX_RETRY_ATTEMPTS) {
      fallbackVideoIndex.current++;
      return FALLBACK_VIDEOS[fallbackVideoIndex.current % FALLBACK_VIDEOS.length];
    }

    // Use selectedVideoUri if available (from quality selection)
    if (video.selectedVideoUri && typeof video.selectedVideoUri === "string") {
      return video.selectedVideoUri;
    }

    // Use quality-optimized URI if available
    const selectedQuality = video.qualityMetadata?.selectedQuality;
    if (selectedQuality && Array.isArray(video.videoVariants)) {
      const selectedVariant = video.videoVariants.find(
        (v: any) => v && typeof v === "object" && v.quality === selectedQuality,
      );
      if (selectedVariant?.uri && typeof selectedVariant.uri === "string") {
        return selectedVariant.uri;
      }
    }

    // Check for cached quality selection
    const cachedQuality = qualitySelectionCache.current.get(video.videoUri);
    if (cachedQuality?.selectedUri && typeof cachedQuality.selectedUri === "string") {
      return cachedQuality.selectedUri;
    }

    return video.videoUri;
  }, [activeIndex, videos]);

  // Enhanced video player with error recovery
  const videoPlayer: VideoPlayer | null = useVideoPlayer(activeSource, (player) => {
    if (!player) return;

    try {
      player.loop = true;
      player.volume = muted ? 0 : 1;

      // Register player with global store
      if (videos[activeIndex]) {
        globalVideoStore.registerVideoPlayer(videos[activeIndex].id, player, {
          canPlay: true,
          canPause: true,
          canSeek: true,
          canSetVolume: true,
          canSetPlaybackRate: false,
          supportsFullscreen: false,
          supportsPiP: false,
        });
      }
    } catch (error) {
      handlePlayerError(error as Error, videos[activeIndex]?.id);
    }
  });

  const videoPlayerRef = useRef<VideoPlayer | null>(null);

  useEffect(() => {
    videoPlayerRef.current = videoPlayer;
    if (videoPlayer && videos[activeIndex]) {
      const videoId = videos[activeIndex].id;
      const currentState = videoPlayersRef.current.get(videoId) || {
        player: null,
        retryCount: 0,
      };

      videoPlayersRef.current.set(videoId, {
        ...currentState,
        player: videoPlayer,
      });
    }
  }, [videoPlayer, activeIndex, videos]);

  // Enhanced error handling for player errors
  const handlePlayerError = useCallback(
    async (error: Error, videoId?: string) => {
      const errorCode = error.message?.includes("network")
        ? VideoErrorCode.NETWORK_ERROR
        : error.message?.includes("decode")
          ? VideoErrorCode.DECODE_ERROR
          : VideoErrorCode.PLAYBACK_STALLED;

      const videoError = new VideoPlaybackError(
        errorCode,
        `Video playback failed: ${error.message}`,
        undefined,
        VideoErrorSeverity.ERROR,
      );

      if (videoId) {
        const playerState = videoPlayersRef.current.get(videoId) || {
          player: null,
          retryCount: 0,
        };

        // Comment 6: Use VideoErrorRecoveryService instead of local retry logic
        const video = videos.find((v) => v.id === videoId);
        const recoveryResult = await videoErrorRecoveryService.handleError(videoError, {
          videoId,
          source: video?.videoUri ?? undefined,
          networkStatus,
        });

        if (recoveryResult.success) {
          // Comment 9: Reset retry counter on success
          videoPlayersRef.current.set(videoId, {
            ...playerState,
            retryCount: 0,
            error: undefined,
          });
        } else {
          const nextRetryCount = (playerState.retryCount ?? 0) + 1;
          videoPlayersRef.current.set(videoId, {
            ...playerState,
            player: playerState.player ?? null,
            error: videoError,
            retryCount: nextRetryCount,
            lastRetryTime: Date.now(),
          });

          if (recoveryResult.fallbackUsed) {
            fallbackVideoIndex.current++;
          }
        }
      }

      console.warn("Video player error:", videoError);
    },
    [videos, networkStatus],
  );

  // Recovery mechanism for video playback
  const recoverVideoPlayback = useCallback(
    async (videoId: string) => {
      const playerState = videoPlayersRef.current.get(videoId);
      if (!playerState) return;

      const currentRetryCount = playerState.retryCount ?? 0;
      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, currentRetryCount);

      setTimeout(async () => {
        try {
          if (playerState.player) {
            const success = await globalVideoStore.recoverPlayer(videoId);
            if (success) {
              // Comment 9: Reset retry count on successful recovery
              const updatedState = videoPlayersRef.current.get(videoId);
              if (updatedState) {
                videoPlayersRef.current.set(videoId, {
                  ...updatedState,
                  player: updatedState.player ?? null,
                  retryCount: 0,
                  error: undefined,
                });
              }
              circuitBreaker.current.recordSuccess();
            }
          }
        } catch (error) {
          console.warn(`Failed to recover video ${videoId}:`, error);
        }
      }, retryDelay);
    },
    [globalVideoStore],
  );

  // Enhanced memory cleanup with progressive strategies
  const cleanupUnusedPlayers = useCallback(() => {
    const currentId = videos[activeIndex]?.id;
    const keepIds = new Set<string>();

    // Keep current and nearby videos
    for (
      let i = Math.max(0, activeIndex - preloadOffset);
      i <= Math.min(videos.length - 1, activeIndex + preloadOffset);
      i++
    ) {
      if (videos[i]) {
        keepIds.add(videos[i].id);
      }
    }

    // Clean up distant players with progressive disposal
    for (const [id, playerState] of videoPlayersRef.current.entries()) {
      if (!keepIds.has(id) && playerState.player) {
        void globalVideoStore.unregisterVideoPlayer(id);
        videoPlayersRef.current.delete(id);
      }
    }
  }, [activeIndex, videos, globalVideoStore, preloadOffset]);

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

  // Handle app state changes with enhanced recovery
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to foreground
        setNetworkStatus(isOnline());
        if (videoPlayerRef.current && isFocused) {
          retryVideoOperation(() => {
            videoPlayerRef.current?.play();
            setIsPlaying(true);
          });
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

  // Network monitoring with auto-recovery
  useEffect(() => {
    const interval = setInterval(() => {
      const online = isOnline();
      setNetworkStatus((prev) => {
        if (online !== prev && online) {
          // Network recovered - attempt to reload failed videos
          if (videos.length === 0 || circuitBreaker.current.getState() === "half-open") {
            hydrateVideosWithRetry();
          }
        }
        return online;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [videos.length]);

  // Simple retry wrapper for video operations
  const retryVideoOperation = useCallback(
    async (operation: () => void | Promise<void>, maxRetries = 3): Promise<void> => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          await operation();
          return;
        } catch (error) {
          attempt++;
          if (attempt >= maxRetries) {
            console.warn("Video operation failed after retries:", error);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    },
    [],
  );

  // Enhanced video loading with retry logic
  const hydrateVideosWithRetry = useCallback(async (isRefresh = false, append = false): Promise<VideoLoadResult> => {
    if (!circuitBreaker.current.canAttempt()) {
      return {
        success: false,
        videos: [],
        error: new VideoPlaybackError(
          VideoErrorCode.RateLimitExceeded,
          "Too many failed attempts. Please wait before trying again.",
          undefined,
          VideoErrorSeverity.WARNING,
        ),
        shouldRetry: false,
      };
    }

    const retryConfig: RetryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      shouldRetry: (error) => {
        const online = isOnline();
        const message = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
        return online && !(message?.toLowerCase().includes("rate limit") ?? false);
      },
    };

    const loadVideos = async (): Promise<VideoLoadResult> => {
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

      if (combined.length > 0) {
        circuitBreaker.current.recordSuccess();
      }

      return {
        success: true,
        videos: combined,
        shouldRetry: false,
      };
    };

    try {
      const result = await createRetryableOperation(loadVideos, retryConfig);
      return result;
    } catch (error) {
      const videoError = new VideoLoadError(`Failed to load videos: ${error}`, {
        code: VideoErrorCode.LOAD_FAILED,
        severity: VideoErrorSeverity.ERROR,
      });

      // Comment 6: Use VideoErrorRecoveryService for load errors
      const recoveryResult = await videoErrorRecoveryService.handleError(videoError, {
        networkStatus: isOnline(),
      });

      if (!recoveryResult.success) {
        circuitBreaker.current.recordFailure();
      }

      return {
        success: false,
        videos: [],
        error: videoError,
        shouldRetry: recoveryResult.recoveryStrategy.canAutoRecover ?? circuitBreaker.current.canAttempt(),
      };
    }
  }, []);

  // Initialize device and network detection
  const initializeDeviceAndNetwork = useCallback(async () => {
    try {
      // Detect device tier
      const deviceInfo = await environmentDetector.getDeviceInfo();
      const memoryInfo = await environmentDetector.getMemoryInfo();
      const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);

      let tier: DevicePerformanceTier;
      if (totalMemoryGB >= 6) {
        tier = DevicePerformanceTier.HIGH;
      } else if (totalMemoryGB >= 4) {
        tier = DevicePerformanceTier.MID;
      } else {
        tier = DevicePerformanceTier.LOW;
      }

      setDeviceTier(tier);
      videoPerformanceConfig.setDeviceTier(tier);

      // Update configuration based on device tier
      const perfProfile = videoPerformanceConfig.getPreloadProfile();
      setPreloadOffset(perfProfile.preloadWindowSize);
      setMaxMemoryVideos(Math.min(perfProfile.preloadWindowSize * 2, 20));

      // Start network quality monitoring
      networkQualityMonitor.current = NetInfo.addEventListener((state) => {
        handleNetworkQualityChange(state);
      });

      // Initial network quality check
      const netInfo = await NetInfo.fetch();
      handleNetworkQualityChange(netInfo);
    } catch (error) {
      console.error("Failed to initialize device and network:", error);
    }
  }, []);

  // Handle network quality changes
  const handleNetworkQualityChange = useCallback(
    async (state: any) => {
      if (!state.isConnected) {
        setNetworkQualityTier(NetworkQualityTier.POOR);
        return;
      }

      const type = state.type?.toLowerCase();
      const effectiveType = state.details?.cellularGeneration?.toLowerCase() || type;

      let quality: NetworkQualityTier;
      if (effectiveType === "wifi" || effectiveType === "5g") {
        quality = NetworkQualityTier.EXCELLENT;
      } else if (effectiveType === "4g") {
        quality = NetworkQualityTier.GOOD;
      } else if (effectiveType === "3g") {
        quality = NetworkQualityTier.FAIR;
      } else {
        quality = NetworkQualityTier.POOR;
      }

      setNetworkQualityTier(quality);
      videoPerformanceConfig.setNetworkQuality(quality);

      // Update quality selection for current video if network improved
      if (quality === NetworkQualityTier.EXCELLENT && videos[activeIndex]) {
        const video = videos[activeIndex] as any;
        const canUpgrade = await videoQualitySelector.canUpgradeQuality(video.videoUri);
        if (canUpgrade) {
          await updateVideoQuality(videos[activeIndex]);
        }
      }
    },
    [activeIndex, videos],
  );

  // Update video quality based on current conditions
  const updateVideoQuality = useCallback(async (video: Confession) => {
    try {
      const qualityResult = await videoQualitySelector.selectVideoQuality((video as any).videoUri);
      setCurrentVideoQuality(qualityResult.selectedQuality);

      // Cache the quality selection
      qualitySelectionCache.current.set((video as any).videoUri, {
        selectedUri: qualityResult.variants.find((v) => v.quality === qualityResult.selectedQuality)?.uri,
        quality: qualityResult.selectedQuality,
        timestamp: Date.now(),
      });

      // Trigger re-render to use new quality
      setVideos((prev) => [...prev]);
    } catch (error) {
      console.error("Failed to update video quality:", error);
    }
  }, []);

  // Preload upcoming videos based on device capabilities
  const preloadUpcomingVideos = useCallback(async () => {
    if (videos.length === 0) return;

    const startIdx = Math.max(0, activeIndex - 1);
    const endIdx = Math.min(videos.length, activeIndex + preloadOffset);
    const videosToPreload = videos.slice(startIdx, endIdx);

    const videoUris = videosToPreload.map((v) => (v as any).videoUri).filter(Boolean);

    if (videoUris.length > 0) {
      try {
        // Use device-aware preloading
        await videoCacheManager.preloadVideos(videoUris, "normal");

        // Optimize quality for preloaded videos in background
        if (videoPerformanceConfig.shouldEnableFeature("autoQualityUpgrade")) {
          setTimeout(async () => {
            for (const video of videosToPreload) {
              if (!(video as any).qualityMetadata) {
                await updateVideoQuality(video);
              }
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Failed to preload videos:", error);
      }
    }
  }, [videos, activeIndex, preloadOffset, deviceTier, updateVideoQuality]);

  const hydrateVideos = useCallback(
    async (isRefresh = false, append = false) => {
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
      if (append) {
        setIsLoadingMore(true);
      }

      try {
        const result = await hydrateVideosWithRetry(isRefresh, append);

        if (result.success && result.videos) {
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

            // Ensure result.videos is always an array of valid objects
            const videosToProcess = Array.isArray(result.videos)
              ? result.videos.filter((item) => item && typeof item === "object" && item.id)
              : [];

            for (const item of videosToProcess) {
              dedupedMap.set(item.id, item);
            }

            const combined = Array.from(dedupedMap.values());
            // Limit total videos for memory management
            const limited = combined.slice(0, maxMemoryVideos);

            if (!limited.length && !append) {
              setActiveIndex(0);
              return [];
            } else {
              if (!append) {
                setActiveIndex((prev) => {
                  if (isRefresh) return 0;
                  return Math.min(prev, limited.length - 1);
                });
                setIsPlaying(false);
              }
              return limited;
            }
          });

          // Track successful load
          VideoDataService.flushAllEvents();
        } else if (result.error) {
          const online = isOnline();
          const attemptNum = retryAttempts + 1;
          setRetryAttempts(attemptNum);

          // Create VideoError from result.error
          const videoError: VideoError = {
            type:
              result.error.code === VideoErrorCode.NETWORK_ERROR
                ? VideoErrorType.NETWORK
                : result.error.code === VideoErrorCode.RATE_LIMITED
                  ? VideoErrorType.SERVER
                  : VideoErrorType.UNKNOWN,
            code: result.error.code,
            message: result.error.message,
            timestamp: Date.now(),
          };

          const friendlyError = VideoErrorMessages.getUserFriendlyError(videoError, attemptNum, { isOffline: !online });

          setUserFriendlyError(friendlyError);
          setError(friendlyError.message);

          // Log error for analytics
          VideoErrorMessages.logErrorForAnalytics(videoError, attemptNum);

          // Pause player on error
          if (videoPlayerRef.current) {
            try {
              videoPlayerRef.current.pause();
            } catch (error) {
              // Ignore disposal errors
            }
          }
        }
      } catch (err) {
        console.error("TikTokVideoFeed: failed to load videos", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [hydrateVideosWithRetry],
  );

  useEffect(() => {
    initializeDeviceAndNetwork();
    hydrateVideos(false);
  }, []);

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
    if (!videoPlayer) return;

    retryVideoOperation(() => {
      videoPlayer.muted = muted;
      videoPlayer.volume = muted ? 0 : 1;
    });
  }, [videoPlayer, muted, retryVideoOperation]);

  const pausePlayer = useCallback(() => {
    if (!videoPlayer) return;

    retryVideoOperation(() => {
      videoPlayer.pause?.();
      setIsPlaying(false);
    });
  }, [videoPlayer, retryVideoOperation]);

  const playPlayer = useCallback(() => {
    if (!videoPlayer) return;

    retryVideoOperation(async () => {
      await videoPlayer.play?.();
      setIsPlaying(true);
    });
  }, [videoPlayer, retryVideoOperation]);

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

    // Comment 9: Reset retry counter when playback starts successfully
    const currentVideo = videos[activeIndex];
    if (currentVideo) {
      const playerState = videoPlayersRef.current.get(currentVideo.id);
      const retryCount = playerState?.retryCount ?? 0;
      if (playerState && retryCount > 0) {
        videoPlayersRef.current.set(currentVideo.id, {
          ...playerState,
          player: playerState.player ?? null,
          retryCount: 0,
          error: undefined,
        });
      }
    }

    // Track video view
    if (currentVideo) {
      VideoDataService.updateVideoViews(currentVideo.id);

      // Comment 7: Only set isPlaying without contradictory currentTime/duration
      globalVideoStore.updatePlayerState(currentVideo.id, {
        isPlaying: true,
      });
    }
  }, [activeIndex, videoPlayer, isFocused, videos.length, playPlayer, globalVideoStore]);

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
    circuitBreaker.current.recordSuccess(); // Reset circuit breaker on manual refresh
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

  // Gesture handlers for advanced interactions
  const handleSwipeUp = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < videos.length) {
      scrollToIndex(nextIndex);
    }
  }, [activeIndex, videos.length]);

  const handleSwipeDown = useCallback(() => {
    if (activeIndex === 0) {
      // Pull to refresh at top
      handleRefresh();
    } else {
      const prevIndex = activeIndex - 1;
      if (prevIndex >= 0) {
        scrollToIndex(prevIndex);
      }
    }
  }, [activeIndex, handleRefresh]);

  const handleSwipeLeft = useCallback(() => {
    setShowShareMenu(true);
  }, []);

  const handleSwipeRight = useCallback(() => {
    setShowCreatorProfile(true);
  }, []);

  const handleLongPress = useCallback(() => {
    // Cycle playback speed
    setPlaybackSpeeds((prev) => ({
      ...prev,
      [activeIndex]: (((prev[activeIndex] || 1) * 2) % 3) + 0.5, // Cycles: 0.5, 1, 1.5, 2
    }));
  }, [activeIndex]);

  const handlePinch = useCallback((scale: number) => {
    setVideoZoom(scale);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (flashListRef.current) {
      flashListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    }
  }, []);

  // Handle liking a video
  const handleLike = useCallback(async (video: Confession) => {
    // Use the existing like functionality from the store
    // This would need to be implemented based on the existing like system
    console.log("Like video:", video.id);
  }, []);

  const {
    gestures: composedGestures,
    containerStyle: gestureContainerStyle,
    overlayStyle: gestureOverlayStyle,
    resetAnimations,
    isScrolling,
    progressY,
    progressX,
    pinchScale,
    gestureState,
  } = useVideoFeedGestures({
    currentIndex: activeIndex,
    totalVideos: videos.length,
    onLongPress: handleLongPress,
    onRefresh: handleRefresh,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onDoubleTap: handleDoubleTap,
    onPinch: handlePinch,
    onPlaybackSpeedChange: handleLongPress,
    isLoading,
  });

  useEffect(() => {
    return () => {
      resetAnimations();
      // Cleanup all players on unmount
      const cleanupPromises = Array.from(videoPlayersRef.current.keys()).map((id) =>
        globalVideoStore.unregisterVideoPlayer(id),
      );
      Promise.allSettled(cleanupPromises);
      videoPlayersRef.current.clear();
    };
  }, [resetAnimations, globalVideoStore]);

  const handleViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!viewableItems?.length) return;

    const visibleItem = viewableItems.find((item) => item.isViewable && typeof item.index === "number");
    if (visibleItem && typeof visibleItem.index === "number" && visibleItem.index !== activeIndexRef.current) {
      setActiveIndex(visibleItem.index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Confession; index: number }) => {
      const isItemActive = index === activeIndex && isFocused;
      const shouldPreload = Math.abs(index - activeIndex) <= preloadOffset;

      // Note: Fallback logic handled internally by video components

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
    [
      activeIndex,
      isFocused,
      isPlaying,
      muted,
      onClose,
      registerLikeHandler,
      videoPlayer,
      progressY,
      handleSingleTap,
      handleDoubleTap,
      networkStatus,
      preloadOffset,
    ],
  );

  const errorOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(error && !videos.length ? 1 : 0, { duration: 300 }),
  }));

  if (isLoading && !videos.length) {
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
        <View style={styles.centeredContainer}>
          <Animated.View style={errorOpacity}>
            <StatusBar hidden />
            <Ionicons
              name={userFriendlyError?.context === "network" ? "cloud-offline-outline" : "alert-circle-outline"}
              size={48}
              color={userFriendlyError?.severity === "critical" ? "#ff3333" : "#ff6666"}
            />
            <Text style={styles.errorTitle}>{userFriendlyError?.title || "Oops!"}</Text>
            <Text style={styles.centeredText}>{userFriendlyError?.message || error}</Text>

            {userFriendlyError?.retryStrategy.shouldRetry && (
              <Pressable
                style={[styles.primaryButton]}
                onPress={handleRefresh}
                accessibilityRole="button"
                accessibilityLabel={userFriendlyError.actionText}
              >
                <Text style={styles.primaryButtonText}>{userFriendlyError.actionText || "Retry"}</Text>
              </Pressable>
            )}

            {userFriendlyError?.secondaryActionText && (
              <Pressable style={styles.secondaryButton} onPress={() => {}} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>{userFriendlyError.secondaryActionText}</Text>
              </Pressable>
            )}

            {userFriendlyError?.retryStrategy.explanation && (
              <Text style={styles.retryExplanation}>{userFriendlyError.retryStrategy.explanation}</Text>
            )}
          </Animated.View>
        </View>
        <NetworkStatusIndicator position="top" persistentMode={true} onRetry={handleRefresh} />
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
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[styles.gestureContainer, gestureContainerStyle]}>
            <FlashList
              ref={flashListRef}
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
              getItemType={() => "video"}
              drawDistance={SCREEN_HEIGHT * 2}
            />

            {isRefreshing && <VideoFeedSkeleton isVisible={true} state="pullToRefresh" itemCount={1} />}

            {isLoadingMore && <VideoFeedSkeleton isVisible={true} state="loadMore" itemCount={1} />}

            <NetworkStatusIndicator
              position="top"
              minimalMode={true}
              autoHideDelay={3000}
              scrollOffset={scrollOffset}
            />
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
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600" as const,
    fontSize: 15,
  },
  circuitBreakerText: {
    color: "#ffaa00",
    marginTop: 8,
    fontSize: 12,
    textAlign: "center" as const,
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
  recoveryIndicator: {
    position: "absolute" as const,
    top: 100,
    alignSelf: "center" as const,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  recoveryIndicatorText: {
    color: "#ffaa00",
    fontSize: 12,
    fontWeight: "600" as const,
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
  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#60A5FA",
    fontSize: 14,
  },
  retryExplanation: {
    color: "#888888",
    fontSize: 12,
    marginTop: 16,
    textAlign: "center" as const,
  },
};
