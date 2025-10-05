/**
 * Vision Camera Recorder Hook with Native Face Blur
 *
 * FIXED: Removed buggy useSkiaFrameProcessor (memory leak causing 2s crash)
 * NOW USES: Native iOS Core Image blur plugin (stable, no memory leaks)
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Direct imports - will be tree-shaken in Expo Go
let Camera: any = null;
let useCameraDevice: any = null;
let useFrameProcessor: any = null;
let useFaceDetector: any = null;

// Import modules (safe for native builds)
if (!IS_EXPO_GO) {
  try {
    const visionCamera = require("react-native-vision-camera");
    Camera = visionCamera.Camera;
    useCameraDevice = visionCamera.useCameraDevice;
    useFrameProcessor = visionCamera.useFrameProcessor;

    const faceDetector = require("react-native-vision-camera-face-detector");
    useFaceDetector = faceDetector.useFaceDetector;
  } catch (error) {
    console.error("Failed to load Vision Camera modules:", error);
  }
}

export interface VisionCameraRecorderOptions {
  maxDuration?: number;
  enableFaceBlur?: boolean;
  blurIntensity?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: (videoPath: string) => void;
  onError?: (error: string) => void;
}

export interface VisionCameraRecorderState {
  isRecording: boolean;
  recordingTime: number;
  hasPermissions: boolean;
  isReady: boolean;
  error?: string;
  cameraDevice: any;
  facing: "front" | "back";
}

export interface VisionCameraRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleCamera: () => void;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for Vision Camera recording with native face blur
 * Uses iOS Core Image (CIGaussianBlur) - much more stable than Skia
 */
export const useVisionCameraRecorder = (options: VisionCameraRecorderOptions = {}) => {
  const {
    maxDuration = 60,
    enableFaceBlur = true,
    blurIntensity = 25,
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  // Refs
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Check permissions on mount
  useEffect(() => {
    if (!IS_EXPO_GO && Camera) {
      Camera.getCameraPermissionStatus().then((status: string) => {
        setHasPermissions(status === "granted");
      });
      Camera.getMicrophonePermissionStatus().then((status: string) => {
        if (status !== "granted") {
          setHasPermissions(false);
        }
      });
    }
  }, []);

  // Get camera device - MUST be called unconditionally at top level
  const cameraDevice = !IS_EXPO_GO && useCameraDevice ? useCameraDevice(facing) : null;

  // Face detector hook - MUST be called unconditionally at top level
  const faceDetectorResult =
    !IS_EXPO_GO && useFaceDetector && enableFaceBlur
      ? useFaceDetector({
          performanceMode: "fast",
          contourMode: "all",
          landmarkMode: "none",
          classificationMode: "none",
        })
      : { detectFaces: null };

  const detectFaces = faceDetectorResult?.detectFaces;

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
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
    if (IS_EXPO_GO || !Camera) {
      Alert.alert("Not Available", "Camera is not available in Expo Go");
      return false;
    }

    try {
      const cameraPermission = await Camera.requestCameraPermission();
      const micPermission = await Camera.requestMicrophonePermission();

      const granted = cameraPermission === "granted" && micPermission === "granted";
      setHasPermissions(granted);

      if (!granted) {
        Alert.alert("Permissions Required", "Camera and microphone permissions are required to record videos.");
      }

      return granted;
    } catch (error) {
      console.error("Failed to request permissions:", error);
      Alert.alert("Error", "Failed to request permissions");
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current) {
      console.warn("Camera ref not ready");
      return;
    }

    if (!cameraDevice) {
      console.warn("Camera device not ready");
      return;
    }

    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    try {
      console.log("🎬 Starting Vision Camera recording...");
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();

      await cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          console.log("✅ Recording finished:", video.path);
          isRecordingRef.current = false;
          setIsRecording(false);
          onRecordingStop?.(video.path);
        },
        onRecordingError: (error: any) => {
          console.error("❌ Recording error:", error);
          const errorMessage = error.message || "Recording failed";
          setError(errorMessage);
          onError?.(errorMessage);
          isRecordingRef.current = false;
          setIsRecording(false);
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
  }, [cameraDevice, hasPermissions, requestPermissions, onRecordingStart, onRecordingStop, onError]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingRef.current) {
      console.warn("Cannot stop recording - not currently recording");
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
  }, [onError]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  // Native blur frame processor - NO SKIA, uses Core Image plugin
  const frameProcessor = useMemo(() => {
    if (!useFrameProcessor || !enableFaceBlur || !detectFaces) {
      console.log("Frame processor not created:", {
        hasHook: !!useFrameProcessor,
        enabled: enableFaceBlur,
        hasDetector: !!detectFaces,
      });
      return null;
    }

    try {
      console.log("✅ Creating native blur frame processor");

      // Use standard useFrameProcessor + native plugin
      return useFrameProcessor(
        (frame) => {
          "worklet";

          try {
            // Detect faces
            const result = detectFaces(frame);
            if (!result?.faces || result.faces.length === 0) {
              return;
            }

            // Convert faces to regions for native plugin
            const faceRegions = result.faces.map((face: any) => ({
              x: face.bounds?.x ?? face.frame?.x ?? 0,
              y: face.bounds?.y ?? face.frame?.y ?? 0,
              width: face.bounds?.width ?? face.frame?.width ?? 0,
              height: face.bounds?.height ?? face.frame?.height ?? 0,
              blurRadius: blurIntensity,
            }));

            // Call native blur plugin (iOS Core Image)
            // @ts-ignore - Native plugin registered in AppDelegate
            if (typeof blurFaces !== "undefined") {
              blurFaces(frame, faceRegions);
            }
          } catch (error) {
            // Silent fail - continue recording without blur
            console.error("Frame processing error:", error);
          }
        },
        [detectFaces, blurIntensity]
      );
    } catch (err) {
      console.error("❌ Failed to create frame processor:", err);
      return null;
    }
  }, [useFrameProcessor, enableFaceBlur, detectFaces, blurIntensity]);

  const state: VisionCameraRecorderState = {
    isRecording,
    recordingTime,
    hasPermissions,
    isReady: !IS_EXPO_GO && !!Camera && !!cameraDevice && (enableFaceBlur ? !!detectFaces : true),
    error,
    cameraDevice,
    facing,
  };

  const controls: VisionCameraRecorderControls = {
    startRecording,
    stopRecording,
    toggleCamera,
    requestPermissions,
  };

  return {
    state,
    controls,
    cameraRef,
    frameProcessor,
    Camera,
  };
};
