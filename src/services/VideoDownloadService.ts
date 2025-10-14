/**
 * Video Download Service
 * Handles downloading and saving blurred videos to device gallery
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "../utils/legacyFileSystem";
import { Alert, Platform } from "react-native";

export interface VideoDownloadOptions {
  onProgress?: (progress: number, message: string) => void;
  albumName?: string;
}

export interface VideoDownloadResult {
  success: boolean;
  assetId?: string;
  error?: string;
}

/**
 * Download and save video to device gallery
 */
export const downloadVideoToGallery = async (
  videoUri: string,
  options: VideoDownloadOptions = {},
): Promise<VideoDownloadResult> => {
  const { onProgress, albumName = "Toxic Confessions" } = options;

  try {
    onProgress?.(0, "Checking permissions...");

    // Request media library permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "Media library permission is required to save videos to your gallery",
      };
    }

    onProgress?.(20, "Preparing video...");

    // Ensure the video file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: "Video file not found",
      };
    }

    onProgress?.(40, "Saving to gallery...");

    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `toxic-confession-${timestamp}.mp4`;

    // Copy to a temporary location with proper filename if needed
    let finalVideoUri = videoUri;
    if (!videoUri.includes(".mp4")) {
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({
        from: videoUri,
        to: tempUri,
      });
      finalVideoUri = tempUri;
    }

    onProgress?.(60, "Creating media asset...");

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(finalVideoUri);

    onProgress?.(80, "Organizing in album...");

    // Try to create/get album and add asset to it
    try {
      let album = await MediaLibrary.getAlbumAsync(albumName);

      if (!album) {
        // Create album if it doesn't exist
        album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        // Add asset to existing album
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch (albumError) {
      // Album operations might fail on some devices, but the video is still saved
      console.warn("Album operation failed, but video was saved:", albumError);
    }

    onProgress?.(100, "Download complete!");

    return {
      success: true,
      assetId: asset.id,
    };
  } catch (error) {
    console.error("Video download failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download video",
    };
  }
};

/**
 * Check if media library permissions are granted
 */
export const checkMediaLibraryPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Failed to check media library permissions:", error);
    return false;
  }
};

/**
 * Request media library permissions with user-friendly messaging
 */
export const requestMediaLibraryPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "To save videos to your gallery, please enable photo library access in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                // On iOS, we can't directly open settings, but the user knows what to do
                Alert.alert(
                  "Enable Photo Access",
                  'Go to Settings > Privacy & Security > Photos > Toxic Confessions and select "Add Photos Only" or "Full Access"',
                );
              }
            },
          },
        ],
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to request media library permissions:", error);
    Alert.alert("Permission Error", "Failed to request photo library permission. Please try again.");
    return false;
  }
};

/**
 * Show success message after download
 */
export const showDownloadSuccessMessage = (albumName: string = "Toxic Confessions") => {
  Alert.alert(
    "Video Saved! 📱",
    `Your blurred video has been saved to your photo gallery${albumName ? ` in the "${albumName}" album` : ""}.`,
    [{ text: "Great!", style: "default" }],
  );
};

/**
 * Show error message after failed download
 */
export const showDownloadErrorMessage = (error: string) => {
  Alert.alert("Download Failed", `Unable to save video to gallery: ${error}`, [{ text: "OK", style: "default" }]);
};
