import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";

import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";

import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { ProcessedVideo } from "../services/IAnonymiser";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import type { RootStackParamList } from "../navigation/AppNavigator";

type VideoPreviewScreenRouteProp = RouteProp<RootStackParamList, "VideoPreview">;

// Emoji mapping for privacy modes
type EmojiType = 'mask' | 'sunglasses' | 'blur' | 'robot' | 'incognito';
const EMOJI_MAP: Record<EmojiType, string> = {
  mask: '😷',
  sunglasses: '🕶️',
  blur: '🌫️',
  robot: '🤖',
  incognito: '🥸',
};

export default function VideoPreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoPreviewScreenRouteProp>();
  const { processedVideo } = route.params;

  const [isSharing, setIsSharing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();
  const { addConfession } = useConfessionStore();
  const hasStartedPlayingRef = useRef(false);

  // Validate video URI format
  const videoUri = processedVideo.uri.startsWith("file://") ? processedVideo.uri : `file://${processedVideo.uri}`;

  console.log("📹 VideoPreviewScreen - Video URI:", videoUri);

  // Create video player
  const player = useVideoPlayer(videoUri, (player) => {
    console.log("🎬 Video player initialized");
    player.loop = true;
    player.muted = false;
  });

  // Monitor player status
  useEventListener(player, "statusChange", (event) => {
    if (!event) return;
    const { status, error } = event;
    console.log("📊 Player status changed:", status);

    if (status === "error") {
      console.error("❌ Video player error:", error);
      setVideoError(error?.message ?? "Failed to load video");
      setIsLoading(false);
    } else if (status === "readyToPlay" && !hasStartedPlayingRef.current) {
      console.log("✅ Video ready to play");
      setIsLoading(false);
      setVideoError(null);
      hasStartedPlayingRef.current = true;
      player.play();
      setIsPlaying(true);
    } else if (status === "loading") {
      console.log("⏳ Video loading...");
      setIsLoading(true);
    }
  });

  // Loading timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setVideoError("Video loading timed out");
        setIsLoading(false);
      }
    }, 10000); // 10 seconds
    return () => clearTimeout(timeout);
  }, []);

  // Validate video file exists
  useEffect(() => {
    const validateVideo = async () => {
      try {
        const fileUri = videoUri.replace("file://", "");
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log("📁 Video file info:", fileInfo);

        if (!fileInfo.exists) {
          console.error("❌ Video file does not exist:", fileUri);
          setVideoError("Video file not found");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("❌ Error validating video file:", error);
        setVideoError("Failed to validate video file");
        setIsLoading(false);
      }
    };

    validateVideo();
  }, [videoUri]);

  // Handle screen focus/blur
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 VideoPreview focused");
      if (player && hasStartedPlayingRef.current) {
        player.play();
        setIsPlaying(true);
      }

      return () => {
        console.log("VideoPreview blurred");
        if (player.status === "readyToPlay") {
          player.pause();
        }
        setIsPlaying(false);
      };
    }, [player]),
  );

  const togglePlayPause = useCallback(() => {
    if (!player || isLoading || videoError) return;

    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("❌ Error toggling play/pause:", error);
    }
  }, [player, isPlaying, isLoading, videoError]);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    setShareError(null);
    setUploadProgress(0);

    try {
      const confessionPayload = {
        type: "video" as const,
        content: "Anonymous video confession",
        videoUri: processedVideo.uri,
        transcription: processedVideo.transcription,
        isAnonymous: true,
        faceBlurApplied: processedVideo.faceBlurApplied ?? true,
        voiceChangeApplied: processedVideo.voiceChangeApplied ?? true,
        duration: processedVideo.duration,
        likes: 0,
        views: 0,
        isLiked: false,
      };

      await addConfession(confessionPayload, {
        onUploadProgress: (progress: number) => {
          setUploadProgress(progress);
        },
      });

      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      Alert.alert("Video Shared!", "Your anonymous video confession has been shared successfully.", [
        {
          text: "Great",
          onPress: () => {
            // Navigate back to home or previous screen
            if (navigation.canGoBack()) {
              navigation.goBack();
              navigation.goBack(); // Go back twice to skip the record screen
            } else {
              (navigation as any).navigate("MainTabs", { screen: "Home" });
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to share video:", error);
      const message = error instanceof Error ? error.message : "Failed to share video. Please try again.";
      setShareError(message);

      Alert.alert("Share Failed", message, [
        {
          text: "Try Again",
          onPress: () => {
            setShareError(null);
            // Don't automatically retry, let user click share again
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setShareError(null);
          },
        },
      ]);
    } finally {
      setIsSharing(false);
      setUploadProgress(0);
    }
  }, [isSharing, processedVideo, addConfession, hapticsEnabled, impactAsync, navigation]);

  const handleDiscard = useCallback(() => {
    Alert.alert("Discard Video?", "Are you sure you want to discard this video? This action cannot be undone.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          if (hapticsEnabled) {
            impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          navigation.goBack();
        },
      },
    ]);
  }, [hapticsEnabled, impactAsync, navigation]);

  const handleRetake = useCallback(() => {
    if (hapticsEnabled) {
      impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  }, [hapticsEnabled, impactAsync, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {!videoError && <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />}

        {/* Loading Overlay */}
        {isLoading && !videoError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1D9BF0" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {/* Error Overlay */}
        {videoError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Video Error</Text>
            <Text style={styles.errorMessage}>{videoError}</Text>
            <Pressable style={styles.errorButton} onPress={() => navigation.goBack()}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </Pressable>
          </View>
        )}

        {/* Play/Pause Button Overlay */}
        {!isLoading && !videoError && (
          <Pressable
            style={styles.playPauseOverlay}
            onPress={togglePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
          >
            {!isPlaying && (
              <View style={styles.playPauseButton}>
                <Ionicons name="play" size={32} color="#ffffff" />
              </View>
            )}
          </Pressable>
        )}

        {/* Privacy Overlay - Shows when privacy effects are applied */}
        {processedVideo.faceBlurApplied && (
          <View style={styles.privacyOverlay}>
            <View style={styles.privacyBadge}>
              <Ionicons name="eye-off" size={16} color="#ffffff" />
              <Text style={styles.privacyText}>
                {processedVideo.privacyMode === 'emoji' && processedVideo.emojiType
                  ? `${EMOJI_MAP[processedVideo.emojiType as EmojiType]} Privacy`
                  : processedVideo.privacyMode === 'blur'
                    ? 'Face Blur Applied'
                    : 'Privacy Applied'}
              </Text>
            </View>
          </View>
        )}

        {/* Upload Progress Overlay */}
        {isSharing && uploadProgress > 0 && (
          <View style={styles.uploadProgressOverlay}>
            <View style={styles.uploadProgressContainer}>
              <Text style={styles.uploadProgressText}>Uploading... {Math.round(uploadProgress)}%</Text>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Video Preview</Text>
          <Text style={styles.subtitle}>
            {processedVideo.transcription
              ? `"${processedVideo.transcription.substring(0, 50)}${processedVideo.transcription.length > 50 ? "..." : ""}"`
              : "Your anonymous video confession"}
          </Text>

          {processedVideo.faceBlurApplied && (
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.featureText}>
                  {processedVideo.privacyMode === 'emoji' && processedVideo.emojiType
                    ? `${EMOJI_MAP[processedVideo.emojiType as EmojiType]} Emoji privacy applied`
                    : 'Face blur applied'}
                </Text>
              </View>
              {processedVideo.voiceChangeApplied && (
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.featureText}>Voice change applied</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Error Message */}
        {shareError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{shareError}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleRetake} disabled={isSharing}>
            <Ionicons name="camera" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Retake</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.dangerButton]} onPress={handleDiscard} disabled={isSharing}>
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Discard</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.primaryButton, isSharing && styles.buttonDisabled]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="share" size={20} color="#ffffff" />
            )}
            <Text style={styles.buttonText}>{isSharing ? "Sharing..." : "Share"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  video: {
    flex: 1,
  },
  privacyOverlay: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  privacyText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  controlsContainer: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoContainer: {
    marginBottom: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#8B98A5",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    color: "#8B98A5",
    fontSize: 12,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#1D9BF0",
  },
  secondaryButton: {
    backgroundColor: "#374151",
  },
  dangerButton: {
    backgroundColor: "#EF4444",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  playPauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProgressOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  uploadProgressContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    padding: 16,
  },
  uploadProgressText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  uploadProgressFill: {
    height: "100%",
    backgroundColor: "#1D9BF0",
    borderRadius: 2,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: "#8B98A5",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
