import { unifiedVideoProcessingService } from "./UnifiedVideoProcessingService";
// removed unused offlineQueue
import { videoPerformanceConfig, DevicePerformanceTier, BackgroundProcessingConfig } from "../config/videoPerformance";
import { environmentDetector } from "../utils/environmentDetector";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export enum JobPriority {
  CRITICAL = 5,
  HIGH = 4,
  NORMAL = 3,
  LOW = 2,
  IDLE = 1,
}

export enum JobType {
  QUALITY_VARIANT_GENERATION = "quality_variant_generation",
  VIDEO_PRELOADING = "video_preloading",
  CACHE_OPTIMIZATION = "cache_optimization",
  THUMBNAIL_GENERATION = "thumbnail_generation",
  VIDEO_TRANSCODING = "video_transcoding",
  METADATA_EXTRACTION = "metadata_extraction",
  CLEANUP = "cleanup",
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  priority: JobPriority;
  data: any;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  progress?: number;
  result?: any;
  memoryUsage?: number;
}

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
  memoryUsed?: number;
}

interface QueueConfig {
  maxConcurrentJobs: number;
  jobQueueLimit: number;
  priorityLevels: number;
  memoryThreshold: number;
  idleThreshold: number;
  batchSize: number;
  persistJobs: boolean;
  autoResume: boolean;
}

class VideoBackgroundQueue {
  private queue: Map<string, BackgroundJob> = new Map();
  private processingJobs: Map<string, BackgroundJob> = new Map();
  private completedJobs: Map<string, BackgroundJob> = new Map();
  private config: QueueConfig;
  private isProcessing = false;
  private isPaused = false;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private appStateSubscription?: any;
  private currentAppState: AppStateStatus = "active";
  private jobIdCounter = 0;
  private videoProcessingService = unifiedVideoProcessingService;
  private deviceTier: DevicePerformanceTier = DevicePerformanceTier.MID;
  private jobListeners: Map<string, (result: JobResult) => void> = new Map();
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();

  constructor(config?: Partial<QueueConfig>) {
    this.config = this.getDefaultConfig();

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initialize();
  }

  private getDefaultConfig(): QueueConfig {
    const backgroundConfig = videoPerformanceConfig.getBackgroundProcessingConfig();

    return {
      maxConcurrentJobs: backgroundConfig.maxConcurrentJobs,
      jobQueueLimit: backgroundConfig.jobQueueLimit,
      priorityLevels: backgroundConfig.priorityLevels,
      memoryThreshold: backgroundConfig.memoryThreshold,
      idleThreshold: backgroundConfig.idleThreshold,
      batchSize: backgroundConfig.batchSize,
      persistJobs: true,
      autoResume: true,
    };
  }

  private async initialize(): Promise<void> {
    // Detect device tier
    await this.detectDeviceTier();

    // Update config based on device tier
    this.updateConfigForDeviceTier();

    // Start monitoring
    this.startMemoryMonitoring();
    this.startAppStateMonitoring();

    // Load persisted jobs if enabled
    if (this.config.persistJobs) {
      await this.loadPersistedJobs();
    }

    // Auto-resume if enabled
    if (this.config.autoResume) {
      this.resume();
    }
  }

