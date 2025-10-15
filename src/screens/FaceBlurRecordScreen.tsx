/**
 * Face Blur Record Screen
 * Modern UI with 2025 design trends
 * Features: Circular progress, glassmorphism, smooth animations
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import * as Haptics from "expo-haptics";

import { usePreferenceAwareHaptics } from "../utils/haptics";
import { RecordButton, TimerDisplay, GlassButton, StatusBadge } from "../components/ModernRecordingUI";
import { TikTokCaptions, TIKTOK_CAPTION_STYLES, CaptionPosition } from "../components/TikTokCaptions";
import { CaptionStyleSelector } from "../components/CaptionStyleSelector";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const MAX_DURATION = 60;

function FaceBlurRecordScreen() {
  const navigation = useNavigation();
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();

  const cameraRef = useRef<Camera>(null);
  const mountTimeRef = useRef(Date.now());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [recordedVideoPath, setRecordedVideoPath] = useState<string | null>(null);

  // Caption system state
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState(TIKTOK_CAPTION_STYLES[0]);
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>("bottom");

  // Speech recognition
  const {
    isProcessing: isTranscribing,
    isAvailable: speechAvailable,
    segments,
    error: speechError,
    processAudioFile,
    clearResults,
    hasPermission: hasSpeechPermission,
  } = useSpeechRecognition({
    language: "en-US",
  });

  useEffect(() => {
    console.log("🎬 FaceBlurRecordScreen mounted");
    return () => {
      const lifetime = Date.now() - mountTimeRef.current;
      console.log(`🎬 FaceBlurRecordScreen unmounted after ${lifetime}ms`);
    };
  }, []);

  // Get camera device
  const device = useCameraDevice(facing);

  useEffect(() => {
    console.log("📷 Camera device:", {
      facing,
      hasDevice: !!device,
      deviceId: device?.id,
    });
  }, [device, facing]);
  // No frame processor - blur happens in preview screen
  // Request permissions
  useEffect(() => {
    (async () => {
      console.log("📸 Requesting camera permissions...");
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();
      const granted = cameraPermission === "granted" && microphonePermission === "granted";
      console.log("📸 Permissions:", { cameraPermission, microphonePermission, granted });
      setHasPermissions(granted);
    })();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      console.log("⏱️ Recording timer started");
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime % 5 === 0) {
            console.log(`⏱️ Recording time: ${newTime}s / ${MAX_DURATION}s`);
          }
          if (prev >= MAX_DURATION) {
            console.log("⏱️ Max duration reached, stopping recording");
            if (cameraRef.current) {
              cameraRef.current.stopRecording();
            }
            return prev;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        console.log("⏱️ Recording timer cleared");
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      if (hapticsEnabled) {
        await notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setIsRecording(true);
      setRecordingTime(0);

      // Clear previous transcription results
      if (captionsEnabled) {
        console.log("🎤 Preparing for post-processing transcription");
        clearResults();
      }

      console.log("🎬 Starting recording...");

      cameraRef.current.startRecording({
        onRecordingFinished: async (video) => {
          console.log("✅ Recording finished:", video.path);
          setRecordedVideoPath(video.path);
          setIsRecording(false);

          // Process audio for transcription after recording
          if (captionsEnabled && speechAvailable && hasSpeechPermission) {
            console.log("🎤 Starting post-processing transcription");
            try {
              await processAudioFile(video.path);
            } catch (error) {
              console.error("Failed to process audio for transcription:", error);
            }
          }
        },
        onRecordingError: (error) => {
          console.error("❌ Camera error:", error);
          setIsRecording(false);
        },
        // Add recording configuration to prevent AssetWriter errors
        fileType: "mov",
        videoCodec: "h264",
      });
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setIsRecording(false);
    }
  }, [
    hapticsEnabled,
    notificationAsync,
    captionsEnabled,
    speechAvailable,
    hasSpeechPermission,
    clearResults,
    processAudioFile,
  ]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      console.log("🛑 Stopping recording...");

      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      setIsRecording(false);
    }
  }, [isRecording, hapticsEnabled, impactAsync]);

  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  const handleNextPress = useCallback(async () => {
    if (!recordedVideoPath) return;

    if (hapticsEnabled) {
      await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const videoUri = recordedVideoPath.startsWith("file://") ? recordedVideoPath : `file://${recordedVideoPath}`;

    (navigation as any).navigate("VideoPreview", {
      processedVideo: {
        uri: videoUri,
        width: 1280,
        height: 720,
        duration: recordingTime,
        size: 0,
        faceBlurApplied: false, // No real-time blur in this screen - blur happens in preview
        privacyMode: "blur" as const,
      },
    });

    setTimeout(() => {
      setRecordedVideoPath(null);
      setRecordingTime(0);
    }, 500);
  }, [recordedVideoPath, recordingTime, hapticsEnabled, impactAsync, navigation]);

  // Loading/Permission states
  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D9BF0" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={48} color="#1D9BF0" />
          <Text style={styles.permissionText}>Camera and microphone permissions are required.</Text>
          <Pressable
            style={styles.button}
            onPress={async () => {
              const cameraPermission = await Camera.requestCameraPermission();
              const microphonePermission = await Camera.requestMicrophonePermission();
              setHasPermissions(cameraPermission === "granted" && microphonePermission === "granted");
            }}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        onError={(error) => {
          console.error("❌ Camera error:", error);
        }}
        onInitialized={() => {
          console.log("✅ Camera initialized");
        }}
      />

      {/* Modern UI Overlay */}
      <View style={styles.controlsOverlay}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <GlassButton icon="arrow-back" onPress={() => navigation.goBack()} />

          <View style={styles.topCenter}>
            <StatusBadge
              text={isRecording ? "Recording" : "Ready"}
              icon={isRecording ? "radio-button-on" : "camera"}
              variant={isRecording ? "error" : "info"}
            />
            {/* Speech recognition status */}
            {captionsEnabled && (
              <View style={styles.speechStatus}>
                <Text style={styles.speechStatusText}>
                  {isTranscribing
                    ? "🎤 Processing Audio"
                    : speechError
                      ? "❌ Transcription Error"
                      : isRecording
                        ? "🎬 Recording"
                        : "✅ Ready"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.topRightControls}>
            <GlassButton
              icon={captionsEnabled ? "chatbubble" : "chatbubble-outline"}
              onPress={() => setCaptionsEnabled(!captionsEnabled)}
              disabled={isRecording}
            />
            <GlassButton icon="camera-reverse" onPress={toggleCamera} disabled={isRecording} />
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {!recordedVideoPath ? (
            <View style={styles.recordingControls}>
              {/* Timer above record button */}
              {isRecording && (
                <View style={styles.timerAboveButton}>
                  <TimerDisplay seconds={recordingTime} maxSeconds={MAX_DURATION} isRecording={isRecording} />
                </View>
              )}

              <RecordButton
                isRecording={isRecording}
                onPress={isRecording ? stopRecording : startRecording}
                progress={recordingTime / MAX_DURATION}
              />

              {!isRecording && (
                <View style={styles.bottomHints}>
                  <Text style={styles.hintText}>Tap to start recording</Text>
                  {captionsEnabled && (
                    <Pressable style={styles.styleButton} onPress={() => setShowStyleSelector(!showStyleSelector)}>
                      <Text style={styles.styleButtonText}>Caption Style</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.nextControls}>
              <GlassButton icon="arrow-forward" label="Continue" onPress={handleNextPress} variant="primary" />
            </View>
          )}
        </View>
      </View>

      {/* TikTok-style Captions Overlay */}
      {captionsEnabled && segments.length > 0 && (
        <TikTokCaptions
          segments={segments}
          currentSegment={null}
          style={selectedCaptionStyle}
          position={captionPosition}
          maxLines={3}
          showConfidence={true}
        />
      )}

      {/* Caption Style Selector */}
      <CaptionStyleSelector
        visible={showStyleSelector}
        selectedStyle={selectedCaptionStyle}
        selectedPosition={captionPosition}
        onStyleChange={setSelectedCaptionStyle}
        onPositionChange={setCaptionPosition}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permissionText: {
    color: "#F9FAFB",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  topRightControls: {
    flexDirection: "row",
    gap: 8,
  },
  speechStatus: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
  },
  speechStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  centerControls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    alignItems: "center",
    gap: 16,
  },
  recordingControls: {
    alignItems: "center",
    gap: 16,
  },
  timerAboveButton: {
    marginBottom: 20,
    alignItems: "center",
  },
  nextControls: {
    width: "100%",
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomHints: {
    alignItems: "center",
    gap: 12,
  },
  styleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  styleButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default FaceBlurRecordScreen;
