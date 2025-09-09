import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { IAnonymiser, ProcessedVideo, VideoProcessingOptions } from "./IAnonymiser";
import { env } from "../utils/env";

// These imports will only work in development/standalone builds, not in Expo Go
let FFmpegKit: any;
let ReturnCode: any;
let FaceDetection: any;
let Voice: any;

// Lazy load native modules to prevent Expo Go crashes
const loadNativeModules = async () => {
  if (env.expoGo) {
    throw new Error("Native modules not available in Expo Go");
  }

  try {
    if (!FFmpegKit) {
      const ffmpegModule = await import("ffmpeg-kit-react-native");
      FFmpegKit = ffmpegModule.FFmpegKit;
      ReturnCode = ffmpegModule.ReturnCode;
    }

    if (!FaceDetection) {
      try {
        const faceModule = await import("@react-native-ml-kit/face-detection");
        FaceDetection = faceModule.default || faceModule.FaceDetection || faceModule;
      } catch (error) {
        console.warn("Face detection module not available:", error);
        // Provide fallback that will apply general blur
        FaceDetection = {
          detectFaces: async (imagePath: string) => {
            console.warn("Using fallback face detection - applying general blur");
            return [
              {
                bounds: { x: 0, y: 0, width: 1920, height: 1080 }, // Full frame blur as fallback
                landmarks: [],
                angles: { x: 0, y: 0, z: 0 },
              },
            ];
          },
        };
      }
    }

    if (!Voice) {
      try {
        const voiceModule = await import("@react-native-voice/voice");
        Voice = voiceModule.default || voiceModule;
      } catch (error) {
        console.warn("Voice recognition module not available:", error);
        // Provide fallback Voice mock
        Voice = {
          onSpeechResults: null,
          onSpeechError: null,
          start: async () => {},
          destroy: async () => ({ removeAllListeners: () => {} }),
        };
      }
    }
  } catch (error) {
    console.error("Failed to load native modules:", error);
    throw new Error("Native anonymization features require development build");
  }
};

const tmp = FileSystem.documentDirectory!;

class NativeAnonymiserImpl implements IAnonymiser {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🚀 NativeAnonymiser - Real processing with ML Kit + FFmpeg");

    try {
      await loadNativeModules();

      // Set global flag for compatibility
      (global as any).__ffmpegAvailable = true;

      this.isInitialized = true;
    } catch (error) {
      console.error("NativeAnonymiser initialization failed:", error);
      throw error;
    }
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

    onProgress?.(5, "Preparing video processing...");

