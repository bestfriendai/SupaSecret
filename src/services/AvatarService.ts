/**
 * Avatar Service
 * Handles avatar upload, compression, and management with Supabase Storage
 */

import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../lib/supabase";
import { storageWithRetry } from "../utils/supabaseWithRetry";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 1024; // 1024x1024 pixels
const AVATAR_QUALITY = 0.8;
const MAX_FILE_SIZE_MB = 5;

export interface AvatarUploadOptions {
  onProgress?: (progress: number) => void;
  quality?: number;
  maxSize?: number;
}

export interface AvatarUploadResult {
  url: string;
  path: string;
  size: number;
}

export class AvatarService {
  /**
   * Upload and process avatar image
   */
  static async uploadAvatar(
    imageUri: string,
    userId: string,
    options: AvatarUploadOptions = {},
  ): Promise<AvatarUploadResult> {
    const { onProgress, quality = AVATAR_QUALITY, maxSize = MAX_AVATAR_SIZE } = options;

    try {
      onProgress?.(10);

      // Validate file size
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error("Image file not found");
      }

      const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(`Image file too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      }

      onProgress?.(20);

      // Process and compress image
      const processedImage = await this.processImage(imageUri, {
        maxSize,
        quality,
      });

      onProgress?.(40);

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${timestamp}.jpg`;
      const filePath = `${userId}/${filename}`;

      onProgress?.(50);

      // Convert processed image to blob for upload
      const response = await fetch(processedImage.uri);
      const blob = await response.blob();

      onProgress?.(60);

      // Upload to Supabase Storage with retry logic
      const uploadData = await storageWithRetry.upload(AVATAR_BUCKET, filePath, blob, {
        upsert: true,
        retryOptions: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 5000,
        },
      });

      onProgress?.(80);

      // Get public URL
      const { data: urlData } = storageWithRetry.getPublicUrl(AVATAR_BUCKET, filePath);

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded avatar");
      }

      onProgress?.(90);

      // Clean up temporary processed image
      await FileSystem.deleteAsync(processedImage.uri, { idempotent: true });

      onProgress?.(100);

      return {
        url: urlData.publicUrl,
        path: filePath,
        size: blob.size,
      };
    } catch (error) {
      console.error("Avatar upload failed:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to upload avatar. Please try again.");
    }
  }

  /**
   * Process and compress image for avatar use
   */
  private static async processImage(
    imageUri: string,
    options: { maxSize: number; quality: number },
  ): Promise<ImageManipulator.ImageResult> {
    try {
      // Get image dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Calculate resize dimensions to maintain aspect ratio
      const { width, height } = imageInfo;
      const maxDimension = Math.max(width, height);

      let resizeWidth = width;
      let resizeHeight = height;

      if (maxDimension > options.maxSize) {
        const ratio = options.maxSize / maxDimension;
        resizeWidth = Math.round(width * ratio);
        resizeHeight = Math.round(height * ratio);
      }

      // Process image: resize, crop to square, and compress
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize if needed
          ...(maxDimension > options.maxSize ? [{ resize: { width: resizeWidth, height: resizeHeight } }] : []),
          // Crop to square (center crop)
          {
            crop: {
              originX: Math.max(0, (resizeWidth - Math.min(resizeWidth, resizeHeight)) / 2),
              originY: Math.max(0, (resizeHeight - Math.min(resizeWidth, resizeHeight)) / 2),
              width: Math.min(resizeWidth, resizeHeight),
              height: Math.min(resizeWidth, resizeHeight),
            },
          },
        ],
        {
          compress: options.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      return processedImage;
    } catch (error) {
      console.error("Image processing failed:", error);
      throw new Error("Failed to process image. Please try a different image.");
    }
  }

  /**
   * Delete old avatar from storage
   */
  static async deleteAvatar(avatarPath: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);

      if (error) {
        console.warn("Failed to delete old avatar:", error);
        // Don't throw error for deletion failures as it's not critical
      }
    } catch (error) {
      console.warn("Avatar deletion failed:", error);
    }
  }

  /**
   * Update user avatar URL in database
   */
  static async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("profiles" as any)
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to update user avatar in database:", error);
      throw new Error("Failed to update profile. Please try again.");
    }
  }

  /**
   * Complete avatar update process
   */
  static async updateAvatar(
    imageUri: string,
    userId: string,
    currentAvatarUrl?: string,
    options: AvatarUploadOptions = {},
  ): Promise<string> {
    try {
      // Upload new avatar
      const uploadResult = await this.uploadAvatar(imageUri, userId, options);

      // Update user profile
      await this.updateUserAvatar(userId, uploadResult.url);

      // Delete old avatar if it exists and is from our storage
      if (currentAvatarUrl && this.isAvatarFromOurBucket(currentAvatarUrl)) {
        const oldPath = this.extractPathFromUrl(currentAvatarUrl);
        if (oldPath) {
          await this.deleteAvatar(oldPath);
        }
      }

      return uploadResult.url;
    } catch (error) {
      console.error("Avatar update failed:", error);
      throw error;
    }
  }

  /**
   * Check if URL is from our avatar bucket
   */
  private static isAvatarFromOurBucket(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Check if the pathname contains our avatar bucket
      return parsedUrl.pathname.includes(`/${AVATAR_BUCKET}/`);
    } catch (error) {
      console.warn("Failed to parse avatar URL:", error);
      return false;
    }
  }

  /**
   * Extract storage path from public URL
   */
  private static extractPathFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;

      // Find the avatar bucket segment in the path
      const bucketIndex = pathname.indexOf(`/${AVATAR_BUCKET}/`);
      if (bucketIndex === -1) {
        return null;
      }

      // Extract the path after the bucket segment
      const pathAfterBucket = pathname.substring(bucketIndex + `/${AVATAR_BUCKET}/`.length);

      // Decode URI components and normalize
      const decodedPath = decodeURIComponent(pathAfterBucket);

      return decodedPath || null;
    } catch (error) {
      console.warn("Failed to extract path from avatar URL:", error);
      return null;
    }
  }

  /**
   * Validate image file
   */
  static async validateImage(imageUri: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);

      if (!fileInfo.exists) {
        return { valid: false, error: "Image file not found" };
      }

      const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return {
          valid: false,
          error: `Image file too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
        };
      }

      // Try to get image info to validate it's a valid image
      await ImageManipulator.manipulateAsync(imageUri, [], {});

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: "Invalid image file. Please select a valid image.",
      };
    }
  }
}

// Export convenience functions
export const uploadAvatar = AvatarService.uploadAvatar.bind(AvatarService);
export const updateAvatar = AvatarService.updateAvatar.bind(AvatarService);
export const validateImage = AvatarService.validateImage.bind(AvatarService);
