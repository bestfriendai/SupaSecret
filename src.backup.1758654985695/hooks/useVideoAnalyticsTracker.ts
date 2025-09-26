import { useEffect, useRef, useCallback, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { VideoDataService } from "../services/VideoDataService";
import { consentStore } from "../state/consentStore";

interface PlaybackStatusSnapshot {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  didJustFinish?: boolean;
}

export interface VideoAnalyticsConfig {
  videoId: string;
  videoDuration?: number;
  enableDetailedTracking?: boolean;
  trackQualityChanges?: boolean;
  sessionId?: string;
  onEngagementUpdate?: (score: number) => void;
  onCompletionDetected?: (completionRate: number) => void;
}

export interface VideoAnalyticsState {
  watchTime: number;
  completionRate: number;
  engagementScore: number;
  isPlaying: boolean;
  bufferingCount: number;
  seekCount: number;
  sessionActive: boolean;
}

interface WatchTimeState {
  startTime: number | null;
  totalWatchTime: number;
  lastPosition: number;
}

const WATCH_TIME_UPDATE_INTERVAL = 1000; // Update watch time every second
const ENGAGEMENT_CALC_INTERVAL = 5000; // Calculate engagement every 5 seconds
const POSITION_TOLERANCE = 2; // 2 second tolerance for seek detection

export function useVideoAnalyticsTracker(config: VideoAnalyticsConfig) {
  const {
    videoId,
    videoDuration,
    enableDetailedTracking = true,
    trackQualityChanges = true,
    sessionId: providedSessionId,
    onEngagementUpdate,
    onCompletionDetected,
  } = config;

  const [analyticsState, setAnalyticsState] = useState<VideoAnalyticsState>({
    watchTime: 0,
    completionRate: 0,
    engagementScore: 0,
    isPlaying: false,
    bufferingCount: 0,
    seekCount: 0,
    sessionActive: false,
  });

  const watchTimeRef = useRef<WatchTimeState>({
    startTime: null,
    totalWatchTime: 0,
    lastPosition: 0,
  });

  const sessionIdRef = useRef<string | null>(providedSessionId || null);
  const watchTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const engagementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastPlaybackStatusRef = useRef<PlaybackStatusSnapshot | null>(null);
  const hasTrackedImpressionRef = useRef(false);
  const isBufferingRef = useRef(false);
  const lastQualityRef = useRef<string | null>(null);
  const hasMarkedCompletedRef = useRef(false);

  // Initialize session
  useEffect(() => {
    if (!videoId || !consentStore.preferences.analytics) return;

    // Get or create session
    if (!sessionIdRef.current) {
      sessionIdRef.current = VideoDataService.getOrCreateSession(videoId);
    }

    // Track impression
    if (!hasTrackedImpressionRef.current) {
      VideoDataService.trackVideoEvent(videoId, {
        type: "impression",
        timestamp: Date.now(),
        metadata: { videoDuration },
      });
      hasTrackedImpressionRef.current = true;
    }

    setAnalyticsState((prev) => ({ ...prev, sessionActive: true }));

    return () => {
      // Cleanup on unmount
      if (sessionIdRef.current) {
        VideoDataService.endSession(sessionIdRef.current);
      }
    };
  }, [videoId, videoDuration]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appStateRef.current === "active" && nextAppState.match(/inactive|background/)) {
        // App going to background - pause tracking
        handlePause();
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        analyticsState.isPlaying
      ) {
        // App returning to foreground - resume tracking if was playing
        handlePlay();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [analyticsState.isPlaying]);

  // Start watch time tracking
  const startWatchTimeTracking = useCallback(() => {
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
    }

    watchTimeRef.current.startTime = Date.now();

    watchTimeIntervalRef.current = setInterval(() => {
      if (watchTimeRef.current.startTime) {
        const elapsed = (Date.now() - watchTimeRef.current.startTime) / 1000;
        const newTotalTime = watchTimeRef.current.totalWatchTime + elapsed;
        watchTimeRef.current.totalWatchTime = newTotalTime;
        watchTimeRef.current.startTime = Date.now();

        setAnalyticsState((prev) => ({
          ...prev,
          watchTime: newTotalTime,
          completionRate: videoDuration ? (newTotalTime / videoDuration) * 100 : 0,
        }));

        // Update cached analytics
        VideoDataService.updateAnalyticsCache(videoId, {
          watchTime: newTotalTime,
          completionRate: videoDuration ? (newTotalTime / videoDuration) * 100 : 0,
        });
      }
    }, WATCH_TIME_UPDATE_INTERVAL);
  }, [videoId, videoDuration]);

  // Stop watch time tracking
  const stopWatchTimeTracking = useCallback(() => {
    if (watchTimeIntervalRef.current) {
      clearInterval(watchTimeIntervalRef.current);
      watchTimeIntervalRef.current = null;
    }

    if (watchTimeRef.current.startTime) {
      const elapsed = (Date.now() - watchTimeRef.current.startTime) / 1000;
      watchTimeRef.current.totalWatchTime += elapsed;
      watchTimeRef.current.startTime = null;
    }
  }, []);

  // Calculate engagement score
  const calculateEngagement = useCallback(() => {
    const engagementScore = VideoDataService.calculateEngagementScore({
      completionRate: analyticsState.completionRate / 100,
      watchTime: analyticsState.watchTime,
    });

    setAnalyticsState((prev) => ({ ...prev, engagementScore }));

    if (onEngagementUpdate) {
      onEngagementUpdate(engagementScore);
    }

    VideoDataService.updateAnalyticsCache(videoId, { engagementScore });
  }, [videoId, analyticsState.completionRate, analyticsState.watchTime, onEngagementUpdate]);

  // Start engagement calculation
  useEffect(() => {
    if (analyticsState.isPlaying && enableDetailedTracking) {
      engagementIntervalRef.current = setInterval(calculateEngagement, ENGAGEMENT_CALC_INTERVAL);
    } else if (engagementIntervalRef.current) {
      clearInterval(engagementIntervalRef.current);
      engagementIntervalRef.current = null;
    }

    return () => {
      if (engagementIntervalRef.current) {
        clearInterval(engagementIntervalRef.current);
      }
    };
  }, [analyticsState.isPlaying, enableDetailedTracking, calculateEngagement]);

  // Handle play event
  const handlePlay = useCallback(() => {
    if (!consentStore.preferences.analytics) return;

    VideoDataService.trackVideoEvent(videoId, {
      type: analyticsState.watchTime > 0 ? "resume" : "play",
      timestamp: Date.now(),
      metadata: { position: watchTimeRef.current.lastPosition },
    });

    startWatchTimeTracking();
    setAnalyticsState((prev) => ({ ...prev, isPlaying: true }));
  }, [videoId, analyticsState.watchTime, startWatchTimeTracking]);

  // Handle pause event
  const handlePause = useCallback(() => {
    if (!consentStore.preferences.analytics) return;

    VideoDataService.trackVideoEvent(videoId, {
      type: "pause",
      timestamp: Date.now(),
      metadata: {
        position: watchTimeRef.current.lastPosition,
        watchTime: watchTimeRef.current.totalWatchTime,
      },
    });

    stopWatchTimeTracking();
    setAnalyticsState((prev) => ({ ...prev, isPlaying: false }));
  }, [videoId, stopWatchTimeTracking]);

  // Handle seek event
  const handleSeek = useCallback(
    (fromPosition: number, toPosition: number) => {
      if (!consentStore.preferences.analytics || !enableDetailedTracking) return;

      VideoDataService.trackVideoEvent(videoId, {
        type: "seek",
        timestamp: Date.now(),
        metadata: { from: fromPosition, to: toPosition },
      });

      setAnalyticsState((prev) => ({ ...prev, seekCount: prev.seekCount + 1 }));
    },
    [videoId, enableDetailedTracking],
  );

  // Handle buffer start
  const handleBufferStart = useCallback(() => {
    if (!consentStore.preferences.analytics || !enableDetailedTracking) return;

    isBufferingRef.current = true;

    VideoDataService.trackVideoEvent(videoId, {
      type: "buffer_start",
      timestamp: Date.now(),
      metadata: { position: watchTimeRef.current.lastPosition },
    });

    VideoDataService.trackBufferingStart(videoId);
    setAnalyticsState((prev) => ({ ...prev, bufferingCount: prev.bufferingCount + 1 }));
  }, [videoId, enableDetailedTracking]);

  // Handle buffer end
  const handleBufferEnd = useCallback(() => {
    if (!consentStore.preferences.analytics || !enableDetailedTracking) return;

    if (isBufferingRef.current) {
      isBufferingRef.current = false;

      VideoDataService.trackVideoEvent(videoId, {
        type: "buffer_end",
        timestamp: Date.now(),
        metadata: { position: watchTimeRef.current.lastPosition },
      });

      VideoDataService.trackBufferingEnd(videoId);
    }
  }, [videoId, enableDetailedTracking]);

  // Handle quality change
  const handleQualityChange = useCallback(
    (newQuality: string) => {
      if (!consentStore.preferences.analytics || !trackQualityChanges) return;

      VideoDataService.trackVideoEvent(videoId, {
        type: "quality_change",
        timestamp: Date.now(),
        metadata: {
          from: lastQualityRef.current,
          to: newQuality,
          position: watchTimeRef.current.lastPosition,
        },
      });

      lastQualityRef.current = newQuality;
    },
    [videoId, trackQualityChanges],
  );

  // Handle completion
  const handleCompletion = useCallback(() => {
    if (!consentStore.preferences.analytics) return;

    const completionRate = videoDuration ? (watchTimeRef.current.totalWatchTime / videoDuration) * 100 : 0;

    VideoDataService.trackVideoCompletion(videoId, watchTimeRef.current.totalWatchTime, videoDuration || 0);

    if (onCompletionDetected) {
      onCompletionDetected(completionRate);
    }

    setAnalyticsState((prev) => ({ ...prev, completionRate }));
  }, [videoId, videoDuration, onCompletionDetected]);

  // Process playback status update
  const onPlaybackStatusUpdate = useCallback(
    (status: PlaybackStatusSnapshot) => {
      if (!status.isLoaded || !consentStore.preferences.analytics) return;

      const prevStatus = lastPlaybackStatusRef.current;
      lastPlaybackStatusRef.current = status;

      // Track play/pause state changes
      if (status.isPlaying && (!prevStatus || !prevStatus.isLoaded || !prevStatus.isPlaying)) {
        handlePlay();
      } else if (!status.isPlaying && prevStatus?.isLoaded && prevStatus.isPlaying) {
        handlePause();
      }

      // Track buffering
      if (enableDetailedTracking) {
        if (status.isBuffering && !isBufferingRef.current) {
          handleBufferStart();
        } else if (!status.isBuffering && isBufferingRef.current) {
          handleBufferEnd();
        }
      }

      // Track position and detect seeks
      if (status.positionMillis !== undefined) {
        const currentPosition = status.positionMillis / 1000;

        if (prevStatus?.isLoaded && prevStatus.positionMillis !== undefined) {
          const prevPosition = prevStatus.positionMillis / 1000;
          const timeDiff = Math.abs(currentPosition - prevPosition);

          // Detect seek (position change larger than normal playback)
          if (timeDiff > POSITION_TOLERANCE && enableDetailedTracking) {
            handleSeek(prevPosition, currentPosition);
          }
        }

        watchTimeRef.current.lastPosition = currentPosition;
      }

      // Check for completion - track once per session regardless of looping
      const currentCompletionRate = videoDuration ? watchTimeRef.current.totalWatchTime / videoDuration : 0;

      if (!hasMarkedCompletedRef.current && (status.didJustFinish || currentCompletionRate >= 0.8) && videoDuration) {
        hasMarkedCompletedRef.current = true;
        handleCompletion();
      }
    },
    [
      handlePlay,
      handlePause,
      handleBufferStart,
      handleBufferEnd,
      handleSeek,
      handleCompletion,
      enableDetailedTracking,
      videoDuration,
    ],
  );

  // Track interaction events
  const trackInteraction = useCallback(
    (type: "like" | "unlike" | "comment" | "share" | "save") => {
      if (!consentStore.preferences.analytics) return;

      VideoDataService.trackVideoEvent(videoId, {
        type,
        timestamp: Date.now(),
        metadata: {
          position: watchTimeRef.current.lastPosition,
          watchTime: watchTimeRef.current.totalWatchTime,
        },
      });
    },
    [videoId],
  );

  // Manual quality update
  const updateQuality = useCallback(
    (quality: string) => {
      handleQualityChange(quality);
    },
    [handleQualityChange],
  );

  // Manual completion trigger
  const markAsCompleted = useCallback(() => {
    handleCompletion();
  }, [handleCompletion]);

  // Get current analytics state
  const getCurrentAnalytics = useCallback(
    () => ({
      ...analyticsState,
      sessionId: sessionIdRef.current,
      currentPosition: watchTimeRef.current.lastPosition,
    }),
    [analyticsState],
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    stopWatchTimeTracking();
    if (engagementIntervalRef.current) {
      clearInterval(engagementIntervalRef.current);
    }
    if (sessionIdRef.current) {
      VideoDataService.endSession(sessionIdRef.current);
    }
  }, [stopWatchTimeTracking]);

  return {
    // State
    analyticsState,

    // Event handlers
    onPlaybackStatusUpdate,
    trackInteraction,
    updateQuality,
    markAsCompleted,

    // Utilities
    getCurrentAnalytics,
    cleanup,

    // Direct event handlers (for custom players)
    handlePlay,
    handlePause,
    handleSeek,
    handleBufferStart,
    handleBufferEnd,
    handleQualityChange,
    handleCompletion,
  };
}
