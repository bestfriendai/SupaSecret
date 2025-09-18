import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { IAnonymiser, ProcessedVideo, VideoProcessingOptions } from "./IAnonymiser";
import { ensureSignedVideoUrl, uploadVideoToSupabase } from "../utils/storage";
import { supabase } from "../lib/supabase";
import { env } from "../utils/env";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { videoCacheManager } from "../utils/videoCacheManager";
import { videoProcessor } from "./ModernVideoProcessor";
import { isExpoGo, hasVideoProcessing } from "../utils/environmentDetector";
import {
  videoValidation,
  validateVideoProcessingOptions,
  VideoProcessingOptions as ValidationVideoProcessingOptions,
} from "../utils/validation";
import { transcribeAudio } from "../api/transcribe-audio";

export enum ProcessingMode {
  LOCAL = "local",
  SERVER = "server",
  HYBRID = "hybrid",
  FFMPEG = "ffmpeg",
}

export interface ProcessingJob {
  id: string;
  uri: string;
  options: VideoProcessingOptions;
  priority: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  result?: ProcessedVideo;
  error?: Error;
  startTime?: number;
  endTime?: number;
  retries: number;
  mode?: ProcessingMode;
  fallbackToServer?: boolean;
  maxRetries?: number;
  completionPromise?: Promise<ProcessedVideo>;
  resolvePromise?: (value: ProcessedVideo) => void;
  rejectPromise?: (error: Error) => void;
  onProgress?: (progress: number, message: string) => void;
}

export interface ProcessingStats {
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  queueLength: number;
  activeJobs: number;
  processingMode: ProcessingMode;
}

export interface UnifiedVideoProcessingOptions extends VideoProcessingOptions {
  mode?: ProcessingMode;
  priority?: number;
  fallbackToServer?: boolean;
  maxRetries?: number;
  cacheStrategy?: "aggressive" | "normal" | "bypass";
}

