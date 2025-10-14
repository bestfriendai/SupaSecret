import { NativeModules } from "react-native";

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

export default {
  blurFacesInVideo,
  isNativeFaceBlurAvailable,
};
