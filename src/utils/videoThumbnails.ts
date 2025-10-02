/**
 * Video Thumbnail Generation Utility
 * Generates thumbnails for video previews
 */

import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";

export interface ThumbnailOptions {
  time?: number; // Time in ms to capture thumbnail (default: 1000)
  quality?: number; // 0-1 (default: 0.7)
}

export interface ThumbnailResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Generate thumbnail from video URI
 */
export async function generateVideoThumbnail(
  videoUri: string,
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  const { time = 1000, quality = 0.7 } = options;

  try {
    const { uri, width, height } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time,
      quality,
    });

    return { uri, width, height };
  } catch (error) {
    console.error("Failed to generate thumbnail:", error);
    throw new Error("Thumbnail generation failed");
  }
}

/**
 * Generate thumbnail and save to permanent storage
 */
export async function generateAndSaveThumbnail(
  videoUri: string,
  confessionId: string,
  options: ThumbnailOptions = {},
): Promise<string> {
  try {
    const { uri } = await generateVideoThumbnail(videoUri, options);

    // Create permanent path
    const thumbnailDir = `${FileSystem.documentDirectory}thumbnails/`;
    await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });

    const thumbnailPath = `${thumbnailDir}${confessionId}.jpg`;

    // Copy thumbnail to permanent location
    await FileSystem.copyAsync({
      from: uri,
      to: thumbnailPath,
    });

    return thumbnailPath;
  } catch (error) {
    console.error("Failed to save thumbnail:", error);
    throw error;
  }
}

/**
 * Delete thumbnail file
 */
export async function deleteThumbnail(thumbnailUri: string): Promise<void> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(thumbnailUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(thumbnailUri);
    }
  } catch (error) {
    console.warn("Failed to delete thumbnail:", error);
  }
}

/**
 * Get thumbnail URI or generate if not exists
 */
export async function getThumbnailUri(
  videoUri: string,
  confessionId: string,
  existingThumbnail?: string,
): Promise<string> {
  // Return existing if valid
  if (existingThumbnail) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(existingThumbnail);
      if (fileInfo.exists) {
        return existingThumbnail;
      }
    } catch (error) {
      console.warn("Existing thumbnail not found:", error);
    }
  }

  // Generate new thumbnail
  return generateAndSaveThumbnail(videoUri, confessionId);
}
