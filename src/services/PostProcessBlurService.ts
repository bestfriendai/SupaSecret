/**
 * Post-Process Blur Service
 * Applies face blur to recorded videos using on-device native processing
 */

import { Alert } from "react-native";
import { blurFacesInVideo, isNativeFaceBlurAvailable } from "./NativeFaceBlurService";

export interface PostProcessBlurOptions {
  blurIntensity?: number;
  onProgress?: (progress: number, status: string) => void;
}

export interface PostProcessBlurResult {
  success: boolean;
  processedVideoUri?: string;
  error?: string;
}

/**
 * Apply face blur to a recorded video
 */
export const applyPostProcessBlur = async (
  videoUri: string,
  options: PostProcessBlurOptions = {},
): Promise<PostProcessBlurResult> => {
  const { blurIntensity = 50, onProgress } = options;

  try {
    onProgress?.(0, "Initializing blur...");

    if (!isNativeFaceBlurAvailable()) {
      onProgress?.(100, "Blur not available");
      return {
        success: false,
        error: "Native blur not available. Build with: npx expo run:ios",
      };
    }

    onProgress?.(20, "Processing video...");

    const result = await blurFacesInVideo(videoUri, {
      blurIntensity,
      onProgress: (progress, status) => {
        onProgress?.(20 + progress * 0.7, status);
      },
    });

    if (result.success && result.outputPath) {
      onProgress?.(100, "Blur applied!");
      return {
        success: true,
        processedVideoUri: `file://${result.outputPath}`,
      };
    } else {
      return {
        success: false,
        error: result.error || "Blur failed",
      };
    }
  } catch (error) {
    console.error("❌ Post-process blur failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Check if post-processing blur is available
 */
export const isPostProcessBlurAvailable = async (): Promise<boolean> => {
  return isNativeFaceBlurAvailable();
};

/**
 * Get blur processing method
 */
export const getBlurProcessingMethod = (): "on-device" | "unavailable" => {
  return isNativeFaceBlurAvailable() ? "on-device" : "unavailable";
};

/**
 * Show blur processing info to user
 */
export const showBlurProcessingInfo = () => {
  const method = getBlurProcessingMethod();

  const messages = {
    "on-device": "Face blur will be applied on your device using AI face detection",
    unavailable: "Face blur requires a native build. Run: npx expo run:ios",
  };

  Alert.alert("Face Blur Processing", messages[method], [{ text: "Got it" }]);
};

/**
 * Estimate processing time
 */
export const estimateProcessingTime = (videoDurationSeconds: number): number => {
  // Native processing is faster
  return videoDurationSeconds * 2;
};
