import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { AppState } from "react-native";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";

interface VideoItem {
  id: string;
  videoUri?: string;
  transcription?: string;
}

interface VideoPlayerManager {
  getPlayer: (index: number) => VideoPlayer | null;
  playVideo: (index: number) => void;
  pauseVideo: (index: number) => void;
  pauseAll: () => void;
  muteAll: () => void;
  unmuteAll: () => void;
  updateMuteState: (forceUnmuted?: boolean) => void;
  cleanup: () => void;
  stopAll: () => void;
}

export const useVideoPlayers = (videos: VideoItem[]): VideoPlayerManager => {
  // Pool of 3 players: prev/current/next
  const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const userPreferences = useConfessionStore((state) => state.userPreferences);

  // Track which index is considered "current"
  const currentIndexRef = useRef<number>(0);
  const currentPlayingRef = useRef<number>(-1);

  // A monotonically increasing key to force re-binding sources without changing API
  const [poolKey, setPoolKey] = useState(0);

  const resolveSrc = useCallback(
    (offset: -1 | 0 | 1) => {
      const idx = currentIndexRef.current + offset;
      const uri = idx >= 0 && idx < videos.length ? videos[idx]?.videoUri : null;
      return uri || FALLBACK_VIDEO;
    },
    [videos, FALLBACK_VIDEO],
  );

  // Create exactly three players; sources update when poolKey changes
  const playerPrev = useVideoPlayer(resolveSrc(-1), (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });
  const playerCurrent = useVideoPlayer(resolveSrc(0), (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });
  const playerNext = useVideoPlayer(resolveSrc(1), (player) => {
    player.loop = true;
    player.muted = !userPreferences.sound_enabled;
  });

  // Keep a mapping for quick access
  const playersRef = useRef<{ prev: VideoPlayer | null; curr: VideoPlayer | null; next: VideoPlayer | null }>({
    prev: null,
    curr: null,
    next: null,
  });

  useEffect(() => {
    playersRef.current.prev = playerPrev ?? null;
    playersRef.current.curr = playerCurrent ?? null;
    playersRef.current.next = playerNext ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPrev, playerCurrent, playerNext, poolKey]);

  // Define updateMuteState before using it in useEffect
  const updateMuteState = useCallback(
    (forceUnmuted?: boolean) => {
      Object.values(playersRef.current).forEach((player) => {
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

  const getPlayer = (index: number): VideoPlayer | null => {
    // Map the requested index to one of prev/curr/next around the currentIndexRef
    if (index === currentIndexRef.current) return playersRef.current.curr;
    if (index === currentIndexRef.current - 1) return playersRef.current.prev;
    if (index === currentIndexRef.current + 1) return playersRef.current.next;
    return null; // out of pool window
  };

  const playVideo = useCallback(
    (index: number) => {
      try {
        const player = getPlayer(index);
        if (player) {
          // Pause currently playing video
          if (currentPlayingRef.current !== -1 && currentPlayingRef.current !== index) {
            const currentPlayer = getPlayer(currentPlayingRef.current);
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

          // Recenter pool around the new index (prev/current/next)
          const start = Date.now();
          currentIndexRef.current = index;
          setPoolKey((k) => k + 1); // force sources rebinding
          trackStoreOperation("useVideoPlayers", "recenterPool", Date.now() - start);

          // Preload neighboring videos for smoother experience
          // Preload previous video
          if (index > 0) {
            const prevPlayer = getPlayer(index - 1);
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
          if (index < videos.length - 1) {
            const nextPlayer = getPlayer(index + 1);
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
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(`Failed to play video ${index}:`, error);
        }
      }
    },
    [videos.length],
  );

  const pauseVideo = useCallback((index: number) => {
    try {
      const player = getPlayer(index);
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
  }, []);

  const pauseAll = useCallback(() => {
    [playersRef.current.prev, playersRef.current.curr, playersRef.current.next].forEach((player) => {
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

  const muteAll = useCallback(() => {
    [playersRef.current.prev, playersRef.current.curr, playersRef.current.next].forEach((player) => {
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
  }, []);

  const unmuteAll = useCallback(() => {
    [playersRef.current.prev, playersRef.current.curr, playersRef.current.next].forEach((player) => {
      if (player) {
        player.muted = false;
      }
    });
  }, []);

  const stopAll = useCallback(() => {
    // More aggressive stop - pause and reset current playing
    pauseAll();
    currentPlayingRef.current = -1;
  }, [pauseAll]);

  const cleanup = useCallback(() => {
    stopAll();
    playersRef.current.prev = null;
    playersRef.current.curr = null;
    playersRef.current.next = null;
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

  // Timeout-based cleanup for long-unused players
  useEffect(() => {
    const timer = setInterval(() => {
      // If nothing playing, ensure players are paused and muted to reduce load
      if (currentPlayingRef.current === -1) {
        muteAll();
        pauseAll();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [muteAll, pauseAll]);

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
