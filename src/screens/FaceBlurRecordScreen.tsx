import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Worklets } from "react-native-worklets-core";

import { usePreferenceAwareHaptics } from "../utils/haptics";
import { useFaceBlurRecorder } from "../hooks/useFaceBlurRecorder";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import { FaceEmojiOverlay, EmojiType } from "../components/privacy/FaceEmojiOverlay";

const MAX_DURATION = 60;

function CameraScreen({ hookResult, recordedVideoPath, onNextPress }: any) {
  const navigation = useNavigation();
  const {
    state,
    controls,
    cameraRef,
    Camera,
    useCameraDevice,
    useCameraFormat,
    useFrameProcessor,
    useFaceDetector,
    runAsync,
  } = hookResult;

  const { isRecording, recordingTime, hasPermissions, isReady, error, facing } = state;
  const { startRecording, stopRecording, toggleCamera, requestPermissions } = controls;

  const [faces, setFaces] = useState<any[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiType>("mask");

  const device = useCameraDevice(facing);

  const format = device
    ? useCameraFormat(device, [
        {
          videoResolution: { width: 1280, height: 720 },
        },
        {
          fps: 30,
        },
      ])
    : null;

  const { detectFaces, stopListeners } = useFaceDetector({
    performanceMode: "fast",
    contourMode: "none",
    landmarkMode: "none",
    classificationMode: "none",
  });

  useEffect(() => {
    return () => {
      stopListeners();
    };
  }, []);

  const handleDetectedFaces = Worklets.createRunOnJS((detectedFaces: any[]) => {
    setFaces(detectedFaces);
  });

  const frameProcessor =
    useFrameProcessor && runAsync
      ? useFrameProcessor(
          (frame: any) => {
            "worklet";
            runAsync(frame, () => {
              "worklet";
              try {
                const detectedFaces = detectFaces(frame);
                handleDetectedFaces(detectedFaces);
              } catch (e: any) {}
            });
          },
          [handleDetectedFaces],
        )
      : undefined;

  useEffect(() => {
    if (!hasPermissions && isReady) {
      requestPermissions();
    }
  }, [hasPermissions, isReady, requestPermissions]);

  if (!Camera || !device) {
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

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        format={format}
        frameProcessor={frameProcessor}
        fps={30}
      />

      <FaceEmojiOverlay faces={faces} emojiType={selectedEmoji} />

      {error && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        </View>
      )}

      <View style={styles.controlsOverlay}>
        <View style={styles.topControls}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statusPill}>
            <View style={[styles.statusIndicator, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.statusText}>
              Privacy Mode:{" "}
              {selectedEmoji === "mask"
                ? "😷"
                : selectedEmoji === "sunglasses"
                  ? "🕶️"
                  : selectedEmoji === "robot"
                    ? "🤖"
                    : selectedEmoji === "incognito"
                      ? "🥸"
                      : "🌫️"}
            </Text>
          </View>

          <Pressable onPress={toggleCamera} style={styles.iconButton}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.bottomControls}>
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
            <Pressable onPress={onNextPress} style={[styles.recordButton, styles.nextButton]}>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" style={styles.nextButtonIcon} />
              <Text style={styles.recordButtonText}>Next</Text>
            </Pressable>
          )}

          <Text style={styles.timerText}>
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")} / {MAX_DURATION}s
          </Text>

          {!isRecording && !recordedVideoPath && (
            <View style={styles.emojiSelector}>
              <Text style={styles.emojiSelectorLabel}>Choose Privacy Style:</Text>
              <View style={styles.emojiOptions}>
                {(["mask", "sunglasses", "robot", "incognito", "blur"] as EmojiType[]).map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={[styles.emojiOption, selectedEmoji === emoji && styles.emojiOptionSelected]}
                  >
                    <Text style={styles.emojiOptionText}>
                      {emoji === "mask"
                        ? "😷"
                        : emoji === "sunglasses"
                          ? "🕶️"
                          : emoji === "robot"
                            ? "🤖"
                            : emoji === "incognito"
                              ? "🥸"
                              : "🌫️"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.infoText}>✨ Real-time privacy overlay • Captured in recording</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FaceBlurRecordScreenContent() {
  const navigation = useNavigation();
  const { hapticsEnabled, impactAsync, notificationAsync } = usePreferenceAwareHaptics();

  const [recordedVideoPath, setRecordedVideoPath] = useState<string | null>(null);

  const handleRecordingStart = useCallback(async () => {
    if (hapticsEnabled) {
      await notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [hapticsEnabled, notificationAsync]);

  const handleRecordingStop = useCallback((videoPath: string) => {
    console.log("Recording stopped, video saved to:", videoPath);
    setRecordedVideoPath(videoPath);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error("Recording error:", error);
  }, []);

  const hookResult = useFaceBlurRecorder({
    maxDuration: MAX_DURATION,
    blurRadius: 25,
    onRecordingStart: handleRecordingStart,
    onRecordingStop: handleRecordingStop,
    onError: handleError,
  });

  const { isLoaded, state } = hookResult;
  const { error, recordingTime } = state;

  console.log("🔍 FaceBlurRecordScreenContent render - isLoaded:", isLoaded, "error:", error);

  const handleNextPress = useCallback(async () => {
    if (!recordedVideoPath) {
      console.warn("⚠️ No recorded video path available");
      return;
    }

    console.log("📹 Proceeding to preview with emoji overlay already captured");

    if (hapticsEnabled) {
      await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Emoji overlays are already captured in the recording - no processing needed!
    const videoUri = recordedVideoPath.startsWith("file://") ? recordedVideoPath : `file://${recordedVideoPath}`;

    console.log("📹 Navigating to VideoPreview:", videoUri);

    (navigation as any).navigate("VideoPreview", {
      processedVideo: {
        uri: videoUri,
        width: 1280,
        height: 720,
        duration: recordingTime,
        size: 0,
      },
    });

    // Reset video path after navigation
    setTimeout(() => {
      setRecordedVideoPath(null);
    }, 500);
  }, [recordedVideoPath, recordingTime, hapticsEnabled, impactAsync, navigation]);

  if (!isLoaded) {
    console.log("📱 Showing loading screen");

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Camera...</Text>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Camera Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return <CameraScreen hookResult={hookResult} recordedVideoPath={recordedVideoPath} onNextPress={handleNextPress} />;
}

function FaceBlurRecordScreen() {
  const navigation = useNavigation();

  if (IS_EXPO_GO) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Development Build Required</Text>
          <Text style={styles.errorMessage}>
            Face blur requires a development build.{"\n\n"}
            Run: npx expo run:ios or npx expo run:android
          </Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <FaceBlurRecordScreenContent />;
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
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  emojiSelector: {
    marginTop: 16,
    marginBottom: 8,
  },
  emojiSelectorLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  emojiOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiOptionSelected: {
    backgroundColor: "rgba(29,155,240,0.2)",
    borderColor: "#1D9BF0",
  },
  emojiOptionText: {
    fontSize: 24,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorBox: {
    backgroundColor: "#1F2937",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 320,
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  errorMessage: {
    color: "#D1D5DB",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
});

export default FaceBlurRecordScreen;
