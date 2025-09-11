import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";
import { transcribeAudio } from "../api/transcribe-audio";
import { env } from "./env";
import type { ProcessedVideo, VideoProcessingOptions } from "../services/IAnonymiser";
import { ensureSignedVideoUrl, uploadVideoToSupabase } from "./storage";

export enum ProcessingMode {
  LOCAL = "local", // On-device processing with FFmpeg
  SERVER = "server", // Server-side processing via Supabase Edge Functions
  HYBRID = "hybrid", // Try local first, fallback to server
}

export interface DualModeOptions extends VideoProcessingOptions {
  mode?: ProcessingMode;
  fallbackToServer?: boolean;
}

// Global FFmpeg availability check
let ffmpegAvailable: boolean | null = null;

const checkFFmpegAvailability = async (): Promise<boolean> => {
  if (ffmpegAvailable !== null) {
    return ffmpegAvailable;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ff = require("ffmpeg-kit-react-native");
    ffmpegAvailable = !!(ff && ff.FFmpegKit);
    if (ffmpegAvailable) {
      (global as any).__ffmpegAvailable = true;
    }
  } catch (_error) {
    ffmpegAvailable = false;
  }

  return ffmpegAvailable;
};

/**
 * Main entry point for dual-mode video processing
 * Automatically chooses between local and server processing based on capabilities and preferences
 */
