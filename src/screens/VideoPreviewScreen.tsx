import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Responsive spacing based on screen size
const getResponsiveControlSpacing = () => {
  if (SCREEN_HEIGHT < 700) {
    return { bottomPadding: 20, topPadding: 24 };
  } else if (SCREEN_HEIGHT < 800) {
    return { bottomPadding: 28, topPadding: 28 };
  } else if (SCREEN_HEIGHT < 900) {
    return { bottomPadding: 32, topPadding: 32 };
  } else {
    return { bottomPadding: 40, topPadding: 36 };
  }
};

import * as Haptics from "expo-haptics";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import {
  downloadVideoToGallery,
  showDownloadSuccessMessage,
  showDownloadErrorMessage,
  checkMediaLibraryPermissions,
} from "../services/VideoDownloadService";
import { isPostProcessBlurAvailable } from "../services/PostProcessBlurService";
import { burnCaptionsAndWatermarkIntoVideo } from "../../modules/caption-burner";
import { loadCaptionData } from "../services/CaptionGenerator";

import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { ProcessedVideo } from "../services/IAnonymiser";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { applyPostProcessBlur, getBlurProcessingMethod } from "../services/PostProcessBlurService";
import { TikTokCaptions, TIKTOK_CAPTION_STYLES } from "../components/TikTokCaptions";
import { VideoWatermark } from "../components/VideoWatermark";

type VideoPreviewScreenRouteProp = RouteProp<RootStackParamList, "VideoPreview">;

// Emoji mapping for privacy modes
type EmojiType = "mask" | "sunglasses" | "blur" | "robot" | "incognito";
const EMOJI_MAP: Record<EmojiType, string> = {
  mask: "😷",
  sunglasses: "🕶️",
  blur: "🌫️",
  robot: "🤖",
  incognito: "🥸",
};