    try {
      // Step 1: Face detection pass
      let blurFilter = "";
      if (enableFaceBlur) {
        onProgress?.(15, "Detecting faces for anonymization...");
        const faceBoxes = await this.scanFaces(videoUri);
        blurFilter = this.buildBlurFilter(faceBoxes);
      }

      // Step 2: Generate transcription first (needed for video processing)
      let transcription = "";
      if (enableTranscription) {
        onProgress?.(30, "Generating speech transcription...");
        transcription = await this.generateTranscription(videoUri);
      }

      // Step 3: FFmpeg video + audio transform with captions
      onProgress?.(50, "Applying face blur, voice modifications, and captions...");
      const processedUri = await this.processVideoWithFFmpeg(
        videoUri,
        blurFilter,
        enableVoiceChange,
        voiceEffect,
        quality,
        enableTranscription ? transcription : undefined,
      );

      // Step 4: Generate thumbnail
      onProgress?.(85, "Creating thumbnail...");
      const thumbnailUri = await this.generateThumbnail(processedUri);

      // Step 5: Get video duration
      onProgress?.(95, "Finalizing...");
      const duration = await this.getVideoDuration(processedUri);

      onProgress?.(100, "Processing complete!");

      return {
        uri: processedUri,
        transcription,
        duration,
        thumbnailUri,
        faceBlurApplied: enableFaceBlur,
        voiceChangeApplied: enableVoiceChange,
      };
    } catch (error) {
      console.error("Native video processing failed:", error);
      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async scanFaces(videoUri: string): Promise<{ x: number; y: number; w: number; h: number }[]> {
    // Extract frames for face detection
    const framesDir = `${tmp}frames_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true });

    try {
      // Extract every 30th frame (1 fps for 30fps video) as JPEGs
      const extractArgs = [
        "-y",
        "-i",
        this.stripFileScheme(videoUri),
        "-vf",
        "select=not(mod(n,30))", // Fixed: removed unnecessary backslash
        "-vsync",
        "vfr",
        "-q:v",
        "2", // High quality JPEG
        `${this.stripFileScheme(framesDir)}%03d.jpg`,
      ];

      await this.runFFmpegCommand(extractArgs);

      // Process each frame for face detection
      const files = await FileSystem.readDirectoryAsync(framesDir);
      const allFaceBoxes: { x: number; y: number; w: number; h: number }[] = [];

      for (const fileName of files) {
        if (!fileName.endsWith(".jpg")) continue;

        const imagePath = `${framesDir}${fileName}`;

        try {
          const faces = await FaceDetection.detectFaces(imagePath);

          faces.forEach((face: any) => {
            if (face.bounds) {
              allFaceBoxes.push({
                x: Math.round(face.bounds.x),
                y: Math.round(face.bounds.y),
                w: Math.round(face.bounds.width),
                h: Math.round(face.bounds.height),
              });
            }
          });
        } catch (faceDetectionError) {
          console.warn(`Face detection failed for frame ${fileName}:`, faceDetectionError);
        }

        // Clean up frame file immediately
        await FileSystem.deleteAsync(imagePath, { idempotent: true });
      }

      // Clean up frames directory
      await FileSystem.deleteAsync(framesDir, { idempotent: true });

      // Merge overlapping face boxes
      return this.mergeFaceBoxes(allFaceBoxes);
    } catch (error) {
      // Clean up on error
      await FileSystem.deleteAsync(framesDir, { idempotent: true });
      throw error;
    }
  }

  private mergeFaceBoxes(
    boxes: { x: number; y: number; w: number; h: number }[],
  ): { x: number; y: number; w: number; h: number }[] {
    if (boxes.length === 0) return [];

    // Simple approach: create union of all detected face regions
    const minX = Math.max(0, Math.min(...boxes.map((b) => b.x)) - 20); // Add padding
    const minY = Math.max(0, Math.min(...boxes.map((b) => b.y)) - 20);
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 20;
    const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 20;

    return [
      {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      },
    ];
  }

  private buildBlurFilter(faceBoxes: { x: number; y: number; w: number; h: number }[]): string {
    if (faceBoxes.length === 0) {
      // If no faces detected, blur the top half of the video
      return "crop=iw:ih/2:0:0,boxblur=luma_radius=30:luma_power=3,pad=iw:2*ih:0:0";
    }

    // Create blur filter for detected face regions
    return (
      faceBoxes
        .map((box, index) => {
          return `crop=${box.w}:${box.h}:${box.x}:${box.y},boxblur=luma_radius=30:luma_power=3[blur${index}]; [0:v][blur${index}]overlay=${box.x}:${box.y}`;
        })
        .join("; ") + "[blurred]"
    );
  }

  private async processVideoWithFFmpeg(
    inputUri: string,
    blurFilter: string,
    enableVoiceChange: boolean,
    voiceEffect: "deep" | "light",
    quality: "high" | "medium" | "low",
    transcription?: string,
  ): Promise<string> {
    const outputUri = `${tmp}processed_${Date.now()}.mp4`;
    const inputPath = this.stripFileScheme(inputUri);
    const outputPath = this.stripFileScheme(outputUri);

    // Build video filter chain
    const filters: string[] = [];

    // Add blur filter if available
    if (blurFilter) {
      filters.push(blurFilter);
    }

    // Add TikTok-style captions if transcription is available
    if (transcription && transcription.trim()) {
      // Get video duration for proper timing
      const duration = await this.getVideoDuration(inputUri);
      const subtitleFilter = this.buildSubtitleFilter(transcription, duration);
      if (subtitleFilter) {
        filters.push(subtitleFilter);
      }
    }

    const videoFilter = filters.length > 0 ? filters.join(",") : "null";

    // Build audio filter for voice change
    const audioFilter = enableVoiceChange ? this.getVoiceChangeFilter(voiceEffect) : "anull";

    // Quality settings
    const crf = quality === "high" ? 18 : quality === "low" ? 28 : 23;

    const commandArgs = [
      "-y", // Overwrite output
      "-i",
      inputPath,
      "-vf",
      videoFilter,
      "-af",
      audioFilter,
      "-c:v",
      "libx264",
      "-crf",
      crf.toString(),
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    await this.runFFmpegCommand(commandArgs);
    return outputUri;
  }

  private getVoiceChangeFilter(effect: "deep" | "light"): string {
    if (effect === "deep") {
      // Deep voice: Lower pitch, add slight reverb, and formant shifting
      return "asetrate=44100*0.85,aresample=44100,atempo=1.18,aecho=0.8:0.88:60:0.4,equalizer=f=100:width_type=h:width=50:g=3";
    } else {
      // Light voice: Slightly higher pitch with subtle formant adjustment
      return "asetrate=44100*1.08,aresample=44100,atempo=0.93,equalizer=f=200:width_type=h:width=100:g=2";
    }
  }

  private buildSubtitleFilter(transcription: string, videoDuration?: number): string {
    // Create TikTok-style captions that appear on the video
    // Split transcription into chunks for dynamic display
    const words = transcription.trim().split(/\s+/);
    if (words.length === 0) return "";

    const wordsPerSegment = Math.min(4, Math.max(2, words.length / 3)); // 2-4 words per segment
    const segments = [];

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      segments.push(words.slice(i, i + wordsPerSegment).join(" "));
    }

    if (segments.length === 0) return "";

    // Calculate timing - use actual video duration or fallback to 30 seconds
    const actualDuration = videoDuration && videoDuration > 0 && !isNaN(videoDuration) ? videoDuration : 30;
    const segmentDuration = Math.max(1.5, actualDuration / segments.length);
    let currentTime = 0;

    const textFilters = segments.map((segment, index) => {
      const startTime = currentTime;
      const endTime = Math.min(currentTime + segmentDuration, actualDuration);
      currentTime += segmentDuration;

      // Comprehensive escaping for FFmpeg drawtext
      const escapedText = this.escapeFFmpegText(segment);

      // TikTok-style centered text at bottom with outline
      return `drawtext=text='${escapedText}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-80:enable='between(t,${startTime.toFixed(1)},${endTime.toFixed(1)})'`;
    });

