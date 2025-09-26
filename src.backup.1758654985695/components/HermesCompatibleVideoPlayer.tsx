import React, { useRef, useEffect, useCallback, useState } from "react";
import { VideoView, useVideoPlayer } from "expo-video";
import { View } from "react-native";
import { useVideoAnalyticsTracker } from "../hooks/useVideoAnalyticsTracker";
import { consentStore } from "../state/consentStore";

interface HermesCompatibleVideoPlayerProps {
  videoUri: string;
  videoId?: string;
  isActive: boolean;
  onError?: (error: Error) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (from: number, to: number) => void;
  onBufferStart?: () => void;
  onBufferEnd?: () => void;
  onComplete?: () => void;
  onQualityChange?: (quality: string) => void;
  enableAnalytics?: boolean;
  trackDetailedEngagement?: boolean;
  sessionId?: string;
  style?: any;
  className?: string;
}

/**
 * Enhanced video player component with Hermes-specific disposal handling
 * Addresses "Player pause failed during disposal" warnings
 */
export const HermesCompatibleVideoPlayer: React.FC<HermesCompatibleVideoPlayerProps> = ({
  videoUri,
  videoId,
  isActive,
  onError,
  onPlaybackStatusUpdate,
  onPlay,
  onPause,
  onSeek,
  onBufferStart,
  onBufferEnd,
  onComplete,
  onQualityChange,
  enableAnalytics = true,
  trackDetailedEngagement = true,
  sessionId,
  style,
  className,
}) => {
  const playerRef = useRef<VideoView>(null);
  const [isDisposing, setIsDisposing] = useState(false);
  const disposalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlaybackStatusRef = useRef<any>(null);
  const bufferingStateRef = useRef(false);
  const seekDetectionRef = useRef<{ time: number; position: number } | null>(null);
  const qualityRef = useRef<string>("auto");
  const videoDurationRef = useRef<number>(0);
  const hasStartedRef = useRef(false);
  const performanceStartRef = useRef<number>(Date.now());

  // Create player with enhanced error handling
  const player = useVideoPlayer(videoUri, (player) => {
    try {
      player.loop = true;
      player.muted = false;

      // Set initial play state
      if (isActive && !isDisposing) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Video player setup error:", error);
      }
      onError?.(error as Error);
    }
  });

  const analyticsConsent = consentStore.preferences.analytics;
  const analytics = useVideoAnalyticsTracker({
    videoId: videoId || videoUri,
    videoDuration: videoDurationRef.current,
    enableDetailedTracking: trackDetailedEngagement && analyticsConsent && enableAnalytics,
    sessionId,
    onEngagementUpdate: (score) => {
      if (__DEV__) {
        console.log(`Video engagement score: ${score}`);
      }
    },
    onCompletionDetected: (completionRate) => {
      if (__DEV__) {
        console.log(`Video completed: ${completionRate}%`);
      }
      onComplete?.();
    },
  });

  // Handle play/pause based on active state
  useEffect(() => {
    if (!player || isDisposing) return;

    try {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Video play/pause error:", error);
      }
    }
  }, [player, isActive, isDisposing]);

  // Enhanced disposal handling for Hermes compatibility
  const disposePlayer = useCallback(async () => {
    if (isDisposing || !player) return;

    setIsDisposing(true);

    try {
      // Clear any pending disposal timeout
      if (disposalTimeoutRef.current) {
        clearTimeout(disposalTimeoutRef.current);
        disposalTimeoutRef.current = null;
      }

      // Graceful pause with timeout
      const pausePromise = new Promise<void>((resolve) => {
        try {
          // Check if player is still valid
          let shouldPause = false;
          try {
            shouldPause = player.playing;
          } catch (checkError: any) {
            // Player already disposed
            if (
              checkError?.message?.includes("NativeSharedObjectNotFoundException") ||
              checkError?.message?.includes("Unable to find the native shared object")
            ) {
              resolve();
              return;
            }
          }

          if (shouldPause) {
            try {
              player.pause();
            } catch (pauseErr: any) {
              // Only log non-disposal errors
              if (
                __DEV__ &&
                !pauseErr?.message?.includes("NativeSharedObjectNotFoundException") &&
                !pauseErr?.message?.includes("Unable to find the native shared object")
              ) {
                console.warn("Video pause error during disposal:", pauseErr?.message);
              }
            }
          }
          resolve();
        } catch (pauseError: any) {
          // Ignore disposal-related errors
          if (
            __DEV__ &&
            !pauseError?.message?.includes("NativeSharedObjectNotFoundException") &&
            !pauseError?.message?.includes("Unable to find the native shared object")
          ) {
            console.warn("Video pause failed during disposal:", pauseError?.message);
          }
          resolve();
        }
      });

      // Set a timeout for pause operation
      const timeoutPromise = new Promise<void>((resolve) => {
        disposalTimeoutRef.current = setTimeout(() => {
          resolve();
        }, 100); // 100ms timeout for pause
      });

      // Wait for either pause to complete or timeout
      await Promise.race([pausePromise, timeoutPromise]);

      // Note: player.unload() does not exist in expo-video
      // The player is automatically disposed when the component unmounts
    } catch (error) {
      // Silently ignore all disposal errors
      if (__DEV__) {
        console.warn("Video disposal error:", error);
      }
    } finally {
      // Clean up timeout
      if (disposalTimeoutRef.current) {
        clearTimeout(disposalTimeoutRef.current);
        disposalTimeoutRef.current = null;
      }
    }
  }, [player, isDisposing]);

  // Enhanced cleanup with analytics
  useEffect(() => {
    return () => {
      // Clean up analytics tracking
      if (enableAnalytics && analyticsConsent) {
        analytics.cleanup();
      }
      disposePlayer();
    };
  }, [disposePlayer, enableAnalytics, analytics, analyticsConsent]);

  // Track quality changes if supported
  useEffect(() => {
    if (!player || !trackDetailedEngagement || !enableAnalytics || !analyticsConsent) return;

    // expo-video doesn't expose quality directly, but we can track if it changes
    // This is a placeholder for when quality information becomes available
    const checkQuality = () => {
      // Future: Check player.quality or similar property
      const currentQuality = "auto"; // Default for now
      if (currentQuality !== qualityRef.current) {
        qualityRef.current = currentQuality;
        onQualityChange?.(currentQuality);
        analytics.updateQuality(currentQuality);
      }
    };

    const qualityInterval = setInterval(checkQuality, 5000);
    return () => clearInterval(qualityInterval);
  }, [player, trackDetailedEngagement, enableAnalytics, analyticsConsent, onQualityChange, analytics]);

  // Track buffer events (placeholder for when expo-video exposes buffering state)
  useEffect(() => {
    if (!player || !trackDetailedEngagement || !enableAnalytics || !analyticsConsent) return;

    // This is a placeholder - expo-video doesn't currently expose buffering events
    // When available, implement proper buffer tracking
    const checkBuffering = () => {
      // Future: Check player.isBuffering or similar
      const isBuffering = false; // Default for now

      if (isBuffering !== bufferingStateRef.current) {
        bufferingStateRef.current = isBuffering;
        if (isBuffering) {
          onBufferStart?.();
          analytics.handleBufferStart();
        } else {
          onBufferEnd?.();
          analytics.handleBufferEnd();
        }
      }
    };

    const bufferInterval = setInterval(checkBuffering, 500);
    return () => clearInterval(bufferInterval);
  }, [player, trackDetailedEngagement, enableAnalytics, analyticsConsent, onBufferStart, onBufferEnd, analytics]);

  // Track interaction events
  const trackInteraction = useCallback(
    (type: "like" | "unlike" | "comment" | "share" | "save") => {
      if (enableAnalytics && analyticsConsent) {
        analytics.trackInteraction(type);
      }
    },
    [enableAnalytics, analyticsConsent, analytics],
  );

  // Handle player status changes with enhanced analytics
  useEffect(() => {
    if (!player || isDisposing) return;

    // Monitor player properties for status updates
    const checkStatus = () => {
      try {
        const currentStatus = {
          isLoaded: true,
          isPlaying: player.playing,
          isBuffering: false, // expo-video doesn't expose buffering state directly
          currentTime: player.currentTime,
          duration: player.duration,
          positionMillis: player.currentTime * 1000,
          durationMillis: player.duration * 1000,
          muted: player.muted,
          loop: player.loop,
          didJustFinish: false,
          isLooping: player.loop,
          error: null,
        };

        // Update duration reference
        if (player.duration > 0 && videoDurationRef.current !== player.duration) {
          videoDurationRef.current = player.duration;
        }

        // Detect first play
        if (player.playing && !hasStartedRef.current) {
          hasStartedRef.current = true;
          const startupTime = Date.now() - performanceStartRef.current;
          if (__DEV__) {
            console.log(`Video startup time: ${startupTime}ms`);
          }
        }

        // Detect playback state changes
        if (lastPlaybackStatusRef.current) {
          const lastStatus = lastPlaybackStatusRef.current;

          // Play/Pause detection
          if (player.playing !== lastStatus.isPlaying) {
            if (player.playing) {
              onPlay?.();
            } else {
              onPause?.();
            }
          }

          // Seek detection
          if (seekDetectionRef.current) {
            const timeDiff = Date.now() - seekDetectionRef.current.time;
            const positionDiff = Math.abs(player.currentTime - seekDetectionRef.current.position);

            if (timeDiff < 100 && positionDiff > 2) {
              // Likely a seek if position changed more than 2 seconds within 100ms
              onSeek?.(seekDetectionRef.current.position, player.currentTime);
            }
          }
          seekDetectionRef.current = { time: Date.now(), position: player.currentTime };

          // Completion detection
          if (player.duration > 0 && player.currentTime >= player.duration * 0.95) {
            if (!lastStatus.didJustFinish) {
              currentStatus.didJustFinish = true;
            }
          }
        }

        // Send status updates
        onPlaybackStatusUpdate?.(currentStatus);

        // Send to analytics tracker if enabled
        if (enableAnalytics && analyticsConsent) {
          analytics.onPlaybackStatusUpdate(currentStatus);
        }

        lastPlaybackStatusRef.current = currentStatus;
      } catch (statusError) {
        if (__DEV__) {
          console.warn("Playback status update error:", statusError);
        }
        onError?.(new Error("Failed to get playback status"));
      }
    };

    // Check status periodically with higher frequency for better tracking
    const interval = setInterval(checkStatus, 250); // 250ms for more accurate tracking

    // Initial status check
    checkStatus();

    return () => {
      clearInterval(interval);
    };
  }, [
    player,
    isDisposing,
    onPlaybackStatusUpdate,
    onError,
    onPlay,
    onPause,
    onSeek,
    onComplete,
    enableAnalytics,
    analytics,
    analyticsConsent,
  ]);

  if (isDisposing) {
    return <View style={style} className={className} />;
  }

  return (
    <VideoView
      ref={playerRef}
      style={style}
      player={player}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
      showsTimecodes={false}
      requiresLinearPlayback={false}
    />
  );
};

export default HermesCompatibleVideoPlayer;
