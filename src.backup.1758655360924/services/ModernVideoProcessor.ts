/**
 * Modern Video Processing Service for September 2025
 * Supports both Expo Go (fallback) and Development Builds (full features)
 * Replaces deprecated react-native-video-processing
 */

import * as VideoThumbnails from "expo-video-thumbnails";
// removed unused ImageManipulator
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "../utils/legacyFileSystem";
import { Directory } from "expo-file-system";
import Constants from "expo-constants";
// removed unused Platform
import {
  videoValidation,
  validateVideoProcessingOptions,
  VideoProcessingOptions as ValidationVideoProcessingOptions,
} from "../utils/validation";

// Check if we're in Expo Go or Development Build
const IS_EXPO_GO = Constants.appOwnership === "expo";
const IS_DEV_BUILD = Constants.appOwnership === null;
const HAS_FFMPEG = !IS_EXPO_GO; // FFmpeg only available in dev builds

// Lazy load FFmpeg for development builds only
let FFmpegKit: any = null;
let FFmpegKitConfig: any = null;
let FFprobeKit: any = null;
let ReturnCode: any = null;

const loadFFmpeg = async () => {
  if (!HAS_FFMPEG || FFmpegKit) return;

  try {
    const ffmpegModule = await import("ffmpeg-kit-react-native");
    FFmpegKit = ffmpegModule.FFmpegKit;
    FFmpegKitConfig = ffmpegModule.FFmpegKitConfig;
    FFprobeKit = ffmpegModule.FFprobeKit;
    ReturnCode = ffmpegModule.ReturnCode;

    if (__DEV__) {
      console.log("✅ FFmpeg loaded successfully for development build");
    }
  } catch (error) {
    if (__DEV__) {
      console.log("⚠️ FFmpeg not available - using Expo Go fallbacks");
    }
  }
};

// Initialize FFmpeg on module load for dev builds
if (HAS_FFMPEG) {
  loadFFmpeg();
}

const resolveCacheDirectory = (): string => {
  const fsAny = FileSystem as unknown as {
    cacheDirectory?: string | null;
    documentDirectory?: string | null;
    temporaryDirectory?: string | null;
    Paths?: { cache?: { uri?: string }; document?: { uri?: string } };
  };

  const candidate =
    fsAny.cacheDirectory ??
    fsAny.documentDirectory ??
    fsAny.temporaryDirectory ??
    fsAny.Paths?.cache?.uri ??
    fsAny.Paths?.document?.uri ??
    null;

  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate.endsWith("/") ? candidate : `${candidate}/`;
  }

  throw new Error("Unable to resolve cache directory.");
};

export interface VideoProcessingOptions {
  quality?: "low" | "medium" | "high" | "highest";
  maxDuration?: number; // seconds
  removeAudio?: boolean;
  outputFormat?: "mp4" | "mov";
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
}

export interface ProcessedVideo {
  uri: string;
  width: number;
  height: number;
  duration: number;
  size: number;
  thumbnail?: string;
}

export class ModernVideoProcessor {
  private static instance: ModernVideoProcessor;

  static getInstance(): ModernVideoProcessor {
    if (!this.instance) {
      this.instance = new ModernVideoProcessor();
    }
    return this.instance;
  }

