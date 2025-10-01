/**
 * Face Blur Recorder Hook
 * Based on FaceBlurApp by Marc Rousavy: https://github.com/mrousavy/FaceBlurApp
 *
 * Uses Vision Camera + react-native-vision-camera-face-detector + Skia
 * for real-time face blur at 60-120 FPS during video recording.
 *
 * Native builds only (not Expo Go)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load Vision Camera modules
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraFormat: any = null;
let useSkiaFrameProcessor: any = null;
let useFrameProcessor: any = null;
let useFaceDetector: any = null;
let runAsync: any = null;
let Skia: any = null;
let ClipOp: any = null;
let TileMode: any = null;

const loadVisionCamera = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Vision Camera not available in Expo Go");
  }

  try {
    // Load Vision Camera (includes useSkiaFrameProcessor)
    const visionCamera = await import("react-native-vision-camera");
    Camera = visionCamera.Camera;
    useCameraDevice = visionCamera.useCameraDevice;
    useCameraFormat = visionCamera.useCameraFormat;
    useFrameProcessor = visionCamera.useFrameProcessor;
    runAsync = visionCamera.runAsync;

    // Check if useSkiaFrameProcessor is available in Vision Camera
    if ("useSkiaFrameProcessor" in visionCamera) {
      useSkiaFrameProcessor = visionCamera.useSkiaFrameProcessor;
      console.log("✅ useSkiaFrameProcessor loaded from Vision Camera");
    } else {
      console.warn("⚠️ useSkiaFrameProcessor not found in Vision Camera module");
    }

    // Load Skia for drawing APIs
    const skia = await import("@shopify/react-native-skia");
    Skia = skia.Skia;
    ClipOp = skia.ClipOp;
    TileMode = skia.TileMode;

    // Load Face Detector
    const faceDetector = await import("react-native-vision-camera-face-detector");
    useFaceDetector = faceDetector.useFaceDetector;

    console.log("✅ Vision Camera, Face Detector, and Skia loaded successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to load Vision Camera modules:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
};

export interface FaceBlurRecorderOptions {
  maxDuration?: number;
  blurRadius?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: (videoPath: string) => void;
  onError?: (error: string) => void;
}

export interface FaceBlurRecorderState {
  isRecording: boolean;
  recordingTime: number;
  hasPermissions: boolean;
  isReady: boolean;
  error?: string;
  facing: "front" | "back";
}

export interface FaceBlurRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleCamera: () => void;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for Vision Camera recording with FaceBlurApp-style real-time face blur
 */
export const useFaceBlurRecorder = (options: FaceBlurRecorderOptions = {}) => {
  const { maxDuration = 60, blurRadius = 25, onRecordingStart, onRecordingStop, onError } = options;

  // Refs
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Initialize Vision Camera
  useEffect(() => {
    const init = async () => {
      try {
        console.log("🎬 Starting Vision Camera initialization...");
        const loaded = await loadVisionCamera();
        console.log("🎬 loadVisionCamera returned:", loaded);
        if (loaded) {
          console.log("✅ Setting isLoaded to true");
          setIsLoaded(true);
        } else {
          const errorMessage = "Failed to load Vision Camera modules";
          console.error("❌ Vision Camera failed to load");
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize Vision Camera";
        console.error("❌ Vision Camera initialization error:", errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    init();
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
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
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isLoaded || !Camera) {
      setError("Vision Camera not loaded");
      return false;
    }

    try {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      const granted = cameraPermission === "granted" && microphonePermission === "granted";
      setHasPermissions(granted);

      if (!granted) {
        Alert.alert("Permissions Required", "Camera and microphone permissions are required to record videos.");
      }

      return granted;
    } catch (error) {
      console.error("Permission request failed:", error);
      setError("Failed to request permissions");
      return false;
    }
  }, [isLoaded]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current) {
      return;
    }

    try {
      // Check permissions
      if (!hasPermissions) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      setError(undefined);
      setRecordingTime(0);
      isRecordingRef.current = true;
      setIsRecording(true);

      onRecordingStart?.();

      console.log("🎬 Starting Vision Camera recording with face blur...");

      await cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          console.log("✅ Recording finished:", video.path);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          onRecordingStop?.(video.path);
        },
        onRecordingError: (error: any) => {
          console.error("❌ Recording error:", error);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          const errorMessage = error?.message || "Recording failed";
          setError(errorMessage);
          onError?.(errorMessage);
        },
      });
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      setError(errorMessage);
      onError?.(errorMessage);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [cameraRef, hasPermissions, requestPermissions, onRecordingStart, onRecordingStop, onError]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingRef.current) {
      return;
    }

    try {
      console.log("🛑 Stopping Vision Camera recording...");
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to stop recording";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [cameraRef, onError]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  const state: FaceBlurRecorderState = {
    isRecording,
    recordingTime,
    hasPermissions,
    isReady: isLoaded,
    error,
    facing,
  };

  const controls: FaceBlurRecorderControls = {
    startRecording,
    stopRecording,
    toggleCamera,
    requestPermissions,
  };

  return {
    state,
    controls,
    cameraRef,
    isLoaded,
    Camera,
    useCameraDevice,
    useCameraFormat,
    useSkiaFrameProcessor,
    useFrameProcessor,
    useFaceDetector,
    runAsync,
    Skia,
    ClipOp,
    TileMode,
    blurRadius,
  };
};

export default useFaceBlurRecorder;
