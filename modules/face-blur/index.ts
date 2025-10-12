import { requireNativeModule } from 'expo-modules-core';

/**
 * Native Face Blur Module
 *
 * iOS: Uses Vision Framework + Core Image
 * Android: Uses ML Kit + RenderEffect/RenderScript
 */

// Lazy-load the native module to prevent crashes at import time
let FaceBlurModule: any = null;
let moduleLoadError: Error | null = null;

function getFaceBlurModule() {
  if (FaceBlurModule) {
    return FaceBlurModule;
  }

  if (moduleLoadError) {
    throw moduleLoadError;
  }

  try {
    FaceBlurModule = requireNativeModule('FaceBlurModule');
    return FaceBlurModule;
  } catch (error) {
    moduleLoadError = error instanceof Error ? error : new Error(String(error));
    console.warn('⚠️ FaceBlurModule not available:', error);
    throw moduleLoadError;
  }
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
export async function blurFacesInVideo(
  videoPath: string,
  options: BlurOptions = {}
): Promise<BlurResult> {
  const { blurIntensity = 50, onProgress } = options;

  try {
    const module = getFaceBlurModule();
    onProgress?.(0, 'Initializing...');

    const result = await module.blurFacesInVideo(
      videoPath,
      blurIntensity
    );

    onProgress?.(100, 'Complete!');

    return result;
  } catch (error) {
    console.error('Face blur error:', error);
    return {
      success: false,
      outputPath: undefined
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
  isNativeFaceBlurAvailable
};
