import { useRef, useEffect, useCallback, useState } from "react";
import { AppState } from "react-native";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";

interface VideoItem {
  id: string;
  videoUri?: string;
  transcription?: string;
}

interface SimpleVideoPlayerManager {
  getPlayer: (index: number) => VideoPlayer | null;
  playVideo: (index: number) => void;
  pauseVideo: (index: number) => void;
  pauseAll: () => void;
  muteAll: () => void;
  unmuteAll: () => void;
  updateMuteState: (forceUnmuted?: boolean) => void;
  cleanup: () => void;
  stopAll: () => void;
  setCurrentIndex: (index: number) => void;
}

export const useSimpleVideoPlayer = (videos: VideoItem[]): SimpleVideoPlayerManager => {
  const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const userPreferences = useConfessionStore((state) => state.userPreferences);

  // Track current video index and playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPlayingRef = useRef<number>(-1);

  // Get current video source
  const getCurrentVideoSource = useCallback(() => {
    if (videos.length === 0) {
      console.log("useSimpleVideoPlayer: No videos, using fallback");
      return FALLBACK_VIDEO;
    }

    const video = videos[currentIndex];
    const source = video?.videoUri || FALLBACK_VIDEO;
    console.log(`useSimpleVideoPlayer: Video source for index ${currentIndex}:`, source);
    console.log(`useSimpleVideoPlayer: Video object:`, JSON.stringify(video, null, 2));
    return source;
  }, [videos, currentIndex, FALLBACK_VIDEO]);

  // Create a single video player for the current video
  const currentVideoSource = getCurrentVideoSource();

  const videoPlayer = useVideoPlayer(currentVideoSource, (player) => {
    console.log("useSimpleVideoPlayer: Player callback called with:", player ? "valid player" : "null player");
    console.log("useSimpleVideoPlayer: Source being used:", currentVideoSource);

    if (player) {
      try {
        player.loop = true;
        player.muted = !userPreferences.sound_enabled;
        console.log("useSimpleVideoPlayer: Player configured successfully for:", currentVideoSource);
      } catch (error) {
        console.error("useSimpleVideoPlayer: Error configuring player:", error);
      }
    } else {
      console.warn("useSimpleVideoPlayer: Player is null during configuration");
    }
  });

  // Log player state
  useEffect(() => {
    console.log("useSimpleVideoPlayer: Player state changed:", videoPlayer ? "available" : "null");
    console.log("useSimpleVideoPlayer: Current video source:", currentVideoSource);
  }, [videoPlayer, currentVideoSource]);

  // Update mute state when preferences change
  useEffect(() => {
    if (videoPlayer) {
      try {
        videoPlayer.muted = !userPreferences.sound_enabled;
      } catch (error) {
        console.warn("useSimpleVideoPlayer: Error updating mute state:", error);
      }
    }
  }, [videoPlayer, userPreferences.sound_enabled]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        try {
          if (videoPlayer && typeof videoPlayer.pause === "function") {
            videoPlayer.pause();
            currentPlayingRef.current = -1;
          }
        } catch (error) {
          console.warn("useSimpleVideoPlayer: Error pausing on app state change:", error);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [videoPlayer]);

  // Get player for specific index (simplified - always returns current player)
  const getPlayer = useCallback(
    (index: number): VideoPlayer | null => {
      if (index !== currentIndex) {
        console.log(`useSimpleVideoPlayer: Requested index ${index} but current is ${currentIndex}`);
        return null;
      }

      if (!videoPlayer) {
        console.warn("useSimpleVideoPlayer: Video player is null");
        return null;
      }

      return videoPlayer;
    },
    [videoPlayer, currentIndex],
  );

  // Play video at specific index
  const playVideo = useCallback(
    (index: number) => {
      try {
        // If requesting different index, update current index
        if (index !== currentIndex) {
          console.log(`useSimpleVideoPlayer: Switching from index ${currentIndex} to ${index}`);
          setCurrentIndex(index);
          return; // Player will be recreated with new source
        }

        if (videoPlayer && typeof videoPlayer.play === "function") {
          videoPlayer.play();
          currentPlayingRef.current = index;
          console.log(`useSimpleVideoPlayer: Playing video at index ${index}`);
        } else {
          console.warn("useSimpleVideoPlayer: Cannot play - player not available");
        }
      } catch (error: any) {
        if (
          !error?.message?.includes("NativeSharedObjectNotFoundException") &&
          !error?.message?.includes("FunctionCallException")
        ) {
          console.warn(`useSimpleVideoPlayer: Error playing video ${index}:`, error?.message);
        }
      }
    },
    [videoPlayer, currentIndex],
  );

  // Pause video at specific index
  const pauseVideo = useCallback(
    (index: number) => {
      try {
        if (index === currentIndex && videoPlayer && typeof videoPlayer.pause === "function") {
          videoPlayer.pause();
          currentPlayingRef.current = -1;
          console.log(`useSimpleVideoPlayer: Paused video at index ${index}`);
        }
      } catch (error: any) {
        if (
          !error?.message?.includes("NativeSharedObjectNotFoundException") &&
          !error?.message?.includes("FunctionCallException")
        ) {
          console.warn(`useSimpleVideoPlayer: Error pausing video ${index}:`, error?.message);
        }
      }
    },
    [videoPlayer, currentIndex],
  );

  // Pause all videos
  const pauseAll = useCallback(() => {
    try {
      if (videoPlayer && typeof videoPlayer.pause === "function") {
        videoPlayer.pause();
        currentPlayingRef.current = -1;
        console.log("useSimpleVideoPlayer: Paused all videos");
      }
    } catch (error: any) {
      if (
        !error?.message?.includes("NativeSharedObjectNotFoundException") &&
        !error?.message?.includes("FunctionCallException")
      ) {
        console.warn("useSimpleVideoPlayer: Error pausing all videos:", error?.message);
      }
    }
  }, [videoPlayer]);

  // Mute all videos
  const muteAll = useCallback(() => {
    try {
      if (videoPlayer) {
        videoPlayer.muted = true;
        console.log("useSimpleVideoPlayer: Muted all videos");
      }
    } catch (error) {
      console.warn("useSimpleVideoPlayer: Error muting videos:", error);
    }
  }, [videoPlayer]);

  // Unmute all videos
  const unmuteAll = useCallback(() => {
    try {
      if (videoPlayer) {
        videoPlayer.muted = false;
        console.log("useSimpleVideoPlayer: Unmuted all videos");
      }
    } catch (error) {
      console.warn("useSimpleVideoPlayer: Error unmuting videos:", error);
    }
  }, [videoPlayer]);

  // Update mute state
  const updateMuteState = useCallback(
    (forceUnmuted?: boolean) => {
      try {
        if (videoPlayer) {
          if (forceUnmuted) {
            videoPlayer.muted = false;
          } else {
            videoPlayer.muted = !userPreferences.sound_enabled;
          }
        }
      } catch (error) {
        console.warn("useSimpleVideoPlayer: Error updating mute state:", error);
      }
    },
    [videoPlayer, userPreferences.sound_enabled],
  );

  // Stop all videos
  const stopAll = useCallback(() => {
    pauseAll();
  }, [pauseAll]);

  // Cleanup
  const cleanup = useCallback(() => {
    try {
      pauseAll();
      console.log("useSimpleVideoPlayer: Cleanup completed");
    } catch (error) {
      console.warn("useSimpleVideoPlayer: Error during cleanup:", error);
    }
  }, [pauseAll]);

  // Set current index
  const setCurrentIndexCallback = useCallback(
    (index: number) => {
      if (index >= 0 && index < videos.length && index !== currentIndex) {
        console.log(`useSimpleVideoPlayer: Setting current index to ${index}`);
        setCurrentIndex(index);
      }
    },
    [currentIndex, videos.length],
  );

  return {
    getPlayer,
    playVideo,
    pauseVideo,
    pauseAll,
    muteAll,
    unmuteAll,
    updateMuteState,
    cleanup,
    stopAll,
    setCurrentIndex: setCurrentIndexCallback,
  };
};
