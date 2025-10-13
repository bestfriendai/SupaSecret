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

  const [enableFaceBlur, setEnableFaceBlur] = useState(true); // Now working with fixed implementation!
  const [blurIntensity] = useState(25); // Match FaceBlurApp default
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
  console.log("📹 [VisionCameraRecordScreen] Camera state:", {
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
    const videoUri = recordedVideoPath.startsWith("file://") ? recordedVideoPath : `file://${recordedVideoPath}`;

    console.log("📹 Video URI for preview:", videoUri);

    // Navigate to preview with the recorded video
    (navigation as any).navigate("VideoPreview", {
      processedVideo: {
        uri: videoUri,
        width: 1920,
        height: 1080,
        duration: recordingTime,
        size: 0, // Will be calculated later
        faceBlurApplied: enableFaceBlur,
        privacyMode: "blur" as const,
        blurIntensity: blurIntensity,
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
    <View style={styles.container}>
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
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>MainTabs</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Record Video</Text>

          <Pressable onPress={toggleCamera} style={styles.flipButton}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Center Status Indicator */}
        <View style={styles.centerStatus}>
          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: isReady ? "#22C55E" : "#F59E0B" }]} />
            <Text style={styles.statusText}>Ready</Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {recordedVideoPath ? (
            <Pressable onPress={handleNextPress} style={styles.continueButton}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.continueIcon} />
              <Text style={styles.continueButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => navigation.goBack()} style={styles.bottomBackButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                style={[styles.recordButtonCircle, isRecording && styles.recordButtonRecording]}
                disabled={!isReady}
              >
                {isRecording ? (
                  <View style={styles.stopSquare} />
                ) : (
                  <View style={styles.recordDot} />
                )}
              </Pressable>

              <Pressable onPress={toggleCamera} style={styles.flipButtonBottom}>
                <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
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
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerStatus: {
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
  },
  bottomBackButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  recordButtonRecording: {
    backgroundColor: "rgba(239,68,68,0.3)",
    borderColor: "#EF4444",
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  flipButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 8,
    flex: 1,
    marginHorizontal: 40,
  },
  continueIcon: {
    marginRight: 4,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
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
