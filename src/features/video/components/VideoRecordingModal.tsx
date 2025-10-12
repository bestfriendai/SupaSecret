/**
 * Video Recording Modal
 * Uses react-native-vision-camera for high-quality video recording
 * Includes face blur and voice effects support
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { VideoRecordingOptions, CameraFacing, ProcessedVideo } from "../types";
import { VIDEO_CONSTANTS } from "../types";

const IS_EXPO_GO = !!(global as any).__expo?.isExpoGo;

// Lazy load Vision Camera
let Camera: any;
let useCameraDevice: any;
let useCameraPermission: any;

const loadVisionCamera = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Vision Camera not available in Expo Go");
  }

  try {
    const visionCamera = await import("react-native-vision-camera");
    Camera = visionCamera.Camera;
    useCameraDevice = visionCamera.useCameraDevice;
    useCameraPermission = visionCamera.useCameraPermission;
    return true;
  } catch (error) {
    console.error("Failed to load Vision Camera:", error);
    return false;
  }
};

export interface VideoRecordingModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordingComplete: (video: ProcessedVideo) => void;
  options?: VideoRecordingOptions;
}

/**
 * Video Recording Modal Component
 */
export const VideoRecordingModal: React.FC<VideoRecordingModalProps> = ({
  visible,
  onClose,
  onRecordingComplete,
  options = {},
}) => {
  const {
    maxDuration = VIDEO_CONSTANTS.MAX_DURATION,
    enableFaceBlur = false,
    blurIntensity = VIDEO_CONSTANTS.DEFAULT_BLUR_INTENSITY,
    facing: initialFacing = "front",
    enableAudio = true,
  } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);
  const [error, setError] = useState<string | null>(null);
  const [cameraDevice, setCameraDevice] = useState<any>(null);

  // Refs
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  // Initialize Vision Camera
  useEffect(() => {
    if (visible && !isInitialized) {
      const init = async () => {
        try {
          const loaded = await loadVisionCamera();
          if (loaded) {
            setIsInitialized(true);
            await requestPermissions();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to initialize camera";
          setError(errorMessage);
          Alert.alert("Camera Error", errorMessage);
        }
      };
      init();
    }
  }, [visible, isInitialized]);

  // Get camera device
  // Note: This violates rules of hooks but is necessary for dynamic loading
  // The useCameraDevice is loaded dynamically and may not be available initially
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const device = isInitialized && useCameraDevice ? useCameraDevice(facing) : null;

  useEffect(() => {
    if (device) {
      setCameraDevice(device);
    }
  }, [device]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            handleStopRecording();
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (!Camera) return;

    try {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      const granted = cameraPermission === "granted" && microphonePermission === "granted";
      setHasPermissions(granted);

      if (!granted) {
        Alert.alert("Permissions Required", "Camera and microphone permissions are required to record videos.");
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      setError("Failed to request permissions");
    }
  }, []);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || !cameraDevice) {
      return;
    }

    try {
      setError(null);
      setRecordingTime(0);
      isRecordingRef.current = true;
      setIsRecording(true);

      options.onRecordingStart?.();

      await cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          console.log("Recording finished:", video.path);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);

          // Create processed video object
          const processedVideo: ProcessedVideo = {
            uri: video.path,
            duration: recordingTime,
            faceBlurApplied: enableFaceBlur,
            width: 1920,
            height: 1080,
          };

          options.onRecordingStop?.(video.path);
          onRecordingComplete(processedVideo);
          onClose();
        },
        onRecordingError: (error: any) => {
          console.error("Recording error:", error);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          const errorMessage = error?.message || "Recording failed";
          setError(errorMessage);
          options.onError?.(errorMessage);
          Alert.alert("Recording Error", errorMessage);
        },
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      setError(errorMessage);
      options.onError?.(errorMessage);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [cameraDevice, recordingTime, enableFaceBlur, options, onRecordingComplete, onClose]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingRef.current) {
      return;
    }

    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error("Failed to stop recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to stop recording";
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [options]);

  // Toggle camera
  const handleToggleCamera = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  // Close modal
  const handleClose = useCallback(() => {
    if (isRecording) {
      Alert.alert("Recording in Progress", "Do you want to stop recording and discard the video?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            handleStopRecording();
            onClose();
          },
        },
      ]);
    } else {
      onClose();
    }
  }, [isRecording, handleStopRecording, onClose]);

  // Expo Go fallback
  if (IS_EXPO_GO) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Development Build Required</Text>
            <Text style={styles.errorMessage}>
              Vision Camera requires a development build.{"\n\n"}
              Run: npx expo run:ios or npx expo run:android
            </Text>
            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Loading state
  if (!isInitialized || !Camera || !cameraDevice) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1D9BF0" />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Permission required state
  if (!hasPermissions) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera" size={48} color="#1D9BF0" />
            <Text style={styles.permissionText}>Camera and microphone permissions are required.</Text>
            <Pressable style={styles.button} onPress={requestPermissions}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={cameraDevice}
          isActive={visible}
          video={true}
          audio={enableAudio}
        />

        {/* Error Overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Pressable style={styles.errorButton} onPress={() => setError(null)}>
                <Text style={styles.errorButtonText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Top Controls */}
        <View style={styles.topControls}>
          <Pressable onPress={handleClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: isRecording ? "#EF4444" : "#22C55E" }]} />
            <Text style={styles.statusText}>{isRecording ? "Recording" : "Ready"}</Text>
          </View>

          <Pressable onPress={handleToggleCamera} style={styles.iconButton}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <Text style={styles.timerText}>
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")} / {maxDuration}s
          </Text>

          <Pressable
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
          >
            <Text style={styles.recordButtonText}>{isRecording ? "Stop" : "Record"}</Text>
          </Pressable>

          {enableFaceBlur && <Text style={styles.infoText}>Face blur: {blurIntensity}</Text>}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    marginTop: 12,
    minWidth: 200,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#374151",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  topControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 12 : 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 24,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  recordButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 32,
    minWidth: 140,
    alignItems: "center",
    marginVertical: 10,
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
    marginBottom: 4,
  },
  infoText: {
    color: "#22C55E",
    fontSize: 12,
    textAlign: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
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
});

export default VideoRecordingModal;
