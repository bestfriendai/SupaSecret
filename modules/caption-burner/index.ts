import { NativeModules, Platform } from "react-native";

const LINKING_ERROR =
  `The package 'caption-burner' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: "" }) +
  "- You rebuilt the app after installing the package\n" +
  "- You are not using Expo Go (this module requires a development build)\n";

const CaptionBurnerModule = NativeModules.CaptionBurnerModule
  ? NativeModules.CaptionBurnerModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      },
    );

export interface CaptionWord {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence?: number;
  isComplete?: boolean;
}

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  isComplete: boolean;
  words: CaptionWord[];
}

export interface BurnCaptionsOptions {
  onProgress?: (progress: number, status: string) => void;
}

export interface BurnCaptionsResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Check if native caption burning is available
 */
export function isNativeCaptionBurnerAvailable(): boolean {
  try {
    return CaptionBurnerModule.isAvailable !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the native module (throws if not available)
 */
function getCaptionBurnerModule() {
  if (!isNativeCaptionBurnerAvailable()) {
    throw new Error(
      "Caption burner module not available. Make sure you're using a development build (not Expo Go) and have run 'npx expo run:ios'",
    );
  }
  return CaptionBurnerModule;
}

/**
 * Burn captions into a video file using native iOS AVFoundation
 * This permanently embeds captions into the video (like face blur)
 *
 * @param videoPath - Path to the input video (file:// or absolute path)
 * @param captionSegments - Array of caption segments with word-level timing
 * @param options - Burn configuration options
 * @returns Promise with output video path
 */
export async function burnCaptionsIntoVideo(
  videoPath: string,
  captionSegments: CaptionSegment[],
  options: BurnCaptionsOptions = {},
): Promise<BurnCaptionsResult> {
  const { onProgress } = options;

  try {
    const module = getCaptionBurnerModule();
    onProgress?.(0, "Initializing caption burning...");

    // Convert caption segments to JSON string
    const captionSegmentsJSON = JSON.stringify(captionSegments);

    console.log("🎬 Burning captions into video:", videoPath);
    console.log("📝 Caption segments:", captionSegments.length);

    onProgress?.(20, "Processing video with captions...");

    const result = await module.burnCaptionsIntoVideo(videoPath, captionSegmentsJSON);

    onProgress?.(100, "Complete!");

    console.log("✅ Caption burning complete:", result);

    return result;
  } catch (error) {
    console.error("Caption burning error:", error);
    return {
      success: false,
      outputPath: undefined,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if caption burning is supported on this platform
 */
export function isCaptionBurningSupported(): boolean {
  return Platform.OS === "ios" && isNativeCaptionBurnerAvailable();
}
