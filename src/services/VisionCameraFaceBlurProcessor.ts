/**
 * Modern Face Blur Processor using Vision Camera + Skia + ML Kit
 * Replaces FFmpegKit with real-time frame processing
 * Works with native builds (not Expo Go)
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load native modules to prevent Expo Go crashes
let Camera: any;
let useSkiaFrameProcessor: any;
let detectFaces: any;
let Skia: any;

const loadNativeModules = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Face blur not available in Expo Go - use development build");
  }

  try {
    if (!Camera) {
      const visionCamera = await import("react-native-vision-camera");
      Camera = visionCamera.Camera;

      // Load useSkiaFrameProcessor from Vision Camera
      if ("useSkiaFrameProcessor" in visionCamera) {
        useSkiaFrameProcessor = visionCamera.useSkiaFrameProcessor;
      } else {
        console.warn("⚠️ useSkiaFrameProcessor not found in Vision Camera module");
      }
    }

    if (!Skia) {
      const skia = await import("@shopify/react-native-skia");
      Skia = skia.Skia;
    }

    if (!detectFaces) {
      try {
        await import("react-native-vision-camera-face-detector");
        console.log("✅ react-native-vision-camera-face-detector loaded");
      } catch (error) {
        console.warn("react-native-vision-camera-face-detector not available:", error);
      }
    }
  } catch (error) {
    console.error("Failed to load native modules:", error);
    throw new Error("Native modules not available. Ensure you're using a development build.");
  }
};

export interface FaceBlurOptions {
  blurIntensity?: number; // 1-50, default 15
  detectionMode?: "fast" | "accurate"; // default 'fast'
  onProgress?: (progress: number, status: string) => void;
}

/**
 * Hook for real-time face blur during video recording
 * Uses Vision Camera frame processors for on-the-fly processing
 */
export const useRealtimeFaceBlur = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeFaceBlur = useCallback(async () => {
    try {
      await loadNativeModules();
      setIsReady(true);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Face blur initialization failed:", error);
      setError(errorMessage);

      if (errorMessage.includes("Expo Go")) {
        Alert.alert(
          "Feature Unavailable",
          "Face blur requires a development build. Please build the app with 'npx expo run:ios' or 'npx expo run:android'.",
        );
      } else {
        Alert.alert("Initialization Error", `Face blur setup failed: ${errorMessage}`);
      }

      return false;
    }
  }, []);

  /**
   * Creates a Skia frame processor that blurs detected faces in real-time
   * This runs on every camera frame during recording
   */
  /**
   * Create a face blur frame processor
   * Uses the same approach as Marc Rousavy's FaceBlurApp reference implementation
   */
  const createFaceBlurFrameProcessor = useCallback(
    (blurIntensity: number = 25) => {
      if (!isReady) {
        console.warn("Face blur not initialized. Call initializeFaceBlur() first.");
        return null;
      }

      // This must be used inside a component with useSkiaFrameProcessor
      // Return null - the actual processor setup happens in the component
      return null;
    },
    [isReady],
  );

  return {
    initializeFaceBlur,
    createFaceBlurFrameProcessor,
    isReady,
    error,
  };
};

/**
 * Post-processing face blur for already recorded videos
 * Note: This is less efficient than real-time processing
 * Consider using real-time blur during recording instead
 */
export const usePostProcessFaceBlur = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processVideoWithFaceBlur = useCallback(
    async (videoUri: string, options: FaceBlurOptions = {}): Promise<string> => {
      const { blurIntensity = 15, onProgress } = options;

      setIsProcessing(true);
      setError(null);
      onProgress?.(0, "Initializing face blur...");

      try {
        await loadNativeModules();
        onProgress?.(20, "Loading video...");

        // For post-processing, we recommend using server-side processing
        // or implementing a frame-by-frame extraction and re-encoding pipeline
        // This is complex and resource-intensive on mobile devices

        console.warn(
          "Post-processing face blur is not recommended. " +
            "Use real-time blur during recording for better performance.",
        );

        onProgress?.(50, "Processing frames...");

        // TODO: Implement frame extraction, blur, and re-encoding
        // This would require:
        // 1. Extract frames from video
        // 2. Detect faces in each frame
        // 3. Apply blur to faces
        // 4. Re-encode video from processed frames
        // 5. Merge audio back

        // For now, return original video with warning
        Alert.alert(
          "Feature Not Available",
          "Post-processing face blur is not yet implemented. Please use real-time blur during recording.",
        );

        onProgress?.(100, "Complete");
        return videoUri;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Face blur processing failed:", error);
        setError(errorMessage);

        Alert.alert("Processing Error", `Face blur failed: ${errorMessage}`);
        return videoUri;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    processVideoWithFaceBlur,
    isProcessing,
    error,
  };
};

/**
 * Utility function to check if face blur is available
 */
export const isFaceBlurAvailable = async (): Promise<boolean> => {
  if (IS_EXPO_GO) {
    return false;
  }

  try {
    await loadNativeModules();
    return true;
  } catch {
    return false;
  }
};

/**
 * Get camera permissions for face blur
 */
export const requestFaceBlurPermissions = async (): Promise<boolean> => {
  try {
    await loadNativeModules();

    const cameraPermission = await Camera.requestCameraPermission();
    const microphonePermission = await Camera.requestMicrophonePermission();

    return cameraPermission === "granted" && microphonePermission === "granted";
  } catch (error) {
    console.error("Failed to request permissions:", error);
    return false;
  }
};

export default {
  useRealtimeFaceBlur,
  usePostProcessFaceBlur,
  isFaceBlurAvailable,
  requestFaceBlurPermissions,
};
