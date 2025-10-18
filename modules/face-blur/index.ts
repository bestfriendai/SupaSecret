import { NativeModules, Platform } from "react-native";

/**
 * Native Face Blur Module
 *
 * iOS: Uses Vision Framework + Core Image
 * Android: Uses ML Kit + RenderEffect/RenderScript
 */

// Get the native module from React Native's NativeModules
const { FaceBlurModule } = NativeModules;

let moduleLoadError: Error | null = null;

function getFaceBlurModule() {
  if (!FaceBlurModule) {
    if (!moduleLoadError) {
      moduleLoadError = new Error("FaceBlurModule not found in NativeModules");
      console.warn("⚠️ FaceBlurModule not available:", moduleLoadError);
    }
    throw moduleLoadError;
  }

  return FaceBlurModule;
}

export interface BlurResult {
  success: boolean;
  outputPath?: string;
}

export interface BlurOptions {
  blurIntensity?: number; // 0-100, default 50
  onProgress?: (progress: number, status: string) => void;
}

export interface FaceBlurOptions {
  blurIntensity?: number;
  detectionMode?: "fast" | "accurate";
}

/**
 * Blur faces in a video file
 *
 * @param videoPath - Path to the input video (file:// or absolute path)
 * @param options - Blur configuration options
 * @returns Promise with output video path
 */
export async function blurFacesInVideo(videoPath: string, options: BlurOptions = {}): Promise<BlurResult> {
  const { blurIntensity = 50, onProgress } = options;

  try {
    const module = getFaceBlurModule();
    onProgress?.(0, "Initializing...");

    const result = await module.blurFacesInVideo(videoPath, blurIntensity);

    onProgress?.(100, "Complete!");

    return result;
  } catch (error) {
    console.error("Face blur error:", error);
    return {
      success: false,
      outputPath: undefined,
    };
  }
}

/**
 * Apply face blur to a video (simplified interface for download service)
 * Returns the processed video URI or null if it fails
 */
export const applyFaceBlur = async (videoUri: string, options: FaceBlurOptions = {}): Promise<string | null> => {
  if (!FaceBlurModule) {
    console.warn("FaceBlurModule not available");
    return null;
  }

  try {
    const result = await FaceBlurModule.blurFacesInVideo(videoUri, {
      blurIntensity: options.blurIntensity || 50,
      detectionMode: options.detectionMode || "fast",
    });

    return result.success ? result.outputPath : null;
  } catch (error) {
    console.error("Face blur failed:", error);
    return null;
  }
};

/**
 * Check if face blur is available on this device
 */
export function isNativeFaceBlurAvailable(): boolean {
  try {
    const module = getFaceBlurModule();
    return module.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if face blur is supported on the current platform
 */
export const isFaceBlurSupported = (): boolean => {
  return !!FaceBlurModule && Platform.OS !== "web";
};

export default {
  blurFacesInVideo,
  isNativeFaceBlurAvailable,
  applyFaceBlur,
  isFaceBlurSupported,
};