  /**
   * Process video with automatic fallback for Expo Go
   */
  async processVideo(
    videoUri: string,
    options: VideoProcessingOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<ProcessedVideo> {
    try {
      onProgress?.(1);

      // Validate processing options using comprehensive validation
      const mappedOptions: ValidationVideoProcessingOptions = {
        quality: options.quality === "highest" ? "high" : (options.quality as "low" | "medium" | "high" | undefined),
        voiceEffect: "none", // Not supported in this processor
        transcriptionEnabled: false, // Not supported in this processor
        backgroundMusic: false,
        filters: [], // Not supported in this processor
      };

      const optionsValidation = validateVideoProcessingOptions(mappedOptions);
      if (!optionsValidation.isValid && optionsValidation.error) {
        throw new Error(`Invalid processing options: ${optionsValidation.error}`);
      }

      // Log validation warnings
      if (optionsValidation.warnings && __DEV__) {
        console.warn("ModernVideoProcessor options warnings:", optionsValidation.warnings);
      }

      onProgress?.(2);

      // Validate video file
      let fileInfo: any;
      try {
        fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          throw new Error("Video file does not exist");
        }
      } catch (error) {
        throw new Error("Video file does not exist");
      }

      // Comprehensive file validation
      const fileValidation = videoValidation.videoFile({ uri: videoUri, size: fileInfo.size });
      if (!fileValidation.isValid && fileValidation.error) {
        throw new Error(fileValidation.error);
      }

      // Validate file size
      if (fileInfo.size) {
        const maxSize = IS_EXPO_GO ? 50 : 200; // Lower limits for Expo Go
        const sizeValidation = videoValidation.videoSize(fileInfo.size, maxSize);
        if (!sizeValidation.isValid && sizeValidation.error) {
          throw new Error(sizeValidation.error);
        }

        if (sizeValidation.warnings && __DEV__) {
          console.warn("Video size warnings:", sizeValidation.warnings);
        }
      }

      // Validate video format from URI
      const videoFormat = this.extractFormatFromUri(videoUri);
      if (videoFormat) {
        const formatValidation = videoValidation.videoFormat(videoFormat);
        if (!formatValidation.isValid && formatValidation.error) {
          throw new Error(formatValidation.error);
        }
      }

      // Validate environment-specific options
      if (IS_EXPO_GO && options.maxDuration && options.maxDuration > 120) {
        throw new Error("Maximum duration in Expo Go is limited to 120 seconds");
      }

      if (!IS_EXPO_GO && options.maxDuration && options.maxDuration > 300) {
        throw new Error("Maximum duration is limited to 300 seconds");
      }

      onProgress?.(5);

      // Process video with selected method
      if (IS_EXPO_GO) {
        try {
          return await this.processVideoExpoGo(videoUri, options, onProgress);
        } catch (error) {
          console.error("Expo Go processing failed, using minimal fallback:", error);
          // Minimal fallback - just copy the file and generate basic metadata
          return this.createMinimalProcessedVideo(videoUri, options);
        }
      } else {
        return this.processVideoWithFFmpeg(videoUri, options, onProgress);
      }
    } catch (error) {
      console.error("[ModernVideoProcessor] Processing failed:", error);

      // Enhanced error handling for validation errors
      if (error instanceof Error) {
        if (
          error.message.includes("Invalid processing options:") ||
          error.message.includes("Unsupported video format") ||
          error.message.includes("Video size must be less than") ||
          error.message.includes("Maximum duration")
        ) {
          // These are validation errors - re-throw with original message
          throw error;
        }

        throw new Error(`Video processing failed: ${error.message}`);
      }

      throw new Error("Video processing failed: Unknown error occurred");
    }
  }

  /**
   * Expo Go fallback - limited processing using only Expo SDK APIs
   */
  private async processVideoExpoGo(
    videoUri: string,
    options: VideoProcessingOptions,
    onProgress?: (progress: number) => void,
  ): Promise<ProcessedVideo> {
    if (__DEV__) {
      console.log("📱 Using Expo Go video processing fallback");
    }

    onProgress?.(10);

    // Get video info
    let videoInfo: any;
    try {
      videoInfo = await FileSystem.getInfoAsync(videoUri);
      if (!videoInfo.exists) {
        throw new Error("Video file not found");
      }
    } catch (error) {
      throw new Error("Video file not found");
    }

    onProgress?.(30);

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(videoUri);

    onProgress?.(60);

    // In Expo Go, we can't compress or trim, so we just copy the file
    const outputDir = `${resolveCacheDirectory()}processed/`;
    new Directory(outputDir).create({ intermediates: true });

    const outputUri = `${outputDir}video_${Date.now()}.mp4`;
    await FileSystem.copyAsync({
      from: videoUri,
      to: outputUri,
    });

    onProgress?.(90);

    // Return processed video info
    const result: ProcessedVideo = {
      uri: outputUri,
      width: 1920, // Default values since we can't get actual dimensions in Expo Go
      height: 1080,
      duration: 60, // Default duration
      size: (videoInfo as any).size || 0,
      thumbnail,
    };

    onProgress?.(100);

    if (__DEV__) {
      console.log("✅ Expo Go video processing complete (limited features)");
    }

    return result;
  }