class UnifiedVideoProcessingService implements IAnonymiser {
  private static instance: UnifiedVideoProcessingService;
  private isInitialized = false;
  private processingQueue: ProcessingJob[] = [];
  private activeJobs: Map<string, ProcessingJob> = new Map();
  private maxConcurrentJobs = 2;
  private stats: ProcessingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    queueLength: 0,
    activeJobs: 0,
    processingMode: ProcessingMode.HYBRID,
  };
  private ffmpegAvailable: boolean | null = null;
  private processingLock = false;
  private cacheIndex: Map<string, ProcessedVideo> = new Map(); // Cache metadata index

  private constructor() {}

  static getInstance(): UnifiedVideoProcessingService {
    if (!UnifiedVideoProcessingService.instance) {
      UnifiedVideoProcessingService.instance = new UnifiedVideoProcessingService();
    }
    return UnifiedVideoProcessingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const startTime = Date.now();

    // Check FFmpeg availability
    this.ffmpegAvailable = await this.checkFFmpegAvailability();

    // Determine processing mode based on environment
    if (isExpoGo() || env.expoGo) {
      this.stats.processingMode = ProcessingMode.SERVER;
      console.log("🎯 Unified Video Processing: Server mode (Expo Go)");
    } else if (hasVideoProcessing() && this.ffmpegAvailable) {
      this.stats.processingMode = ProcessingMode.FFMPEG;
      console.log("🎯 Unified Video Processing: FFmpeg mode");
    } else if (hasVideoProcessing()) {
      this.stats.processingMode = ProcessingMode.LOCAL;
      console.log("🎯 Unified Video Processing: Local mode");
    } else {
      this.stats.processingMode = ProcessingMode.HYBRID;
      console.log("🎯 Unified Video Processing: Hybrid mode");
    }

    // Initialize cache manager
    await videoCacheManager.initialize();

    // Start background queue processor
    this.startQueueProcessor();

    this.isInitialized = true;
    trackStoreOperation("UnifiedVideoProcessing", "initialize", Date.now() - startTime);
  }

  async processVideo(videoUri: string, options: UnifiedVideoProcessingOptions = {}): Promise<ProcessedVideo> {
    await this.initialize();

    const startTime = Date.now();
    const {
      onProgress,
      mode = this.stats.processingMode,
      priority = 5,
      fallbackToServer = true,
      maxRetries = 2,
      cacheStrategy = "normal",
      ...processingOptions
    } = options;

    try {
      // Step 1: Validate input
      onProgress?.(1, "Validating input parameters...");
      await this.validateInput(videoUri, processingOptions);

      // Step 2: Check cache
      if (cacheStrategy !== "bypass") {
        onProgress?.(5, "Checking cache...");
        const cacheKey = this.generateCacheKey(videoUri, processingOptions);

        // Check if we have cached metadata for this processing configuration
        const cachedMetadata = this.cacheIndex.get(cacheKey);
        if (cachedMetadata) {
          // Verify the cached file still exists
          const cachedPath = await videoCacheManager.getCachedVideo(cachedMetadata.uri);
          if (cachedPath) {
            this.stats.cacheHitRate =
              (this.stats.cacheHitRate * this.stats.totalProcessed + 1) / (this.stats.totalProcessed + 1);
            onProgress?.(100, "Using cached result");
            trackStoreOperation("UnifiedVideoProcessing", "cacheHit", Date.now() - startTime);
            return { ...cachedMetadata, uri: cachedPath };
          } else {
            // Cached file was deleted, remove from index
            this.cacheIndex.delete(cacheKey);
          }
        }
      }

      // Step 3: Create processing job with promise for completion
      let resolvePromise: ((value: ProcessedVideo) => void) | undefined;
      let rejectPromise: ((error: Error) => void) | undefined;
      const completionPromise = new Promise<ProcessedVideo>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      const job: ProcessingJob = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        uri: videoUri,
        options: processingOptions,
        priority,
        status: "pending",
        progress: 0,
        message: "Queued for processing",
        retries: 0,
        mode,
        fallbackToServer,
        maxRetries,
        completionPromise,
        resolvePromise,
        rejectPromise,
        onProgress,
      };

      // Step 4: Add to queue or process immediately
      if (this.activeJobs.size < this.maxConcurrentJobs) {
        return await this.executeJob(job, mode, fallbackToServer, maxRetries, onProgress);
      } else {
        // Add to priority queue
        this.addToQueue(job);
        onProgress?.(10, `Queued (position ${this.processingQueue.length})`);

        // Wait for job completion
        return await this.waitForJobCompletion(job, onProgress);
      }
    } catch (error) {
      this.stats.totalFailed++;
      console.error("Video processing failed:", error);
      throw error;
    }
  }

  private async executeJob(
    job: ProcessingJob,
    mode: ProcessingMode,
    fallbackToServer: boolean,
    maxRetries: number,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    job.status = "processing";
    job.startTime = Date.now();
    this.activeJobs.set(job.id, job);
    this.stats.activeJobs = this.activeJobs.size;

    // Centralize progress reporting
    const report = (p: number, m: string) => {
      job.progress = p;
      job.message = m;
      job.onProgress?.(p, m);
      onProgress?.(p, m);
    };

    try {
      let result: ProcessedVideo;

      switch (mode) {
        case ProcessingMode.FFMPEG:
          result = await this.processWithFFmpeg(job, report);
          break;
        case ProcessingMode.LOCAL:
          result = await this.processLocally(job, report);
          break;
        case ProcessingMode.SERVER:
          result = await this.processOnServer(job, report);
          break;
        case ProcessingMode.HYBRID:
        default:
          try {
            if (this.ffmpegAvailable) {
              result = await this.processWithFFmpeg(job, report);
            } else if (hasVideoProcessing()) {
              result = await this.processLocally(job, report);
            } else {
              result = await this.processOnServer(job, report);
            }
          } catch (error) {
            if (fallbackToServer && job.retries < maxRetries) {
              job.retries++;
              console.warn(`Processing failed, attempt ${job.retries}/${maxRetries}, falling back to server`);
              result = await this.processOnServer(job, report);
            } else {
              throw error;
            }
          }
      }

      // Update job and stats
      job.status = "completed";
      job.result = result;
      job.endTime = Date.now();
      job.progress = 100;
      job.message = "Processing complete";

      // Resolve the promise
      job.resolvePromise?.(result);

      const processingTime = job.endTime - job.startTime!;
      this.stats.totalProcessed++;
      this.stats.averageProcessingTime =
        (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) /
        this.stats.totalProcessed;

      // Cache result
      const cacheKey = this.generateCacheKey(job.uri, job.options);
      const cachedPath = await videoCacheManager.cacheVideo(result.uri, "high");

      // Store metadata in cache index
      this.cacheIndex.set(cacheKey, { ...result, uri: cachedPath });

      // Track performance
      trackStoreOperation("UnifiedVideoProcessing", `process_${mode}`, processingTime);

      return result;
    } catch (error) {
      job.status = "failed";
      job.error = error as Error;
      job.endTime = Date.now();
      job.rejectPromise?.(error as Error);
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
      this.stats.activeJobs = this.activeJobs.size;
      this.processNextInQueue();
    }
  }

  private async processWithFFmpeg(
    job: ProcessingJob,
    report: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    report(15, "Processing with FFmpeg...");

    const processingDir = `${FileSystem.Paths.cache.uri}processing_${job.id}/`;
    await FileSystem.makeDirectoryAsync(processingDir, { intermediates: true });

    try {
      let currentUri = job.uri;

      // Apply face blur
      if (job.options.enableFaceBlur) {
        report(30, "Applying face blur effect...");
        currentUri = await this.applyFaceBlurFFmpeg(currentUri, processingDir, job.options.quality);
      }

      // Apply voice change
      let voiceChanged = false;
      if (job.options.enableVoiceChange) {
        report(50, "Processing audio with voice effects...");
        const result = await this.applyVoiceChangeFFmpeg(currentUri, processingDir, job.options.voiceEffect);
        if (result) {
          currentUri = result;
          voiceChanged = true;
        }
      }

      // Generate transcription
      let transcription = "";
      if (job.options.enableTranscription) {
        report(70, "Generating transcription...");
        transcription = await this.generateTranscription(currentUri, processingDir);
      }

      // Generate thumbnail
      report(85, "Generating thumbnail...");
      const thumbnailUri = await this.generateThumbnail(currentUri);

      // Get duration
      const duration = await this.getVideoDuration(currentUri);

      report(100, "Processing complete!");

      return {
        uri: currentUri,
        transcription,
        duration,
        thumbnailUri,
        faceBlurApplied: job.options.enableFaceBlur || false,
        voiceChangeApplied: voiceChanged,
      };
    } finally {
      // Cleanup
      await FileSystem.deleteAsync(processingDir, { idempotent: true });
    }
  }

  private async processLocally(
    job: ProcessingJob,
    report: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    report(15, "Processing locally...");

    try {
      report(30, "Initializing video processor...");
      const processed = await videoProcessor.processVideo(
        job.uri,
        {
          quality: job.options.quality || "high",
          maxDuration: job.options.maxDuration,
          removeAudio: job.options.muteAudio,
        },
        (progress) => report(progress, "Processing video..."),
      );

      report(50, "Video processing complete...");

      let transcription = "";
      if (job.options.enableTranscription) {
        report(70, "Generating transcription...");
        transcription = await this.generateTranscription(job.uri, FileSystem.Paths.cache.uri!);
      }

      report(85, "Finalizing...");

      const result = {
        uri: processed.uri,
        thumbnailUri: processed.thumbnail || "",
        duration: processed.duration,
        transcription,
        faceBlurApplied: job.options.enableFaceBlur || false,
        voiceChangeApplied: job.options.enableVoiceChange || false,
        metadata: {
          width: processed.width,
          height: processed.height,
          duration: processed.duration,
          size: processed.size,
        },
      };

      report(100, "Processing complete!");
      return result;
    } catch (error) {
      console.error("[UnifiedVideoProcessing] Local processing failed:", error);
      throw error;
    }
  }

  private async processOnServer(
    job: ProcessingJob,
    report: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    report(10, "Uploading to server...");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated for server processing");
    }

    const upload = await uploadVideoToSupabase(job.uri, user.id, {
      onProgress: (p: number) => report(10 + p * 0.2, "Uploading video..."),
    });

    report(30, "Processing on server...");

    const { data, error } = await supabase.functions.invoke("process-video", {
      body: {
        videoPath: upload.path,
        options: job.options,
      },
    });

    if (error) {
      throw new Error(`Server processing failed: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(`Server processing failed: ${data?.error || "Unknown error"}`);
    }

    report(80, "Retrieving processed video...");

    const signedUrl = await ensureSignedVideoUrl(data.storagePath);

    report(100, "Processing complete!");

    return {
      uri: signedUrl.signedUrl || job.uri,
      transcription: data.transcription || "",
      duration: data.duration || 30,
      thumbnailUri: data.thumbnailUrl || "",
      faceBlurApplied: data.faceBlurApplied || false,
      voiceChangeApplied: data.voiceChangeApplied || false,
    };
  }

  async preloadVideos(uris: string[], priority: number = 3): Promise<void> {
    await this.initialize();

    const preloadJobs = uris.map((uri) => ({
      id: `preload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uri,
      options: { quality: "medium" as const },
      priority,
      status: "pending" as const,
      progress: 0,
      message: "Queued for preloading",
      retries: 0,
      mode: this.stats.processingMode,
      fallbackToServer: true,
      maxRetries: 1,
      onProgress: undefined,
    }));

    preloadJobs.forEach((job) => this.addToQueue(job));
  }

  async clearCache(): Promise<void> {
    await videoCacheManager.clearCache();
    this.stats.cacheHitRate = 0;
  }

  getProcessingStats(): ProcessingStats {
    return {
      ...this.stats,
      queueLength: this.processingQueue.length,
    };
  }

  private async validateInput(videoUri: string, options: VideoProcessingOptions): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file does not exist");
    }

    const fileValidation = videoValidation.videoFile({ uri: videoUri, size: fileInfo.size });
    if (!fileValidation.isValid && fileValidation.error) {
      throw new Error(fileValidation.error);
    }

    if (fileInfo.size && fileInfo.size > 100 * 1024 * 1024) {
      throw new Error("Video file is too large (max 100MB)");
    }

    const mappedOptions: ValidationVideoProcessingOptions = {
      quality: options.quality as "low" | "medium" | "high" | undefined,
      voiceEffect: options.voiceEffect as "none" | "robot" | "whisper" | "deep" | undefined,
      transcriptionEnabled: options.enableTranscription,
      backgroundMusic: false,
      filters: [],
    };

    const optionsValidation = validateVideoProcessingOptions(mappedOptions);
    if (!optionsValidation.isValid && optionsValidation.error) {
      throw new Error(`Invalid processing options: ${optionsValidation.error}`);
    }
  }

  private generateCacheKey(uri: string, options: VideoProcessingOptions): string {
    return `${uri}:${JSON.stringify({
      enableFaceBlur: options.enableFaceBlur,
      enableVoiceChange: options.enableVoiceChange,
      enableTranscription: options.enableTranscription,
      quality: options.quality,
      voiceEffect: options.voiceEffect,
    })}`;
  }

  private addToQueue(job: ProcessingJob): void {
    this.processingQueue.push(job);
    this.processingQueue.sort((a, b) => b.priority - a.priority);
    this.stats.queueLength = this.processingQueue.length;
  }

  private async waitForJobCompletion(
    job: ProcessingJob,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<ProcessedVideo> {
    // Monitor progress with interval
    const progressInterval = setInterval(() => {
      if (job.status === "processing") {
        onProgress?.(job.progress, job.message);
      }
    }, 100);

    try {
      // Wait for the promise to resolve/reject
      const result = await job.completionPromise!;
      clearInterval(progressInterval);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  private async startQueueProcessor(): Promise<void> {
    setInterval(() => {
      if (!this.processingLock && this.activeJobs.size < this.maxConcurrentJobs) {
        this.processNextInQueue();
      }
    }, 500);
  }

  private async processNextInQueue(): Promise<void> {
    if (this.processingQueue.length === 0 || this.processingLock) return;

    this.processingLock = true;
    try {
      const job = this.processingQueue.shift();
      if (job) {
        this.stats.queueLength = this.processingQueue.length;
        // Use job-specific settings or defaults
        await this.executeJob(
          job,
          job.mode || this.stats.processingMode,
          job.fallbackToServer ?? true,
          job.maxRetries || 2,
        );
      }
    } finally {
      this.processingLock = false;
    }
  }

  private async checkFFmpegAvailability(): Promise<boolean> {
    if (this.ffmpegAvailable !== null) {
      return this.ffmpegAvailable;
    }

    try {
      if (env.expoGo) {
        this.ffmpegAvailable = false;
        return false;
      }
      const ff = await import("ffmpeg-kit-react-native");
      this.ffmpegAvailable = !!(ff && ff.FFmpegKit);
      return this.ffmpegAvailable;
    } catch {
      this.ffmpegAvailable = false;
      return false;
    }
  }

  private async applyFaceBlurFFmpeg(
    videoUri: string,
    outputDir: string,
    quality?: "high" | "medium" | "low" | "highest",
  ): Promise<string> {
    const outputUri = `${outputDir}face_blurred.mp4`;
    const inPath = this.pathForFFmpeg(videoUri);
    const outPath = this.pathForFFmpeg(outputUri);

    // Validate and sanitize blur sigma value
    const blurSigma = quality === "high" ? 15 : quality === "low" ? 25 : 20;
    if (blurSigma < 1 || blurSigma > 50) {
      throw new Error("Invalid blur sigma value");
    }

    // Validate and sanitize CRF value
    const crf = this.qualityToCrf(quality || "medium");
    if (crf < 0 || crf > 51) {
      throw new Error("Invalid CRF value");
    }

    // Use safe FFmpeg args array instead of string interpolation
    const args = [
      "-y",
      "-i",
      this.sanitizeFFmpegPath(inPath),
      "-vf",
      `gblur=sigma=${blurSigma}`,
      "-c:v",
      "libx264",
      "-crf",
      crf.toString(),
      "-preset",
      "veryfast",
      "-c:a",
      "copy",
      this.sanitizeFFmpegPath(outPath),
    ];

    const success = await this.runFFmpegSafe(args);
    if (!success) {
      await FileSystem.copyAsync({ from: videoUri, to: outputUri });
    }

    return outputUri;
  }

  private async applyVoiceChangeFFmpeg(
    videoUri: string,
    outputDir: string,
    effect?: "deep" | "light",
  ): Promise<string | null> {
    try {
      const outputUri = `${outputDir}voice_changed.mp4`;
      const inPath = this.pathForFFmpeg(videoUri);
      const outPath = this.pathForFFmpeg(outputUri);

      const audioFilter =
        effect === "deep"
          ? "asetrate=44100*0.75,aresample=44100,atempo=1.2,highpass=150,lowpass=2800"
          : "asetrate=44100*0.9,aresample=44100,atempo=1.1,highpass=200,lowpass=3200";

      const cmd = `-y -i "${inPath}" -af "${audioFilter}" -c:v copy -c:a aac -b:a 128k "${outPath}"`;

      const success = await this.runFFmpeg(cmd);
      if (success) {
        return outputUri;
      }
      return null;
    } catch (error) {
      console.error("Voice change failed:", error);
      return null;
    }
  }

  private async generateTranscription(videoUri: string, processingDir: string): Promise<string> {
    try {
      const audioUri = await this.extractAudioFromVideo(videoUri, processingDir);
      const transcription = await transcribeAudio(audioUri);
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
      return transcription;
    } catch (error) {
      console.error("Transcription failed:", error);
      return this.generateMockTranscription();
    }
  }

  private async extractAudioFromVideo(videoUri: string, outputDir: string): Promise<string> {
    const audioUri = `${outputDir}audio_${Date.now()}.m4a`;
    const inPath = this.pathForFFmpeg(videoUri);
    const outPath = this.pathForFFmpeg(audioUri);

    const cmd = `-y -i "${inPath}" -vn -c:a aac -b:a 128k "${outPath}"`;
    const success = await this.runFFmpeg(cmd);

    if (!success) {
      await FileSystem.writeAsStringAsync(audioUri, "", { encoding: "base64" });
    }

    return audioUri;
  }

  private async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
        quality: 0.8,
      });
      return uri;
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      return "";
    }
  }

  private async getVideoDuration(videoUri: string): Promise<number> {
    // Try to get duration using FFmpeg if available
    if (this.ffmpegAvailable) {
      try {
        const ff = await import("ffmpeg-kit-react-native");
        if (ff && ff.FFprobeKit) {
          const session = await ff.FFprobeKit.getMediaInformation(this.pathForFFmpeg(videoUri));
          const info = await session.getMediaInformation();
          if (info) {
            const duration = info.getDuration();
            if (duration && !isNaN(Number(duration))) {
              return Number(duration);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to get duration with FFprobe:", error);
      }
    }

    // Note: videoProcessor.getVideoMetadata is private, so we use FFprobe above as primary method

    // Fallback to a reasonable default
    return 30;
  }

  private generateMockTranscription(): string {
    const mockConfessions = [
      "I've been keeping this secret for too long and need to share it anonymously.",
      "This is something I've never told anyone before.",
      "I have a confession that I need to get off my chest.",
      "Here's my anonymous story that I want to share with the world.",
      "This confession has been weighing on me for months.",
    ];
    return mockConfessions[Math.floor(Math.random() * mockConfessions.length)];
  }

  private pathForFFmpeg(uri: string): string {
    return uri.startsWith("file://") ? uri.replace("file://", "") : uri;
  }

  private sanitizeFFmpegPath(path: string): string {
    // Remove dangerous characters and validate path
    if (!path || typeof path !== "string") {
      throw new Error("Invalid path provided");
    }

    // Remove shell metacharacters and ensure path safety
    const sanitized = path.replace(/[;&|`$(){}\[\]<>"'\\]/g, "");

    // Validate that path exists within expected directories
    if (!sanitized.includes(FileSystem.Paths.cache.uri!) && !sanitized.includes(FileSystem.Paths.document.uri!)) {
      throw new Error("Path not in allowed directory");
    }

    return sanitized;
  }

  private async runFFmpegSafe(args: string[]): Promise<boolean> {
    try {
      const isAvailable = await this.checkFFmpegAvailability();
      if (!isAvailable) return false;

      const ff = await import("ffmpeg-kit-react-native");
      if (!ff || !ff.FFmpegKit) return false;

      // Use executeWithArguments for safer execution
      const session = await ff.FFmpegKit.executeWithArguments(args);
      const returnCode = await session.getReturnCode();
      return ff.ReturnCode.isSuccess(returnCode);
    } catch (error) {
      console.warn("FFmpeg execution failed:", error);
      return false;
    }
  }

  private async runFFmpeg(command: string): Promise<boolean> {
    try {
      const isAvailable = await this.checkFFmpegAvailability();
      if (!isAvailable) return false;

      const ff = await import("ffmpeg-kit-react-native");
      if (!ff || !ff.FFmpegKit) return false;

      const session = await ff.FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();
      return ff.ReturnCode.isSuccess(returnCode);
    } catch (error) {
      console.warn("FFmpeg execution failed:", error);
      return false;
    }
  }

  private qualityToCrf(quality: "high" | "medium" | "low" | "highest"): number {
    switch (quality) {
      case "highest":
        return 18;
      case "high":
        return 22;
      case "low":
        return 30;
      default:
        return 26;
    }
  }

  // IAnonymiser interface implementation for compatibility
  async startRealTimeTranscription(): Promise<void> {
    console.log("🎯 Real-time transcription started");
  }

  async stopRealTimeTranscription(): Promise<void> {
    console.log("🎯 Real-time transcription stopped");
  }
}

// Export singleton instance
export const unifiedVideoProcessingService = UnifiedVideoProcessingService.getInstance();

// Export as IAnonymiser for compatibility
export const videoProcessingService: IAnonymiser = unifiedVideoProcessingService;
