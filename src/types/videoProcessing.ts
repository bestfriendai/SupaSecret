/**
 * TypeScript types for video processing system
 */

// ============================================
// Core Video Types
// ============================================

export type VideoQuality = 'highest' | 'high' | 'medium' | 'low';
export type VoiceEffect = 'none' | 'robot' | 'whisper' | 'deep' | 'light';
export type VideoFormat = 'mp4' | 'mov' | 'avi' | 'mkv' | 'm4v' | '3gp' | 'webm';
export type ProcessingMode = 'local' | 'server' | 'hybrid' | 'ffmpeg';
export type ContentType = 'thumbnail' | 'preview' | 'full';

// ============================================
// Processing Options
// ============================================

export interface VideoProcessingOptions {
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: VideoQuality;
  voiceEffect?: VoiceEffect;
  maxDuration?: number;
  muteAudio?: boolean;
  removeAudio?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface ExtendedVideoProcessingOptions extends VideoProcessingOptions {
  mode?: ProcessingMode;
  priority?: number;
  fallbackToServer?: boolean;
  maxRetries?: number;
  cacheStrategy?: 'aggressive' | 'normal' | 'bypass';
}

// ============================================
// Processing Results
// ============================================

export interface ProcessedVideo {
  uri: string;
  thumbnailUri?: string;
  duration: number;
  transcription?: string;
  faceBlurApplied?: boolean;
  voiceChangeApplied?: boolean;
  metadata?: VideoMetadata;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  size: number;
  format?: VideoFormat;
  bitrate?: number;
  framerate?: number;
  codec?: string;
}

// ============================================
// Processing Job
// ============================================

export interface ProcessingJob {
  id: string;
  uri: string;
  options: VideoProcessingOptions;
  priority: number;
  status: ProcessingStatus;
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
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ============================================
// Processing Progress
// ============================================

export interface ProcessingProgress {
  jobId: string;
  progress: number;
  message: string;
  stage: ProcessingStage;
  estimatedTimeRemaining?: number;
}

export type ProcessingStage =
  | 'initializing'
  | 'downloading'
  | 'processing'
  | 'applying-effects'
  | 'transcribing'
  | 'generating-thumbnail'
  | 'uploading'
  | 'finalizing';

// ============================================
// Cache Types
// ============================================

export interface VideoCacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
  accessCount: number;
  priority: 'high' | 'normal' | 'low';
  lastAccessTime: number;
  predictedNextAccess?: number;
  quality?: VideoQuality;
  contentType?: ContentType;
  compressionRatio?: number;
  metadata?: VideoMetadata;
}

export interface CacheConfig {
  maxCacheSize: number;
  maxEntries: number;
  preloadLimit: number;
  cleanupThreshold: number;
  memoryPressureThreshold: number;
  compressionEnabled: boolean;
  intelligentPreload: boolean;
  cachePartitioning: boolean;
  idleCleanupInterval: number;
}

// ============================================
// Error Types
// ============================================

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public code: VideoProcessingErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

export enum VideoProcessingErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  SIZE_LIMIT_EXCEEDED = 'SIZE_LIMIT_EXCEEDED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN'
}

// ============================================
// Service Interfaces
// ============================================

export interface IVideoProcessor {
  initialize(): Promise<void>;
  processVideo(uri: string, options: VideoProcessingOptions): Promise<ProcessedVideo>;
  cancelProcessing(jobId: string): void;
  getProcessingStats(): ProcessingStats;
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

// ============================================
// Type Guards
// ============================================

export function isVideoQuality(value: unknown): value is VideoQuality {
  return typeof value === 'string' &&
    ['highest', 'high', 'medium', 'low'].includes(value);
}

export function isVoiceEffect(value: unknown): value is VoiceEffect {
  return typeof value === 'string' &&
    ['none', 'robot', 'whisper', 'deep', 'light'].includes(value);
}

export function isVideoFormat(value: unknown): value is VideoFormat {
  return typeof value === 'string' &&
    ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp', 'webm'].includes(value);
}

export function isProcessingMode(value: unknown): value is ProcessingMode {
  return typeof value === 'string' &&
    ['local', 'server', 'hybrid', 'ffmpeg'].includes(value);
}

export function isProcessedVideo(value: unknown): value is ProcessedVideo {
  if (!value || typeof value !== 'object') return false;
  const v = value as any;
  return typeof v.uri === 'string' &&
         typeof v.duration === 'number';
}

// ============================================
// Utility Types
// ============================================

export type PartialProcessingOptions = Partial<VideoProcessingOptions>;
export type RequiredProcessingOptions = Required<VideoProcessingOptions>;
export type ProcessingCallback = (progress: ProcessingProgress) => void;
export type ProcessingResult = ProcessedVideo | VideoProcessingError;