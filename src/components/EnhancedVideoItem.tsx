import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import { Audio } from "expo-av";
import { format } from "date-fns";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import { useGlobalVideoStore } from "../state/globalVideoStore";
import AnimatedActionButton from "./AnimatedActionButton";
import { useVideoPlayer } from "expo-video";

const { height: screenHeight } = Dimensions.get("window");

interface EnhancedVideoItemProps {
  confession: any;
  isActive: boolean;
  onClose: () => void;
  onCommentPress?: (confessionId: string) => void;
  onSharePress?: (confessionId: string, confessionText: string) => void;
  onSavePress?: (confessionId: string) => void;
  onReportPress?: (confessionId: string, confessionText: string) => void;
  forceUnmuted?: boolean; // Override user sound preference for video tab
  screenFocused?: boolean; // New: explicitly pause/mute on tab blur
}

export default function EnhancedVideoItem({
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
  const { impactAsync } = usePreferenceAwareHaptics();
  const wasPlayingRef = useRef(false);

  const sourceUri =
    confession.videoUri || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const soundEnabled = useConfessionStore((state) => state.userPreferences.soundEnabled);

  // Debug log for sound preferences
  if (__DEV__) {
    console.log(`EnhancedVideoItem: soundEnabled=${soundEnabled}, isActive=${isActive}`);
  }

  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
    // Use forceUnmuted for video tab, otherwise respect user preference
    p.muted = forceUnmuted ? false : !soundEnabled;
    if (__DEV__) {
      console.log(`Video player created for ${confession.id}: soundEnabled=${soundEnabled}, forceUnmuted=${forceUnmuted}, muted=${p.muted}`);
    }
  });

  // Register video player with global store
  useEffect(() => {
    if (player) {
      registerVideoPlayer(confession.id, player);
      return () => {
        unregisterVideoPlayer(confession.id);
      };
    }
  }, [player, confession.id, registerVideoPlayer, unregisterVideoPlayer]);

  // React to sound preference changes
  useEffect(() => {
    try {
      if (player) {
        // Use forceUnmuted for video tab, otherwise respect user preference
        const shouldBeMuted = forceUnmuted ? false : !soundEnabled;
        player.muted = shouldBeMuted;
        if (__DEV__) {
          console.log(`Video ${confession.id}: soundEnabled=${soundEnabled}, forceUnmuted=${forceUnmuted}, muted=${player.muted}, shouldBeMuted=${shouldBeMuted}`);
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("Failed to update mute state:", e);
    }
  }, [soundEnabled, player, confession.id, forceUnmuted]);

  // Control playback based on visibility and ensure audio is properly set
  useEffect(() => {
    const handleVideoActivation = async () => {
      try {
        if (isActive && screenFocused) {
          if (__DEV__) {
            console.log(`Video ${confession.id}: Playing - isActive=${isActive}, screenFocused=${screenFocused}`);
          }
          // Ensure audio session is active when video becomes active
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: false,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
          } catch (audioError) {
            if (__DEV__) console.warn("Failed to set audio mode:", audioError);
          }

          // Ensure audio is enabled when video becomes active
          if (player) {
            // Use forceUnmuted for video tab, otherwise respect user preference
            player.muted = forceUnmuted ? false : !soundEnabled;

            if (typeof player.play === "function") {
              player.play();
              wasPlayingRef.current = true;
              updatePlayerState(confession.id, true);
            }

            // Additional check after a short delay to ensure audio is working
            setTimeout(() => {
              if (player && (forceUnmuted || soundEnabled)) {
                player.muted = false;
                if (__DEV__) {
                  console.log(`Force unmuted video ${confession.id}: muted=${player.muted}, forceUnmuted=${forceUnmuted}`);
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
      }
    };

    handleVideoActivation();
  }, [isActive, screenFocused, player, soundEnabled, confession.id, forceUnmuted, updatePlayerState]);

  // Handle app state changes to pause videos when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (player) {
        try {
          if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App is going to background, pause video
            if (player.playing) {
              wasPlayingRef.current = true;
              player.pause();
            }
          } else if (nextAppState === 'active' && wasPlayingRef.current && isActive) {
            // App is coming back to foreground, resume if it was playing and is active
            player.play();
          }
        } catch (e) {
          if (__DEV__) console.warn("VideoItem app state change failed:", e);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [player, isActive]);

  return (
    <View style={{
      height: screenHeight,
      width: '100%',
      backgroundColor: 'black',
      position: 'relative'
    }}>
      {/* Video Player */}
      <VideoView
        player={player}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: screenHeight,
          backgroundColor: 'black'
        }}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Tap to toggle play/pause and unmute */}
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
        onPress={() => {
          try {
            if (player) {
              if (player.playing) {
                player.pause();
              } else {
                // When resuming, ensure audio is enabled based on forceUnmuted or user preference
                if (forceUnmuted || soundEnabled) {
                  player.muted = false;
                }
                player.play();
              }
              impactAsync();
            }
          } catch (e) {
            if (__DEV__) console.warn("Video tap handler failed:", e);
          }
        }}
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
              <Pressable
                className="bg-black/50 rounded-full p-2"
                onPress={() => {
                  try {
                    if (player) {
                      const newMutedState = !player.muted;
                      player.muted = newMutedState;
                      impactAsync();
                      if (__DEV__) {
                        console.log(`Manual audio toggle for ${confession.id}: muted=${newMutedState}`);
                      }
                    }
                  } catch (e) {
                    if (__DEV__) console.warn("Failed to toggle audio:", e);
                  }
                }}
              >
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
            isActive={confession.isLiked}
            onPress={() => {
              toggleLike(confession.id);
              impactAsync();
            }}
          />

          <AnimatedActionButton
            icon="chatbubble-outline"
            label="Reply"
            onPress={() => {
              onCommentPress?.(confession.id);
              impactAsync();
            }}
          />

          <AnimatedActionButton
            icon="share-outline"
            label="Share"
            onPress={() => {
              onSharePress?.(confession.id, confession.transcription || confession.content || "");
              impactAsync();
            }}
          />

          <AnimatedActionButton
            icon={isSaved(confession.id) ? "bookmark" : "bookmark-outline"}
            label="Save"
            isActive={isSaved(confession.id)}
            onPress={async () => {
              if (onSavePress) {
                onSavePress(confession.id);
              } else {
                try {
                  if (isSaved(confession.id)) {
                    await unsaveConfession(confession.id);
                  } else {
                    await saveConfession(confession.id);
                  }
                } catch (error) {
                  console.error('Failed to toggle save:', error);
                }
              }
              impactAsync();
            }}
          />

          <AnimatedActionButton
            icon="flag-outline"
            label="Report"
            onPress={() => {
              onReportPress?.(confession.id, confession.transcription || confession.content || "");
              impactAsync();
            }}
          />
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
                  <Text className="text-gray-400 text-13">{format(new Date(confession.timestamp), "MMM d")}</Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="eye-off" size={12} color="#10B981" />
                  <Text className="text-green-500 text-11 ml-1">Face blurred</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <Ionicons name="volume-off" size={12} color="#10B981" />
                  <Text className="text-green-500 text-11 ml-1">Voice changed</Text>
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
      <Pressable
        className="absolute inset-0 z-5"
        onPress={() => {
          try {
            if (player && player.playing && typeof player.pause === "function") {
              player.pause();
            } else if (player && typeof player.play === "function") {
              player.play();
            }
          } catch (e) {
            if (__DEV__) console.warn("Toggle play failed:", e);
          }
          impactAsync();
        }}
      />

      {/* Bottom Sheets */}
    </View>
  );
}