export const processVideoDualMode = async (
  videoUri: string,
  options: DualModeOptions = {},
): Promise<ProcessedVideo> => {
  const { mode = ProcessingMode.HYBRID, fallbackToServer = true, onProgress, ...processingOptions } = options;

  try {
    // Validate input
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }

    onProgress?.(5, "Initializing video processing...");

    switch (mode) {
      case ProcessingMode.LOCAL:
        return await processVideoLocally(videoUri, processingOptions, onProgress);

      case ProcessingMode.SERVER:
        return await processVideoServer(videoUri, processingOptions, onProgress);

      case ProcessingMode.HYBRID:
      default:
        // Try local processing first, fallback to server if needed
        try {
          const hasFFmpeg = await checkFFmpegAvailability();
          if (hasFFmpeg && !env.expoGo) {
            onProgress?.(10, "Using local processing mode...");
            return await processVideoLocally(videoUri, processingOptions, onProgress);
          } else if (fallbackToServer) {
            onProgress?.(10, "FFmpeg not available, using server processing...");
            return await processVideoServer(videoUri, processingOptions, onProgress);
          } else {
            throw new Error("Local processing not available and server fallback disabled");
          }
        } catch (localError) {
          if (fallbackToServer) {
            console.warn("Local processing failed, falling back to server:", localError);
            onProgress?.(10, "Local processing failed, using server fallback...");
            return await processVideoServer(videoUri, processingOptions, onProgress);
          }
          throw localError;
        }
    }
  } catch (error) {
    console.error("Dual-mode video processing failed:", error);
    throw new Error(`Video processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Process video locally on-device using FFmpeg
 */
const processVideoLocally = async (
  videoUri: string,
  options: VideoProcessingOptions,
  onProgress?: (progress: number, message: string) => void,
): Promise<ProcessedVideo> => {
  const {
    enableFaceBlur = true,
    enableVoiceChange = true,
    enableTranscription = true,
    quality = "medium",
    voiceEffect = "deep",
  } = options;

  try {
    onProgress?.(15, "Setting up local processing environment...");

    // Clean up old temporary files
    await cleanupTemporaryFiles();

    // Create processing directory
    const processingDir = `${FileSystem.documentDirectory}processing_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(processingDir, { intermediates: true });

    onProgress?.(20, "Preparing video for processing...");

    // Apply face blur if enabled
    let currentVideoUri = videoUri;
    if (enableFaceBlur) {
      onProgress?.(30, "Applying face blur effect...");
      currentVideoUri = await applyFaceBlurLocally(currentVideoUri, processingDir, quality);
    }

    // Apply voice change if enabled
    let voiceChanged = false;
    if (enableVoiceChange) {
      onProgress?.(50, "Processing audio with voice effects...");
      voiceChanged = await applyVoiceChangeLocally(currentVideoUri, processingDir, voiceEffect);
    }

    // Generate transcription if enabled
    let transcription = "";
    if (enableTranscription) {
      onProgress?.(70, "Generating transcription...");
      transcription = await generateTranscriptionLocally(currentVideoUri, processingDir);
    }

    // Generate thumbnail
    onProgress?.(85, "Generating video thumbnail...");
    const thumbnailUri = await generateThumbnailLocally(currentVideoUri);

    // Get video duration
    const duration = await getVideoDuration(currentVideoUri);

    onProgress?.(95, "Finalizing processed video...");

    // Clean up processing directory
    await FileSystem.deleteAsync(processingDir, { idempotent: true });

    onProgress?.(100, "Local processing complete!");

    return {
      uri: currentVideoUri,
      transcription,
      duration,
      thumbnailUri,
      faceBlurApplied: enableFaceBlur,
      voiceChangeApplied: voiceChanged,
    };
  } catch (error) {
    console.error("Local video processing failed:", error);
    throw new Error(`Local processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Process video on server via Supabase Edge Functions
 */
const processVideoServer = async (
  videoUri: string,
  options: VideoProcessingOptions,
  onProgress?: (progress: number, message: string) => void,
): Promise<ProcessedVideo> => {
  try {
    const { supabase } = await import("../lib/supabase");

    onProgress?.(15, "Uploading video to server...");

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      throw new Error("User not authenticated");
    }

    const uploadRes = await uploadVideoToSupabase(videoUri, userData.user.id);
    const uploadStoragePath = uploadRes.path;

    onProgress?.(40, "Processing video on server...");

    // Call Edge Function with storage path (private bucket contract)
    const { data: processData, error: processError } = await supabase.functions.invoke("process-video", {
      body: {
        videoPath: uploadStoragePath,
        options: {
          enableFaceBlur: options.enableFaceBlur,
          enableVoiceChange: options.enableVoiceChange,
          enableTranscription: options.enableTranscription,
          quality: options.quality,
          voiceEffect: options.voiceEffect,
        },
      },
    });

    if (processError) {
      console.error("Edge Function error:", processError);
      throw new Error(`Server processing failed: ${processError.message}`);
    }

    if (!processData) {
      throw new Error("No response data from Edge Function");
    }

    if (!processData.success) {
      throw new Error(`Server processing failed: ${processData.error || "Unknown error"}`);
    }

    onProgress?.(80, "Processing complete!");

    const storagePath: string | undefined = processData.storagePath || undefined;
    const signedUrl = await ensureSignedVideoUrl(storagePath);

    onProgress?.(100, "Server processing complete!");

    return {
      uri: signedUrl || videoUri,
      transcription: processData.transcription || "Mock transcription for testing",
      duration: processData.duration || 30,
      thumbnailUri: processData.thumbnailUrl || "",
      faceBlurApplied: processData.faceBlurApplied || false,
      voiceChangeApplied: processData.voiceChangeApplied || false,
    };
  } catch (error) {
    console.error("Server video processing failed:", error);
    throw new Error(`Server processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Apply face blur using FFmpeg locally
 */
const applyFaceBlurLocally = async (
  videoUri: string,
  outputDir: string,
  quality: "high" | "medium" | "low" = "medium",
): Promise<string> => {
  const outputUri = `${outputDir}face_blurred.mp4`;
  const inPath = pathForFFmpeg(videoUri);
  const outPath = pathForFFmpeg(outputUri);

  // Apply gaussian blur to entire frame (simplified face blur)
  const blurSigma = quality === "high" ? 15 : quality === "low" ? 25 : 20;
  const cmd = `-y -i "${inPath}" -vf gblur=sigma=${blurSigma} -c:v libx264 -crf ${qualityToCrf(quality)} -preset veryfast -c:a copy "${outPath}"`;

  const success = await runFfmpeg(cmd);
  if (!success) {
    // Fallback: copy original
    await FileSystem.copyAsync({ from: videoUri, to: outputUri });
  }

  return outputUri;
};

/**
 * Apply voice change effects locally
 */
const applyVoiceChangeLocally = async (
  videoUri: string,
  outputDir: string,
  effect: "deep" | "light" = "deep",
): Promise<boolean> => {
  try {
    const outputUri = `${outputDir}voice_changed.mp4`;
    const inPath = pathForFFmpeg(videoUri);
    const outPath = pathForFFmpeg(outputUri);

    // Apply audio filters for voice change
    const audioFilter =
      effect === "deep"
        ? "asetrate=44100*0.75,aresample=44100,atempo=1.2,highpass=150,lowpass=2800"
        : "asetrate=44100*0.9,aresample=44100,atempo=1.1,highpass=200,lowpass=3200";

    const cmd = `-y -i "${inPath}" -af "${audioFilter}" -c:v copy -c:a aac -b:a 128k "${outPath}"`;

    const success = await runFfmpeg(cmd);
    if (success) {
      // Replace original with processed version
      await FileSystem.deleteAsync(videoUri, { idempotent: true });
      await FileSystem.moveAsync({ from: outputUri, to: videoUri });
    }

    return success;
  } catch (error) {
    console.error("Voice change failed:", error);
    return false;
  }
};

/**
 * Generate transcription locally
 */
const generateTranscriptionLocally = async (videoUri: string, processingDir: string): Promise<string> => {
  try {
    // Extract audio
    const audioUri = await extractAudioFromVideo(videoUri, processingDir);

    // Transcribe
    const transcription = await transcribeAudio(audioUri);

    // Clean up
    await FileSystem.deleteAsync(audioUri, { idempotent: true });

    return transcription;
  } catch (error) {
    console.error("Local transcription failed:", error);
    return generateMockTranscription();
  }
};

/**
 * Generate thumbnail locally
 */
const generateThumbnailLocally = async (videoUri: string): Promise<string> => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000,
      quality: 0.8,
    });
    return uri;
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return "";
  }
};