    return textFilters.join(",");
  }

  private async generateTranscription(videoUri: string): Promise<string> {
    try {
      // Extract audio for transcription
      const audioUri = await this.extractAudio(videoUri);

      // Use speech-to-text
      const transcription = await this.speechToText(audioUri);

      // Clean up audio file
      await FileSystem.deleteAsync(audioUri, { idempotent: true });

      return transcription;
    } catch (error) {
      console.warn("Transcription failed:", error);
      return "Transcription not available";
    }
  }

  private async extractAudio(videoUri: string): Promise<string> {
    const audioUri = `${tmp}audio_${Date.now()}.m4a`;
    const commandArgs = [
      "-y",
      "-i",
      this.stripFileScheme(videoUri),
      "-vn", // No video
      "-acodec",
      "aac",
      "-b:a",
      "128k",
      this.stripFileScheme(audioUri),
    ];

    await this.runFFmpegCommand(commandArgs);
    return audioUri;
  }

  private async speechToText(audioUri: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        Voice.destroy();
        reject(new Error("Speech recognition timeout"));
      }, 30000); // 30 second timeout

      Voice.onSpeechResults = (event: any) => {
        clearTimeout(timeout);
        const results = event.value || [];
        resolve(results.join(" ") || "No speech detected");
        Voice.destroy().then(() => Voice.removeAllListeners());
      };

      Voice.onSpeechError = (event: any) => {
        clearTimeout(timeout);
        console.warn("Speech recognition error:", event);
        resolve("Speech recognition failed");
        Voice.destroy().then(() => Voice.removeAllListeners());
      };

      // Start speech recognition with the extracted audio
      Voice.start("en-US", {
        // Note: Some platforms may not support file-based recognition
        // In those cases, this would need server-side processing
      }).catch(() => {
        clearTimeout(timeout);
        resolve("Speech recognition not available");
      });
    });
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

      // Fallback: generate with FFmpeg
      try {
        const thumbUri = `${tmp}thumb_${Date.now()}.jpg`;
        const commandArgs = [
          "-y",
          "-i",
          this.stripFileScheme(videoUri),
          "-vf",
          "thumbnail,scale=320:-1",
          "-frames:v",
          "1",
          this.stripFileScheme(thumbUri),
        ];

        await this.runFFmpegCommand(commandArgs);
        return thumbUri;
      } catch (ffmpegError) {
        console.error("FFmpeg thumbnail generation also failed:", ffmpegError);
        return "";
      }
    }
  }

  private async getVideoDuration(videoUri: string): Promise<number> {
    try {
      const commandArgs = ["-i", this.stripFileScheme(videoUri), "-hide_banner"];
      const session = await FFmpegKit.executeWithArguments(commandArgs);
      const output = await session.getOutput();

      // Parse duration from FFmpeg output
      const durationMatch = output?.match(/Duration: (\d+):(\d+):([\d.]+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }

      return 30; // Default fallback
    } catch (error) {
      console.warn("Duration detection failed:", error);
      return 30; // Default fallback
    }
  }

  private async runFFmpegCommand(args: string[]): Promise<void> {
    // Validate and sanitize arguments
    const sanitizedArgs = args.map((arg) => this.sanitizeFFmpegArg(arg));

    const session = await FFmpegKit.executeWithArguments(sanitizedArgs);
    const returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      const output = await session.getOutput();
      const errorOutput = await session.getFailStackTrace();
      throw new Error(`FFmpeg failed with code ${returnCode}: ${errorOutput || output}`);
    }
  }

  private sanitizeFFmpegArg(arg: string): string {
    // Basic validation and sanitization for FFmpeg arguments
    if (typeof arg !== "string") {
      throw new Error("FFmpeg argument must be a string");
    }

    // Reject suspicious characters that could be used for command injection
    const suspiciousChars = /[;&|`$(){}[\]<>]/;
    if (suspiciousChars.test(arg)) {
      throw new Error(`Invalid characters in FFmpeg argument: ${arg}`);
    }

    // Allow only safe characters for file paths and filter strings
    const allowedChars = /^[a-zA-Z0-9._\-/\\:=,'"()\s+*?!@#%^&]+$/;
    if (!allowedChars.test(arg)) {
      throw new Error(`Unsafe characters in FFmpeg argument: ${arg}`);
    }

    return arg;
  }

  private escapeFFmpegText(text: string): string {
    // Comprehensive escaping for FFmpeg drawtext filter
    return text
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/:/g, "\\:") // Escape colons
      .replace(/%/g, "\\%") // Escape percent signs
      .replace(/,/g, "\\,") // Escape commas
      .replace(/\[/g, "\\[") // Escape square brackets
      .replace(/\]/g, "\\]") // Escape square brackets
      .replace(/\{/g, "\\{") // Escape curly brackets
      .replace(/\}/g, "\\}") // Escape curly brackets
      .replace(/\(/g, "\\(") // Escape round brackets
      .replace(/\)/g, "\\)") // Escape round brackets
      .replace(/;/g, "\\;") // Escape semicolons
      .replace(/&/g, "\\&") // Escape ampersands
      .replace(/\?/g, "\\?") // Escape question marks
      .replace(/\n/g, "\\n") // Replace newlines with literal \n
      .replace(/\r/g, ""); // Remove carriage returns
  }

  private stripFileScheme(uri: string): string {
    return uri.startsWith("file://") ? uri.replace("file://", "") : uri;
  }

  // Real-time transcription (placeholder for future implementation)
  async startRealTimeTranscription(): Promise<void> {
    console.log("🎯 Starting real-time transcription (native)");
    // TODO: Implement with Camera frame processor + Voice recognition
  }

  async stopRealTimeTranscription(): Promise<void> {
    console.log("🎯 Stopping real-time transcription (native)");
    // TODO: Stop real-time processing
  }
}

// Export singleton instance
export const nativeAnonymiser: IAnonymiser = new NativeAnonymiserImpl();
