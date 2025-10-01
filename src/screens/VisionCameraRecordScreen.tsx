/**
 * Vision Camera Record Screen with Real-time Face Blur
 * Uses Vision Camera + Skia for on-device processing
 * Native builds only (not Expo Go)
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { usePreferenceAwareHaptics } from "../utils/haptics";
import { useVisionCameraRecorder } from "../hooks/useVisionCameraRecorder";
import { IS_EXPO_GO } from "../utils/environmentCheck";

const MAX_DURATION = 60; // seconds

function VisionCameraRecordScreenContent() {
  const navigation = useNavigation();
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();

  const [enableFaceBlur, setEnableFaceBlur] = useState(true);
  const [blurIntensity] = useState(15);
  const [uiError, setUiError] = useState<string | null>(null);
  const [recordedVideoPath, setRecordedVideoPath] = useState<string | null>(null);

  const handleRecordingStart = useCallback(async () => {
    setUiError(null);
    if (hapticsEnabled) {
      await notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled, notificationAsync]);

  const handleRecordingStop = useCallback((videoPath: string) => {
    console.log("Recording stopped, video saved to:", videoPath);
    setRecordedVideoPath(videoPath);
  }, []);

  const handleError = useCallback((error: string) => {
    setUiError(error);
    Alert.alert("Error", error);
  }, []);

  const { state, controls, cameraRef, frameProcessor, Camera } = useVisionCameraRecorder({
    maxDuration: MAX_DURATION,
    enableFaceBlur,
    blurIntensity,
    onRecordingStart: handleRecordingStart,
    onRecordingStop: handleRecordingStop,
    onError: handleError,
  });

  const { startRecording, stopRecording, toggleCamera, requestPermissions } = controls;
  const { isRecording, recordingTime, hasPermissions, isReady, error, cameraDevice, facing } = state;

  // DEBUG: Log camera device state
  console.log('📹 [VisionCameraRecordScreen] Camera state:', {
    hasCamera: !!Camera,
    hasCameraDevice: !!cameraDevice,
    cameraDeviceValue: cameraDevice,
    isReady,
    hasPermissions,
  });

  // Request permissions on mount
  useEffect(() => {
    if (!hasPermissions && isReady) {
      requestPermissions();
    }
  }, [hasPermissions, isReady, requestPermissions]);

  const handleNextPress = useCallback(async () => {
    if (!recordedVideoPath) {
      setUiError("No video recorded");
      console.warn("⚠️ No recorded video path available");
      return;
    }

    console.log("🎬 Navigating to VideoPreview with video:", recordedVideoPath);

    if (hapticsEnabled) {
      await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Ensure video path has file:// prefix
    const videoUri = recordedVideoPath.startsWith("file://")
      ? recordedVideoPath
      : `file://${recordedVideoPath}`;

    console.log("📹 Video URI for preview:", videoUri);

    // Navigate to preview with the recorded video
    (navigation as any).navigate("VideoPreview", {
      processedVideo: {
        uri: videoUri,
        width: 1920,
        height: 1080,
        duration: recordingTime,
        size: 0, // Will be calculated later
      },
    });

    // Reset for next recording after a delay to allow navigation to complete
    setTimeout(() => {
      setRecordedVideoPath(null);
    }, 500);
  }, [recordedVideoPath, recordingTime, hapticsEnabled, impactAsync, navigation]);

  if (!Camera || !cameraDevice) {
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
          <Pressable style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const errorMessage = uiError || error;

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={cameraDevice}
        isActive={true}
        video={true}
        audio={true}
        frameProcessor={frameProcessor} // Real-time face blur!
      />

      {/* Error Overlay */}
      {errorMessage && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <Pressable style={styles.errorButton} onPress={() => setUiError(null)}>
              <Text style={styles.errorButtonText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: isReady ? "#22C55E" : "#F59E0B" }]} />
            <Text style={styles.statusText}>{enableFaceBlur ? "Face Blur Active" : "No Blur"}</Text>
          </View>

          <Pressable onPress={toggleCamera} style={styles.iconButton}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.togglesRow}>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Face blur</Text>
              <Switch
                value={enableFaceBlur}
                onValueChange={setEnableFaceBlur}
                disabled={isRecording}
                thumbColor={enableFaceBlur ? "#1D9BF0" : "#374151"}
                trackColor={{ false: "#1F2937", true: "#1D9BF0" }}
              />
            </View>
            {enableFaceBlur && <Text style={styles.blurInfo}>Intensity: {blurIntensity}</Text>}
          </View>

          {!recordedVideoPath && (
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
              disabled={!isReady}
            >
              <Text style={styles.recordButtonText}>{isRecording ? "Stop" : "Record"}</Text>
            </Pressable>
          )}

          {recordedVideoPath && (
            <Pressable onPress={handleNextPress} style={[styles.recordButton, styles.nextButton]}>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" style={styles.nextButtonIcon} />
              <Text style={styles.recordButtonText}>Next</Text>
            </Pressable>
          )}

          <Text style={styles.timerText}>
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")} / {MAX_DURATION}s
          </Text>

          {enableFaceBlur && <Text style={styles.infoText}>✨ Real-time face blur active</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Main component with conditional rendering
function VisionCameraRecordScreen() {
  const navigation = useNavigation();

  // Check if running in Expo Go - do this BEFORE any hooks
  if (IS_EXPO_GO) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Development Build Required</Text>
          <Text style={styles.errorMessage}>
            Vision Camera with real-time face blur requires a development build.
            {"\n\n"}
            Run: npx expo run:ios or npx expo run:android
          </Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render the full component for native builds
  return <VisionCameraRecordScreenContent />;
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
  },
  loadingText: {
    color: "#F9FAFB",
    marginTop: 16,
    fontSize: 16,
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
  blurInfo: {
    color: "#9CA3AF",
    fontSize: 12,
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
    marginBottom: 4,
  },
  infoText: {
    color: "#22C55E",
    fontSize: 12,
    textAlign: "center",
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
  errorBox: {
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
});

export default VisionCameraRecordScreen;
