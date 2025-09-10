import { useRef, useEffect, useMemo, useCallback } from "react";
import { AppState } from "react-native";
import { useVideoPlayer } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";

interface VideoItem {
  id: string;
  videoUri?: string;
  transcription?: string;
}

interface VideoPlayerManager {
  getPlayer: (index: number) => any;
  playVideo: (index: number) => void;
  pauseVideo: (index: number) => void;
  pauseAll: () => void;
  muteAll: () => void;
  unmuteAll: () => void;
  updateMuteState: (forceUnmuted?: boolean) => void;
  cleanup: () => void;
  stopAll: () => void; // New method to completely stop all videos
}

export const useVideoPlayers = (videos: VideoItem[]): VideoPlayerManager => {
  const playersRef = useRef<Map<number, any>>(new Map());
  const currentPlayingRef = useRef<number>(-1);
  const userPreferences = useConfessionStore((state) => state.userPreferences);

  // Fallback sample video to avoid blank players when a videoUri is missing
  const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Create video players using individual hooks (following Rules of Hooks)
  const player0 = useVideoPlayer(videos.length > 0 ? videos[0]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player1 = useVideoPlayer(videos.length > 1 ? videos[1]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player2 = useVideoPlayer(videos.length > 2 ? videos[2]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player3 = useVideoPlayer(videos.length > 3 ? videos[3]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player4 = useVideoPlayer(videos.length > 4 ? videos[4]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player5 = useVideoPlayer(videos.length > 5 ? videos[5]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player6 = useVideoPlayer(videos.length > 6 ? videos[6]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  const player7 = useVideoPlayer(videos.length > 7 ? videos[7]?.videoUri || FALLBACK_VIDEO : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  // Store players in a stable array
  const players = useMemo(
    () => [player0, player1, player2, player3, player4, player5, player6, player7],
    [player0, player1, player2, player3, player4, player5, player6, player7],
  );

  // Initialize players map
  useEffect(() => {
    playersRef.current.clear();
    players.forEach((player, index) => {
      if (player && index < videos.length) {
        playersRef.current.set(index, player);
      }
    });
  }, [players, videos.length]);

  // Define updateMuteState before using it in useEffect
  const updateMuteState = useCallback(
    (forceUnmuted?: boolean) => {
      playersRef.current.forEach((player) => {
        if (player) {
          if (forceUnmuted) {
            player.muted = false;
          } else {
            player.muted = !userPreferences.sound_enabled;
          }
        }
      });
    },
    [userPreferences.sound_enabled],
  );

  // Update mute state when sound preference changes
  useEffect(() => {
    updateMuteState();
  }, [userPreferences.sound_enabled, updateMuteState]);

  const getPlayer = (index: number) => {
    return playersRef.current.get(index) || null;
  };

  const preloadNeighbors = (currentIndex: number) => {
    // Preload previous video
    if (currentIndex > 0) {
      const prevPlayer = playersRef.current.get(currentIndex - 1);
      if (prevPlayer) {
        try {
          // Load the video without playing
          prevPlayer.currentTime = 0;
        } catch (error) {
          if (__DEV__) {
            console.warn(`Failed to preload previous video:`, error);
          }
        }
      }
    }

    // Preload next video
    if (currentIndex < videos.length - 1) {
      const nextPlayer = playersRef.current.get(currentIndex + 1);
      if (nextPlayer) {
        try {
          // Load the video without playing
          nextPlayer.currentTime = 0;
        } catch (error) {
          if (__DEV__) {
            console.warn(`Failed to preload next video:`, error);
          }
        }
      }
    }
  };

  const playVideo = (index: number) => {
    try {
      const player = playersRef.current.get(index);
      if (player) {
        // Pause currently playing video
        if (currentPlayingRef.current !== -1 && currentPlayingRef.current !== index) {
          const currentPlayer = playersRef.current.get(currentPlayingRef.current);
          try {
            if (currentPlayer && typeof currentPlayer.pause === "function") {
              currentPlayer.pause();
            }
          } catch (error) {
            if (__DEV__) {
              console.warn(`Failed to pause current player:`, error);
            }
          }
        }

        player.play();
        currentPlayingRef.current = index;

        // Preload neighboring videos for smoother experience
        preloadNeighbors(index);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`Failed to play video ${index}:`, error);
      }
    }
  };

  const pauseVideo = (index: number) => {
    try {
      const player = playersRef.current.get(index);
      if (player && typeof player.pause === "function") {
        player.pause();
        if (currentPlayingRef.current === index) {
          currentPlayingRef.current = -1;
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`Failed to pause video ${index}:`, error);
      }
    }
  };

  const pauseAll = useCallback(() => {
    playersRef.current.forEach((player) => {
      try {
        if (player && typeof player.pause === "function") {
          player.pause();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to pause player:", error);
        }
      }
    });
    currentPlayingRef.current = -1;
  }, []);

  const muteAll = () => {
    playersRef.current.forEach((player) => {
      if (player) {
        try {
          player.muted = true;
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to mute player:", error);
          }
        }
      }
    });
  };

  const unmuteAll = () => {
    playersRef.current.forEach((player) => {
      if (player) {
        player.muted = false;
      }
    });
  };

  const stopAll = useCallback(() => {
    // More aggressive stop - pause and reset current playing
    pauseAll();
    currentPlayingRef.current = -1;
  }, [pauseAll]);

  const cleanup = useCallback(() => {
    stopAll();
    playersRef.current.clear();
  }, [stopAll]);

  // Handle app state changes to pause all videos when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        // App is going to background, pause all videos
        pauseAll();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [pauseAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
  };
};
