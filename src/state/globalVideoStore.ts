import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerStoreCleanup } from "../utils/storeCleanup";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import {
  VideoPlayerInterface,
  VideoPlayerState,
  VideoPlayerCapabilities,
  VideoPlaybackState,
} from "../types/videoPlayer";
import { BaseVideoError, VideoErrorCode, VideoErrorSeverity } from "../types/videoErrors";
import {
  disposeVideoPlayer,
  scheduleVideoPlayerDisposal,
  DisposalStrategy,
  DisposalConfig,
} from "../utils/videoPlayerDisposal";

interface VideoPlayerRef {
  id: string;
  player: VideoPlayerInterface;
  state: VideoPlayerState;
  capabilities: VideoPlayerCapabilities;
  playbackState?: VideoPlaybackState;
  lastActivity: number;
  disposalAttempts: number;
  errorCount: number;
}

// Comment 3: Use plain POJO for serializable error
interface SerializableError {
  code: VideoErrorCode;
  message: string;
  severity: VideoErrorSeverity;
  at: number;
}

interface PlayerMetadata {
  isPlaying: boolean;
  lastError?: SerializableError;
  recoveryAttempts: number;
  lastRecoveryTime?: number;
}

interface GlobalVideoState {
  videoPlayers: Map<string, VideoPlayerRef>;
  playersMeta: Record<string, PlayerMetadata>;
  currentTab: string;
  hermesCompatMode: boolean;
  cleanupInterval?: NodeJS.Timeout;
  errorMetrics: {
    disposalErrors: number;
    recoverySuccesses: number;
    totalErrors: number;
  };

  // Actions
  registerVideoPlayer: (id: string, player: VideoPlayerInterface, capabilities?: VideoPlayerCapabilities) => void;
  unregisterVideoPlayer: (id: string) => Promise<void>;
  pauseAllVideos: () => Promise<void>;
  resumeVideosForTab: (tabName: string) => Promise<void>;
  setCurrentTab: (tabName: string) => void;
  updatePlayerState: (id: string, state: Partial<VideoPlaybackState>) => void;
  recoverPlayer: (id: string) => Promise<boolean>;
  cleanupStalePlayers: () => Promise<void>;
  updateErrorMetrics: (type: "disposal" | "recovery" | "general", success: boolean) => void;
}

// Hermes detection utility
const isHermesRuntime = (): boolean => {
  try {
    // @ts-ignore - HermesInternal is a global object in Hermes runtime
    return typeof HermesInternal !== "undefined";
  } catch {
    return false;
  }
};

// Comment 1: Map disposal strategy types
const mapDisposalStrategy = (type: "immediate" | "delayed" | "forced"): DisposalStrategy => {
  switch (type) {
    case "immediate":
      return DisposalStrategy.GRACEFUL;
    case "delayed":
      return DisposalStrategy.SCHEDULED;
    case "forced":
      return DisposalStrategy.FORCED;
    default:
      return DisposalStrategy.GRACEFUL;
  }
};

