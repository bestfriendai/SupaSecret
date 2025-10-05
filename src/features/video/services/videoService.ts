/**
 * Comprehensive Video Service
 * Handles video recording, playback, processing, and management
 * Uses latest expo-video and react-native-vision-camera APIs
 */

import * as FileSystem from "../../../utils/legacyFileSystem";
import { Platform } from "react-native";
import type {
  VideoRecordingOptions,
  VideoRecordingState,
  ProcessedVideo,
  VideoProcessingOptions,
  VideoMetadata,
  VideoFormat,
  CameraPermissions,
  VideoRecordingError,
  VideoRecordingErrorCode,
} from "../types";

// Lazy load native modules to prevent crashes in Expo Go
let Camera: any;
let useCameraDevice: any;
let useCameraPermission: any;

const IS_EXPO_GO = !!(global as any).__expo?.isExpoGo;

/**
 * Load react-native-vision-camera modules
 */
const loadVisionCamera = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Vision Camera not available in Expo Go. Please use a development build.");
  }

  try {
    const visionCamera = await import("react-native-vision-camera");
    Camera = visionCamera.Camera;
    useCameraDevice = visionCamera.useCameraDevice;
    useCameraPermission = visionCamera.useCameraPermission;
    return true;
  } catch (error) {
    console.error("Failed to load Vision Camera:", error);
    throw new Error("Vision Camera is not available. Please ensure react-native-vision-camera is installed.");
  }
};

/**
 * Video Service Class
 * Manages video recording, playback, and processing operations
 */
export class VideoService {
  private isInitialized = false;
  private recordingState: VideoRecordingState = {
    isRecording: false,
    recordingTime: 0,
    hasPermissions: false,
    isReady: false,
    facing: "front",
  };

  /**
   * Initialize the video service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!IS_EXPO_GO) {
        await loadVisionCamera();
      }
      this.isInitialized = true;
      this.recordingState.isReady = true;
    } catch (error) {
      console.error("Video service initialization failed:", error);
      throw error;
    }
  }

  /**
   * Request camera and microphone permissions
   */
  async requestPermissions(): Promise<CameraPermissions> {
    if (IS_EXPO_GO) {
      return {
        camera: "denied",
        microphone: "denied",
      };
    }

    try {
      if (!Camera) {
        await loadVisionCamera();
      }

      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      const permissions: CameraPermissions = {
        camera: cameraPermission as any,
        microphone: microphonePermission as any,
      };

      this.recordingState.hasPermissions = permissions.camera === "granted" && permissions.microphone === "granted";

      return permissions;
    } catch (error) {
      console.error("Permission request failed:", error);
      return {
        camera: "denied",
        microphone: "denied",
      };
    }
  }

  /**
   * Check if video recording is available
   */
  isRecordingAvailable(): boolean {
    return !IS_EXPO_GO && this.isInitialized;
  }

  /**
   * Get current recording state
   */
  getRecordingState(): VideoRecordingState {
    return { ...this.recordingState };
  }

  /**
   * Update recording state
   */
  updateRecordingState(updates: Partial<VideoRecordingState>): void {
    this.recordingState = {
      ...this.recordingState,
      ...updates,
    };
  }

  /**
   * Get video metadata from file
   */
  async getVideoMetadata(videoUri: string): Promise<VideoMetadata> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);

      if (!fileInfo.exists) {
        throw new Error("Video file does not exist");
      }

      // Basic metadata - duration would need expo-av or native module
      return {
        width: 1920, // Default, should be detected from video
        height: 1080, // Default, should be detected from video
        duration: 0, // Would need video analysis
        size: fileInfo.size || 0,
        format: this.getVideoFormat(videoUri),
      };
    } catch (error) {
      console.error("Failed to get video metadata:", error);
      throw error;
    }
  }

  /**
   * Extract video format from URI
   */
  private getVideoFormat(uri: string): VideoFormat {
    const extension = uri.split(".").pop()?.toLowerCase() || "mp4";
    const validFormats: VideoFormat[] = ["mp4", "mov", "avi", "mkv", "m4v", "3gp", "webm"];
    return validFormats.includes(extension as VideoFormat) ? (extension as VideoFormat) : "mp4";
  }

  /**
   * Validate video file
   */
  async validateVideoFile(videoUri: string, maxSize: number = 100 * 1024 * 1024): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);

      if (!fileInfo.exists) {
        throw new Error("Video file does not exist");
      }

      if (fileInfo.size && fileInfo.size > maxSize) {
        throw new Error(`Video file is too large (max ${maxSize / (1024 * 1024)}MB)`);
      }

      return true;
    } catch (error) {
      console.error("Video validation failed:", error);
      return false;
    }
  }

  /**
   * Create a processed video object
   */
  createProcessedVideo(uri: string, options: VideoProcessingOptions = {}, metadata?: VideoMetadata): ProcessedVideo {
    return {
      uri,
      duration: metadata?.duration || 0,
      faceBlurApplied: options.enableFaceBlur || false,
      voiceChangeApplied: options.enableVoiceChange || false,
      metadata,
    };
  }

  /**
   * Generate thumbnail from video (placeholder - would need native implementation)
   */
  async generateThumbnail(videoUri: string): Promise<string> {
    try {
      // This would use expo-video-thumbnails or a native implementation
      // For now, return a placeholder or the video URI
      console.log("Thumbnail generation not implemented, returning video URI");
      return videoUri;
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      return videoUri;
    }
  }

  /**
   * Copy video to cache directory
   */
  async copyToCache(videoUri: string): Promise<string> {
    try {
      const filename = `video_${Date.now()}.mp4`;
      const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: videoUri,
        to: cacheUri,
      });

      return cacheUri;
    } catch (error) {
      console.error("Failed to copy video to cache:", error);
      throw error;
    }
  }

  /**
   * Delete video file
   */
  async deleteVideo(videoUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(videoUri);
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  }

  /**
   * Clear cache directory
   */
  async clearCache(): Promise<void> {
    try {
      if (FileSystem.cacheDirectory) {
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        const videoFiles = files.filter(
          (file) => file.endsWith(".mp4") || file.endsWith(".mov") || file.endsWith(".m4v"),
        );

        for (const file of videoFiles) {
          const uri = `${FileSystem.cacheDirectory}${file}`;
          await this.deleteVideo(uri);
        }
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    try {
      if (!FileSystem.cacheDirectory) return 0;

      const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith(".mp4") || file.endsWith(".mov") || file.endsWith(".m4v")) {
          const uri = `${FileSystem.cacheDirectory}${file}`;
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists && info.size) {
            totalSize += info.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Failed to get cache size:", error);
      return 0;
    }
  }

  /**
   * Create recording error
   */
  createRecordingError(message: string, code: VideoRecordingErrorCode): VideoRecordingError {
    const error = new Error(message) as VideoRecordingError;
    error.name = "VideoRecordingError";
    error.code = code;
    return error;
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.recordingState = {
      isRecording: false,
      recordingTime: 0,
      hasPermissions: false,
      isReady: this.isInitialized,
      facing: "front",
    };
  }
}

/**
 * Singleton instance
 */
let videoServiceInstance: VideoService | null = null;

/**
 * Get video service instance
 */
export const getVideoService = (): VideoService => {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService();
  }
  return videoServiceInstance;
};

/**
 * Initialize video service
 */
export const initializeVideoService = async (): Promise<VideoService> => {
  const service = getVideoService();
  await service.initialize();
  return service;
};

export default VideoService;
