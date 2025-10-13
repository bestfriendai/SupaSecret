import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView } from "expo-camera";

import { usePreferenceAwareHaptics } from "../utils/haptics";
import { PermissionGate } from "../components/PermissionGate";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { TranscriptionOverlay } from "../components/TranscriptionOverlay";
import { ProcessedVideo } from "../services/IAnonymiser";
import { ProcessingMode } from "../hooks/useVideoRecorder";
import { useVideoCapabilities } from "../services/UnifiedVideoService";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load FaceBlurRecordScreen to prevent worklets from being loaded in Expo Go
const FaceBlurRecordScreen = lazy(() => import("./FaceBlurRecordScreen"));

const MAX_DURATION = 60; // seconds

/**
 * Unified Video Record Screen
 * Automatically uses FaceBlurApp-style Vision Camera (native builds) or Expo Camera (Expo Go)
 */
function VideoRecordScreen() {
  // Use FaceBlurApp-style Vision Camera for native builds with real-time face blur at 60+ FPS
  // Uses react-native-vision-camera-face-detector for precise contour-based face masking
  // Use Expo Camera for Expo Go with post-processing fallback
  if (!IS_EXPO_GO) {
    return (
      <Suspense
        fallback={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        }
      >
        <FaceBlurRecordScreen />
      </Suspense>
    );
  }

  // Expo Go implementation below
  return <ExpoCameraRecordScreen />;
}

/**
 * Expo Camera implementation for Expo Go
 * Uses post-processing for face blur (no real-time effects)
 */
