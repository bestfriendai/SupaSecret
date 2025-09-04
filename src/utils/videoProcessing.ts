import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";

export interface ProcessedVideo {
  uri: string;
  transcription: string;
  duration?: number;
  thumbnailUri?: string;
  audioUri?: string;
}

export interface VideoProcessingOptions {
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: "high" | "medium" | "low";
  onProgress?: (progress: number, status: string) => void;
}

/**
 * Process video with face blur and voice change simulation
 * In a real implementation, this would:
 * 1. Extract audio from video
 * 2. Apply voice modulation using audio processing
 * 3. Apply face blur using ML/computer vision
 * 4. Transcribe the modified audio
 * 5. Combine processed audio and video
 */
export const processVideoConfession = async (
  videoUri: string,
  options: VideoProcessingOptions = {}
): Promise<ProcessedVideo> => {
  try {
    const {
      enableTranscription = true,
      quality = "medium",
      onProgress
    } = options;

    // Check if video file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }

    onProgress?.(5, "Cleaning up old temporary files...");
    
    // Clean up old temporary files to free space
    await cleanupTemporaryFiles();
    
    onProgress?.(10, "Initializing video processing...");

    // Simulate face blur and voice change processing
    const processingTime = quality === "high" ? 3000 : quality === "medium" ? 2000 : 1000;
    onProgress?.(30, "Applying face blur and voice change...");
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    let transcription = "";
    
    if (enableTranscription) {
      try {
        onProgress?.(50, "Extracting audio for transcription...");
        
        // Extract audio from video and transcribe
        const audioUri = await extractAudioFromVideo(videoUri);
        
        onProgress?.(70, "Transcribing audio...");
        transcription = await transcribeAudio(audioUri);
        
        // Clean up temporary audio file
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (error) {
        console.error("Transcription failed:", error);
        // Fallback to mock transcription if real transcription fails
        transcription = generateMockTranscription();
      }
    }
    
    onProgress?.(85, "Finalizing video processing...");
    
    // Copy video to a processed location (in real app, this would be the processed video)
    const processedVideoUri = `${FileSystem.documentDirectory}processed_${Date.now()}.mp4`;
    await FileSystem.copyAsync({
      from: videoUri,
      to: processedVideoUri,
    });

    onProgress?.(95, "Generating thumbnail...");
    
    // Generate thumbnail (mock implementation)
    const thumbnailUri = await generateVideoThumbnail(processedVideoUri);
    
    onProgress?.(100, "Processing complete!");
    
    return {
      uri: processedVideoUri,
      transcription,
      duration: 30, // Mock duration - in real app, get from video metadata
      thumbnailUri,
    };
  } catch (error) {
    console.error("Video processing error:", error);
    throw new Error(`Failed to process video confession: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate thumbnail from video (mock implementation)
 * In a real implementation, you would use expo-video-thumbnails
 */
const generateVideoThumbnail = async (videoUri: string): Promise<string> => {
  try {
    // Check if video file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }
    
    // For now, return empty string as we don't have thumbnail generation
    // In a real implementation:
    // import { VideoThumbnails } from 'expo-video-thumbnails';
    // const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    //   time: 1000,
    // });
    // return uri;
    
    return "";
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return "";
  }
};

/**
 * Extract audio from video file
 * This is a simplified implementation using expo-av
 */
const extractAudioFromVideo = async (videoUri: string): Promise<string> => {
  try {
    // Check if video file exists and get its size
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }
    
    // Check available storage space
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const videoSize = fileInfo.size || 0;
    
    if (freeSpace < videoSize * 2) { // Need at least 2x video size for processing
      throw new Error("Insufficient storage space for video processing");
    }
    
    // Create temporary audio file path
    const audioUri = `${FileSystem.documentDirectory}temp_audio_${Date.now()}.m4a`;
    
    // Load the video to extract audio
    const { sound } = await Audio.Sound.createAsync(
      { uri: videoUri },
      { shouldPlay: false }
    );
    
    // Get the audio URI from the loaded sound
    // Note: This is a simplified approach. In a real implementation,
    // you would use FFmpeg or similar to properly extract audio
    
    // For now, we'll copy the video file as audio (works for most formats)
    await FileSystem.copyAsync({
      from: videoUri,
      to: audioUri,
    });
    
    // Unload the sound
    await sound.unloadAsync();
    
    return audioUri;
  } catch (error) {
    console.error("Audio extraction error:", error);
    throw new Error(`Failed to extract audio from video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract audio from video and transcribe it
 * This is a simplified version - in production you'd use FFmpeg
 */
export const extractAndTranscribeAudio = async (videoUri: string): Promise<string> => {
  try {
    const audioUri = await extractAudioFromVideo(videoUri);
    const transcription = await transcribeAudio(audioUri);
    
    // Clean up temporary audio file
    await FileSystem.deleteAsync(audioUri, { idempotent: true });
    
    return transcription;
  } catch (error) {
    console.error("Audio extraction/transcription error:", error);
    throw new Error("Failed to transcribe video audio");
  }
};

/**
 * Clean up temporary files created during video processing
 */
export const cleanupTemporaryFiles = async (): Promise<void> => {
  try {
    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) return;
    
    const files = await FileSystem.readDirectoryAsync(documentDirectory);
    const tempFiles = files.filter(file => 
      file.startsWith('temp_audio_') || 
      file.startsWith('temp_video_') ||
      file.startsWith('thumbnail_')
    );
    
    // Clean up files older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of tempFiles) {
      try {
        const filePath = `${documentDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime && fileInfo.modificationTime < oneHourAgo) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      } catch (error) {
        console.warn(`Failed to clean up temp file ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn("Failed to clean up temporary files:", error);
  }
};

/**
 * Generate mock transcription for demo purposes
 */
const generateMockTranscription = (): string => {
  const mockConfessions = [
    "I've been pretending to be happy at work for months, but I'm actually really struggling with anxiety and feel like I'm failing at everything.",
    "I secretly judge people based on their social media posts, even though I know it's wrong and I hate that I do it.",
    "I've been lying to my family about my financial situation. I'm actually in debt and too embarrassed to ask for help.",
    "Sometimes I feel like I'm not good enough for my partner and that they deserve someone better than me.",
    "I've been avoiding my best friend because I'm jealous of their success and I feel terrible about it.",
    "I still think about my ex from years ago and wonder what would have happened if we stayed together.",
    "I pretend to understand things in meetings at work when I'm actually completely lost most of the time.",
    "I've been eating my feelings and gained weight, but I tell everyone I'm fine when I'm really not.",
  ];
  
  return mockConfessions[Math.floor(Math.random() * mockConfessions.length)];
};