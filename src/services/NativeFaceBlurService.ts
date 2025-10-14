/**
 * Native Face Blur Service
 * Uses platform-native APIs for on-device video face blur
 * iOS: Uses Vision Framework + Core Image
 * Android: Uses ML Kit + RenderEffect/RenderScript
 */

import { Platform } from "react-native";
import { blurFacesInVideo as nativeBlurFaces, isNativeFaceBlurAvailable as checkAvailability } from "@local/face-blur";

export interface NativeFaceBlurOptions {
  blurIntensity?: number; // 0-100
  onProgress?: (progress: number, status: string) => void;
}

export interface NativeFaceBlurResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Blur faces in a video using native platform APIs
 */
export const blurFacesInVideo = async (
  inputPath: string,
  options: NativeFaceBlurOptions = {},
): Promise<NativeFaceBlurResult> => {
  const { blurIntensity = 50, onProgress } = options;

  try {
    if (!isNativeFaceBlurAvailable()) {
      return {
        success: false,
        error: "Native face blur not available. Rebuild with: npx expo run:ios",
      };
    }

    onProgress?.(10, "Starting native blur...");

    const result = await nativeBlurFaces(inputPath, {
      blurIntensity,
      onProgress: (progress, status) => {
        onProgress?.(progress, status);
      },
    });

    if (result.success && result.outputPath) {
      return {
        success: true,
        outputPath: result.outputPath,
      };
    } else {
      return {
        success: false,
        error: "Blur failed - no output path",
      };
    }
  } catch (error) {
    console.error("❌ Native face blur error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const isNativeFaceBlurAvailable = (): boolean => {
  try {
    return checkAvailability();
  } catch {
    return false;
  }
};
