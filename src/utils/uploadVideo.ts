import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { env } from "./env";

export interface UploadResult {
  uploadId: string;
  status: "uploading" | "processing" | "completed" | "failed";
  processedVideoUrl?: string;
  thumbnailUrl?: string;
  transcription?: string;
  error?: string;
}

export interface UploadOptions {
  onProgress?: (progress: number, message: string) => void;
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: "high" | "medium" | "low";
  voiceEffect?: "deep" | "light";
}

/**
 * Upload video anonymously to Supabase storage and initiate processing
 */
export const uploadVideoAnonymously = async (videoUri: string, options: UploadOptions = {}): Promise<UploadResult> => {
  const {
    onProgress,
    enableFaceBlur = true,
    enableVoiceChange = true,
    enableTranscription = true,
    quality = "medium",
    voiceEffect = "deep",
  } = options;

  try {
    onProgress?.(5, "Validating video file...");

    // Validate input file
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }

    if (fileInfo.size && fileInfo.size > 100 * 1024 * 1024) {
      // 100MB limit
      throw new Error("Video file is too large (max 100MB)");
    }

    onProgress?.(10, "Preparing upload...");

    // Generate unique upload ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fileName = `${uploadId}.mp4`;

    // Read video file as base64
    const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(20, "Uploading video...");

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("videos").upload(
      fileName,
      Uint8Array.from(atob(videoBase64), (c) => c.charCodeAt(0)),
      {
        contentType: "video/mp4",
        upsert: false,
      },
    );

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.(40, "Initiating processing...");

    // Get the full URL for the uploaded video
    const { data: videoUrlData } = supabase.storage.from("videos").getPublicUrl(uploadData.path);
    const fullVideoUrl = videoUrlData.publicUrl;

    // Call Edge Function for processing
    const { data: processData, error: processError } = await supabase.functions.invoke("process-video", {
      body: {
        videoUrl: fullVideoUrl,
        uploadId,
        videoPath: uploadData.path, // Keep for compatibility
        options: {
          enableFaceBlur,
          enableVoiceChange,
          enableTranscription,
          quality,
          voiceEffect,
        },
      },
    });

    if (processError) {
      console.error("Edge Function error:", processError);
      throw new Error(`Processing initiation failed: ${processError.message}`);
    }

    if (!processData) {
      throw new Error("No response data from Edge Function");
    }

    if (!processData.success) {
      throw new Error(`Processing initiation failed: ${processData.error || "Unknown error"}`);
    }

    onProgress?.(50, "Upload and processing initiated successfully");

    return {
      uploadId,
      status: "processing",
    };
  } catch (error) {
    console.error("Anonymous upload failed:", error);
    return {
      uploadId: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
};

/**
 * Poll for processing status of an uploaded video
 * Uses storage-based status tracking for anonymous uploads
 */
export const pollProcessingStatus = async (
  uploadId: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<UploadResult> => {
  const maxRetries = 60; // 5 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      onProgress?.(50 + (attempt / maxRetries) * 40, `Checking status... (${attempt + 1}/${maxRetries})`);

      // Check for status file in storage
      const statusFileName = `status_${uploadId}.json`;
      const { data: statusData, error } = await supabase.storage.from("videos").download(statusFileName);

      if (error) {
        if (error.message.includes("not found")) {
          // Status file doesn't exist yet, continue polling
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }

      // Parse status from JSON file
      const statusText = await statusData.text();
      const status = JSON.parse(statusText);

      if (status.status === "completed") {
        onProgress?.(95, "Processing completed, downloading results...");

        return {
          uploadId,
          status: "completed",
          processedVideoUrl: status.processedVideoUrl,
          thumbnailUrl: status.thumbnailUrl,
          transcription: status.transcription,
        };
      } else if (status.status === "failed") {
        return {
          uploadId,
          status: "failed",
          error: status.error || "Processing failed",
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      // Continue polling on error
    }
  }

  return {
    uploadId,
    status: "failed",
    error: "Processing timeout - video processing took too long",
  };
};

/**
 * Download processed video and save locally
 */
export const downloadProcessedVideo = async (
  processedVideoUrl: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<string> => {
  try {
    onProgress?.(5, "Starting download...");

    const { data: videoData, error: downloadError } = await supabase.storage.from("videos").download(processedVideoUrl);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    onProgress?.(50, "Saving video locally...");

    // Save to local filesystem
    const localUri = `${FileSystem.documentDirectory}processed_${Date.now()}.mp4`;
    const arrayBuffer = await videoData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(100, "Download complete");

    return localUri;
  } catch (error) {
    console.error("Download failed:", error);
    throw new Error(`Failed to download processed video: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Complete workflow: upload, poll, and download
 */
export const uploadAndProcessVideo = async (
  videoUri: string,
  options: UploadOptions = {},
): Promise<{ localUri: string; transcription?: string; thumbnailUrl?: string }> => {
  const { onProgress } = options;

  // Step 1: Upload video
  const uploadResult = await uploadVideoAnonymously(videoUri, options);

  if (uploadResult.status === "failed") {
    throw new Error(uploadResult.error || "Upload failed");
  }

  // Step 2: Poll for completion
  const finalResult = await pollProcessingStatus(uploadResult.uploadId, onProgress);

  if (finalResult.status === "failed") {
    throw new Error(finalResult.error || "Processing failed");
  }

  if (!finalResult.processedVideoUrl) {
    throw new Error("No processed video URL received");
  }

  // Step 3: Download processed video
  const localUri = await downloadProcessedVideo(finalResult.processedVideoUrl, onProgress);

  return {
    localUri,
    transcription: finalResult.transcription,
    thumbnailUrl: finalResult.thumbnailUrl,
  };
};