function ExpoCameraRecordScreen() {
  const navigation = useNavigation();

  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const capabilities = useVideoCapabilities();

  const resetRef = useRef<(() => void) | null>(null);

  const [enableFaceBlur, setEnableFaceBlur] = useState(true);
  const [enableVoiceChange, setEnableVoiceChange] = useState(true);
  const [voiceEffect, setVoiceEffect] = useState<"deep" | "light">("deep");
  const [uiError, setUiError] = useState<string | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [isProcessingStarted, setIsProcessingStarted] = useState(false);

  const handleRecorderError = useCallback((message: string) => {
    setUiError(message);
  }, []);

  const handleRecordingStart = useCallback(async () => {
    setUiError(null);
    if (hapticsEnabled) {
      await notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled, notificationAsync]);

  const handleRecordingStop = useCallback((videoUri: string) => {
    console.log("Recording stopped, video saved to:", videoUri);
    setRecordedVideoUri(videoUri);
    setShowNextButton(true);
    // Don't start processing automatically - wait for user to click Next

    // Also update the UI error state to clear any previous errors
    setUiError(null);
  }, []);

  const handleProcessingComplete = useCallback(
    async (processed: ProcessedVideo) => {
      try {
        console.log("✅ Processing complete, navigating to preview:", processed);

        if (hapticsEnabled) {
          await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        resetRef.current?.();
        setShowNextButton(false);
        setRecordedVideoUri(null);
        setIsProcessingStarted(false);

        // Validate processed video
        if (!processed || !processed.uri) {
          throw new Error("Invalid processed video data");
        }

        // Navigate to preview screen
        console.log("🚀 Attempting navigation to VideoPreview...");
        (navigation as any).navigate("VideoPreview", {
          processedVideo: processed,
        });
        console.log("✅ Navigation call completed");
      } catch (error) {
        console.error("❌ Failed to navigate to preview:", error);
        const message = error instanceof Error ? error.message : "Failed to process video. Please try again.";
        setUiError(message);
        setIsProcessingStarted(false);
        setShowNextButton(true); // Allow user to try again

        Alert.alert("Processing Failed", message, [
          {
            text: "Try Again",
            onPress: () => {
              setUiError(null);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              // Reset to initial state
              setRecordedVideoUri(null);
              setShowNextButton(false);
            },
          },
        ]);
      }
    },
    [hapticsEnabled, impactAsync, navigation, resetRef],
  );

  const {
    state,
    controls,
    data,
    hasPermissions,
    requestPermissions,
    error: recorderError,
  } = useVideoRecorder({
    maxDuration: MAX_DURATION,
    quality: "high",
    enableFaceBlur,
    enableVoiceChange,
    enableLiveCaptions: true,
    voiceEffect,
    processingMode: IS_EXPO_GO ? ProcessingMode.SERVER : ProcessingMode.HYBRID,
    onRecordingStart: handleRecordingStart,
    onRecordingStop: handleRecordingStop,
    onProcessingComplete: handleProcessingComplete,
    onError: handleRecorderError,
    autoProcessAfterRecording: false, // Don't auto-process, wait for Next button
  });

  const { startRecording, stopRecording, toggleCamera, cleanup, startProcessing } = controls;

  useEffect(() => {
    resetRef.current = controls.reset;
  }, [controls.reset]);

  const handleNextPress = useCallback(async () => {
    if (!recordedVideoUri) {
      setUiError("No video recorded. Please record a video first.");
      return;
    }

    setShowNextButton(false);
    setUiError(null);
    setIsProcessingStarted(true);

    try {
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Start processing the recorded video
      console.log("🎬 Starting video processing for:", recordedVideoUri);
      await startProcessing();
    } catch (error) {
      console.error("❌ Failed to start processing:", error);
      const message = error instanceof Error ? error.message : "Failed to start processing. Please try again.";
      setUiError(message);
      setShowNextButton(true); // Show the button again on error
      setIsProcessingStarted(false);

      // Show user-friendly error alert
      Alert.alert(
        "Processing Failed",
        message,
        [
          {
            text: "Try Again",
            onPress: () => {
              setUiError(null);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setUiError(null);
            },
          },
        ],
        { cancelable: true },
      );
    }
  }, [recordedVideoUri, hapticsEnabled, impactAsync, startProcessing]);

  useEffect(() => {
    if (recorderError) {
      setUiError(recorderError);
    }
  }, [recorderError]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        cleanup();
      };
    }, [cleanup]),
  );

  const capabilitySummary = useMemo(() => {
    if (!capabilities) {
      return "Checking camera capabilities...";
    }

    if (capabilities.recording.visionCamera && capabilities.effects.realtimeFaceBlur) {
      return "Vision Camera + FFmpeg available";
    }

    if (capabilities.recording.visionCamera) {
      return "Vision Camera available (face blur via post-processing)";
    }

    return "Using Expo Camera fallback";
  }, [capabilities]);

  const toggleVoiceEffect = useCallback(() => {
    setVoiceEffect((prev) => (prev === "deep" ? "light" : "deep"));
  }, []);

  if (!hasPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera and microphone permissions are required.</Text>
          <Pressable style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isRecording = state.isRecording;
  const processing = state.isProcessing;
  const errorMessage = uiError || state.error;

  return (
    <PermissionGate permissions={["camera", "microphone"]}>
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <CameraView
          ref={data.cameraRef}
          style={styles.camera}
          facing={data.facing}
          mode="video"
          active={!processing}
          videoQuality="720p"
          animateShutter={false}
        />

        <TranscriptionOverlay
          isRecording={isRecording}
          transcriptionText={data.liveTranscription}
          onTranscriptionUpdate={() => {}}
        />

        {/* Expo Go Info Banner */}
        <View style={styles.expoGoBanner}>
          <Ionicons name="information-circle" size={16} color="#3B82F6" />
          <Text style={styles.expoGoBannerText}>Expo Go: Post-processing mode (build for real-time blur)</Text>
        </View>

        {(processing || isProcessingStarted) && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#1D9BF0" />
            <Text style={styles.processingLabel}>Processing {Math.round(state.processingProgress)}%</Text>
            {state.processingStatus ? <Text style={styles.processingStatus}>{state.processingStatus}</Text> : null}
            {isProcessingStarted && !processing && (
              <Text style={styles.processingStatus}>Initializing processing...</Text>
            )}
          </View>
        )}

        {/* Error Overlay */}
        {uiError && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{uiError}</Text>
              <Pressable
                style={styles.errorButton}
                onPress={() => setUiError(null)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
              >
                <Text style={styles.errorButtonText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.controlsOverlay}>
          <View style={styles.topControls}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityRole="button">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: capabilities?.recording.visionCamera ? "#22C55E" : "#F59E0B" },
                ]}
              />
              <Text style={styles.statusText}>{capabilitySummary}</Text>
            </View>

            <Pressable onPress={toggleCamera} style={styles.iconButton} accessibilityRole="button">
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.togglesRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Face blur</Text>
                <Switch
                  value={enableFaceBlur}
                  onValueChange={setEnableFaceBlur}
                  thumbColor={enableFaceBlur ? "#1D9BF0" : "#374151"}
                  trackColor={{ false: "#1F2937", true: "#1D9BF0" }}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Voice mod</Text>
                <Switch
                  value={enableVoiceChange}
                  onValueChange={setEnableVoiceChange}
                  thumbColor={enableVoiceChange ? "#1D9BF0" : "#374151"}
                  trackColor={{ false: "#1F2937", true: "#1D9BF0" }}
                />
              </View>
              <Pressable onPress={toggleVoiceEffect} style={styles.voiceButton} accessibilityRole="button">
                <Text style={styles.voiceButtonText}>{voiceEffect === "deep" ? "Deep" : "Light"} voice</Text>
              </Pressable>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {!showNextButton && (
              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
              >
                <Text style={styles.recordButtonText}>{isRecording ? "Stop" : "Record"}</Text>
              </Pressable>
            )}

            {showNextButton && !processing && (
              <Pressable
                onPress={handleNextPress}
                style={[styles.recordButton, styles.nextButton]}
                accessibilityRole="button"
                accessibilityLabel="Process video and continue to preview"
              >
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" style={styles.nextButtonIcon} />
                <Text style={styles.recordButtonText}>Next</Text>
              </Pressable>
            )}

            {/* Temporary test button for debugging */}
            {__DEV__ && !isRecording && !processing && !showNextButton && (
              <Pressable
                style={styles.testButton}
                onPress={() => {
                  console.log("🧪 Testing navigation to VideoPreview...");
                  const testVideo = {
                    uri: "test://video.mp4",
                    width: 1920,
                    height: 1080,
                    duration: 30,
                    size: 1000000,
                    thumbnail: "test://thumbnail.jpg",
                  };
                  (navigation as any).navigate("VideoPreview", {
                    processedVideo: testVideo,
                  });
                }}
              >
                <Text style={styles.testButtonText}>Test Preview</Text>
              </Pressable>
            )}

            <Text style={styles.timerText}>
              {Math.floor(state.recordingTime / 60)}:{(state.recordingTime % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </PermissionGate>
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
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Platform.OS === "ios" ? 12 : 24,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomControls: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  togglesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLabel: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 8,
  },
  voiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(29,155,240,0.15)",
  },
  voiceButtonText: {
    color: "#1D9BF0",
    fontSize: 12,
    fontWeight: "600",
  },
  recordButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 32,
    minWidth: 140,
    alignItems: "center",
    marginBottom: 10,
  },
  recordButtonInactive: {
    backgroundColor: "#DC2626",
  },
  recordButtonActive: {
    backgroundColor: "#991B1B",
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  nextButton: {
    backgroundColor: "#1D9BF0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextButtonIcon: {
    marginRight: 4,
  },
  timerText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  errorText: {
    color: "#F87171",
    textAlign: "center",
    marginBottom: 8,
    fontSize: 13,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 24,
  },
  processingLabel: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "600",
  },
  processingStatus: {
    color: "#D1D5DB",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  testButton: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  errorContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  errorTitle: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  errorMessage: {
    color: "#E5E7EB",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
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
  expoGoBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  expoGoBannerText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});

export default VideoRecordScreen;
