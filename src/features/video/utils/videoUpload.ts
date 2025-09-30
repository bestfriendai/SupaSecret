/**
 * Video Upload Utility
 * Handles video upload to Supabase with progress tracking
 * Supports processing pipeline and status polling
 */

import * as FileSystem from '../../../utils/legacyFileSystem';
import type {
  VideoUploadOptions,
  VideoUploadResult,
  VIDEO_CONSTANTS,
} from '../types';

// This should be imported from your app's Supabase client
// For now, we'll define the interface
interface SupabaseClient {
  auth: {
    getUser(): Promise<{ data: { user: any } | null; error: any }>;
  };
  functions: {
    invoke(name: string, options: any): Promise<{ data: any; error: any }>;
  };
  storage: {
    from(bucket: string): {
      upload(path: string, file: any, options?: any): Promise<{ data: any; error: any }>;
      download(path: string): Promise<{ data: any; error: any }>;
    };
  };
}

/**
 * Upload video to Supabase storage
 */
export const uploadVideoToStorage = async (
  videoUri: string,
  userId: string,
  supabase: SupabaseClient,
  onProgress?: (progress: number) => void,
): Promise<{ path: string; publicUrl?: string }> => {
  try {
    onProgress?.(5);

    // Validate file
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }

    if (fileInfo.size && fileInfo.size > 100 * 1024 * 1024) {
      throw new Error('Video file is too large (max 100MB)');
    }

    onProgress?.(10);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `${userId}/${timestamp}_${randomId}.mp4`;

    onProgress?.(20);

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(40);

    // Convert to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'video/mp4' });

    onProgress?.(60);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('confessions')
      .upload(filename, blob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    onProgress?.(100);

    return {
      path: data.path,
    };
  } catch (error) {
    console.error('Video upload failed:', error);
    throw error;
  }
};

/**
 * Upload and initiate processing
 */
export const uploadVideoAnonymously = async (
  videoUri: string,
  supabase: SupabaseClient,
  options: VideoUploadOptions = {},
): Promise<VideoUploadResult> => {
  const {
    onProgress,
    enableFaceBlur = true,
    enableVoiceChange = true,
    enableTranscription = true,
    quality = 'medium',
    voiceEffect = 'deep',
  } = options;

  try {
    onProgress?.(5, 'Validating video file...');

    // Validate input
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }

    if (fileInfo.size && fileInfo.size > 100 * 1024 * 1024) {
      throw new Error('Video file is too large (max 100MB)');
    }

    onProgress?.(10, 'Preparing upload...');

    // Get authenticated user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      throw new Error('You must be signed in to upload video');
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    onProgress?.(20, 'Uploading video...');

    // Upload video
    const upload = await uploadVideoToStorage(
      videoUri,
      userData.user.id,
      supabase,
      (p: number) => onProgress?.(20 + (p * 0.2) / 100, 'Uploading video...'),
    );

    onProgress?.(40, 'Initiating processing...');

    // Initiate processing via Edge Function
    const { data: processData, error: processError } = await supabase.functions.invoke(
      'process-video',
      {
        body: {
          uploadId,
          videoPath: upload.path,
          options: {
            enableFaceBlur,
            enableVoiceChange,
            enableTranscription,
            quality,
            voiceEffect,
          },
        },
      },
    );

    if (processError) {
      throw new Error(`Processing initiation failed: ${processError.message}`);
    }

    if (!processData?.success) {
      throw new Error(`Processing initiation failed: ${processData?.error || 'Unknown error'}`);
    }

    onProgress?.(50, 'Upload and processing initiated successfully');

    return {
      uploadId,
      status: 'processing',
    };
  } catch (error) {
    console.error('Anonymous upload failed:', error);
    return {
      uploadId: '',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
};

/**
 * Poll for processing status
 */
export const pollProcessingStatus = async (
  uploadId: string,
  supabase: SupabaseClient,
  onProgress?: (progress: number, message: string) => void,
): Promise<VideoUploadResult> => {
  const maxRetries = 60; // 5 minutes with 5-second intervals
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      onProgress?.(50 + (attempt / maxRetries) * 40, `Checking status... (${attempt + 1}/${maxRetries})`);

      // Check for status file in storage
      const statusFileName = `status_${uploadId}.json`;
      const { data: statusData, error } = await supabase.storage
        .from('confessions')
        .download(statusFileName);

      if (error) {
        if (error.message.includes('not found')) {
          // Status file doesn't exist yet, continue polling
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }

      // Parse status from JSON file
      const statusText = await statusData.text();
      const status = JSON.parse(statusText);

      if (status.status === 'completed') {
        onProgress?.(95, 'Processing completed!');

        return {
          uploadId,
          status: 'completed',
          processedVideoUrl: status.processedVideoUrl,
          thumbnailUrl: status.thumbnailUrl,
          transcription: status.transcription,
        };
      } else if (status.status === 'failed') {
        return {
          uploadId,
          status: 'failed',
          error: status.error || 'Processing failed',
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
    status: 'failed',
    error: 'Processing timeout - video processing took too long',
  };
};

/**
 * Download processed video
 */
export const downloadProcessedVideo = async (
  processedVideoUrl: string,
  supabase: SupabaseClient,
  onProgress?: (progress: number, message: string) => void,
): Promise<string> => {
  try {
    onProgress?.(5, 'Starting download...');

    const { data: videoData, error: downloadError } = await supabase.storage
      .from('confessions')
      .download(processedVideoUrl);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    onProgress?.(50, 'Saving video locally...');

    // Save to local filesystem
    const localUri = `${FileSystem.cacheDirectory}processed_${Date.now()}.mp4`;
    const arrayBuffer = await videoData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress?.(100, 'Download complete');

    return localUri;
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error(`Failed to download processed video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Complete workflow: upload, poll, and download
 */
export const uploadAndProcessVideo = async (
  videoUri: string,
  supabase: SupabaseClient,
  options: VideoUploadOptions = {},
): Promise<{ localUri: string; transcription?: string; thumbnailUrl?: string }> => {
  const { onProgress } = options;

  // Step 1: Upload video
  const uploadResult = await uploadVideoAnonymously(videoUri, supabase, options);

  if (uploadResult.status === 'failed') {
    throw new Error(uploadResult.error || 'Upload failed');
  }

  // Step 2: Poll for completion
  const finalResult = await pollProcessingStatus(uploadResult.uploadId, supabase, onProgress);

  if (finalResult.status === 'failed') {
    throw new Error(finalResult.error || 'Processing failed');
  }

  if (!finalResult.processedVideoUrl) {
    throw new Error('No processed video URL received');
  }

  // Step 3: Download processed video
  const localUri = await downloadProcessedVideo(finalResult.processedVideoUrl, supabase, onProgress);

  return {
    localUri,
    transcription: finalResult.transcription,
    thumbnailUrl: finalResult.thumbnailUrl,
  };
};
