import { useRef, useEffect, useMemo } from "react";
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
  updateMuteState: () => void;
  cleanup: () => void;
}

export const useVideoPlayers = (videos: VideoItem[]): VideoPlayerManager => {
  const playersRef = useRef<Map<number, any>>(new Map());
  const currentPlayingRef = useRef<number>(-1);
  const userPreferences = useConfessionStore((state) => state.userPreferences);

  // Create video players using individual hooks (following Rules of Hooks)
  const player0 = useVideoPlayer(videos.length > 0 ? videos[0]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player1 = useVideoPlayer(videos.length > 1 ? videos[1]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player2 = useVideoPlayer(videos.length > 2 ? videos[2]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player3 = useVideoPlayer(videos.length > 3 ? videos[3]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player4 = useVideoPlayer(videos.length > 4 ? videos[4]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player5 = useVideoPlayer(videos.length > 5 ? videos[5]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player6 = useVideoPlayer(videos.length > 6 ? videos[6]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
  });

  const player7 = useVideoPlayer(videos.length > 7 ? videos[7]?.videoUri || null : null, (player) => {
    player.loop = true;
    player.muted = !userPreferences.soundEnabled;
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

  // Update mute state when sound preference changes
  useEffect(() => {
    updateMuteState();
  }, [userPreferences.soundEnabled]);

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

  const pauseAll = () => {
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
  };

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

  const updateMuteState = () => {
    playersRef.current.forEach((player) => {
      if (player) {
        player.muted = !userPreferences.soundEnabled;
      }
    });
  };

  const cleanup = () => {
    pauseAll();
    playersRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    getPlayer,
    playVideo,
    pauseVideo,
    pauseAll,
    muteAll,
    unmuteAll,
    updateMuteState,
    cleanup,
  };
};