  /**
   * Development build - full processing with FFmpeg
   */
  private async processVideoWithFFmpeg(
    videoUri: string,
    options: VideoProcessingOptions,
    onProgress?: (progress: number) => void,
  ): Promise<ProcessedVideo> {
    await loadFFmpeg();

    if (!FFmpegKit) {
      console.warn("FFmpeg not available, falling back to Expo Go processing");
      return this.processVideoExpoGo(videoUri, options, onProgress);
    }

    if (__DEV__) {
      console.log("🎬 Using FFmpeg for full video processing");
    }

    onProgress?.(10);

    // Get video metadata
    const metadata = await this.getVideoMetadata(videoUri);

    onProgress?.(20);

    // Build FFmpeg command
    const outputDir = `${resolveCacheDirectory()}processed/`;
    new Directory(outputDir).create({ intermediates: true });

    const outputUri = `${outputDir}video_${Date.now()}.mp4`;
    const command = this.buildFFmpegCommand(videoUri, outputUri, options, metadata);

    onProgress?.(30);

    // Execute FFmpeg command
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      throw new Error("Video processing failed");
    }

    onProgress?.(80);

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(outputUri);

    onProgress?.(90);

    // Get processed video info
    const processedInfo = await FileSystem.getInfoAsync(outputUri);
    const processedMetadata = await this.getVideoMetadata(outputUri);

    const result: ProcessedVideo = {
      uri: outputUri,
      width: processedMetadata.width,
      height: processedMetadata.height,
      duration: processedMetadata.duration,
      size: (processedInfo as any).size || 0,
      thumbnail,
    };

    onProgress?.(100);

    if (__DEV__) {
      console.log("✅ FFmpeg video processing complete");
    }