export const useGlobalVideoStore = create<GlobalVideoState>()(
  persist(
    (set, get) => ({
      videoPlayers: new Map(),
      playersMeta: {},
      currentTab: "Home",
      hermesCompatMode: isHermesRuntime(),
      cleanupInterval: undefined,
      errorMetrics: {
        disposalErrors: 0,
        recoverySuccesses: 0,
        totalErrors: 0,
      },

      registerVideoPlayer: (id, player, capabilities) => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();
        const newPlayers = new Map(videoPlayers);

        // Clean up existing player if it exists
        const existingPlayer = videoPlayers.get(id);
        if (existingPlayer?.player) {
          // Comment 1 & 8: Use centralized disposal utility with schedule
          scheduleVideoPlayerDisposal(id, existingPlayer.player, 0, {
            strategy: DisposalStrategy.SCHEDULED,
            timeout: 1000,
            retries: 2,
          });
        }

        // Create new player reference with enhanced metadata
        const playerRef: VideoPlayerRef = {
          id,
          player,
          state: VideoPlayerState.Idle,
          capabilities: capabilities || {
            canPlay: true,
            canPause: true,
            canSeek: false,
            canSetVolume: true,
            canSetPlaybackRate: false,
            supportsFullscreen: false,
            supportsPiP: false,
          },
          lastActivity: Date.now(),
          disposalAttempts: 0,
          errorCount: 0,
        };

        // Preserve existing metadata
        const isPlaying = playersMeta[id]?.isPlaying ?? false;
        newPlayers.set(id, playerRef);

        set({
          videoPlayers: newPlayers,
          playersMeta: {
            ...playersMeta,
            [id]: {
              isPlaying,
              recoveryAttempts: 0,
            },
          },
        });

        trackStoreOperation("globalVideoStore", "registerVideoPlayer", Date.now() - t0);

        // Start cleanup interval if not running
        if (!get().cleanupInterval) {
          const interval = setInterval(() => {
            get().cleanupStalePlayers();
          }, 30000); // Run every 30 seconds
          set({ cleanupInterval: interval });
        }
      },

      // Comment 2: Always remove player from store, force dispose on failure
      unregisterVideoPlayer: async (id) => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();
        const playerRef = videoPlayers.get(id);

        // Always remove from store first
        const newPlayers = new Map(videoPlayers);
        newPlayers.delete(id);
        const { [id]: _removed, ...restMeta } = playersMeta;

        set({
          videoPlayers: newPlayers,
          playersMeta: restMeta,
        });

        // Attempt disposal if player exists
        if (playerRef?.player) {
          try {
            // Comment 1: Use centralized disposal utility
            const result = await disposeVideoPlayer(id, playerRef.player, {
              strategy: DisposalStrategy.GRACEFUL,
              timeout: 500,
              retries: 3,
            });

            if (result.success) {
              get().updateErrorMetrics("disposal", true);
            } else {
              // Comment 2: Force disposal in background on failure
              disposeVideoPlayer(id, playerRef.player, {
                strategy: DisposalStrategy.FORCED,
                retries: 1,
                timeout: 100,
              }).then(
                () => get().updateErrorMetrics("disposal", true),
                () => get().updateErrorMetrics("disposal", false),
              );
            }
          } catch (error) {
            get().updateErrorMetrics("disposal", false);

            // Comment 2: Force disposal in background
            disposeVideoPlayer(id, playerRef.player, {
              strategy: DisposalStrategy.FORCED,
              retries: 1,
              timeout: 100,
            }).catch(() => {
              // Ignore errors, player is already removed from store
            });
          }
        }

        trackStoreOperation("globalVideoStore", "unregisterVideoPlayer", Date.now() - t0);
      },

      pauseAllVideos: async () => {
        const t0 = Date.now();
        const { videoPlayers, playersMeta } = get();

        const pauseOperations = Array.from(videoPlayers.entries()).map(async ([id, playerRef]) => {
          try {
            if (playerRef.player) {
              if (typeof playerRef.player.pause === "function") {
                await playerRef.player.pause();
              }
              if (typeof playerRef.player.setMuted === "function") {
                playerRef.player.setMuted(true);
              }
            }
            return { id, success: true };
          } catch (error) {
            get().updateErrorMetrics("general", false);
            if (__DEV__) console.warn(`🎥 Failed to pause video ${id}:`, error);
            return { id, success: false };
          }
        });

        const results = await Promise.allSettled(pauseOperations);

        // Update metadata for all players
        const nextMeta: Record<string, PlayerMetadata> = {};
        Object.keys(playersMeta).forEach((k) => {
          nextMeta[k] = { ...playersMeta[k], isPlaying: false };
        });
        set({ playersMeta: nextMeta });

        trackStoreOperation("globalVideoStore", "pauseAllVideos", Date.now() - t0);
      },

      resumeVideosForTab: async (tabName) => {
        const t0 = Date.now();
        const { videoPlayers, currentTab, playersMeta } = get();

        if (tabName === "Videos" && currentTab === "Videos") {
          const resumeOperations = Array.from(videoPlayers.entries()).map(async ([id, playerRef]) => {
            try {
              if (playerRef.player && playersMeta[id]?.isPlaying) {
                if (typeof playerRef.player.setMuted === "function") {
                  playerRef.player.setMuted(false);
                }
                if (typeof playerRef.player.play === "function") {
                  await playerRef.player.play();
                }
              }
              return { id, success: true };
            } catch (error) {
              get().updateErrorMetrics("general", false);

              // Attempt recovery
              const recovered = await get().recoverPlayer(id);
              if (!recovered && __DEV__) {
                console.warn(`🎥 Failed to resume video ${id}:`, error);
              }
              return { id, success: recovered };
            }
          });

          await Promise.allSettled(resumeOperations);
        }

        trackStoreOperation("globalVideoStore", "resumeVideosForTab", Date.now() - t0);
      },

      setCurrentTab: (tabName) => {
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

      // Comment 7: Improved state derivation logic
      updatePlayerState: (id, state) => {
        const { videoPlayers, playersMeta } = get();
        const playerRef = videoPlayers.get(id);

        if (playerRef) {
          const newPlayers = new Map(videoPlayers);
          const updatedRef: VideoPlayerRef = {
            ...playerRef,
            playbackState: { ...playerRef.playbackState, ...state },
            lastActivity: Date.now(),
          };

          // Only derive state when both values are meaningful
          if (
            state.currentTime !== undefined &&
            state.duration !== undefined &&
            state.currentTime > 0 &&
            state.duration > 0
          ) {
            updatedRef.state = state.currentTime > 0 ? VideoPlayerState.Playing : VideoPlayerState.Idle;
          }

          newPlayers.set(id, updatedRef);

          set({
            videoPlayers: newPlayers,
            playersMeta: {
              ...playersMeta,
              [id]: {
                ...playersMeta[id],
                isPlaying: state.isPlaying ?? playersMeta[id]?.isPlaying ?? false,
              },
            },
          });
        } else {
          set({
            playersMeta: {
              ...playersMeta,
              [id]: {
                ...playersMeta[id],
                isPlaying: state.isPlaying ?? false,
              },
            },
          });
        }
      },

      recoverPlayer: async (id) => {
        const { videoPlayers, playersMeta } = get();
        const playerRef = videoPlayers.get(id);

        if (!playerRef?.player) return false;

        const metadata = playersMeta[id];
        if (metadata?.recoveryAttempts >= 3) {
          return false; // Too many recovery attempts
        }

        try {
          const playerInstance = playerRef.player as any;
          if (typeof playerInstance?.reset === "function") {
            await playerInstance.reset();
          }

          // Update recovery metrics
          set({
            playersMeta: {
              ...playersMeta,
              [id]: {
                ...metadata,
                recoveryAttempts: (metadata?.recoveryAttempts || 0) + 1,
                lastRecoveryTime: Date.now(),
              },
            },
          });

          get().updateErrorMetrics("recovery", true);
          return true;
        } catch (error) {
          get().updateErrorMetrics("recovery", false);

          const message = error instanceof Error ? error.message : String(error);

          if (error instanceof BaseVideoError) {
            set({
              playersMeta: {
                ...playersMeta,
                [id]: {
                  ...playersMeta[id],
                  lastError: {
                    code: error.code,
                    message,
                    severity: error.severity || VideoErrorSeverity.ERROR,
                    at: Date.now(),
                  },
                },
              },
            });
          } else {
            set({
              playersMeta: {
                ...playersMeta,
                [id]: {
                  ...playersMeta[id],
                  lastError: {
                    code: VideoErrorCode.Unknown,
                    message,
                    severity: VideoErrorSeverity.ERROR,
                    at: Date.now(),
                  },
                },
              },
            });
          }
          return false;
        }
      },

      cleanupStalePlayers: async () => {
        const { videoPlayers } = get();
        const now = Date.now();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes

        const stalePlayerIds: string[] = [];

        videoPlayers.forEach((playerRef, id) => {
          if (now - playerRef.lastActivity > staleThreshold) {
            stalePlayerIds.push(id);
          }
        });

        for (const id of stalePlayerIds) {
          await get().unregisterVideoPlayer(id);
        }
      },

      updateErrorMetrics: (type, success) => {
        const { errorMetrics } = get();
        const newMetrics = { ...errorMetrics };

        switch (type) {
          case "disposal":
            if (!success) newMetrics.disposalErrors++;
            break;
          case "recovery":
            if (success) newMetrics.recoverySuccesses++;
            break;
          case "general":
            if (!success) newMetrics.totalErrors++;
            break;
        }

        set({ errorMetrics: newMetrics });
      },
    }),
    {
      name: "global-video-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentTab: state.currentTab,
        playersMeta: state.playersMeta,
        errorMetrics: state.errorMetrics,
      }),
      version: 2,
    },
  ),
);

// Centralized cleanup registration with enhanced disposal
registerStoreCleanup("globalVideoStore", async () => {
  const state = useGlobalVideoStore.getState();
  const { videoPlayers } = state;

  // Clear cleanup interval
  if (state.cleanupInterval) {
    clearInterval(state.cleanupInterval);
  }

  // Comment 1: Use centralized disposal utility
  const disposalPromises = Array.from(videoPlayers.entries()).map(([id, playerRef]) =>
    disposeVideoPlayer(id, playerRef.player, {
      strategy: DisposalStrategy.FORCED,
      timeout: 100,
      retries: 1,
    }),
  );

  await Promise.allSettled(disposalPromises);

  useGlobalVideoStore.setState({
    videoPlayers: new Map(),
    cleanupInterval: undefined,
  });
});