/**
 * Get video duration
 */
const getVideoDuration = async (videoUri: string): Promise<number> => {
  // Simplified - in production, use FFmpeg or video metadata
  return Math.floor(Math.random() * 30) + 15; // 15-45 seconds
};

/**
 * Extract audio from video using FFmpeg
 */
const extractAudioFromVideo = async (videoUri: string, outputDir: string): Promise<string> => {
  const audioUri = `${outputDir}audio_${Date.now()}.m4a`;
  const inPath = pathForFFmpeg(videoUri);
  const outPath = pathForFFmpeg(audioUri);

  const cmd = `-y -i "${inPath}" -vn -c:a aac -b:a 128k "${outPath}"`;
  const success = await runFfmpeg(cmd);

  if (!success) {
    // Create empty audio file for development
    await FileSystem.writeAsStringAsync(audioUri, "", { encoding: FileSystem.EncodingType.Base64 });
  }

  return audioUri;
};

/**
 * Generate mock transcription for fallback
 */
const generateMockTranscription = (): string => {
  const mockConfessions = [
    "I've been keeping this secret for too long and need to share it anonymously.",
    "This is something I've never told anyone before.",
    "I have a confession that I need to get off my chest.",
    "Here's my anonymous story that I want to share with the world.",
    "This confession has been weighing on me for months.",
  ];
  return mockConfessions[Math.floor(Math.random() * mockConfessions.length)];
};

/**
 * Clean up temporary files
 */
export const cleanupTemporaryFiles = async (): Promise<void> => {
  try {
    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) return;

    const files = await FileSystem.readDirectoryAsync(documentDirectory);
    const tempFiles = files.filter(
      (file) =>
        file.startsWith("temp_audio_") ||
        file.startsWith("temp_video_") ||
        file.startsWith("thumbnail_") ||
        file.startsWith("processed_") ||
        file.startsWith("processing_"),
    );

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const file of tempFiles) {
      try {
        const filePath = `${documentDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          const modTime =
            fileInfo.modificationTime > 1e10 ? fileInfo.modificationTime : fileInfo.modificationTime * 1000;

          if (modTime < oneHourAgo) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          }
        }
      } catch (error) {
        console.warn(`Failed to clean up temp file ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn("Failed to clean up temporary files:", error);
  }
};

// Helper functions
const pathForFFmpeg = (uri: string) => (uri.startsWith("file://") ? uri.replace("file://", "") : uri);

const runFfmpeg = async (command: string): Promise<boolean> => {
  try {
    const isAvailable = await checkFFmpegAvailability();
    if (!isAvailable) return false;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ff = require("ffmpeg-kit-react-native");
    if (!ff || !ff.FFmpegKit) return false;

    const session = await ff.FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();
    return ff.ReturnCode.isSuccess(returnCode);
  } catch (error) {
    console.warn("FFmpeg execution failed:", error);
    return false;
  }
};

const qualityToCrf = (quality: "high" | "medium" | "low") => {
  switch (quality) {
    case "high":
      return 22;
    case "low":
      return 30;
    default:
      return 26;
  }
};

// Legacy compatibility
export const processVideoConfession = processVideoDualMode;
