import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView } from "expo-camera";

import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { PermissionGate } from "../components/PermissionGate";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { TranscriptionOverlay } from "../components/TranscriptionOverlay";
import { ProcessedVideo } from "../services/IAnonymiser";
import { ProcessingMode } from "../services/UnifiedVideoProcessingService";
import { useVideoCapabilities } from "../services/UnifiedVideoService";
import { IS_EXPO_GO } from "../utils/environmentCheck";

const MAX_DURATION = 60; // seconds

function VideoRecordScreen() {
  const navigation = useNavigation();
  const queueTempConfession = useConfessionStore((state) => state.queueTempConfession);
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const capabilities = useVideoCapabilities();

  const resetRef = useRef<(() => void) | null>(null);

  const [enableFaceBlur, setEnableFaceBlur] = useState(true);
  const [enableVoiceChange, setEnableVoiceChange] = useState(true);
  const [voiceEffect, setVoiceEffect] = useState<"deep" | "light">("deep");
  const [uiError, setUiError] = useState<string | null>(null);

  const handleRecordingStart = useCallback(async () => {
    setUiError(null);
    if (hapticsEnabled) {
      await notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled, notificationAsync]);

  const handleRecorderError = useCallback((message: string) => {
    setUiError(message);
  }, []);

  const handleProcessingComplete = useCallback(
    async (processed: ProcessedVideo) => {
      try {
        const confessionPayload = {
          type: "video" as const,
          content: "Anonymous video confession",
          videoUri: processed.uri,
          transcription: processed.transcription,
          isAnonymous: true,
          faceBlurApplied: processed.faceBlurApplied ?? enableFaceBlur,
          voiceChangeApplied: processed.voiceChangeApplied ?? enableVoiceChange,
          duration: processed.duration,
        };

        await queueTempConfession(confessionPayload, {
          type: "video",
          faceBlurApplied: processed.faceBlurApplied ?? enableFaceBlur,
          voiceChangeApplied: processed.voiceChangeApplied ?? enableVoiceChange,
          processingMode: IS_EXPO_GO ? "server" : "hybrid",
          duration: processed.duration,
        });

        if (hapticsEnabled) {
          await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        resetRef.current?.();

        Alert.alert(
          "Video Queued",
          "Your anonymized video will upload automatically when a connection is available.",
          [
            {
              text: "Great",
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } catch (error) {
        console.error("Failed to queue processed confession:", error);
        const message =
          error instanceof Error ? error.message : "Failed to queue video for upload. Please try again.";
        setUiError(message);
        Alert.alert("Upload Failed", message);
      }
    },
    [
      enableFaceBlur,
      enableVoiceChange,
      hapticsEnabled,
      impactAsync,
      navigation,
      queueTempConfession,
      resetRef,
    ],
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
    onProcessingComplete: handleProcessingComplete,
    onError: handleRecorderError,
  });

  const { startRecording, stopRecording, toggleCamera, cleanup } = controls;

  useEffect(() => {
    resetRef.current = controls.reset;
  }, [controls.reset]);

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
      <SafeAreaView style={styles.container}>
        <CameraView
          ref={data.cameraRef}
          style={styles.camera}
          facing={data.facing}
          mode="video"
          active={!processing}
          videoQuality="1080p"
          animateShutter={false}
        />

        <TranscriptionOverlay
          isRecording={isRecording}
          transcriptionText={data.liveTranscription}
          onTranscriptionUpdate={() => {}}
        />

        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#1D9BF0" />
            <Text style={styles.processingLabel}>
              Processing {Math.round(state.processingProgress)}%
            </Text>
            {state.processingStatus ? <Text style={styles.processingStatus}>{state.processingStatus}</Text> : null}
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

            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
              accessibilityRole="button"
              accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
            >
              <Text style={styles.recordButtonText}>{isRecording ? "Stop" : "Record"}</Text>
            </Pressable>

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
});

export default VideoRecordScreen;
