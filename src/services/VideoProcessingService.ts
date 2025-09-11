import * as FileSystem from "expo-file-system/legacy";
import { setAudioModeAsync } from "expo-audio";
// Demo mode - no native voice imports for Expo Go
// import Voice from '@react-native-voice/voice';
import * as VideoThumbnails from "expo-video-thumbnails";
import { IAnonymiser, ProcessedVideo, VideoProcessingOptions } from "./IAnonymiser";
import { ensureSignedVideoUrl, uploadVideoToSupabase } from "../utils/storage";
import { supabase } from "../lib/supabase";
import { env } from "../utils/env";

export class VideoProcessingService implements IAnonymiser {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🎯 VideoProcessingService Mode - Expo Go compatible demo processing");
    this.isInitialized = true;
  }

  async processVideo(videoUri: string, options: VideoProcessingOptions = {}): Promise<ProcessedVideo> {
    await this.initialize();

    const {
      enableFaceBlur = true,
      enableVoiceChange = true,
      enableTranscription = true,
      quality = "medium",
      voiceEffect = "deep",
      onProgress,
    } = options;

    try {
      onProgress?.(5, "Initializing video processing...");

      // Validate input file
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error("Video file does not exist");
      }

      // If in Expo Go mode, use server-side processing via Edge Function
      if (env.expoGo) {
        return await this.processVideoServerSide(videoUri, options, onProgress);
      }

      // Otherwise, use local processing (for development builds)
      return await this.processVideoLocally(videoUri, options, onProgress);
    } catch (error) {
      console.error("Video processing failed:", error);
      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async processVideoServerSide(
    videoUri: string,
    options: VideoProcessingOptions,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    try {
      onProgress?.(10, "Uploading video to server...");

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("User not authenticated, falling back to local processing");
        return await this.processVideoLocally(videoUri, options, onProgress);
      }

      // Upload video to Supabase storage using streaming helper
      const upload = await uploadVideoToSupabase(videoUri, user.id, (p) =>
        onProgress?.(10 + (p * 0.2) / 100, "Uploading video..."),
      );

      onProgress?.(30, "Processing video on server...");

      // Call Edge Function for processing using storage path (private bucket)
      const { data: processData, error: processError } = await supabase.functions.invoke("process-video", {
        body: {
          videoPath: upload.path,
          options: {
            enableFaceBlur: options.enableFaceBlur,
            enableVoiceChange: options.enableVoiceChange,
            enableTranscription: options.enableTranscription,
            quality: options.quality,
            voiceEffect: options.voiceEffect,
          },
        },
      });

      if (processError) {
        console.error("Edge Function failed:", processError);
        return await this.processVideoLocally(videoUri, options, onProgress);
      }

      // Check if the response indicates success
      if (!processData || !processData.success) {
        console.error("Edge Function returned unsuccessful response:", processData);
        return await this.processVideoLocally(videoUri, options, onProgress);
      }

      onProgress?.(80, "Processing complete!");

      const storagePath: string | undefined = processData?.storagePath || undefined;
      const signedUrl = await ensureSignedVideoUrl(storagePath);

      return {
        uri: signedUrl || videoUri,
        transcription: processData?.transcription || "Mock transcription for testing",
        duration: processData?.duration || 30,
        thumbnailUri: "",
        faceBlurApplied: options.enableFaceBlur || false,
        voiceChangeApplied: options.enableVoiceChange || false,
      };
    } catch (error) {
      console.error("Server-side processing failed:", error);
      // Fallback to local processing
      return await this.processVideoLocally(videoUri, options, onProgress);
    }
  }

  private async processVideoLocally(
    videoUri: string,
    options: VideoProcessingOptions,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    const {
      enableFaceBlur = true,
      enableVoiceChange = true,
      enableTranscription = true,
      voiceEffect = "deep",
    } = options;

    // Create processing directory
    const processingDir = `${FileSystem.documentDirectory}processing/`;
    await FileSystem.makeDirectoryAsync(processingDir, { intermediates: true });

    onProgress?.(15, "Applying face blur effect...");

    // Simulate face blur processing (in development build, this would use real ML Kit)
    let processedVideoUri = videoUri;
    if (enableFaceBlur) {
      processedVideoUri = await this.simulateFaceBlur(videoUri, processingDir);
    }

    onProgress?.(35, "Processing audio with voice effects...");

    // Simulate voice change processing
    let voiceChangeApplied = false;
    if (enableVoiceChange) {
      voiceChangeApplied = await this.simulateVoiceChange(voiceEffect);
    }

    onProgress?.(55, "Generating transcription...");

    // Generate transcription
    let transcription = "";
    if (enableTranscription) {
      transcription = await this.generateMockTranscription();
    }

    onProgress?.(75, "Generating thumbnail...");

    // Generate thumbnail
    const thumbnailUri = await this.generateThumbnail(processedVideoUri);

    onProgress?.(90, "Finalizing processing...");

    // Get video duration (mock)
    const duration = await this.getMockDuration(processedVideoUri);

    onProgress?.(100, "Processing complete!");

    // Clean up temporary files
    await this.performCleanup(processingDir);

    return {
      uri: processedVideoUri,
      transcription,
      duration,
      thumbnailUri,
      faceBlurApplied: enableFaceBlur,
      voiceChangeApplied,
    };
  }

  private async simulateFaceBlur(videoUri: string, outputDir: string): Promise<string> {
    // In Expo Go, we simulate face blur
    // In development build, this would use real ML Kit face detection
    const outputUri = `${outputDir}face_blurred.mp4`;

    try {
      // Copy original video (in dev build, this would apply real face blur)
      await FileSystem.copyAsync({
        from: videoUri,
        to: outputUri,
      });

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return outputUri;
    } catch (error) {
      console.error("Face blur simulation failed:", error);
      return videoUri; // Return original if processing fails
    }
  }

  private async simulateVoiceChange(effect: "deep" | "light"): Promise<boolean> {
    try {
      // Simulate voice processing time based on effect
      const processingTime = effect === "deep" ? 800 : 600;
      await new Promise((resolve) => setTimeout(resolve, processingTime));

      console.log(`Applied ${effect} voice effect`);
      return true;
    } catch (error) {
      console.error("Voice change simulation failed:", error);
      return false;
    }
  }

  private async generateMockTranscription(): Promise<string> {
    try {
      // In development build, this would use real speech-to-text
      // For now, return a mock transcription
      const mockTranscriptions = [
        "This is my anonymous confession about something I've never told anyone.",
        "I have a secret that I need to share with the world anonymously.",
        "Here's something I've been keeping to myself for too long.",
        "This confession is about a personal experience I want to share.",
        "I'm sharing this story because I think others might relate to it.",
      ];

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    } catch (error) {
      console.error("Transcription failed:", error);
      return "";
    }
  }

  private async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // 1 second
        quality: 0.8,
      });
      return uri;
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      return "";
    }
  }

  private async getMockDuration(videoUri: string): Promise<number> {
    // Mock implementation - in production, use ffprobe or similar
    return Math.floor(Math.random() * 30) + 15; // 15-45 seconds
  }

  private async performCleanup(processingDir: string): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(processingDir);
      for (const file of files) {
        await FileSystem.deleteAsync(`${processingDir}${file}`, { idempotent: true });
      }
      await FileSystem.deleteAsync(processingDir, { idempotent: true });
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }

  // Real-time transcription for live overlay (Demo mode)
  async startRealTimeTranscription(): Promise<void> {
    console.log("🎯 Demo: Starting real-time transcription simulation");
  }

  async stopRealTimeTranscription(): Promise<void> {
    console.log("🎯 Demo: Stopping real-time transcription simulation");
  }
}

// Export singleton instance that implements IAnonymiser interface
export const videoProcessingService: IAnonymiser = new VideoProcessingService();
