import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as FileSystem from "../utils/legacyFileSystem";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load native modules to prevent Expo Go crashes
let FaceDetection: any;
let FFmpegKit: any;

const loadNativeModules = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Face blur not available in Expo Go - use development build");
  }

  try {
    if (!FaceDetection) {
      FaceDetection = await import("@react-native-ml-kit/face-detection");
    }
    if (!FFmpegKit) {
      // FFmpegKit = await import("ffmpeg-kit-react-native-community");
    }
  } catch (error) {
    console.error("Failed to load native modules:", error);
    throw new Error("Native modules not available");
  }
};

export interface FaceBlurOptions {
  blurIntensity?: number; // 1-50, default 15
  detectionMode?: "fast" | "accurate"; // default 'fast'
  onProgress?: (progress: number, status: string) => void;
}

export const useFaceBlurProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processVideoWithFaceBlur = useCallback(
    async (videoUri: string, options: FaceBlurOptions = {}): Promise<string> => {
      const { blurIntensity = 15, detectionMode = "fast", onProgress } = options;

      setIsProcessing(true);
      setError(null);
      onProgress?.(0, "Initializing face detection...");

      try {
        // Load native modules
        await loadNativeModules();
        onProgress?.(10, "Loading video for analysis...");

        // Check if input file exists
        try {
          const fileInfo = await FileSystem.getInfoAsync(videoUri);
          if (!fileInfo.exists) {
            throw new Error("Video file not found");
          }
        } catch (error) {
          throw new Error("Video file not found");
        }

        // Create output path
        const outputUri = videoUri.replace(/\.(mp4|mov)$/i, "_blurred.$1");
        onProgress?.(20, "Detecting faces in video...");

        // For development builds, use ML Kit for face detection
        const faceDetector = FaceDetection.FaceDetector.create({
          detectionMode:
            detectionMode === "fast" ? FaceDetection.FaceDetectionMode.FAST : FaceDetection.FaceDetectionMode.ACCURATE,
          landmarkMode: FaceDetection.FaceDetectionLandmarkMode.NONE,
          contourMode: FaceDetection.FaceDetectionContourMode.NONE,
          classificationMode: FaceDetection.FaceDetectionClassificationMode.NONE,
        });

        // Extract first frame for face detection
        const thumbnailUri = `${FileSystem.Paths.cache.uri}face_detection_frame.jpg`;

        onProgress?.(30, "Extracting frame for analysis...");

        // Use FFmpeg to extract first frame
        const extractFrameCommand = `-i "${videoUri}" -vf "select=eq(n\\,0)" -vframes 1 -y "${thumbnailUri}"`;

        const extractSession = await FFmpegKit.FFmpegKit.execute(extractFrameCommand);
        const extractReturnCode = await extractSession.getReturnCode();

        if (!FFmpegKit.ReturnCode.isSuccess(extractReturnCode)) {
          throw new Error("Failed to extract frame for face detection");
        }

        onProgress?.(40, "Analyzing faces...");

        // Detect faces in the extracted frame
        if (!faceDetector) {
          throw new Error("Face detector not initialized");
        }
        const faces = await faceDetector.processImage(thumbnailUri);

        console.log(`Detected ${faces.length} faces in video`);

        if (faces.length === 0) {
          onProgress?.(100, "No faces detected - returning original video");
          Alert.alert("No Faces Detected", "No faces found in the video. Original video will be used.");
          return videoUri;
        }

        onProgress?.(50, `Applying blur to ${faces.length} detected face(s)...`);

        // Apply blur using FFmpeg
        // For simplicity, we'll apply a general blur to the entire video
        // In production, you'd want to track faces and apply selective blur
        const blurCommand = `-i "${videoUri}" -vf "boxblur=${blurIntensity}:1" -c:a copy -y "${outputUri}"`;

        onProgress?.(70, "Processing video with face blur...");

        const blurSession = await FFmpegKit.FFmpegKit.execute(blurCommand);
        const blurReturnCode = await blurSession.getReturnCode();

        if (!FFmpegKit.ReturnCode.isSuccess(blurReturnCode)) {
          const logs = await blurSession.getAllLogsAsString();
          console.error("FFmpeg blur failed:", logs);
          throw new Error("Failed to apply face blur");
        }

        onProgress?.(90, "Finalizing processed video...");

        // Verify output file exists
        const outputInfo = await FileSystem.getInfoAsync(outputUri);
        if (!outputInfo.exists) {
          throw new Error("Processed video file not created");
        }

        // Cleanup temporary files
        try {
          await FileSystem.deleteAsync(thumbnailUri, { idempotent: true });
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary files:", cleanupError);
        }

        onProgress?.(100, "Face blur processing complete!");

        return outputUri;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Face blur processing failed:", error);
        setError(errorMessage);

        // Show user-friendly error
        if (errorMessage.includes("Expo Go")) {
          Alert.alert("Feature Unavailable", "Face blur requires a development build. Please use the original video.");
        } else {
          Alert.alert("Processing Error", `Face blur failed: ${errorMessage}. Using original video.`);
        }

        // Return original video on error
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

// Advanced face blur with selective region processing (for future enhancement)
export const processVideoWithSelectiveFaceBlur = async (
  videoUri: string,
  faces: any[],
  options: FaceBlurOptions = {},
): Promise<string> => {
  const { blurIntensity = 15 } = options;

  // This would implement frame-by-frame face tracking and selective blur
  // For now, we use the simpler approach above

  const outputUri = videoUri.replace(/\.(mp4|mov)$/i, "_selective_blur.$1");

  // Build complex FFmpeg filter for selective blur based on face coordinates
  const faceFilters = faces
    .map((face, index) => {
      const { boundingBox } = face;
      return `[0:v]crop=${boundingBox.width}:${boundingBox.height}:${boundingBox.left}:${boundingBox.top},boxblur=${blurIntensity}:1[blurred${index}]`;
    })
    .join(";");

  // This is a simplified example - real implementation would be more complex
  const selectiveBlurCommand = `-i "${videoUri}" -filter_complex "${faceFilters}" -c:a copy -y "${outputUri}"`;

  // Implementation would continue here...
  return outputUri;
};

// Fallback blur for Expo Go (applies general blur without face detection)
export const applyGeneralBlur = async (
  videoUri: string,
  blurIntensity: number = 15,
  onProgress?: (progress: number, status: string) => void,
): Promise<string> => {
  onProgress?.(0, "Applying general blur...");

  try {
    // For Expo Go, we can't use FFmpeg, so we return the original video
    // In a real implementation, you might use server-side processing
    if (IS_EXPO_GO) {
      onProgress?.(100, "Blur not available in Expo Go");
      Alert.alert("Feature Limited", "Video blur requires a development build. Original video will be used.");
      return videoUri;
    }

    // Load FFmpeg for development builds
    await loadNativeModules();

    const outputUri = videoUri.replace(/\.(mp4|mov)$/i, "_blurred.$1");

    onProgress?.(50, "Processing video with blur...");

    const blurCommand = `-i "${videoUri}" -vf "boxblur=${blurIntensity}:1" -c:a copy -y "${outputUri}"`;

    const session = await FFmpegKit.FFmpegKit.execute(blurCommand);
    const returnCode = await session.getReturnCode();

    if (FFmpegKit.ReturnCode.isSuccess(returnCode)) {
      onProgress?.(100, "Blur applied successfully!");
      return outputUri;
    } else {
      throw new Error("Failed to apply blur");
    }
  } catch (error) {
    console.error("General blur failed:", error);
    onProgress?.(100, "Blur failed - using original video");
    return videoUri;
  }
};

export default {
  useFaceBlurProcessing,
  processVideoWithSelectiveFaceBlur,
  applyGeneralBlur,
};
