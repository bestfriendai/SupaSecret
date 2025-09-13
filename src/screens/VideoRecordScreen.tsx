import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { processVideoConfession } from "../utils/videoProcessing";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { useMediaPermissions } from "../hooks/useMediaPermissions";
import { BlurView } from "expo-blur";
import { VideoView, useVideoPlayer } from "expo-video";
import * as Speech from "expo-speech";
// Temporarily disabled Reanimated due to NativeWind v4 + Expo SDK 54 compatibility issues
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withTiming,
//   interpolate,
// } from "react-native-reanimated";

import TikTokCaptionsOverlay from "../components/TikTokCaptionsOverlay";

// Create animated components - temporarily disabled
// const AnimatedView = Animated.createAnimatedComponent(View);
// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function VideoRecordScreen() {
  // All hooks must be called at the top level, before any conditional logic
  const { impactAsync, notificationAsync } = usePreferenceAwareHaptics();
  const { permissionState, requestVideoPermissions, hasVideoPermissions } = useMediaPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalButtons, setModalButtons] = useState<{ text: string; onPress?: () => void }[]>([]);
  const [blurIntensity, setBlurIntensity] = useState(25);

  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation();
  const addConfession = useConfessionStore((state) => state.addConfession);

  // Mount/recording guards to prevent camera-unmounted errors
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isMountedRef.current = true;

    // Store cleanup function for use in navigation listener
    cleanupRef.current = cleanup;

    const removeBeforeRemove = (navigation as any).addListener?.("beforeRemove", (e: any) => {
      // If recording, stop it before navigating away to avoid unmounted errors
      if (isRecordingRef.current) {
        e.preventDefault();
        try {
          cameraRef.current?.stopRecording();
        } catch (error) {
          if (__DEV__) {
            console.warn("Error stopping recording during navigation:", error);
          }
        }
        // Allow navigation to proceed after a brief tick
        setTimeout(() => {
          (navigation as any).dispatch?.(e.data.action);
        }, 200);
      }
    });

    return () => {
      isMountedRef.current = false;
      try {
        cleanupRef.current?.();
      } catch (error) {
        if (__DEV__) {
          console.warn("Error during component unmount cleanup:", error);
        }
      }
      removeBeforeRemove && removeBeforeRemove();
    };
  }, [navigation]);

  // Animation values for TikTok-like UI - temporarily disabled due to NativeWind compatibility issues
  // const recordButtonScale = useSharedValue(1);
  // const recordButtonOpacity = useSharedValue(1);
  // const controlsOpacity = useSharedValue(1);
  // const blurIntensity = useSharedValue(25);
  // const captionsScale = useSharedValue(1);

  // Animated styles - temporarily disabled for debugging
  // const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ scale: recordButtonScale.value }],
  //   opacity: recordButtonOpacity.value,
  // }));

  // const controlsAnimatedStyle = useAnimatedStyle(() => ({
  //   opacity: controlsOpacity.value,
  // }));

  // const captionsAnimatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ scale: captionsScale.value }],
  // }));

  // Preview state after processing (before upload)
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewTranscription, setPreviewTranscription] = useState<string>("");
  const previewPlayer = useVideoPlayer(previewUri, (player) => {
    if (player) {
      player.loop = true;
      player.muted = true; // Expo Go: mute original and use TTS for masking
    }
  });

  // Preview player cleanup
  useEffect(() => {
    return () => {
      try {
        if (previewPlayer) {
          previewPlayer.pause?.();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Error cleaning up preview player:", error);
        }
      }
    };
  }, [previewPlayer]);

  // Start/stop preview playback + TTS voice masking for Expo Go
  useEffect(() => {
    if (showPreview && previewUri && previewPlayer) {
      try {
        // Reset player position before playing
        previewPlayer.currentTime = 0;
        previewPlayer.play?.();
      } catch (error) {
        if (__DEV__) {
          console.warn("Error starting preview playback:", error);
        }
      }
      if (previewTranscription) {
        // Simulate voice change using TTS (lower pitch / slower rate)
        Speech.stop();
        Speech.speak(previewTranscription, {
          language: "en-US",
          pitch: 0.75,
          rate: 0.9,
          volume: 1.0,
        });
      }
    } else {
      try {
        Speech.stop();
        if (previewPlayer) {
          previewPlayer.pause?.();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Error stopping preview playback:", error);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, previewUri, previewTranscription, previewPlayer]);

  const showMessage = (
    message: string,
    type: "success" | "error",
    buttons?: { text: string; onPress?: () => void }[],
  ) => {
    if (!isMountedRef.current) return;
    setModalMessage(message);
    setModalType(type);
    setModalButtons(buttons || [{ text: "OK", onPress: () => setShowModal(false) }]);
    setShowModal(true);
  };

  // Check permissions on mount
  useEffect(() => {
    const initPermissions = () => {
      try {
        console.log("🔍 Checking initial permissions...");
        // Permissions are automatically checked by the hook
      } catch (error) {
        console.error("❌ Error checking permissions:", error);
      }
    };

    initPermissions();
  }, []);

  // Cleanup effect - must be called after all other hooks
  useEffect(() => {
    return cleanup;
  }, []);

  // Cleanup function to prevent memory leaks
  const cleanup = () => {
    try {
      // Stop recording if in progress
      if (isRecordingRef.current) {
        cameraRef.current?.stopRecording();
      }

      // Stop TTS speech
      Speech.stop();

      // Pause preview player
      if (previewPlayer) {
        previewPlayer.pause?.();
      }

      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Clear recording promise
      recordingPromiseRef.current = null;

      // Reset state if component is still mounted
      if (isMountedRef.current) {
        setIsRecording(false);
        setRecordingTime(0);
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus("");
        setShowPreview(false);
        setPreviewUri(null);
        setPreviewTranscription("");
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Error during cleanup:", error);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
    impactAsync();
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    // Double-check permissions before recording
    if (!hasVideoPermissions) {
      const granted = await requestVideoPermissions();
      if (!granted) return;
    }

    setIsRecording(true);
    setRecordingTime(0);

    // Add haptic feedback
    notificationAsync();

    // TikTok-like animation: scale down record button and fade controls


    setBlurIntensity(35);

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    try {
      const recordingOptions: any = { maxDuration: 60 };
      if (Platform.OS === "ios") {
        // H.264 codec (FourCC 'avc1') required on iOS for bitrate control and compatibility
        recordingOptions.codec = "avc1";
      }
      recordingPromiseRef.current = cameraRef.current.recordAsync(recordingOptions);

      const video = await recordingPromiseRef.current;

      if (video && video.uri) {
        await processVideo(video.uri);
      }
    } catch (error) {
      console.error("Recording error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage !== "Recording stopped") {
        let userFriendlyMessage = "Failed to record video. Please try again.";

        if (errorMessage.includes("permission")) {
          userFriendlyMessage = "Camera or microphone permission was denied. Please check your settings.";
        } else if (errorMessage.includes("storage") || errorMessage.includes("space")) {
          userFriendlyMessage = "Not enough storage space to record video. Please free up some space.";
        } else if (errorMessage.includes("camera")) {
          userFriendlyMessage = "Camera is not available. Please make sure no other app is using the camera.";
        }

        showMessage(userFriendlyMessage, "error", [
          { text: "Try Again" },
          { text: "Go Back", onPress: () => navigation.goBack() },
        ]);
      }
    } finally {
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      impactAsync();

      // TikTok-like animation: restore record button and controls


      setBlurIntensity(25);

      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const processVideo = async (videoUri: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("Starting processing...");

    try {
      // Process video with face blur, voice change, and transcription
      const processedVideo = await processVideoConfession(videoUri, {
        enableTranscription: true,
        enableFaceBlur: true,
        enableVoiceChange: true,
        quality: "medium",
        onProgress: (progress, status) => {
          setProcessingProgress(progress);
          setProcessingStatus(status);
        },
      });

      // Show preview with simulated voice change + captions overlay
      setIsProcessing(false);
      setProcessingProgress(100);
      setProcessingStatus("");
      setPreviewUri(processedVideo.uri);
      setPreviewTranscription(processedVideo.transcription || "");
      setShowPreview(true);
      return;
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      let userFriendlyMessage = "Failed to process your video confession.";
      let suggestions = "Please try recording again.";

      if (errorMessage.includes("transcription")) {
        userFriendlyMessage = "Video recorded successfully, but transcription failed.";
        suggestions = "Your video will be saved without transcription. You can try again later.";
      } else if (errorMessage.includes("storage") || errorMessage.includes("space")) {
        userFriendlyMessage = "Not enough storage space to process video.";
        suggestions = "Please free up some space and try again.";
      } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
        userFriendlyMessage = "Network error during processing.";
        suggestions = "Please check your internet connection and try again.";
      }

      showMessage(`${userFriendlyMessage}\n\n${suggestions}`, "error", [
        { text: "Try Again", onPress: () => setIsProcessing(false) },
        { text: "Go Back", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStatus("");
    }
  };

  // Render permission loading state
  if (permissionState.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "white", fontSize: 18 }}>Checking permissions...</Text>
      </View>
    );
  }

  // Render permission request screen
  if (!hasVideoPermissions) {
    const needsCamera = !permissionState.camera;
    const needsAudio = !permissionState.microphone;

    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: "#374151",
            borderRadius: 40,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name={needsCamera ? "camera-outline" : "mic-outline"} size={40} color="#8B98A5" />
        </View>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
          {needsCamera && needsAudio
            ? "Camera & Microphone Access Required"
            : needsCamera
              ? "Camera Permission Required"
              : "Microphone Permission Required"}
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 16,
            marginTop: 8,
            textAlign: "center",
            marginBottom: 32,
            lineHeight: 24,
          }}
        >
          We need {needsCamera && needsAudio ? "camera and microphone" : needsCamera ? "camera" : "microphone"} access
          to record your anonymous video confession with privacy protection.
        </Text>
        <Pressable
          style={{
            backgroundColor: "#3B82F6",
            borderRadius: 9999,
            paddingHorizontal: 32,
            paddingVertical: 16,
            marginBottom: 16,
          }}
          onPress={requestVideoPermissions}
        >
          <Text style={{ color: "white", fontWeight: "600", fontSize: 18 }}>Grant Permissions</Text>
        </Pressable>
        <Pressable
          style={{
            backgroundColor: "#374151",
            borderRadius: 9999,
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginBottom: 8,
          }}
          onPress={() => {
            // Retry permissions request
            requestVideoPermissions();
          }}
        >
          <Text style={{ color: "#D1D5DB", fontWeight: "500" }}>Refresh Permissions</Text>
        </Pressable>
        <Pressable
          style={{ backgroundColor: "#1F2937", borderRadius: 9999, paddingHorizontal: 24, paddingVertical: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#D1D5DB", fontWeight: "500" }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Render processing screen
  if (isProcessing) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="cog" size={64} color="#1D9BF0" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">Processing Your Video</Text>
        <Text className="text-gray-400 text-base mt-2 text-center mb-6">
          {processingStatus || "Applying face blur, voice change, and transcription..."}
        </Text>

        {/* Progress Bar */}
        <View className="w-full max-w-xs bg-gray-800 rounded-full h-2 mb-4">
          <View
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </View>

        <Text className="text-blue-400 text-sm font-medium">{Math.round(processingProgress)}% Complete</Text>
      </SafeAreaView>
    );
  }

  // Render preview screen (after processing, before upload)
  if (showPreview && previewUri) {
    return (
      <View className="flex-1 bg-black">
        {previewPlayer ? (
          <VideoView
            player={previewPlayer}
            style={{ flex: 1 }}
            contentFit="cover"
            nativeControls={false}
            onError={(error) => {
              if (__DEV__) {
                console.error("VideoView error:", error);
              }
              showMessage("Failed to load video preview. Please try recording again.", "error");
            }}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "white" }}>Loading preview...</Text>
          </View>
        )}
        {/* Mild blur to maintain privacy even in preview */}
        <BlurView intensity={15} tint="dark" style={{ position: "absolute", inset: 0 }} pointerEvents="none" />

        {/* Enhanced captions overlay with TikTok-like styling */}
        <View
          style={[
            { position: "absolute", left: 0, right: 0, bottom: 140, paddingHorizontal: 16 },
            // captionsAnimatedStyle, // temporarily disabled
          ]}
        >
          <View className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 shadow-lg">
            <TikTokCaptionsOverlay
              text={previewTranscription}
              currentTime={previewPlayer?.currentTime || 0}
              duration={previewPlayer?.duration || 1}
            />
            {/* Add a subtle glow effect */}
            <View className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 blur-sm -z-10" />
          </View>
        </View>

        {/* Top + Bottom controls */}
        <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 py-2">
          <Pressable
            className="bg-black/70 rounded-full p-3"
            onPress={() => {
              try {
                Speech.stop();
                if (previewPlayer) {
                  previewPlayer.pause?.();
                }
              } catch (error) {
                if (__DEV__) {
                  console.warn("Error stopping preview during close:", error);
                }
              }
              setShowPreview(false);
              setPreviewUri(null);
              setPreviewTranscription("");
            }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View className="bg-black/70 rounded-full px-4 py-2 flex-row items-center">
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text className="text-green-400 text-sm font-semibold ml-2">Voice changed</Text>
          </View>

          <View style={{ width: 48 }} />
        </SafeAreaView>

        <SafeAreaView className="absolute bottom-0 left-0 right-0 items-center pb-8">
          <View className="flex-row items-center justify-center space-x-4">
            <Pressable
              className="bg-gray-800 rounded-full px-6 py-3 mr-3"
              onPress={() => {
                try {
                  Speech.stop();
                  if (previewPlayer) {
                    previewPlayer.pause?.();
                  }
                } catch (error) {
                  if (__DEV__) {
                    console.warn("Error stopping preview during retake:", error);
                  }
                }
                setShowPreview(false);
                setPreviewUri(null);
                setPreviewTranscription("");
              }}
            >
              <Text className="text-white font-semibold">Retake</Text>
            </Pressable>
            <Pressable
              className="bg-blue-500 rounded-full px-8 py-3"
              onPress={async () => {
                try {
                  // Begin upload step
                  setIsProcessing(true);
                  setProcessingStatus("Uploading video to secure storage...");
                  setProcessingProgress(90);

                  await addConfession(
                    {
                      type: "video",
                      content: "Video confession with face blur and voice change applied",
                      videoUri: previewUri,
                      transcription: previewTranscription,
                      isAnonymous: true,
                    },
                    {
                      onUploadProgress: (pct) => {
                        const mapped = 90 + pct * 0.1;
                        setProcessingProgress(Math.min(100, Math.max(90, mapped)));
                      },
                    },
                  );

                  Speech.stop();
                  setShowPreview(false);
                  setPreviewUri(null);
                  setPreviewTranscription("");

                  showMessage("Your video confession has been processed and shared anonymously!", "success", [
                    { text: "OK", onPress: () => navigation.goBack() },
                  ]);
                } catch (err) {
                  console.error(err);
                  showMessage("Failed to upload video. Please try again.", "error");
                } finally {
                  try {
                    Speech.stop();
                    if (previewPlayer) {
                      previewPlayer.pause?.();
                    }
                  } catch (error) {
                    if (__DEV__) {
                      console.warn("Error stopping preview after upload:", error);
                    }
                  }
                  setShowPreview(false);
                  setPreviewUri(null);
                  setPreviewTranscription("");
                  setIsProcessing(false);
                  setProcessingProgress(0);
                  setProcessingStatus("");
                }
              }}
            >
              <Text className="text-white font-semibold">Share</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Render main camera screen
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} mode="video" videoBitrate={5000000}>
        {/* Overlay UI */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          {/* Top Controls */}
          <SafeAreaView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
            <Pressable style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 9999, padding: 12 }} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 8, height: 8, backgroundColor: "#10B981", borderRadius: 9999, marginRight: 8 }} />
              <Text style={{ color: "white", fontSize: 14, fontWeight: "500" }}>Protected Mode</Text>
            </View>

            <Pressable style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 9999, padding: 12 }} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>

          {/* Bottom Controls */}
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <SafeAreaView style={{ alignItems: "center", paddingBottom: 32 }}>
              <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, marginHorizontal: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={{ color: "#10B981", fontSize: 14, fontWeight: "600", marginLeft: 8 }}>Privacy Protection Active</Text>
                </View>
                <Text style={{ color: "white", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                  Face blur and voice change will be applied automatically
                </Text>
              </View>

              {isRecording && (
                <View
                  style={{
                    backgroundColor: "#DC2626",
                    borderRadius: 9999,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#EF4444",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                  }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: "white", borderRadius: 9999, marginRight: 12 }} />
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>
                    REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                  </Text>
                  {/* Progress indicator */}
                  <View style={{ marginLeft: 12, width: 64, height: 4, backgroundColor: "#F87171", borderRadius: 9999, overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: "white",
                        borderRadius: 9999,
                        width: `${(recordingTime / 60) * 100}%`,
                      }}
                    />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 }}>
                {/* Camera Flip Button */}
                <View>
                  <Pressable
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 9999, padding: 12 }}
                    onPress={toggleCameraFacing}
                    disabled={isRecording || isProcessing}
                    accessibilityRole="button"
                    accessibilityLabel="Switch camera"
                  >
                    <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Record Button with TikTok-like animation */}
                <View>
                  <Pressable
                    style={{
                      borderRadius: 9999,
                      padding: 24,
                      borderWidth: 4,
                      backgroundColor: isRecording ? "#DC2626" : "transparent",
                      borderColor: isRecording ? "#F87171" : "white",
                      shadowColor: isRecording ? "#EF4444" : "transparent",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    }}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    accessibilityRole="button"
                    accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
                  >
                    <View
                      style={{
                        borderRadius: 9999,
                        width: isRecording ? 24 : 32,
                        height: isRecording ? 24 : 32,
                        backgroundColor: isRecording ? "white" : "#EF4444",
                      }}
                    />
                  </Pressable>
                </View>

                {/* Close Button */}
                <View>
                  <Pressable
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 9999, padding: 12 }}
                    onPress={() => navigation.goBack()}
                    disabled={isRecording || isProcessing}
                    accessibilityRole="button"
                    accessibilityLabel="Close camera"
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {!isRecording && (
                <View style={{ alignItems: "center", marginTop: 16 }}>
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "600", marginBottom: 4 }}>Tap to start recording</Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Max duration: 60 seconds</Text>
                </View>
              )}
            </SafeAreaView>
          </View>
        </View>
        {/* Privacy blur overlay with dynamic intensity for TikTok-like effect */}
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={{ position: "absolute", inset: 0 }}
          pointerEvents="none"
        />

        {/* Live captions overlay for recording preview */}
        {isRecording && (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 140, paddingHorizontal: 16 }}>
            <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: "white", fontSize: 14, fontWeight: "500", textAlign: "center" }}>
                Recording with live privacy protection...
              </Text>
            </View>
          </View>
        )}
      </CameraView>

      {/* Custom Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: "#111827", borderRadius: 16, padding: 24, width: "100%", maxWidth: 384 }}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Ionicons
                name={modalType === "success" ? "checkmark-circle" : "alert-circle"}
                size={48}
                color={modalType === "success" ? "#10B981" : "#EF4444"}
              />
            </View>
            <Text style={{ color: "white", fontSize: 16, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>{modalMessage}</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {modalButtons.map((button, index) => (
                <Pressable
                  key={index}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 9999,
                    backgroundColor: index === 0 ? "#3B82F6" : "#374151",
                  }}
                  onPress={() => {
                    setShowModal(false);
                    button.onPress?.();
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>{button.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
