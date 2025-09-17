import React, { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { View, Text, Pressable, Dimensions, AppState, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import * as Audio from "expo-audio";
import { format } from "date-fns";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { PreferenceAwareHaptics } from "../utils/haptics";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useGlobalVideoStore } from "../state/globalVideoStore";
import AnimatedActionButton from "./AnimatedActionButton";
import { useVideoPlayer } from "expo-video";
import type { Confession } from "../types/confession";
import { getViewCount } from "../utils/viewsCalculator";

const { height: screenHeight } = Dimensions.get("window");

interface EnhancedVideoItemProps {
  confession: Confession; // Keep required - we'll handle undefined at parent level
  isActive: boolean;
  onClose: () => void;
  onCommentPress?: (confessionId: string) => void;
  onSharePress?: (confessionId: string, confessionText: string) => void;
  onSavePress?: (confessionId: string) => void;
  onReportPress?: (confessionId: string, confessionText: string) => void;
  forceUnmuted?: boolean; // Override user sound preference for video tab
  screenFocused?: boolean; // New: explicitly pause/mute on tab blur
}

function EnhancedVideoItem({
  confession,
  isActive,
  onClose,
  onCommentPress,
  onSharePress,
  onSavePress,
  onReportPress,
  forceUnmuted = false,
  screenFocused = true,
}: EnhancedVideoItemProps) {
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const { isSaved, saveConfession, unsaveConfession } = useSavedStore();
  const { registerVideoPlayer, unregisterVideoPlayer, updatePlayerState } = useGlobalVideoStore();
  const wasPlayingRef = useRef(false);

  const sourceUri =
    confession.videoUri || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const soundEnabled = useConfessionStore((state) => state.userPreferences.sound_enabled);
  const previousSourceUriRef = useRef<string | null>(null);

  // Memoize formatted date and static values to avoid repeated work
  const formattedDate = useMemo(() => format(new Date(confession.timestamp), "MMM d"), [confession.timestamp]);
  const confessionText = useMemo(
    () => confession.transcription || confession.content || "",
    [confession.transcription, confession.content],
  );

  // Memoize expensive calculations
  const anonymizerInfo = useMemo(() => ({
    hasFaceBlur: confession.faceBlurApplied || false,
    hasVoiceChange: confession.voiceChangeApplied || false,
  }), [confession.faceBlurApplied, confession.voiceChangeApplied]);

  const videoStats = useMemo(() => ({
    duration: confession.duration || 0,
    viewCount: getViewCount(confession),
    isProcessed: confession.processed || false,
  }), [confession.duration, confession.processed, confession.id]);

  // Debug log for sound preferences
  if (__DEV__) {
    // keep lightweight
  }

  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
    // Use forceUnmuted for video tab, otherwise respect user preference
    p.muted = forceUnmuted ? false : !soundEnabled;
    // Enable autoplay for active videos
    if (isActive && screenFocused) {
      // Play the video (returns void in expo-video)
      try {
        p.play();
      } catch (error: any) {
        if (__DEV__) {
          console.warn(`Initial autoplay failed for ${confession.id}:`, error);
        }
      }
    }
    if (__DEV__) {
      console.log(
        `Video player created for ${confession.id}: soundEnabled=${soundEnabled}, forceUnmuted=${forceUnmuted}, muted=${p.muted}, isActive=${isActive}`,
      );
    }
  });

  // Add disposal flag to prevent race conditions
  const isDisposingRef = useRef(false);

  // Enhanced player cleanup for Hermes compatibility
  useEffect(() => {
    // Cleanup function with enhanced error handling for Hermes
    return () => {
      // Set disposal flag to prevent concurrent disposal attempts
      if (isDisposingRef.current) return;
      isDisposingRef.current = true;

      try {
        if (player) {
          // Enhanced disposal sequence for Hermes/iOS compatibility
          const disposePlayer = async () => {
            try {
              // First check if player exists and hasn't been disposed
              if (!player || isDisposingRef.current === false) return;

              // Try to safely check player state
              let isValid = false;
              try {
                // This will throw if player is disposed
                isValid = player.playing !== undefined;
              } catch (checkError: any) {
                // Player is already disposed
                if (checkError?.message?.includes('NativeSharedObjectNotFoundException') ||
                    checkError?.message?.includes('Unable to find the native shared object')) {
                  isDisposingRef.current = false;
                  return; // Already disposed, nothing to do
                }
              }

              if (isValid && typeof player.pause === 'function' && isDisposingRef.current) {
                // Pause first
                try {
                  await player.pause();
                } catch (pauseError: any) {
                  // Check if it's a disposal-related error
                  if (!pauseError?.message?.includes('NativeSharedObjectNotFoundException') &&
                      !pauseError?.message?.includes('Unable to find the native shared object')) {
                    // Only log non-disposal errors in dev
                    if (__DEV__) {
                      console.warn(`Video pause error for ${confession.id}:`, pauseError?.message);
                    }
                  }
                }

                // Small delay to ensure pause completes before disposal
                setTimeout(() => {
                  if (!isDisposingRef.current) return;
                  try {
                    // Additional cleanup if available
                    if (typeof (player as any).unload === 'function') {
                      (player as any).unload();
                    }
                  } catch (unloadError: any) {
                    // Silently ignore unload errors during cleanup
                    if (__DEV__ && !unloadError?.message?.includes('NativeSharedObject')) {
                      console.warn(`Video unload failed for ${confession.id}:`, unloadError?.message);
                    }
                  } finally {
                    isDisposingRef.current = false;
                  }
                }, 50);
              } else {
                isDisposingRef.current = false;
              }
            } catch (pauseError: any) {
              // Silently ignore disposal-related errors
              if (__DEV__ &&
                  !pauseError?.message?.includes('NativeSharedObjectNotFoundException') &&
                  !pauseError?.message?.includes('Unable to find the native shared object')) {
                console.warn(`Video pause failed during disposal for ${confession.id}:`, pauseError?.message);
              }
              isDisposingRef.current = false;
            }
          };

          // Execute disposal asynchronously to prevent blocking
          disposePlayer();
        }
      } catch (error) {
        // Silently ignore disposal errors
        // These often occur when navigating away quickly
        if (__DEV__) {
          console.warn(`Video disposal error for ${confession.id}:`, error);
        }
        isDisposingRef.current = false;
      }
    };
  }, [player, confession.id]);

  // Clean up old player when sourceUri changes
  useEffect(() => {
    const previousUri = previousSourceUriRef.current;

    if (previousUri && previousUri !== sourceUri) {
      // Source URI changed, need to clean up the old player
      unregisterVideoPlayer(confession.id);
      if (__DEV__) {
        console.log(`Cleaning up old player for ${confession.id} due to sourceUri change`);
      }
    }

    previousSourceUriRef.current = sourceUri;
  }, [sourceUri, confession.id, unregisterVideoPlayer]);

  // Register video player with global store and ensure autoplay
  useEffect(() => {
    let playTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    if (player) {
      registerVideoPlayer(confession.id, player);

      // Ensure video starts playing when it's the active item
      if (isActive && screenFocused) {
        // Small delay to ensure player is ready
        playTimer = setTimeout(() => {
          if (player && typeof player.play === "function") {
            try {
              player.play();
            } catch (error: any) {
              if (__DEV__) {
                console.warn(`Failed to autoplay video ${confession.id}:`, error);
              }
              // Retry play after a short delay
              retryTimer = setTimeout(() => {
                if (player && typeof player.play === "function") {
                  try {
                    player.play();
                  } catch (retryError) {
                    // Silently ignore retry failures
                  }
                }
              }, 100);
            }
          }
        }, 100);
      }
    }

    return () => {
      // Clear both timers to prevent memory leaks
      if (playTimer) {
        clearTimeout(playTimer);
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      unregisterVideoPlayer(confession.id);
    };
  }, [player, confession.id, registerVideoPlayer, unregisterVideoPlayer, isActive, screenFocused]);

  // React to sound preference changes
  useEffect(() => {
    try {
      if (player) {
        // Use forceUnmuted for video tab, otherwise respect user preference
        const shouldBeMuted = forceUnmuted ? false : !soundEnabled;
        player.muted = shouldBeMuted;
        if (__DEV__) {
          console.log(
            `Video ${confession.id}: soundEnabled=${soundEnabled}, forceUnmuted=${forceUnmuted}, muted=${player.muted}, shouldBeMuted=${shouldBeMuted}`,
          );
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("Failed to update mute state:", e);
    }
  }, [soundEnabled, player, confession.id, forceUnmuted]);

  // Control playback based on visibility and ensure audio is properly set
  useEffect(() => {
    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleVideoActivation = async () => {
      try {
        if (isActive && screenFocused) {
          if (__DEV__) {
            console.log(`Video ${confession.id}: Playing - isActive=${isActive}, screenFocused=${screenFocused}`);
          }
          // Ensure audio session is active when video becomes active
          try {
            await Audio.setAudioModeAsync({
              allowsRecording: false,
              shouldPlayInBackground: false,
              playsInSilentMode: true,
              interruptionModeAndroid: "duckOthers",
            });
          } catch (audioError) {
            if (__DEV__) console.warn("Failed to set audio mode:", audioError);
          }

          // Ensure audio is enabled when video becomes active
          if (player) {
            // Use forceUnmuted for video tab, otherwise respect user preference
            player.muted = forceUnmuted ? false : !soundEnabled;

            if (typeof player.play === "function") {
              // Add a small delay to ensure the player is ready
              setTimeout(() => {
                if (player && typeof player.play === "function") {
                  try {
                    player.play();
                    wasPlayingRef.current = true;
                    updatePlayerState(confession.id, true);
                    if (__DEV__) {
                      console.log(`Video ${confession.id}: Started playing`);
                    }
                  } catch (error: any) {
                    if (__DEV__) {
                      console.warn(`Failed to play video ${confession.id}:`, error);
                    }
                  }
                }
              }, 50);
            }

            // Additional check after a short delay to ensure audio is working
            timeoutId = setTimeout(() => {
              if (player && (forceUnmuted || soundEnabled)) {
                player.muted = false;
                if (__DEV__) {
                  console.log(
                    `Force unmuted video ${confession.id}: muted=${player.muted}, forceUnmuted=${forceUnmuted}`,
                  );
                }
              }
            }, 100);
          }
        } else {
          if (__DEV__) {
            console.log(`Video ${confession.id}: Pausing - isActive=${isActive}, screenFocused=${screenFocused}`);
          }
          if (player) {
            try {
              // Hard stop: pause and mute when screen loses focus or item not active
              if (typeof player.pause === "function") player.pause();
              player.muted = true;
              updatePlayerState(confession.id, false);
            } catch {}
            wasPlayingRef.current = false;
          }
        }
      } catch (e) {
        if (__DEV__) console.warn("VideoItem play/pause failed:", e);
      } finally {
        trackStoreOperation("EnhancedVideoItem", "handleActivation", Date.now() - start);
      }
    };

    handleVideoActivation();

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isActive, screenFocused, player, soundEnabled, confession.id, forceUnmuted, updatePlayerState]);

  // Handle app state changes to pause videos when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (player) {
        try {
          if (nextAppState === "background" || nextAppState === "inactive") {
            // App is going to background, pause video
            if (player.playing) {
              wasPlayingRef.current = true;
              player.pause();
            }
          } else if (nextAppState === "active" && wasPlayingRef.current && isActive) {
            // App is coming back to foreground, resume if it was playing and is active
            try {
              player.play();
            } catch (error) {
              // Silently ignore play errors when resuming from background
            }
          }
        } catch (e) {
          if (__DEV__) console.warn("VideoItem app state change failed:", e);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [player, isActive]);

  // Stable callbacks for actions with optimized dependencies
  const onPressTogglePlay = useCallback(() => {
    try {
      if (player && player.playing && typeof player.pause === "function") {
        player.pause();
      } else if (player && typeof player.play === "function") {
        try {
          player.play();
        } catch (error: any) {
          if (__DEV__) console.warn("Toggle play failed:", error);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("Toggle play failed:", e);
    }
    PreferenceAwareHaptics.impactAsync();
  }, [player]);

  const onPressToggleAudio = useCallback(() => {
    try {
      if (player) {
        const newMutedState = !player.muted;
        player.muted = newMutedState;
        PreferenceAwareHaptics.impactAsync();
        if (__DEV__) {
          console.log(`Manual audio toggle for ${confession.id}: muted=${newMutedState}`);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("Failed to toggle audio:", e);
    }
  }, [player, confession.id]);

  const onPressComment = useCallback(() => {
    onCommentPress?.(confession.id);
    PreferenceAwareHaptics.impactAsync();
  }, [onCommentPress, confession.id]);

  const onPressShare = useCallback(() => {
    onSharePress?.(confession.id, confessionText);
    PreferenceAwareHaptics.impactAsync();
  }, [onSharePress, confession.id, confessionText]);

  const onPressReport = useCallback(() => {
    onReportPress?.(confession.id, confessionText);
    PreferenceAwareHaptics.impactAsync();
  }, [onReportPress, confession.id, confessionText]);

  const onPressLike = useCallback(() => {
    toggleLike(confession.id);
    PreferenceAwareHaptics.impactAsync();
  }, [toggleLike, confession.id]);

  const onPressSave = useCallback(async () => {
    if (onSavePress) {
      onSavePress(confession.id);
      PreferenceAwareHaptics.impactAsync();
    } else {
      try {
        if (isSaved(confession.id)) {
          await unsaveConfession(confession.id);
        } else {
          await saveConfession(confession.id);
        }
      } catch {
        Alert.alert("Save Failed", "Unable to save this confession. Please try again.", [{ text: "OK" }]);
      } finally {
        PreferenceAwareHaptics.impactAsync();
      }
    }
  }, [onSavePress, confession.id, isSaved, saveConfession, unsaveConfession]);

  return (
    <View
      style={{
        height: screenHeight,
        width: "100%",
        backgroundColor: "black",
        position: "relative",
      }}
    >
      {/* Video Player */}
      <VideoView
        player={player}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: screenHeight,
          backgroundColor: "black",
        }}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Top Overlay */}
      <View className="absolute top-0 left-0 right-0 z-10">
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Pressable className="bg-black/50 rounded-full p-2" onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>

            <View className="bg-black/50 rounded-full px-3 py-1">
              <Text className="text-white text-13 font-medium">Video Secret</Text>
            </View>

            <View className="flex-row items-center space-x-2">
              {/* Audio Toggle Button */}
              <Pressable className="bg-black/50 rounded-full p-2" onPress={onPressToggleAudio}>
                <Ionicons
                  name={player?.muted ? "volume-mute" : "volume-high"}
                  size={20}
                  color={player?.muted ? "#EF4444" : "#10B981"}
                />
              </Pressable>

              <Pressable className="bg-black/50 rounded-full p-2">
                <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Right Side Actions */}
      <View className="absolute right-4 bottom-32 z-10">
        <View className="items-center space-y-6">
          <AnimatedActionButton
            icon={confession.isLiked ? "heart" : "heart-outline"}
            label="Like"
            count={confession.likes || 0}
            isActive={confession.isLiked || false}
            onPress={onPressLike}
          />

          <AnimatedActionButton icon="chatbubble-outline" label="Reply" onPress={onPressComment} />

          <AnimatedActionButton icon="share-outline" label="Share" onPress={onPressShare} />

          <AnimatedActionButton
            icon={isSaved(confession.id) ? "bookmark" : "bookmark-outline"}
            label="Save"
            isActive={isSaved(confession.id)}
            onPress={onPressSave}
          />

          <AnimatedActionButton icon="flag-outline" label="Report" onPress={onPressReport} />
        </View>
      </View>

      {/* Bottom Overlay */}
      <View className="absolute bottom-0 left-0 right-16 z-10">
        <SafeAreaView>
          <View className="px-4 pb-4">
            {/* User Info */}
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-gray-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={16} color="#8B98A5" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-bold text-15">Anonymous</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <Text className="text-gray-400 text-13">{formattedDate}</Text>
                </View>
                <View className="flex-row items-center mt-1">
                  {anonymizerInfo.hasFaceBlur && (
                    <>
                      <Ionicons name="eye-off" size={12} color="#10B981" />
                      <Text className="text-green-500 text-11 ml-1">Face blurred</Text>
                    </>
                  )}
                  {anonymizerInfo.hasFaceBlur && anonymizerInfo.hasVoiceChange && (
                    <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  )}
                  {anonymizerInfo.hasVoiceChange && (
                    <>
                      <Ionicons name="volume-off" size={12} color="#10B981" />
                      <Text className="text-green-500 text-11 ml-1">Voice changed</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Transcription */}
            {confession.transcription && (
              <Text className="text-white text-15 leading-5 mb-2">{confession.transcription}</Text>
            )}

            {/* Video Info */}
            <View className="flex-row items-center">
              <Ionicons name="videocam" size={14} color="#1D9BF0" />
              <Text className="text-blue-400 text-13 ml-1">Video confession</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tap to Play/Pause */}
      <Pressable className="absolute inset-0 z-5" onPress={onPressTogglePlay} />

      {/* Bottom Sheets */}
    </View>
  );
}

// Enhanced memo comparison with granular prop checking
const areEqual = (prev: EnhancedVideoItemProps, next: EnhancedVideoItemProps) => {
  // Handle undefined confessions
  if (!prev.confession && !next.confession) return true;
  if (!prev.confession || !next.confession) return false;

  // Quick identity check
  if (prev.confession === next.confession) return true;

  // Validate both confessions have IDs (required for uniqueness)
  if (!prev.confession.id || !next.confession.id) {
    if (__DEV__) {
      console.warn('EnhancedVideoItem: areEqual called with confession missing ID');
    }
    return false; // Force re-render for safety
  }

  // Granular property comparison to minimize re-renders
  const sameId = prev.confession.id === next.confession.id;
  const sameActivity = prev.isActive === next.isActive && prev.screenFocused === next.screenFocused;
  const sameAudioOverride = prev.forceUnmuted === next.forceUnmuted;
  const sameCounts = (prev.confession.likes || 0) === (next.confession.likes || 0);
  const sameLiked = !!prev.confession.isLiked === !!next.confession.isLiked;
  const sameUri = prev.confession.videoUri === next.confession.videoUri;
  const sameTranscription = prev.confession.transcription === next.confession.transcription;
  const sameProcessingState = prev.confession.processed === next.confession.processed;

  // Only re-render if essential props changed
  return sameId && sameActivity && sameAudioOverride && sameCounts &&
         sameLiked && sameUri && sameTranscription && sameProcessingState;
};

export default memo(EnhancedVideoItem, areEqual);