export default function VideoPreviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoPreviewScreenRouteProp>();
  const { processedVideo } = route.params;
  const insets = useSafeAreaInsets();
  const spacing = getResponsiveControlSpacing();

  const [isSharing, setIsSharing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isBlurAvailable, setIsBlurAvailable] = useState(false);
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();
  const { addConfession } = useConfessionStore();
  const hasStartedPlayingRef = useRef(false);
  const playerStatusRef = useRef<string>("idle");

  const [isBlurring, setIsBlurring] = useState(false);
  const [blurProgress, setBlurProgress] = useState(0);
  const [hasBlurApplied, setHasBlurApplied] = useState(processedVideo.faceBlurApplied || false);
  const [currentVideoUri, setCurrentVideoUri] = useState(processedVideo.uri);
  const originalVideoUri = useRef(processedVideo.uri); // Store original URI for caption lookup

  // Caption state
  const [isAddingCaptions, setIsAddingCaptions] = useState(false);
  const [captionProgress, setCaptionProgress] = useState(0);
  const [hasCaptionsApplied, setHasCaptionsApplied] = useState(false);
  const [captionSegments, setCaptionSegments] = useState<any[]>([]);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentCaptionSegment, setCurrentCaptionSegment] = useState<any>(null);

  // Validate video URI format
  const videoUri = currentVideoUri.startsWith("file://") ? currentVideoUri : `file://${currentVideoUri}`;

  console.log("📹 VideoPreviewScreen - Video URI:", videoUri);

  // Check blur availability on mount
  useEffect(() => {
    isPostProcessBlurAvailable().then(setIsBlurAvailable);
  }, []);

  // Reset hasStartedPlayingRef when video URI changes
  useEffect(() => {
    hasStartedPlayingRef.current = false;
    setIsLoading(true);
    setVideoError(null);
  }, [videoUri]);

  // Create video player
  const player = useVideoPlayer(videoUri, (player) => {
    console.log("🎬 Video player initialized with URI:", videoUri);
    player.loop = true;
    player.muted = false;
  });

  // Monitor player status
  useEventListener(player, "statusChange", (event) => {
    if (!event) return;
    const { status, error } = event;
    console.log("📊 Player status changed:", status);
    playerStatusRef.current = status;

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

  // Update current caption segment based on video time
  useEffect(() => {
    if (!showCaptions || captionSegments.length === 0) {
      setCurrentCaptionSegment(null);
      return;
    }

    const interval = setInterval(() => {
      const currentTime = player.currentTime;
      const segment = captionSegments.find((seg: any) => currentTime >= seg.startTime && currentTime <= seg.endTime);
      setCurrentCaptionSegment(segment || null);
    }, 100); // Update every 100ms for smooth caption sync

    return () => clearInterval(interval);
  }, [showCaptions, captionSegments, player]);

  // Loading timeout - reset whenever loading state changes
  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      if (isLoading && playerStatusRef.current !== "readyToPlay") {
        console.warn("⏱️ Video loading timed out");
        setVideoError("Video loading timed out");
        setIsLoading(false);
      }
    }, 15000); // 15 seconds (increased from 10)

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Validate video file exists
  useEffect(() => {
    const validateVideo = async () => {
      try {
        const fileUri = videoUri.replace("file://", "");
        const file = new File(fileUri);
        const exists = file.exists; // Property, not method
        const size = exists ? file.size : 0;

        console.log("📁 Video file info:", { exists, size });

        if (!exists) {
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
        try {
          if (player && playerStatusRef.current === "readyToPlay") {
            player.pause();
          }
        } catch (error) {
          // Player reference may be invalid after video URI change, ignore
          console.log("Player cleanup error (expected after blur):", error);
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
      // Use currentVideoUri which contains the blurred video path if blur was applied
      let finalVideoUri = currentVideoUri;

      console.log("📤 ========== SHARE VIDEO DEBUG ==========");
      console.log("📤 currentVideoUri:", currentVideoUri);
      console.log("📤 originalVideoUri:", originalVideoUri.current);
      console.log("🎭 hasBlurApplied:", hasBlurApplied);
      console.log("📝 hasCaptionsApplied:", hasCaptionsApplied);
      console.log("📝 processedVideo.transcription exists:", !!processedVideo.transcription);
      console.log("📤 Are URIs different? (blur applied):", currentVideoUri !== originalVideoUri.current);
      console.log("📤 ========================================");

      // CRITICAL CHECK: If blur is supposed to be applied but URIs are the same, something went wrong!
      if (hasBlurApplied && currentVideoUri === originalVideoUri.current) {
        console.error("❌ CRITICAL ERROR: hasBlurApplied is true but video URI hasn't changed!");
        console.error("❌ This means blur was not actually applied to the video file.");
        console.error("❌ currentVideoUri:", currentVideoUri);
        console.error("❌ originalVideoUri:", originalVideoUri.current);

        Alert.alert(
          "Blur Error Detected",
          "The face blur may not have been properly applied. The video will be uploaded without blur. Please try applying blur again.",
          [
            {
              text: "Cancel Upload",
              style: "cancel",
              onPress: () => {
                setIsSharing(false);
                setUploadProgress(0);
              },
            },
            {
              text: "Upload Anyway",
              style: "destructive",
              onPress: () => {
                // Continue with upload
              },
            },
          ]
        );
        // Don't return here - let user choose
      }

      // CAPTION BURNING DISABLED - Captions will be shown as overlay during playback
      // Just use the current video (with blur if applied)
      console.log("📹 Using video without burning captions:", currentVideoUri);
      setUploadProgress(10);

      console.log("📤 Uploading video:", finalVideoUri);

      const confessionPayload = {
        type: "video" as const,
        content: "Anonymous video confession",
        videoUri: finalVideoUri,
        transcription: processedVideo.transcription,
        isAnonymous: true,
        faceBlurApplied: hasBlurApplied, // Use current blur state, not original
        voiceChangeApplied: processedVideo.voiceChangeApplied ?? false,
        duration: processedVideo.duration,
        likes: 0,
        views: 0,
        isLiked: false,
      };

      console.log("🎬 Final upload payload:", {
        hasBlur: confessionPayload.faceBlurApplied,
        hasCaptions: !!confessionPayload.transcription,
        videoUri: confessionPayload.videoUri,
      });

      await addConfession(confessionPayload, {
        onUploadProgress: (progress: number) => {
          // Map progress from 10-100%
          const adjustedProgress = 10 + progress * 0.9;
          setUploadProgress(adjustedProgress);
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
  }, [
    isSharing,
    currentVideoUri,
    hasBlurApplied,
    processedVideo,
    addConfession,
    hapticsEnabled,
    impactAsync,
    navigation,
  ]);

  const handleBlurFaces = useCallback(async () => {
    if (isBlurring || hasBlurApplied) return;

    setIsBlurring(true);
    setBlurProgress(0);

    try {
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      console.log("🎭 Starting face blur processing...");

      // Import blur service
      const { applyPostProcessBlur } = await import("../services/PostProcessBlurService");

      const result = await applyPostProcessBlur(videoUri, {
        blurIntensity: 50, // Consistent with other blur implementations
        onProgress: (progress, status) => {
          console.log(`🎭 Blur progress: ${progress}% - ${status}`);
          setBlurProgress(progress);
        },
      });

      if (result.success && result.processedVideoUri) {
        console.log("✅ ========== BLUR APPLIED SUCCESSFULLY ==========");
        console.log("✅ Input video (original):", videoUri);
        console.log("✅ Output video (blurred):", result.processedVideoUri);
        console.log("✅ Updating currentVideoUri state to blurred video...");
        console.log("✅ ================================================");

        // Pause current player before changing video
        try {
          if (player) {
            player.pause();
          }
        } catch (e) {
          // Ignore player errors
        }

        setIsPlaying(false);
        setCurrentVideoUri(result.processedVideoUri);
        setHasBlurApplied(true);

        // ✅ Update processedVideo object to keep it in sync
        processedVideo.uri = result.processedVideoUri;
        processedVideo.faceBlurApplied = true;

        console.log("✅ State updated! currentVideoUri should now point to blurred video");
        console.log("✅ When you click Share, this blurred video should be used");

        if (hapticsEnabled) {
          await impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        Alert.alert(
          "Success",
          "Face blur has been applied to your video! 🎭\n\nThe video now has a pixelated privacy effect.",
        );
      } else {
        throw new Error(result.error || "Blur processing failed");
      }
    } catch (error) {
      console.error("❌ Face blur failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to apply face blur";

      Alert.alert(
        "Blur Failed",
        errorMessage + "\n\nYou can still upload the video and blur will be applied server-side.",
        [{ text: "OK" }],
      );
    } finally {
      setIsBlurring(false);
      setBlurProgress(0);
    }
  }, [isBlurring, hasBlurApplied, videoUri, hapticsEnabled, impactAsync]);

  const handleAddCaptions = useCallback(async () => {
    if (isAddingCaptions || hasCaptionsApplied) return;

    setIsAddingCaptions(true);
    setCaptionProgress(0);

    try {
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      console.log("📝 Starting caption processing...");
      setCaptionProgress(10);

      // Get AssemblyAI API key
      const ASSEMBLYAI_API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY;

      if (!ASSEMBLYAI_API_KEY || ASSEMBLYAI_API_KEY === "your_assemblyai_api_key_here") {
        throw new Error(
          "AssemblyAI API key not configured. Please add EXPO_PUBLIC_ASSEMBLYAI_API_KEY to your .env file.",
        );
      }

      console.log("🎤 Extracting audio from video...");
      setCaptionProgress(20);

      // Step 1: Extract audio from video using expo-av
      const { Audio } = await import("expo-av");

      // Load the video to extract audio
      const { sound } = await Audio.Sound.createAsync({ uri: videoUri }, { shouldPlay: false });

      // Get audio URI (the video file itself contains audio)
      // AssemblyAI can process video files directly and extract audio
      console.log("🎤 Uploading audio to AssemblyAI...");
      setCaptionProgress(30);

      // Step 2: Upload audio to AssemblyAI (using video file, AssemblyAI extracts audio)
      const videoFile = await fetch(videoUri);
      const videoBlob = await videoFile.blob();

      const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/octet-stream",
        },
        body: videoBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json();
      console.log("✅ Audio uploaded:", upload_url);
      setCaptionProgress(45);

      // Cleanup sound
      await sound.unloadAsync();

      // Step 3: Request transcription with word-level timestamps
      console.log("🎤 Requesting transcription...");
      const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          audio_url: upload_url,
          word_boost: ["um", "uh", "like", "you know"],
          format_text: true,
          punctuate: true,
          language_detection: true, // Auto-detect language
        }),
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
      }

      const { id: transcriptId } = await transcriptResponse.json();
      console.log("📝 Transcription ID:", transcriptId);
      setCaptionProgress(55);

      // Step 4: Poll for completion (faster polling for better UX)
      console.log("⏳ Processing transcription...");
      let transcript;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll every 3 seconds (faster)

        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: { authorization: ASSEMBLYAI_API_KEY },
        });

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        transcript = await statusResponse.json();

        if (transcript.status === "completed") {
          console.log("✅ Transcription completed!");
          break;
        } else if (transcript.status === "error") {
          throw new Error(transcript.error || "Transcription failed");
        }

        // Update progress (55% to 95% during polling)
        const pollProgress = 55 + (attempts / maxAttempts) * 40;
        setCaptionProgress(pollProgress);

        console.log(`⏳ Status: ${transcript.status} (${Math.round(pollProgress)}%)`);

        attempts++;
      }

      if (transcript.status !== "completed") {
        throw new Error("Transcription timed out after 3 minutes");
      }

      setCaptionProgress(95);
      console.log("📝 Transcription text:", transcript.text);
      console.log("📝 Word count:", transcript.words?.length || 0);

      // Process words into caption segments (8-10 words per segment for TikTok style)
      const words = transcript.words || [];
      const segments = [];
      const wordsPerSegment = 8;

      for (let i = 0; i < words.length; i += wordsPerSegment) {
        const segmentWords = words.slice(i, i + wordsPerSegment);
        segments.push({
          id: `segment_${i}`,
          text: segmentWords.map((w: any) => w.text).join(" "),
          startTime: segmentWords[0].start / 1000, // Convert to seconds
          endTime: segmentWords[segmentWords.length - 1].end / 1000,
          isComplete: true,
          words: segmentWords.map((w: any) => ({
            word: w.text,
            startTime: w.start / 1000,
            endTime: w.end / 1000,
            confidence: w.confidence,
            isComplete: true,
          })),
        });
      }

      console.log("📝 Created caption segments:", segments.length);
      console.log("📝 Sample segment:", segments[0]);

      // ✅ Store caption segments as JSON (with word-level timing) instead of plain text
      // This allows captions to display on videos when people watch them
      processedVideo.transcription = JSON.stringify(segments);

      setCaptionSegments(segments);

      // ✅ DON'T burn captions into video by default - keep them as overlays (like TikTok)
      // Captions will appear on top of the video while playing
      console.log("✅ Captions will be shown as overlays on top of the video");

      setCaptionProgress(100);
      setHasCaptionsApplied(true);
      setShowCaptions(true);

      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      Alert.alert(
        "Success! 📝",
        `Captions added successfully!\n\n"${transcript.text.substring(0, 100)}${transcript.text.length > 100 ? "..." : ""}"\n\nCaptions will appear on your video like TikTok when people watch it!`,
      );
    } catch (error) {
      console.error("❌ Caption processing failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add captions";

      Alert.alert("Caption Processing Failed", errorMessage + "\n\nYou can still upload the video without captions.", [
        { text: "OK" },
      ]);
    } finally {
      setIsAddingCaptions(false);
      setCaptionProgress(0);
    }
  }, [isAddingCaptions, hasCaptionsApplied, videoUri, processedVideo, hapticsEnabled, impactAsync]);

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

  const handleDownload = useCallback(async () => {
    try {
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      // Check if we have media library permissions
      const hasPermission = await checkMediaLibraryPermissions();
      if (!hasPermission) {
        setIsDownloading(false);
        Alert.alert("Permission Required", "To save your blurred video, we need access to your photo library.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Grant Permission",
            onPress: async () => {
              setIsDownloading(true);
              await handleDownloadWithPermission();
            },
          },
        ]);
        return;
      }

      await handleDownloadWithPermission();
    } catch (error) {
      console.error("Download error:", error);
      setIsDownloading(false);
      showDownloadErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }, [hapticsEnabled, impactAsync, currentVideoUri]);

  const handleDownloadWithPermission = useCallback(async () => {
    try {
      const result = await downloadVideoToGallery(currentVideoUri, {
        onProgress: (progress, message) => {
          setDownloadProgress(progress);
          console.log(`Download progress: ${progress}% - ${message}`);
        },
        albumName: "Toxic Confessions",
        videoUri: originalVideoUri.current, // Pass original URI for caption lookup
      });

      setIsDownloading(false);

      if (result.success) {
        if (hapticsEnabled) {
          await impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // Show specific success message based on whether blur was applied
        const message = hasBlurApplied
          ? 'Your blurred video has been saved to your photo gallery in the "Toxic Confessions" album. 🎭'
          : 'Your video has been saved to your photo gallery in the "Toxic Confessions" album. 📱';

        Alert.alert("Video Saved! 📱", message, [{ text: "Great!", style: "default" }]);
      } else {
        showDownloadErrorMessage(result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Download with permission error:", error);
      setIsDownloading(false);
      showDownloadErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }, [currentVideoUri, hapticsEnabled, impactAsync]);

  return (
    <View style={styles.container}>
      {/* Full-Screen Video Player */}
      <View style={styles.videoContainer}>
        {/* Always show video player unless there's an error */}
        {!videoError && (
          <>
            <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />

            {/* TikTok-Style Captions Overlay - Positioned on TOP of video */}
            {showCaptions && captionSegments.length > 0 && (
              <TikTokCaptions
                segments={captionSegments}
                currentSegment={currentCaptionSegment}
                style={TIKTOK_CAPTION_STYLES[0]}
                position="bottom"
              />
            )}

            {/* Watermark Overlay - Always visible on every video */}
            <VideoWatermark position="top-right" size="medium" />
          </>
        )}

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
                {processedVideo.privacyMode === "emoji" && processedVideo.emojiType
                  ? `${EMOJI_MAP[processedVideo.emojiType as EmojiType]} Privacy`
                  : processedVideo.privacyMode === "blur"
                    ? "Face Blur Applied"
                    : "Privacy Applied"}
              </Text>
            </View>
          </View>
        )}

        {/* Blur Progress Overlay */}
        {isBlurring && (
          <View style={styles.uploadProgressOverlay}>
            <View style={styles.uploadProgressContainer}>
              <Text style={styles.uploadProgressText}>Blurring faces... {Math.round(blurProgress)}%</Text>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${blurProgress}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* Download Progress Overlay */}
        {isDownloading && (
          <View style={styles.uploadProgressOverlay}>
            <View style={styles.uploadProgressContainer}>
              <Text style={styles.uploadProgressText}>Saving to gallery... {Math.round(downloadProgress)}%</Text>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${downloadProgress}%` }]} />
              </View>
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
        {/* Bottom Controls Overlay - Floating on video */}
        <View
          style={[
            styles.bottomControlsOverlay,
            {
              paddingBottom: Math.max(spacing.bottomPadding, insets.bottom + 20),
              paddingTop: spacing.topPadding,
              paddingHorizontal: SCREEN_WIDTH < 375 ? 16 : 20,
            },
          ]}
        >
          {/* COMPACT FEATURE ROW */}
          <View style={styles.featureRow}>
            {/* Blur Faces */}
            {!hasBlurApplied && !isBlurring && isBlurAvailable && (
              <Pressable
                style={styles.miniFeatureButton}
                onPress={handleBlurFaces}
                disabled={isSharing || isDownloading || isAddingCaptions}
              >
                <Ionicons name="eye-off" size={18} color="#8B5CF6" />
                <Text style={styles.miniFeatureText}>Blur</Text>
              </Pressable>
            )}

            {hasBlurApplied && (
              <View style={styles.miniFeatureButtonActive}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.miniFeatureTextActive}>Blurred</Text>
              </View>
            )}

            {/* Add Captions */}
            {!hasCaptionsApplied && !isAddingCaptions && (
              <Pressable
                style={styles.miniFeatureButton}
                onPress={handleAddCaptions}
                disabled={isSharing || isDownloading || isBlurring}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#3B82F6" />
                <Text style={styles.miniFeatureText}>Captions</Text>
              </Pressable>
            )}

            {hasCaptionsApplied && (
              <Pressable
                style={[styles.miniFeatureButton, showCaptions && styles.miniFeatureButtonActive]}
                onPress={() => setShowCaptions(!showCaptions)}
              >
                <Ionicons
                  name={showCaptions ? "eye" : "eye-off"}
                  size={16}
                  color={showCaptions ? "#22C55E" : "#8B98A5"}
                />
                <Text style={showCaptions ? styles.miniFeatureTextActive : styles.miniFeatureText}>
                  {showCaptions ? "CC On" : "CC Off"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Caption Progress Overlay */}
          {isAddingCaptions && (
            <View style={styles.uploadProgressOverlay}>
              <View style={styles.uploadProgressContainer}>
                <Text style={styles.uploadProgressText}>Adding captions... {Math.round(captionProgress)}%</Text>
                <View style={styles.uploadProgressBar}>
                  <View style={[styles.uploadProgressFill, { width: `${captionProgress}%` }]} />
                </View>
              </View>
            </View>
          )}

          {/* Error Message */}
          {shareError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{shareError}</Text>
            </View>
          )}

          {/* Action Buttons - Compact Grid */}
          <View style={styles.actionGrid}>
            {/* Share Button - Full Width */}
            <Pressable
              style={[styles.compactPrimaryButton, (isSharing || isBlurring || isDownloading) && styles.buttonDisabled]}
              onPress={handleShare}
              disabled={isSharing || isBlurring || isDownloading}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="share" size={20} color="#ffffff" />
              )}
              <Text style={styles.compactPrimaryText}>{isSharing ? "Sharing..." : "Share"}</Text>
            </Pressable>

            {/* Secondary Actions - 3 Columns */}
            <View style={styles.compactSecondaryRow}>
              <Pressable
                style={[styles.compactSecondaryButton, styles.retakeButton]}
                onPress={handleRetake}
                disabled={isSharing || isBlurring || isDownloading}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
                <Text style={styles.compactSecondaryText}>Retake</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.compactSecondaryButton,
                  styles.downloadButton,
                  (isSharing || isBlurring || isDownloading) && styles.buttonDisabled,
                ]}
                onPress={handleDownload}
                disabled={isSharing || isBlurring || isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download" size={18} color="#ffffff" />
                )}
                <Text style={styles.compactSecondaryText}>{isDownloading ? "..." : "Save"}</Text>
              </Pressable>

              <Pressable
                style={[styles.compactSecondaryButton, styles.discardButton]}
                onPress={handleDiscard}
                disabled={isSharing || isBlurring || isDownloading}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.compactSecondaryText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  bottomControlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  featureRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  miniFeatureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  miniFeatureButtonActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  miniFeatureText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  miniFeatureTextActive: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "600",
  },
  actionGrid: {
    gap: 8,
  },
  compactPrimaryButton: {
    backgroundColor: "#1D9BF0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  compactPrimaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  compactSecondaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  compactSecondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  compactSecondaryText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  featurePills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  featurePillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  featurePillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  mainActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1D9BF0",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
    shadowColor: "#1D9BF0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  iconActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  retakeButton: {
    backgroundColor: "#374151",
  },
  downloadButton: {
    backgroundColor: "#10B981",
  },
  discardButton: {
    backgroundColor: "#EF4444",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  blurSection: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  infoSection: {
    backgroundColor: "#1E3A8A",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#BFDBFE",
    textAlign: "center",
    lineHeight: 20,
  },
  blurSectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  blurSectionSubtitle: {
    fontSize: 14,
    color: "#E9D5FF",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  bigBlurButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bigBlurButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B5CF6",
  },
  blurNote: {
    fontSize: 12,
    color: "#E9D5FF",
    marginTop: 12,
    textAlign: "center",
  },
  captionSection: {
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captionSectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  captionSectionSubtitle: {
    fontSize: 14,
    color: "#DBEAFE",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  bigCaptionButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bigCaptionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  captionNote: {
    fontSize: 12,
    color: "#DBEAFE",
    marginTop: 12,
    textAlign: "center",
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
