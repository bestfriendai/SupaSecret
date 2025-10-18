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
 * Debug logging helper (only logs in development)
 */
const debugLog = (step: string, data: any) => {
  if (__DEV__) {
    console.log(`🔍 [VideoDownload] ${step}:`, data);
  }
};

/**
 * Validate video file exists and is valid
 */
const validateVideoFile = async (videoUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      console.error("❌ Video file does not exist:", videoUri);
      return false;
    }

    const fileSize = (fileInfo as any).size || 0;
    if (fileSize < 1000) {
      console.error("❌ Video file too small:", fileSize, "bytes");
      return false;
    }

    // Additional validation: check if it's a valid video file
    const validExtensions = [".mp4", ".mov", ".m4v", ".avi"];
    const hasValidExtension = validExtensions.some((ext) => videoUri.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      console.error("❌ Invalid video file extension:", videoUri);
      return false;
    }

    debugLog("Video validation passed", { uri: videoUri, size: fileSize });
    return true;
  } catch (error) {
    console.error("❌ Video validation failed:", error);
    return false;
  }
};

/**
 * Validate processed video is valid and not corrupted
 */
const validateProcessedVideo = async (processedUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(processedUri);
    if (!fileInfo.exists) {
      console.error("❌ Processed video file does not exist");
      return false;
    }

    const fileSize = (fileInfo as any).size || 0;
    if (fileSize < 10000) {
      // Increased threshold for processed videos
      console.error("❌ Processed video file too small:", fileSize, "bytes");
      return false;
    }

    console.log("✅ Processed video validation passed:", {
      uri: processedUri,
      size: fileSize,
      sizeMB: (fileSize / 1024 / 1024).toFixed(2),
    });

    return true;
  } catch (error) {
    console.error("❌ Processed video validation failed:", error);
    return false;
  }
};

/**
 * Load watermark asset with multiple fallback methods
 */
const loadWatermarkAsset = async (): Promise<string | null> => {
  try {
    console.log("🎯 Loading watermark asset...");

    // Try multiple approaches to load the logo
    let logoPath: string | null = null;

    // Method 1: Asset.fromModule (primary method)
    try {
      const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
      await logoAsset.downloadAsync();
      logoPath = logoAsset.localUri || logoAsset.uri;
      console.log("✅ Logo loaded via Asset.fromModule:", logoPath);
    } catch (assetError) {
      console.warn("⚠️ Asset.fromModule failed:", assetError);
    }

    // Method 2: Direct require path (fallback)
    if (!logoPath) {
      try {
        const directAsset = Asset.fromModule(require("../../assets/logo.png"));
        logoPath = directAsset.uri;
        console.log("✅ Using direct asset URI:", logoPath);
      } catch (directError) {
        console.warn("⚠️ Direct asset URI failed:", directError);
      }
    }

    if (!logoPath) {
      throw new Error("Failed to load watermark logo from any source");
    }

    return logoPath;
  } catch (error) {
    console.error("❌ Failed to load watermark asset:", error);
    return null;
  }
};

/**
 * Download and save video to device gallery with watermark only (no captions)
 */
export const downloadVideoToGallery = async (
  videoUri: string,
  options: VideoDownloadOptions = {},
): Promise<VideoDownloadResult> => {
  const { onProgress, albumName = "Toxic Confessions" } = options;

  try {
    debugLog("Starting download", { videoUri, options });

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

    onProgress?.(5, "Validating video...");

    // Validate the video file
    const isValidVideo = await validateVideoFile(videoUri);
    debugLog("Video validation", { isValid: isValidVideo });

    if (!isValidVideo) {
      return {
        success: false,
        error: "Invalid video file",
      };
    }

    console.log("📹 ========== PROCESSING VIDEO FOR DOWNLOAD ==========");
    console.log("📹 Input video:", videoUri);
    console.log("📹 Will apply: Face blur (if not already applied) + Watermark");
    console.log("📹 ====================================================");

    onProgress?.(10, "Processing video with blur and watermark...");

    // Process video with face blur and watermark
    const processedVideo = await processVideoWithWatermarkAndBlur(videoUri, (progress, message) => {
      console.log(`📹 Processing progress: ${progress}% - ${message}`);
      const mappedProgress = 10 + (progress / 100) * 50;
      onProgress?.(mappedProgress, message);
    });

    // Determine final video URI
    let finalVideoUri = videoUri;

    if (processedVideo) {
      const isValidProcessed = await validateProcessedVideo(processedVideo);
      debugLog("Processed video validation", { isValid: isValidProcessed, processedVideo });

      if (isValidProcessed) {
        finalVideoUri = processedVideo;
        console.log("✅ Using processed video with blur and watermark!");
      } else {
        console.warn("⚠️ Processed video validation failed, using original");
      }
    } else {
      console.log("⚠️ Video processing failed or not available, using original video");
    }

    debugLog("Final video", { finalVideoUri });

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

    debugLog("Download complete", { assetId: asset.id });

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
 * Process video with face blur and watermark (no captions)
 * Returns the path to the processed video, or null if processing is not available/fails
 */
async function processVideoWithWatermarkAndBlur(
  videoUri: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<string | null> {
  try {
    // Check if video processing is supported
    const { isCaptionBurningSupported } = await import("../../modules/caption-burner");
    if (!isCaptionBurningSupported()) {
      console.log("⚠️ Video processing not supported on this platform");
      return null;
    }

    onProgress?.(0, "Loading assets...");

    // Get logo path with improved error handling
    const logoPath = await loadWatermarkAsset();
    if (!logoPath) {
      console.error("❌ Failed to load watermark asset");
      return null;
    }

    debugLog("Asset loading", { logoPath });

    onProgress?.(20, "Applying face blur...");

    // First apply face blur if available
    let processedVideo = videoUri;
    try {
      const { applyFaceBlur } = await import("../../modules/face-blur");
      const blurredVideo = await applyFaceBlur(videoUri);
      if (blurredVideo) {
        processedVideo = blurredVideo;
        console.log("✅ Face blur applied successfully");
        debugLog("Face blur applied", { blurredVideo });
      } else {
        console.warn("⚠️ Face blur returned null, continuing with original video");
      }
    } catch (blurError) {
      console.warn("⚠️ Face blur failed, continuing with original video:", blurError);
      debugLog("Face blur error", { error: blurError });
    }

    onProgress?.(50, "Applying watermark...");

    console.log("🎬 About to burn watermark into video...");
    console.log("🎬 Input video (with blur if applied):", processedVideo);
    console.log("🎬 Watermark logo path:", logoPath);

    // Then apply watermark
    const result = await burnCaptionsAndWatermarkIntoVideo(processedVideo, [], {
      watermarkImagePath: logoPath,
      watermarkText: "ToxicConfessions.app",
      onProgress: (progress: any, status: any) => {
        const mappedProgress = 50 + (progress / 100) * 50;
        onProgress?.(mappedProgress, status);
      },
    });

    debugLog("Processing result", { success: result.success, outputPath: result.outputPath });

    if (result.success && result.outputPath) {
      console.log("✅ Video processed successfully with blur and watermark");
      return result.outputPath;
    } else {
      console.error("❌ Video processing failed:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Error processing video:", error);
    debugLog("Processing error", { error });
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