  private async detectDeviceTier(): Promise<void> {
    try {
      const memoryInfo = await environmentDetector.getMemoryInfo();
      const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);

      if (totalMemoryGB >= 6) {
        this.deviceTier = DevicePerformanceTier.HIGH;
      } else if (totalMemoryGB >= 4) {
        this.deviceTier = DevicePerformanceTier.MID;
      } else {
        this.deviceTier = DevicePerformanceTier.LOW;
      }

      videoPerformanceConfig.setDeviceTier(this.deviceTier);
    } catch (_error) {
      console.error("Failed to detect device tier");
    }
  }

  private updateConfigForDeviceTier(): void {
    const backgroundConfig = videoPerformanceConfig.getBackgroundProcessingConfig();

    this.config.maxConcurrentJobs = backgroundConfig.maxConcurrentJobs;
    this.config.jobQueueLimit = backgroundConfig.jobQueueLimit;
    this.config.memoryThreshold = backgroundConfig.memoryThreshold;
    this.config.batchSize = backgroundConfig.batchSize;
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(async () => {
      const memoryInfo = await environmentDetector.getMemoryInfo();
      const memoryUsage = (memoryInfo.totalMemory - memoryInfo.availableMemory) / memoryInfo.totalMemory;

      if (memoryUsage > this.config.memoryThreshold) {
        // Pause processing if memory pressure is high
        this.pauseForMemoryPressure();
      } else if (this.isPaused && memoryUsage < this.config.memoryThreshold - 0.1) {
        // Resume if memory pressure has reduced
        this.resume();
      }
    }, 5000);
  }

  private startAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackground = this.currentAppState === "background";
      const isBackground = nextAppState === "background";

      this.currentAppState = nextAppState;

      if (isBackground && !wasBackground) {
        // App went to background - reduce processing
        this.reduceProcessingForBackground();
      } else if (!isBackground && wasBackground) {
        // App came to foreground - restore processing
        this.restoreProcessingForForeground();
      }
    });
  }

  private pauseForMemoryPressure(): void {
    if (!this.isPaused) {
      console.log("[BackgroundQueue] Pausing due to memory pressure");
      this.isPaused = true;

      // Cancel low priority jobs
      for (const [jobId, job] of this.queue) {
        if (job.priority <= JobPriority.LOW) {
          this.cancelJob(jobId);
        }
      }
    }
  }

  private reduceProcessingForBackground(): void {
    // Reduce concurrent jobs for background mode
    const originalConcurrency = this.config.maxConcurrentJobs;
    this.config.maxConcurrentJobs = Math.max(1, Math.floor(originalConcurrency / 2));

    // Cancel idle priority jobs
    for (const [jobId, job] of this.queue) {
      if (job.priority === JobPriority.IDLE) {
        this.cancelJob(jobId);
      }
    }
  }

  private restoreProcessingForForeground(): void {
    // Restore original concurrency
    const backgroundConfig = videoPerformanceConfig.getBackgroundProcessingConfig();
    this.config.maxConcurrentJobs = backgroundConfig.maxConcurrentJobs;

    // Resume processing if paused
    if (this.isPaused) {
      this.resume();
    }
  }

  public async enqueueJob(
    type: JobType,
    data: any,
    priority: JobPriority = JobPriority.NORMAL,
    options?: {
      maxRetries?: number;
      onProgress?: (progress: number) => void;
      onComplete?: (result: JobResult) => void;
    },
  ): Promise<string> {
    // Check queue limits
    if (this.queue.size >= this.config.jobQueueLimit) {
      // Remove lowest priority job if queue is full
      this.evictLowestPriorityJob();
    }

    const jobId = this.generateJobId();
    const job: BackgroundJob = {
      id: jobId,
      type,
      priority,
      data,
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
    };

    this.queue.set(jobId, job);

    // Register callbacks
    if (options?.onProgress) {
      this.progressCallbacks.set(jobId, options.onProgress);
    }
    if (options?.onComplete) {
      this.jobListeners.set(jobId, options.onComplete);
    }

    // Persist job if enabled
    if (this.config.persistJobs) {
      await this.persistJob(job);
    }

    // Start processing if not already running
    if (!this.isProcessing && !this.isPaused) {
      this.startProcessing();
    }

    return jobId;
  }

  public async enqueueBatch(jobs: { type: JobType; data: any; priority?: JobPriority }[]): Promise<string[]> {
    const jobIds: string[] = [];

    for (const jobData of jobs) {
      const jobId = await this.enqueueJob(jobData.type, jobData.data, jobData.priority);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${++this.jobIdCounter}`;
  }

  private evictLowestPriorityJob(): void {
    let lowestPriorityJob: BackgroundJob | null = null;
    let lowestPriorityId: string | null = null;

    for (const [id, job] of this.queue) {
      if (!lowestPriorityJob || job.priority < lowestPriorityJob.priority) {
        lowestPriorityJob = job;
        lowestPriorityId = id;
      }
    }

    if (lowestPriorityId) {
      this.cancelJob(lowestPriorityId);
    }
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing || this.isPaused) return;

    this.isProcessing = true;

    while (this.queue.size > 0 && !this.isPaused) {
      // Check concurrent job limit
      if (this.processingJobs.size >= this.config.maxConcurrentJobs) {
        await this.waitForJobSlot();
      }

      // Get highest priority job
      const nextJob = this.getNextJob();
      if (!nextJob) break;

      // Process job without blocking
      this.processJob(nextJob);
    }

    this.isProcessing = false;
  }

  private getNextJob(): BackgroundJob | null {
    let highestPriorityJob: BackgroundJob | null = null;
    let highestPriorityId: string | null = null;

    for (const [id, job] of this.queue) {
      if (!highestPriorityJob || job.priority > highestPriorityJob.priority) {
        highestPriorityJob = job;
        highestPriorityId = id;
      }
    }

    if (highestPriorityId && highestPriorityJob) {
      this.queue.delete(highestPriorityId);
      this.processingJobs.set(highestPriorityId, highestPriorityJob);
      return highestPriorityJob;
    }

    return null;
  }

  private async waitForJobSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.processingJobs.size < this.config.maxConcurrentJobs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  private async processJob(job: BackgroundJob): Promise<void> {
    job.status = "processing";
    job.startedAt = Date.now();

    try {
      const result = await this.executeJob(job);

      job.status = "completed";
      job.completedAt = Date.now();
      job.result = result.data;

      // Move to completed
      this.processingJobs.delete(job.id);
      this.completedJobs.set(job.id, job);

      // Notify listeners
      this.notifyJobComplete(job.id, result);

      // Clean up old completed jobs
      this.cleanupCompletedJobs();
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        // Retry job with exponential backoff
        setTimeout(
          () => {
            job.status = "pending";
            this.queue.set(job.id, job);
            this.processingJobs.delete(job.id);

            if (!this.isProcessing) {
              this.startProcessing();
            }
          },
          Math.pow(2, job.retryCount) * 1000,
        );
      } else {
        // Job failed permanently
        job.status = "failed";
        job.completedAt = Date.now();

        this.processingJobs.delete(job.id);
        this.completedJobs.set(job.id, job);

        this.notifyJobComplete(job.id, {
          success: false,
          error: job.error,
        });
      }
    }
  }

  private async executeJob(job: BackgroundJob): Promise<JobResult> {
    const startTime = Date.now();
    const startInfo = await environmentDetector.getMemoryInfo();
    const startMemory = startInfo.totalMemory - startInfo.availableMemory;

    try {
      let result: any;

      switch (job.type) {
        case JobType.QUALITY_VARIANT_GENERATION:
          result = await this.generateQualityVariants(job.data);
          break;

        case JobType.VIDEO_PRELOADING:
          result = await this.preloadVideos(job.data);
          break;

        case JobType.CACHE_OPTIMIZATION:
          result = await this.optimizeCache(job.data);
          break;

        case JobType.THUMBNAIL_GENERATION:
          result = await this.generateThumbnails(job.data);
          break;

        case JobType.VIDEO_TRANSCODING:
          result = await this.transcodeVideo(job.data);
          break;

        case JobType.METADATA_EXTRACTION:
          result = await this.extractMetadata(job.data);
          break;

        case JobType.CLEANUP:
          result = await this.performCleanup(job.data);
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const endInfo = await environmentDetector.getMemoryInfo();
      const endMemory = endInfo.totalMemory - endInfo.availableMemory;

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        memoryUsed: endMemory - startMemory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  private async generateQualityVariants(data: any): Promise<any> {
    // Use UnifiedVideoProcessingService for quality variant generation
    return await this.videoProcessingService.processVideo(data.uri, data.options || {});
  }

  private async preloadVideos(data: any): Promise<any> {
    const { uris, priority } = data;

    // Import videoCacheManager dynamically to avoid circular dependency
    const { videoCacheManager } = await import("../utils/videoCacheManager");

    await videoCacheManager.preloadVideos(uris, priority || "normal");

    return { preloadedCount: uris.length };
  }

  private async optimizeCache(data: any): Promise<any> {
    const { videoCacheManager } = await import("../utils/videoCacheManager");

    const result = await videoCacheManager.forceCleanup();

    return {
      removedCount: result.removedCount,
      freedSpace: result.freedSpace,
    };
  }

  private async generateThumbnails(data: any): Promise<any> {
    // Placeholder for thumbnail generation
    // In a real implementation, this would use a video processing library
    return { thumbnailsGenerated: 0 };
  }

  private async transcodeVideo(data: any): Promise<any> {
    return await this.videoProcessingService.processVideo(data.uri, data.options || {});
  }

  private async extractMetadata(data: any): Promise<any> {
    return await this.videoProcessingService.processVideo(data.uri, data.options || {});
  }

  private async performCleanup(data: any): Promise<any> {
    // Clean up old completed jobs
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [id, job] of this.completedJobs) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.completedJobs.delete(id);
        cleanedCount++;
      }
    }

    return { cleanedJobs: cleanedCount };
  }

  private notifyJobComplete(jobId: string, result: JobResult): void {
    const listener = this.jobListeners.get(jobId);
    if (listener) {
      listener(result);
      this.jobListeners.delete(jobId);
    }

    // Clean up progress callback
    this.progressCallbacks.delete(jobId);
  }

  private updateJobProgress(jobId: string, progress: number): void {
    const job = this.processingJobs.get(jobId) || this.queue.get(jobId);
    if (job) {
      job.progress = progress;

      const callback = this.progressCallbacks.get(jobId);
      if (callback) {
        callback(progress);
      }
    }
  }

  private cleanupCompletedJobs(): void {
    // Keep only recent completed jobs (last 100)
    if (this.completedJobs.size > 100) {
      const sortedJobs = Array.from(this.completedJobs.entries()).sort(
        (a, b) => (b[1].completedAt || 0) - (a[1].completedAt || 0),
      );

      this.completedJobs.clear();

      for (let i = 0; i < 100 && i < sortedJobs.length; i++) {
        this.completedJobs.set(sortedJobs[i][0], sortedJobs[i][1]);
      }
    }
  }

  private async persistJob(job: BackgroundJob): Promise<void> {
    try {
      const jobs = await this.loadPersistedJobsData();
      jobs[job.id] = job;
      await AsyncStorage.setItem("background_jobs", JSON.stringify(jobs));
    } catch (_error) {
      console.error("Failed to persist job");
    }
  }

  private async loadPersistedJobs(): Promise<void> {
    try {
      const jobs = await this.loadPersistedJobsData();

      for (const job of Object.values(jobs)) {
        if (job.status === "pending" || (job.status === "processing" && job.retryCount < job.maxRetries)) {
          job.status = "pending";
          this.queue.set(job.id, job);
        }
      }
    } catch (_error) {
      console.error("Failed to load persisted jobs");
    }
  }

  private async loadPersistedJobsData(): Promise<Record<string, BackgroundJob>> {
    try {
      const data = await AsyncStorage.getItem("background_jobs");
      return data ? JSON.parse(data) : {};
    } catch (_error) {
      return {};
    }
  }

  public cancelJob(jobId: string): boolean {
    // Check if job is in queue
    if (this.queue.has(jobId)) {
      const job = this.queue.get(jobId)!;
      job.status = "cancelled";
      this.queue.delete(jobId);
      this.completedJobs.set(jobId, job);

      this.notifyJobComplete(jobId, {
        success: false,
        error: "Job cancelled",
      });

      return true;
    }

    // Check if job is processing
    if (this.processingJobs.has(jobId)) {
      // Can't cancel a job that's already processing
      return false;
    }

    return false;
  }

  public getJobStatus(jobId: string): BackgroundJob | null {
    return this.queue.get(jobId) || this.processingJobs.get(jobId) || this.completedJobs.get(jobId) || null;
  }

  public getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    queueSize: number;
    processingCapacity: number;
  } {
    let failedCount = 0;
    let completedCount = 0;

    for (const job of this.completedJobs.values()) {
      if (job.status === "failed") {
        failedCount++;
      } else if (job.status === "completed") {
        completedCount++;
      }
    }

    return {
      pending: this.queue.size,
      processing: this.processingJobs.size,
      completed: completedCount,
      failed: failedCount,
      queueSize: this.config.jobQueueLimit,
      processingCapacity: this.config.maxConcurrentJobs,
    };
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;

    if (!this.isProcessing && this.queue.size > 0) {
      this.startProcessing();
    }
  }

  public async clearQueue(): Promise<void> {
    // Cancel all pending jobs
    for (const jobId of this.queue.keys()) {
      this.cancelJob(jobId);
    }

    // Clear persisted jobs
    if (this.config.persistJobs) {
      await AsyncStorage.removeItem("background_jobs");
    }
  }

  public destroy(): void {
    // Stop monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Clear all jobs
    this.pause();
    this.queue.clear();
    this.processingJobs.clear();
    this.completedJobs.clear();
    this.jobListeners.clear();
    this.progressCallbacks.clear();
  }
}

export const videoBackgroundQueue = new VideoBackgroundQueue();
