import { requireNativeModule } from 'expo-modules-core';

/**
 * Native Face Blur Module
 *
 * iOS: Uses Vision Framework + Core Image
 * Android: Uses ML Kit + RenderEffect/RenderScript
 */
const FaceBlurModule = requireNativeModule('FaceBlurModule');

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
    onProgress?.(0, 'Initializing...');

    const result = await FaceBlurModule.blurFacesInVideo(
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
    return FaceBlurModule.isAvailable();
  } catch {
    return false;
  }
}

export default {
  blurFacesInVideo,
  isNativeFaceBlurAvailable
};