    return result;
  }

  /**
   * Create minimal processed video for fallback scenarios
   */
  private async createMinimalProcessedVideo(
    videoUri: string,
    options: VideoProcessingOptions,
  ): Promise<ProcessedVideo> {
    // Just copy the file and generate basic metadata
    const outputDir = `${resolveCacheDirectory()}fallback/`;
    new Directory(outputDir).create({ intermediates: true });

    const outputUri = `${outputDir}video_${Date.now()}.mp4`;
    await FileSystem.copyAsync({
      from: videoUri,
      to: outputUri,
    });

    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(videoUri);

    // Get file size
    let size = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(outputUri);
      size = (fileInfo as any).size || 0;
    } catch (error) {
      console.warn("Could not get file size:", error);
    }

    return {
      uri: outputUri,
      width: 1920,
      height: 1080,
      duration: 60,
      size,
      thumbnail,
    };
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(videoUri: string, time: number = 0): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: time * 1000, // Convert to milliseconds
        quality: 0.8,
      });
      return uri;
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to generate thumbnail:", error);
      }
      // Return a placeholder or empty string if thumbnail generation fails
      return "";
    }
  }

  /**
   * Get video metadata using FFprobe (dev builds only)
   */
  private async getVideoMetadata(videoUri: string): Promise<any> {
    if (!FFprobeKit) {
      // Return default values for Expo Go
      return {
        width: 1920,
        height: 1080,
        duration: 60,
        bitrate: 5000000,
        fps: 30,
      };
    }

    return new Promise((resolve, reject) => {
      FFprobeKit.getMediaInformation(videoUri, async (session: any) => {
        const info = await session.getMediaInformation();
        if (info) {
          const streams = info.getStreams();
          const videoStream = streams.find((s: any) => s.getType() === "video");

          resolve({
            width: videoStream?.getWidth() || 1920,
            height: videoStream?.getHeight() || 1080,
            duration: info.getDuration() || 60,
            bitrate: info.getBitrate() || 5000000,
            fps: videoStream?.getFps() || 30,
          });
        } else {
          reject(new Error("Failed to get video metadata"));
        }
      });
    });
  }

  /**
   * Build FFmpeg command based on options
   */
  private buildFFmpegCommand(
    inputUri: string,
    outputUri: string,
    options: VideoProcessingOptions,
    metadata: any,
  ): string {
    const args: string[] = ["-i", inputUri];

    // Quality/bitrate settings
    const qualityBitrates = {
      low: 500000,
      medium: 1000000,
      high: 2500000,
      highest: 5000000,
    };

    const bitrate = options.bitrate || qualityBitrates[options.quality || "high"];
    args.push("-b:v", `${bitrate}`);

    // Resolution
    if (options.width || options.height) {
      const width = options.width || -2;
      const height = options.height || -2;
      args.push("-vf", `scale=${width}:${height}`);
    }

    // Frame rate
    if (options.fps) {
      args.push("-r", `${options.fps}`);
    }

    // Duration limit
    if (options.maxDuration) {
      args.push("-t", `${options.maxDuration}`);
    }

    // Audio settings
    if (options.removeAudio) {
      args.push("-an");
    } else {
      args.push("-c:a", "aac", "-b:a", "128k");
    }

    // Output format
    args.push("-c:v", "h264");
    args.push("-preset", "fast");
    args.push("-movflags", "faststart");

    // Output file
    args.push(outputUri);

    return args.join(" ");
  }

  /**
   * Trim video (start and end times in seconds)
   */
  async trimVideo(
    videoUri: string,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number) => void,
  ): Promise<ProcessedVideo> {
    if (IS_EXPO_GO) {
      // In Expo Go, we can't trim, so return original
      if (__DEV__) {
        console.warn("Video trimming not available in Expo Go");
      }
      return this.processVideoExpoGo(videoUri, {}, onProgress);
    }

    await loadFFmpeg();
    if (!FFmpegKit) {
      return this.processVideoExpoGo(videoUri, {}, onProgress);
    }

    const outputDir = `${resolveCacheDirectory()}trimmed/`;
    new Directory(outputDir).create({ intermediates: true });

    const outputUri = `${outputDir}trimmed_${Date.now()}.mp4`;
    const duration = endTime - startTime;

    // Safe FFmpeg arguments to prevent command injection
    const safeStartTime = String(startTime).replace(/[^0-9.]/g, "");
    const safeDuration = String(duration).replace(/[^0-9.]/g, "");
    const safeVideoUri = videoUri.replace(/[;&|`$(){}[\]<>]/g, "");
    const safeOutputUri = outputUri.replace(/[;&|`$(){}[\]<>]/g, "");

    const command = `-ss ${safeStartTime} -i "${safeVideoUri}" -t ${safeDuration} -c copy "${safeOutputUri}"`;

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      throw new Error("Video trimming failed");
    }

    return this.getVideoInfo(outputUri);
  }

  /**
   * Compress video
   */
  async compressVideo(
    videoUri: string,
    quality: "low" | "medium" | "high" = "medium",
    onProgress?: (progress: number) => void,
  ): Promise<ProcessedVideo> {
    return this.processVideo(videoUri, { quality }, onProgress);
  }

  /**
   * Extract video format from URI for validation
   */
  private extractFormatFromUri(videoUri: string): string | null {
    try {
      // Extract file extension from URI
      const match = videoUri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }

      // Try to extract from common video patterns
      const formats = ["mp4", "mov", "avi", "mkv", "m4v", "3gp", "webm"];
      for (const format of formats) {
        if (videoUri.toLowerCase().includes(format)) {
          return format;
        }
      }

      return null;
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to extract format from URI:", videoUri, error);
      }
      return null;
    }
  }

  /**
   * Get basic video information
   */
  private async getVideoInfo(videoUri: string): Promise<ProcessedVideo> {
    let fileSize = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      fileSize = (fileInfo as any).size || 0;
    } catch (error) {
      console.warn("Could not get file info:", error);
    }

    const thumbnail = await this.generateThumbnail(videoUri);
    const metadata = await this.getVideoMetadata(videoUri);

    return {
      uri: videoUri,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      size: fileSize,
      thumbnail,
    };
  }

  /**
   * Check if video processing features are available
   */
  static getCapabilities() {
    return {
      isExpoGo: IS_EXPO_GO,
      isDevBuild: IS_DEV_BUILD,
      hasFFmpeg: HAS_FFMPEG,
      features: {
        playback: true,
        thumbnail: true,
        trim: HAS_FFMPEG,
        compress: HAS_FFMPEG,
        removeAudio: HAS_FFMPEG,
        resize: HAS_FFMPEG,
        metadata: HAS_FFMPEG,
      },
    };
  }
}

// Export singleton instance
export const videoProcessor = ModernVideoProcessor.getInstance();
