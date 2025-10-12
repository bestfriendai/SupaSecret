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

      console.log("🎬 Starting recording...");

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
  }, [hapticsEnabled, notificationAsync]);

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
        faceBlurApplied: false, // User will blur in preview if they want
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
    <SafeAreaView style={styles.container}>
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
          </View>

          <GlassButton icon="camera-reverse" onPress={toggleCamera} disabled={isRecording} />
        </View>

        {/* Center - Timer (only when recording) */}
        {isRecording && (
          <View style={styles.centerControls}>
            <TimerDisplay seconds={recordingTime} maxSeconds={MAX_DURATION} isRecording={isRecording} />
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {!recordedVideoPath ? (
            <View style={styles.recordingControls}>
              <RecordButton
                isRecording={isRecording}
                onPress={isRecording ? stopRecording : startRecording}
                progress={recordingTime / MAX_DURATION}
              />

              {!isRecording && <Text style={styles.hintText}>Tap to start recording</Text>}
            </View>
          ) : (
            <View style={styles.nextControls}>
              <GlassButton icon="arrow-forward" label="Continue" onPress={handleNextPress} variant="primary" />
            </View>
          )}
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
  nextControls: {
    width: "100%",
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default FaceBlurRecordScreen;
