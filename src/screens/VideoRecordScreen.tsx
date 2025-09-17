import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { withErrorBoundary } from "../components/ErrorBoundary";
import { PermissionGate } from "../components/PermissionGate";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";
import { generateUUID } from "../utils/consolidatedUtils";

// Expo Camera fallback
import { CameraView, CameraType } from "expo-camera";
import { useMediaPermissions } from "../hooks/useMediaPermissions";

const MAX_DURATION = 60; // seconds
const RECORDING_QUALITY = "hd"; // 'sd', 'hd', 'fhd', '4k'

function VideoRecordScreen() {
  const navigation = useNavigation();
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const addConfession = useConfessionStore((state) => state.addConfession);

  // Expo Camera hooks (always called)
  const { hasVideoPermissions, requestVideoPermissions } = useMediaPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const expoCameraRef = useRef<CameraView>(null);

  // Common state
  const [camera, setCamera] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [visionCameraReady, setVisionCameraReady] = useState(false);

  // Timer ref for recording duration
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);

  // Initialize Vision Camera if available
  useEffect(() => {
    const initVisionCamera = async () => {
      if (IS_EXPO_GO) {
        setVisionCameraReady(false);
        return;
      }

      try {
        const visionCamera = await import("react-native-vision-camera");
        const { Camera: VisionCamera } = visionCamera;
        
        // Check permissions
        const cameraPermission = await VisionCamera.getCameraPermissionStatus();
        if (cameraPermission !== "granted") {
          const newPermission = await VisionCamera.requestCameraPermission();
          if (newPermission !== "granted") {
            setVisionCameraReady(false);
            return;
          }
        }

        setVisionCameraReady(true);
      } catch (error) {
        console.warn("Vision Camera not available:", error);
        setVisionCameraReady(false);
      }
    };

    initVisionCamera();
  }, []);

  // Request permissions on focus
  useFocusEffect(
    useCallback(() => {
      if (!visionCameraReady && !hasVideoPermissions) {
        requestVideoPermissions();
      }
      return () => {
        // Cleanup on unfocus
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }, [visionCameraReady, hasVideoPermissions, requestVideoPermissions])
  );

  const startRecording = async () => {
    if (isRecording) return;

    try {
      setError(null);
      setIsRecording(true);
      setRecordingDuration(0);

      // Haptic feedback
      if (hapticsEnabled) {
        await notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= MAX_DURATION) {
            // Clear interval immediately when max duration reached
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            stopRecording();
            return prev;
          }
          return newDuration;
        });
      }, 1000);

      // Use Expo Camera for recording
      if (expoCameraRef.current) {
        const recordingOptions: any = { maxDuration: MAX_DURATION };
        if (Platform.OS === "ios") {
          recordingOptions.codec = "avc1";
        }

        recordingPromiseRef.current = expoCameraRef.current.recordAsync(recordingOptions);
        const video = await recordingPromiseRef.current;

        if (video && video.uri) {
          await handleRecordingComplete(video.uri);
        }
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
      setError("Failed to start recording. Please check permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      if (expoCameraRef.current) {
        expoCameraRef.current.stopRecording();
      }

      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setError("Failed to stop recording.");
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleRecordingComplete = async (videoPath: string) => {
    try {
      // Add to offline queue for processing
      const tempId = generateUUID();
      offlineQueue.enqueue(OFFLINE_ACTIONS.CREATE_CONFESSION, {
        tempId,
        confession: {
          type: "video",
          content: "Anonymous video confession",
          videoUri: videoPath,
          isAnonymous: true,
        },
      });

      Alert.alert(
        "Recording Complete!",
        `Video recorded successfully and queued for processing (${tempId.slice(0, 8)}...)`,
        [
          {
            text: "Record Another",
            onPress: () => {
              // Reset for another recording
              setRecordingDuration(0);
              setError(null);
            },
          },
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to handle recording:", error);
      setError("Failed to process recording.");
    }
  };

  const toggleCameraFacing = () => {
    // Toggle for Expo Camera
    setFacing((current) => (current === "back" ? "front" : "back"));

    if (hapticsEnabled) {
      impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Permission check
  const hasPermissions = hasVideoPermissions;

  if (!hasPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Pressable style={styles.button} onPress={requestVideoPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PermissionGate permissions={["camera", "microphone"]}>
      <SafeAreaView style={styles.container}>
        {/* Camera View */}
        <CameraView ref={expoCameraRef} style={styles.camera} facing={facing} />

        {/* Controls Overlay */}
        <View style={styles.controlsOverlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>

            <Pressable onPress={toggleCameraFacing} style={styles.switchButton}>
              <Ionicons name="camera-reverse" size={24} color="white" />
            </Pressable>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? "Stop" : `Record (${MAX_DURATION}s max)`}
              </Text>
            </Pressable>

            <Text style={styles.infoText}>
              {visionCameraReady ? "Vision Camera Ready" : "Using Expo Camera"}
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
    backgroundColor: "black",
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
    padding: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  switchButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,0,0,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginRight: 8,
  },
  recordingText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  bottomControls: {
    alignItems: "center",
    paddingBottom: 50,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  recordButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 120,
    alignItems: "center",
    marginBottom: 10,
  },
  recordButtonInactive: {
    backgroundColor: "red",
  },
  recordButtonActive: {
    backgroundColor: "darkred",
  },
  recordButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default withErrorBoundary(VideoRecordScreen);
