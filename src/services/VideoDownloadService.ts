/**
 * Video Download Service
 * Handles downloading and saving videos with watermarks and captions to device gallery
 */

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "../utils/legacyFileSystem";
import { Alert, Platform } from "react-native";
import { Asset } from "expo-asset";
import { burnCaptionsAndWatermarkIntoVideo } from "../../modules/caption-burner";
import { loadCaptionData, type CaptionData } from "./CaptionGenerator";

export interface VideoDownloadOptions {
  onProgress?: (progress: number, message: string) => void;
  albumName?: string;
  videoUri?: string; // Original video URI for caption lookup
}

export interface VideoDownloadResult {
  success: boolean;
  assetId?: string;
  error?: string;
}

/**
 * Download and save video to device gallery with watermark and captions
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

    onProgress?.(5, "Preparing video...");

    // Ensure the video file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: "Video file not found",
      };
    }

    onProgress?.(10, "Processing video with watermark and captions...");

    // Process video with watermark and captions
    let finalVideoUri = videoUri;
    try {
      const processedVideo = await processVideoWithWatermarkAndCaptions(
        videoUri,
        options.videoUri || videoUri,
        (progress, message) => {
          // Map progress from 0-100 to 10-60
          const mappedProgress = 10 + (progress / 100) * 50;
          onProgress?.(mappedProgress, message);
        },
      );

      if (processedVideo) {
        finalVideoUri = processedVideo;
      } else {
        console.warn("Video processing returned null, using original video");
      }
    } catch (processingError) {
      console.error("Video processing failed, using original:", processingError);
      // Continue with original video if processing fails
    }

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
 * Process video with watermark and captions
 * Returns the path to the processed video, or null if processing is not available/fails
 */
async function processVideoWithWatermarkAndCaptions(
  videoUri: string,
  originalVideoUri: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<string | null> {
  try {
    // iOS only for now
    if (Platform.OS !== "ios") {
      console.log("Watermark and caption burning only available on iOS");
      return null;
    }

    onProgress?.(0, "Loading caption data...");

    // Load caption data
    const captionUri = originalVideoUri.replace(/\.(mp4|mov)$/i, ".captions.json");
    const captionData = await loadCaptionData(captionUri);

    if (!captionData || !captionData.segments || captionData.segments.length === 0) {
      console.log("No captions found for video, skipping caption burning");
      // Continue without captions but still add watermark
    }

    onProgress?.(20, "Loading watermark assets...");

    // Get logo path from assets
    const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
    await logoAsset.downloadAsync();
    const logoPath = logoAsset.localUri || logoAsset.uri;

    onProgress?.(30, "Processing video...");

    // Convert caption data to caption-burner format
    const captionSegments = captionData
      ? captionData.segments.map((seg, index) => ({
          id: `seg_${index}`,
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
          isComplete: true,
          words: seg.words.map((word) => ({
            word: word.word,
            startTime: word.start,
            endTime: word.end,
            confidence: 1.0,
            isComplete: true,
          })),
        }))
      : [];

    // Burn captions and watermark into video
    const result = await burnCaptionsAndWatermarkIntoVideo(videoUri, captionSegments, {
      watermarkImagePath: logoPath,
      watermarkText: "ToxicConfessions.app",
      onProgress: (progress, status) => {
        // Map progress from 0-100 to 30-100
        const mappedProgress = 30 + (progress / 100) * 70;
        onProgress?.(mappedProgress, status);
      },
    });

    if (result.success && result.outputPath) {
      console.log("✅ Video processed successfully with watermark and captions");
      return result.outputPath;
    } else {
      console.error("Video processing failed:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Error processing video:", error);
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
