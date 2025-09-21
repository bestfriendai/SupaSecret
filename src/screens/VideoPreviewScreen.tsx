import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import * as Haptics from "expo-haptics";

import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { ProcessedVideo } from "../services/IAnonymiser";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import type { RootStackParamList } from "../navigation/AppNavigator";

type VideoPreviewScreenRouteProp = RouteProp<RootStackParamList, "VideoPreview">;

export default function VideoPreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoPreviewScreenRouteProp>();
  const { processedVideo } = route.params;

  const [isSharing, setIsSharing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [shareError, setShareError] = useState<string | null>(null);
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();
  const { addConfession } = useConfessionStore();

  // Create video player
  const player = useVideoPlayer(processedVideo.uri, (player) => {
    player.loop = true;
    if (isPlaying) {
      player.play();
    }
  });

  useEffect(() => {
    return () => {
      player?.release();
    };
  }, [player]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [player, isPlaying]);

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
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />

        {/* Play/Pause Button Overlay */}
        <Pressable
          style={styles.playPauseOverlay}
          onPress={togglePlayPause}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
        >
          <View style={styles.playPauseButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#ffffff" />
          </View>
        </Pressable>

        {/* Expo Go Privacy Overlay */}
        {IS_EXPO_GO && (
          <View style={styles.privacyOverlay}>
            <View style={styles.privacyBadge}>
              <Ionicons name="eye-off" size={16} color="#ffffff" />
              <Text style={styles.privacyText}>Face Blur Applied</Text>
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

          {IS_EXPO_GO && (
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.featureText}>Face blur applied</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.featureText}>Voice change applied</Text>
              </View>
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
});
