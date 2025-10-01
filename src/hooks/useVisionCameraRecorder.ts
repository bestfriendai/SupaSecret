/**
 * Vision Camera Recorder Hook with Real-time Face Blur
 * Uses Vision Camera + Skia for on-device real-time processing
 * Works with native builds only (not Expo Go)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";
import { useRealtimeFaceBlur } from "../services/VisionCameraFaceBlurProcessor";

// Import Vision Camera directly - will be tree-shaken in Expo Go
let Camera: any = null;
let useCameraDeviceHook: any = null;

// Load Vision Camera modules
const loadVisionCamera = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Vision Camera not available in Expo Go");
  }

  try {
    const visionCamera = await import("react-native-vision-camera");
    Camera = visionCamera.Camera;
    useCameraDeviceHook = visionCamera.useCameraDevice;
    return true;
  } catch (error) {
    console.error("Failed to load Vision Camera:", error);
    return false;
  }
};

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
 * Hook for Vision Camera recording with real-time face blur
 */
export const useVisionCameraRecorder = (options: VisionCameraRecorderOptions = {}) => {
  const {
    maxDuration = 60,
    enableFaceBlur = true,
    blurIntensity = 15,
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  // Refs
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  // State
  const [isVisionCameraLoaded, setIsVisionCameraLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cameraDevice, setCameraDevice] = useState<any>(null);

  // Face blur hook
  const { initializeFaceBlur, createFaceBlurFrameProcessor, isReady: faceBlurReady } = useRealtimeFaceBlur();

  // Initialize Vision Camera
  useEffect(() => {
    const init = async () => {
      try {
        const loaded = await loadVisionCamera();
        if (loaded) {
          setIsVisionCameraLoaded(true);

          // Initialize face blur if enabled
          if (enableFaceBlur) {
            await initializeFaceBlur();
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize Vision Camera";
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    init();
  }, [enableFaceBlur]);

  // Get camera device using the proper hook
  // This must be called after Vision Camera is loaded
  useEffect(() => {
    if (isVisionCameraLoaded && useCameraDeviceHook) {
      try {
        // Call the useCameraDevice hook to get the actual device
        // Note: This is a workaround since we can't call hooks conditionally
        // In a real implementation, this should be refactored to use the hook at the top level
        const getDevice = async () => {
          try {
            // Get all available devices
            const devices = await Camera.getAvailableCameraDevices();
            console.log('📹 Available camera devices:', devices.length);

            // Find the device matching the current facing direction
            const device = devices.find((d: any) => d.position === facing);

            if (device) {
              console.log('✅ Found camera device:', { position: device.position, id: device.id });
              setCameraDevice(device);
            } else {
              console.error('❌ No camera device found for position:', facing);
              setError(`No ${facing} camera found`);
            }
          } catch (err) {
            console.error('❌ Failed to get camera devices:', err);
            setError('Failed to get camera devices');
          }
        };

        getDevice();
      } catch (err) {
        console.error('❌ Error setting up camera device:', err);
        setError('Failed to setup camera');
      }
    }
  }, [isVisionCameraLoaded, facing]);

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
    if (!isVisionCameraLoaded) {
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
  }, [isVisionCameraLoaded]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || !cameraDevice) {
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

      console.log("🎬 Starting Vision Camera recording...");

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
  }, [cameraRef, cameraDevice, hasPermissions, requestPermissions, onRecordingStart, onRecordingStop, onError]);

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

  // Create frame processor if face blur is enabled
  const frameProcessor = enableFaceBlur && faceBlurReady ? createFaceBlurFrameProcessor(blurIntensity) : undefined;

  const state: VisionCameraRecorderState = {
    isRecording,
    recordingTime,
    hasPermissions,
    isReady: isVisionCameraLoaded && (enableFaceBlur ? faceBlurReady : true),
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
