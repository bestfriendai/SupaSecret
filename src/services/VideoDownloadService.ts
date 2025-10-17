/**
 * Video Download Service
 * Handles downloading and saving videos with watermarks and face blur to device gallery
 * Captions are removed from downloaded videos - only blurred faces and watermark are included
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "../utils/legacyFileSystem";
import { Alert, Platform } from "react-native";
import { Asset } from "expo-asset";
import { burnCaptionsAndWatermarkIntoVideo } from "../../modules/caption-burner";
import { useMembershipStore } from "../state/membershipStore";

export interface VideoDownloadOptions {
  onProgress?: (progress: number, message: string) => void;
  albumName?: string;
  videoUri?: string; // Original video URI for caption lookup (deprecated - use captionData instead)
  captionData?: any[]; // Caption segments to burn into video
}

export interface VideoDownloadResult {
  success: boolean;
  assetId?: string;
  error?: string;
}

/**
 * Download and save video to device gallery with watermark only (no captions)
 */
export const downloadVideoToGallery = async (
  videoUri: string,
  options: VideoDownloadOptions = {},
): Promise<VideoDownloadResult> => {
  const { onProgress, albumName = "Toxic Confessions" } = options;

  try {
    onProgress?.(0, "Checking permissions...");

    // Check if user has premium subscription
    const { hasFeature } = useMembershipStore.getState();
    if (!hasFeature("unlimitedSaves")) {
      return {
        success: false,
        error: "Premium subscription required to download videos",
      };
    }

    // Request media library permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "Media library permission is required to save videos to your gallery",
      };
    }

    onProgress?.(5, "Preparing video...");

    // Ensure the video file exists and is valid
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    console.log("📹 Original video file info:", fileInfo);

    if (!fileInfo.exists) {
      return {
        success: false,
        error: "Video file not found",
      };
    }

    // Check file size
    const fileSize = (fileInfo as any).size || 0;
    if (fileSize < 1000) {
      console.warn("⚠️ Original video file is very small:", fileSize, "bytes");
    } else {
      console.log("✅ Original video file size:", fileSize, "bytes");
    }

    onProgress?.(10, "Processing video with watermark...");

    // Process video with watermark only (no captions for downloads)
    let finalVideoUri = videoUri;
    try {
      console.log("📹 Starting video processing for download...");
      console.log("📹 Input videoUri:", videoUri);

      const processedVideo = await processVideoWithWatermarkOnly(videoUri, (progress, message) => {
        // Map progress from 0-100 to 10-60
        const mappedProgress = 10 + (progress / 100) * 50;
        onProgress?.(mappedProgress, message);
      });

      if (processedVideo) {
        console.log("✅ Video processing complete. Output:", processedVideo);

        // Verify the processed video file exists and has content
        const processedFileInfo = await FileSystem.getInfoAsync(processedVideo);
        console.log("📹 Processed video file info:", processedFileInfo);

        if (processedFileInfo.exists) {
          // Check file size using type assertion for legacy FileSystem
          const fileSize = (processedFileInfo as any).size || 0;
          if (fileSize > 10000) {
            // Increased threshold to 10KB
            finalVideoUri = processedVideo;
            console.log("✅ Using processed video with watermark");
          } else {
            console.warn("⚠️ Processed video file is too small, using original video");
            console.warn("⚠️ File exists:", processedFileInfo.exists);
            console.warn("⚠️ File size:", fileSize);
          }
        } else {
          console.warn("⚠️ Video processing returned non-existent file, using original video");
        }
      } else {
        console.warn("⚠️ Video processing returned null, using original video");
      }
    } catch (processingError) {
      console.error("❌ Video processing failed, using original:", processingError);
      // Continue with original video if processing fails
      onProgress?.(60, "Using original video (processing failed)...");
    }

    console.log("📹 Final video URI for gallery:", finalVideoUri);

    onProgress?.(60, "Saving to gallery...");

    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `toxic-confession-${timestamp}.mp4`;

    // Copy to a temporary location with proper filename if needed
    let galleryVideoUri = finalVideoUri;
    if (!finalVideoUri.includes(".mp4") && !finalVideoUri.includes(".mov")) {
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({
        from: finalVideoUri,
        to: tempUri,
      });
      galleryVideoUri = tempUri;
    }

    onProgress?.(70, "Creating media asset...");

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(galleryVideoUri);

    onProgress?.(85, "Organizing in album...");

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
 * Process video with watermark only (no captions)
 * Returns the path to the processed video, or null if processing is not available/fails
 */
async function processVideoWithWatermarkOnly(
  videoUri: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<string | null> {
  try {
    // Check if caption burning is supported
    const { isCaptionBurningSupported } = await import("../../modules/caption-burner");
    if (!isCaptionBurningSupported()) {
      console.log("⚠️ Video processing not supported on this platform, using original video");
      onProgress?.(60, "Video processing not available on this platform");
      return null;
    }

    onProgress?.(0, "Loading watermark assets...");

    // Get logo path from assets
    const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
    await logoAsset.downloadAsync();
    const logoPath = logoAsset.localUri || logoAsset.uri;

    onProgress?.(30, "Processing video...");

    console.log("🎬 About to burn watermark only (no captions)...");
    console.log("🎬 Input video:", videoUri);
    console.log("🎬 Watermark logo path:", logoPath);

    // Burn only watermark into video (no captions for downloads)
    const result = await burnCaptionsAndWatermarkIntoVideo(videoUri, [], {
      watermarkImagePath: logoPath,
      watermarkText: "ToxicConfessions.app",
      onProgress: (progress: any, status: any) => {
        // Map progress from 0-100 to 30-100
        const mappedProgress = 30 + (progress / 100) * 70;
        onProgress?.(mappedProgress, status);
      },
    });

    console.log("🎬 Watermark burning result:", result);

    if (result.success && result.outputPath) {
      console.log("✅ Video processed successfully with watermark");
      console.log("✅ Output path:", result.outputPath);
      return result.outputPath;
    } else {
      console.error("❌ Video processing failed:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Error processing video:", error);

    // Check if it's a module not available error
    if (error instanceof Error && error.message.includes("not available")) {
      console.log("⚠️ Video processing module not available, using original video");
      onProgress?.(60, "Video processing not available (using original)");
      return null;
    }

    return null;
  }
}

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
