/**
 * Face Blur Record Screen
 * Hybrid implementation with graceful fallback
 * - Attempts real-time blur if capable
 * - Falls back to regular recording if blur fails
 * - Never breaks recording functionality
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import * as Haptics from "expo-haptics";

import { usePreferenceAwareHaptics } from "../utils/haptics";
import { useSafeFaceBlur } from "../hooks/useSafeFaceBlur";

const MAX_DURATION = 60;

function FaceBlurRecordScreen() {
  const navigation = useNavigation();
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();

  const cameraRef = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [recordedVideoPath, setRecordedVideoPath] = useState<string | null>(null);
  const [blurEnabled, setBlurEnabled] = useState(true);

  // Get camera device
  const device = useCameraDevice(facing);

  // Safe face blur with automatic fallback
  const { frameProcessor, blurStatus, blurReason, canAttemptBlur } = useSafeFaceBlur(blurEnabled);

  // Request permissions
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();
      setHasPermissions(cameraPermission === "granted" && microphonePermission === "granted");
    })();
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            if (cameraRef.current) {
              cameraRef.current.stopRecording();
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
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

      console.log("🎬 Starting recording with blur status:", blurStatus);

      await cameraRef.current.startRecording({
        onRecordingFinished: (video) => {
          console.log("✅ Recording finished:", video.path);
          setRecordedVideoPath(video.path);
          setIsRecording(false);
        },
        onRecordingError: (error) => {
          console.error("❌ Recording error:", error);
          setIsRecording(false);
        },
      });
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setIsRecording(false);
    }
  }, [hapticsEnabled, notificationAsync, blurStatus]);

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
        faceBlurApplied: blurStatus === "active",
        privacyMode: "blur" as const,
      },
    });

    setTimeout(() => {
      setRecordedVideoPath(null);
      setRecordingTime(0);
    }, 500);
  }, [recordedVideoPath, recordingTime, hapticsEnabled, impactAsync, navigation, blurStatus]);

  // Get status indicator color
  const getStatusColor = () => {
    switch (blurStatus) {
      case "active":
        return "#22C55E"; // Green - blur working
      case "available":
        return "#3B82F6"; // Blue - blur ready
      case "failed":
        return "#EF4444"; // Red - blur failed
      case "disabled":
      default:
        return "#F59E0B"; // Orange - blur off
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (blurStatus) {
      case "active":
        return "Blur Active ✓";
      case "available":
        return "Blur Ready";
      case "failed":
        return "Blur Failed";
      case "disabled":
      default:
        return blurEnabled ? "Blur Not Available" : "Blur Disabled";
    }
  };

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
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        frameProcessor={frameProcessor || undefined}
      />

      <View style={styles.controlsOverlay}>
        <View style={styles.topControls}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          <Pressable onPress={toggleCamera} style={styles.iconButton}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.bottomControls}>
          {/* Blur toggle */}
          <View style={styles.blurToggleRow}>
            <View style={styles.blurToggleLeft}>
              <Text style={styles.blurToggleLabel}>Face Blur</Text>
              <Switch
                value={blurEnabled}
                onValueChange={setBlurEnabled}
                disabled={isRecording || !canAttemptBlur}
                thumbColor={blurEnabled ? "#1D9BF0" : "#9CA3AF"}
                trackColor={{ false: "#374151", true: "#1D9BF0" }}
              />
            </View>
            <Text style={styles.blurReasonText}>{blurReason}</Text>
          </View>

          {!recordedVideoPath && (
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording ? styles.recordButtonActive : styles.recordButtonInactive]}
            >
              <Text style={styles.recordButtonText}>{isRecording ? "Stop" : "Record"}</Text>
            </Pressable>
          )}

          {recordedVideoPath && (
            <Pressable onPress={handleNextPress} style={[styles.recordButton, styles.nextButton]}>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>Next</Text>
            </Pressable>
          )}

          <Text style={styles.timerText}>
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")} / {MAX_DURATION}s
          </Text>

          <Text style={styles.infoText}>
            {blurStatus === "active" ? "✨ Blur active - faces hidden" : "📹 Recording works always"}
          </Text>
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
  blurToggleRow: {
    width: "100%",
    marginBottom: 12,
  },
  blurToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  blurToggleLabel: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "500",
  },
  blurReasonText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  recordButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 32,
    minWidth: 140,
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
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
  },
  timerText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  infoText: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});

export default FaceBlurRecordScreen;
