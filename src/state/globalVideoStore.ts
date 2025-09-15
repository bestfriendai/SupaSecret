import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerStoreCleanup } from "../utils/storeCleanup";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";

interface VideoPlayerRef {
  id: string;
  player: any;
  isPlaying: boolean;
}

interface GlobalVideoState {
  videoPlayers: Map<string, VideoPlayerRef>;
  playersMeta: Record<string, { isPlaying: boolean }>;
  currentTab: string;

  // Actions
  registerVideoPlayer: (id: string, player: any) => void;
  unregisterVideoPlayer: (id: string) => void;
  pauseAllVideos: () => void;
  resumeVideosForTab: (tabName: string) => void;
  setCurrentTab: (tabName: string) => void;
  updatePlayerState: (id: string, isPlaying: boolean) => void;
}

export const useGlobalVideoStore = create<GlobalVideoState>()(
  persist(
    (set, get) => ({
      videoPlayers: new Map(),
      playersMeta: {},
      currentTab: "Home",

      registerVideoPlayer: (id: string, player: any) => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();
        const newPlayers = new Map(videoPlayers);

        // Clean up existing player if it exists
        const existingPlayer = videoPlayers.get(id);
        if (existingPlayer?.player) {
          try {
            disposePlayer(existingPlayer.player);
          } catch (error) {
            if (__DEV__) console.warn(`🎥 Failed to cleanup existing player ${id}:`, error);
          }
        }

        // Preserve existing isPlaying state
        const isPlaying = playersMeta[id]?.isPlaying ?? false;
        newPlayers.set(id, { id, player, isPlaying });
        set({ videoPlayers: newPlayers, playersMeta: { ...playersMeta, [id]: { isPlaying } } });
        trackStoreOperation("globalVideoStore", "registerVideoPlayer", Date.now() - t0);
      },

      unregisterVideoPlayer: (id: string) => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();
        const existing = videoPlayers.get(id);
        if (existing?.player) {
          try {
            disposePlayer(existing.player);
          } catch (e) {
            if (__DEV__) console.warn("🎥 Error disposing player during unregister", e);
          }
        }
        const newPlayers = new Map(videoPlayers);
        newPlayers.delete(id);
        const { [id]: _removed, ...restMeta } = playersMeta;
        set({ videoPlayers: newPlayers, playersMeta: restMeta });
        trackStoreOperation("globalVideoStore", "unregisterVideoPlayer", Date.now() - t0);
      },

      pauseAllVideos: () => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();
        videoPlayers.forEach((playerRef, id) => {
          try {
            if (playerRef.player) {
              if (typeof playerRef.player.pause === "function") playerRef.player.pause();
              if (typeof playerRef.player.setMuted === "function") playerRef.player.setMuted(true);
              else if (typeof playerRef.player.mute === "function") playerRef.player.mute();
              else if ("muted" in playerRef.player) (playerRef.player as any).muted = true;
            }
          } catch (error) {
            if (__DEV__) console.warn(`🎥 Failed to pause video ${id}:`, error);
          }
        });
        // persist current playing state as paused
        const nextMeta: Record<string, { isPlaying: boolean }> = {};
        Object.keys(playersMeta).forEach((k) => (nextMeta[k] = { isPlaying: false }));
        set({ playersMeta: nextMeta });
        trackStoreOperation("globalVideoStore", "pauseAllVideos", Date.now() - t0);
      },

      resumeVideosForTab: (tabName: string) => {
        const t0 = Date.now();
        const { videoPlayers, currentTab, playersMeta } = get();
        if (tabName === "Videos" && currentTab === "Videos") {
          videoPlayers.forEach((playerRef, id) => {
            try {
              if (playerRef.player) {
                if (typeof playerRef.player.setMuted === "function") playerRef.player.setMuted(false);
                else if ("muted" in playerRef.player) (playerRef.player as any).muted = false;
                if (
                  (playersMeta[id]?.isPlaying ?? playerRef.isPlaying) &&
                  typeof playerRef.player.play === "function"
                ) {
                  const playPromise = playerRef.player.play();
                  if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch((error: any) => {
                      if (__DEV__) console.warn(`🎥 Failed to resume video ${id}:`, error);
                    });
                  }
                }
              }
            } catch (error) {
              if (__DEV__) console.warn(`🎥 Failed to resume video ${id}:`, error);
            }
          });
          trackStoreOperation("globalVideoStore", "resumeVideosForTab", Date.now() - t0);
        }
      },

      setCurrentTab: (tabName: string) => {
        const { currentTab } = get();
        if (currentTab !== tabName) {
          if (tabName !== "Videos") {
            get().pauseAllVideos();
          }
          set({ currentTab: tabName });
          if (tabName === "Videos") {
            requestAnimationFrame(() => get().resumeVideosForTab(tabName));
          }
        }
      },

      updatePlayerState: (id: string, isPlaying: boolean) => {
        const { videoPlayers, playersMeta } = get();
        const playerRef = videoPlayers.get(id);
        if (playerRef) {
          const newPlayers = new Map(videoPlayers);
          newPlayers.set(id, { ...playerRef, isPlaying });
          set({ videoPlayers: newPlayers, playersMeta: { ...playersMeta, [id]: { isPlaying } } });
        } else {
          set({ playersMeta: { ...playersMeta, [id]: { isPlaying } } });
        }
      },
    }),
    {
      name: "global-video-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentTab: state.currentTab,
        playersMeta: state.playersMeta,
      }),
      version: 1,
    },
  ),
);

// Local helper to defensively dispose any kind of player
function disposePlayer(player: any) {
  try {
    // First pause playback to avoid issues
    if (typeof player.pause === "function") player.pause();

    // expo-video specific cleanup using release() method
    if (typeof player.release === "function") {
      player.release();
      return; // expo-video player disposed successfully
    }

    // Fallback for other player types
    if (typeof player.stop === "function") player.stop();
    if (typeof player.dispose === "function") player.dispose();
    if (typeof player.destroy === "function") player.destroy();
    if (typeof player.removeAllListeners === "function") player.removeAllListeners();
  } catch (error) {
    if (__DEV__) {
      console.warn("Error during player disposal:", error);
    }
  }
}

// Centralized cleanup registration
registerStoreCleanup("globalVideoStore", () => {
  const { videoPlayers } = useGlobalVideoStore.getState();
  videoPlayers.forEach((ref) => {
    try {
      disposePlayer(ref.player);
    } catch {}
  });
  useGlobalVideoStore.setState({ videoPlayers: new Map() });
});
