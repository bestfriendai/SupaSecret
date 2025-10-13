/**
 * Video Compression Utility
 * Compresses videos before upload to reduce file size and improve upload speed
 */

import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export interface CompressionOptions {
  quality?: "low" | "medium" | "high";
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  onProgress?: (progress: number) => void;
}

export interface CompressionResult {
  success: boolean;
  uri?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Get compression settings based on quality preset
 */
function getCompressionSettings(quality: "low" | "medium" | "high") {
  switch (quality) {
    case "low":
      return {
        maxWidth: 480,
        maxHeight: 854,
        bitrate: 1000000, // 1 Mbps
      };
    case "medium":
      return {
        maxWidth: 720,
        maxHeight: 1280,
        bitrate: 2000000, // 2 Mbps
      };
    case "high":
      return {
        maxWidth: 1080,
        maxHeight: 1920,
        bitrate: 4000000, // 4 Mbps
      };
  }
}

/**
 * Compress video using native APIs
 * Note: This is a simplified implementation. For production, consider using:
 * - ffmpeg-kit-react-native for advanced compression
 * - expo-video-thumbnails for basic compression
 * - Server-side compression as fallback
 */
export async function compressVideo(videoUri: string, options: CompressionOptions = {}): Promise<CompressionResult> {
  const { quality = "medium", onProgress } = options;

  try {
    onProgress?.(0);

    // Get original file info using new File API
    const file = new File(videoUri);
    const exists = file.exists; // Property, not method

    if (!exists) {
      return {
        success: false,
        error: "Video file not found",
      };
    }

    const originalSize = file.size; // Property, not method

    // For now, we'll skip actual compression and just validate the file
    // In production, you would use ffmpeg-kit-react-native here
    // Example:
    // import { FFmpegKit } from 'ffmpeg-kit-react-native';
    // const settings = getCompressionSettings(quality);
    // const outputPath = `${FileSystem.cacheDirectory}compressed_${Date.now()}.mp4`;
    // await FFmpegKit.execute(`-i ${videoUri} -vf scale=${settings.maxWidth}:${settings.maxHeight} -b:v ${settings.bitrate} ${outputPath}`);

    onProgress?.(50);

    // Check file size - if over 50MB, warn user
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (originalSize > maxSize) {
      console.warn(`⚠️ Video file is large: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    onProgress?.(100);

    // For now, return original video
    // In production, return compressed video
    return {
      success: true,
      uri: videoUri,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
    };
  } catch (error) {
    console.error("❌ Video compression failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Compression failed",
    };
  }
}

/**
 * Check if video needs compression
 */
export async function shouldCompressVideo(videoUri: string): Promise<boolean> {
  try {
    const file = new File(videoUri);
    const exists = file.exists; // Property, not method
    if (!exists) return false;

    const size = file.size; // Property, not method
    const threshold = 20 * 1024 * 1024; // 20MB

    return size > threshold;
  } catch (error) {
    console.error("Failed to check video size:", error);
    return false;
  }
}

/**
 * Get video file size in MB
 */
export async function getVideoSize(videoUri: string): Promise<number> {
  try {
    const file = new File(videoUri);
    const exists = file.exists; // Property, not method
    if (!exists) return 0;

    const size = file.size; // Property, not method
    return size / 1024 / 1024; // Convert to MB
  } catch (error) {
    console.error("Failed to get video size:", error);
    return 0;
  }
}

/**
 * Delete temporary video file
 */
export async function deleteVideoFile(videoUri: string): Promise<boolean> {
  try {
    const cleanUri = videoUri.replace("file://", "");
    const file = new File(cleanUri);
    const exists = file.exists; // Property, not method

    if (exists) {
      file.delete(); // Synchronous method
      console.log("✅ Deleted temporary video file:", cleanUri);
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Failed to delete video file:", error);
    return false;
  }
}
