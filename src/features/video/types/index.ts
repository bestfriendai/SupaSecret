/**
 * Comprehensive TypeScript types for video feature
 * Migrated from main app with latest best practices
 */

// ============================================
// Core Video Types
// ============================================

export type VideoQuality = 'highest' | 'high' | 'medium' | 'low';
export type VoiceEffect = 'none' | 'deep' | 'light';
export type VideoFormat = 'mp4' | 'mov' | 'avi' | 'mkv' | 'm4v' | '3gp' | 'webm';
export type ProcessingMode = 'local' | 'server' | 'hybrid';
export type ContentType = 'thumbnail' | 'preview' | 'full';
export type CameraFacing = 'front' | 'back';
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

// ============================================
// Video Metadata
// ============================================

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  size: number;
  format?: VideoFormat;
  bitrate?: number;
  framerate?: number;
  codec?: string;
  orientation?: 'portrait' | 'landscape';
  createdAt?: string;
}

// ============================================
// Processed Video
// ============================================

export interface ProcessedVideo {
  uri: string;
  thumbnailUri?: string;
  duration: number;
  transcription?: string;
  faceBlurApplied?: boolean;
  voiceChangeApplied?: boolean;
  metadata?: VideoMetadata;
  width?: number;
  height?: number;
  size?: number;
}

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
  blurIntensity?: number;
  onProgress?: (progress: number, message: string) => void;
}

export interface VideoRecordingOptions {
  maxDuration?: number;
  enableFaceBlur?: boolean;
  blurIntensity?: number;
  quality?: VideoQuality;
  facing?: CameraFacing;
  enableAudio?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (videoPath: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

// ============================================
// Upload Options & Results
// ============================================

export interface VideoUploadOptions {
  onProgress?: (progress: number, message: string) => void;
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: VideoQuality;
  voiceEffect?: VoiceEffect;
}

export interface VideoUploadResult {
  uploadId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  processedVideoUrl?: string;
  thumbnailUrl?: string;
  transcription?: string;
  error?: string;
}

// ============================================
// Recording State
// ============================================

export interface VideoRecordingState {
  isRecording: boolean;
  recordingTime: number;
  hasPermissions: boolean;
  isReady: boolean;
  error?: string;
  facing: CameraFacing;
  isPaused?: boolean;
  recordedVideoPath?: string;
}

// ============================================
// Player State
// ============================================

export interface VideoPlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  error?: string;
  volume: number;
  playbackRate: number;
}

export interface VideoPlayerControls {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  togglePlayPause: () => void;
  toggleMute: () => void;
}

// ============================================
// Face Blur Types
// ============================================

export interface FaceBlurOptions {
  blurIntensity?: number; // 1-50, default 15
  detectionMode?: 'fast' | 'accurate'; // default 'fast'
  onProgress?: (progress: number, status: string) => void;
}

export interface FaceBlurResult {
  uri: string;
  facesDetected: number;
  framesProcessed: number;
  duration: number;
  faceBlurApplied: boolean;
}

export interface FaceDetectionResult {
  faces: FaceBounds[];
  frameIndex: number;
  timestamp: number;
}

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

// ============================================
// Voice Processing Types
// ============================================

export interface VoiceProcessingOptions {
  effect: VoiceEffect;
  onProgress?: (progress: number, status: string) => void;
}

export interface VoiceProcessingResult {
  uri: string;
  effect: VoiceEffect;
  duration: number;
  voiceChangeApplied: boolean;
}

// ============================================
// Video Feed Types
// ============================================

export interface VideoFeedItem {
  id: string;
  videoUri: string;
  thumbnailUri?: string;
  duration: number;
  likes: number;
  views: number;
  comments: number;
  isAnonymous: boolean;
  faceBlurApplied?: boolean;
  voiceChangeApplied?: boolean;
  transcription?: string;
  createdAt: string;
  userId?: string;
}

export interface VideoFeedProps {
  onClose?: () => void;
  initialIndex?: number;
  videos?: VideoFeedItem[];
  onVideoChange?: (index: number) => void;
  onRefresh?: () => void;
}

// ============================================
// Camera Types
// ============================================

export interface CameraDevice {
  id: string;
  name: string;
  position: CameraFacing;
  hasFlash: boolean;
  hasTorch: boolean;
  isMultiCam: boolean;
  supportedFormats: CameraFormat[];
}

export interface CameraFormat {
  videoWidth: number;
  videoHeight: number;
  maxFps: number;
  minFps: number;
  videoStabilizationModes: string[];
}

export interface CameraPermissions {
  camera: 'granted' | 'denied' | 'not-determined';
  microphone: 'granted' | 'denied' | 'not-determined';
}

// ============================================
// Processing Job Types
// ============================================

export interface VideoProcessingJob {
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
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

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
  | 'face-detection'
  | 'face-blur'
  | 'voice-processing'
  | 'transcribing'
  | 'generating-thumbnail'
  | 'uploading'
  | 'finalizing';

// ============================================
// Error Types
// ============================================

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public code: VideoProcessingErrorCode,
    public originalError?: Error,
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
  FACE_DETECTION_FAILED = 'FACE_DETECTION_FAILED',
  VOICE_PROCESSING_FAILED = 'VOICE_PROCESSING_FAILED',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN',
}

export class VideoRecordingError extends Error {
  constructor(
    message: string,
    public code: VideoRecordingErrorCode,
  ) {
    super(message);
    this.name = 'VideoRecordingError';
  }
}

export enum VideoRecordingErrorCode {
  CAMERA_NOT_AVAILABLE = 'CAMERA_NOT_AVAILABLE',
  MICROPHONE_NOT_AVAILABLE = 'MICROPHONE_NOT_AVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RECORDING_FAILED = 'RECORDING_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  INVALID_STATE = 'INVALID_STATE',
  UNKNOWN = 'UNKNOWN',
}

// ============================================
// Service Interfaces
// ============================================

export interface IVideoRecordingService {
  initialize(): Promise<void>;
  startRecording(options: VideoRecordingOptions): Promise<void>;
  stopRecording(): Promise<string>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  getRecordingState(): VideoRecordingState;
  requestPermissions(): Promise<CameraPermissions>;
}

export interface IVideoPlayerService {
  initialize(videoUri: string): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(time: number): void;
  getState(): VideoPlayerState;
  release(): void;
}

export interface IVideoProcessingService {
  processVideo(uri: string, options: VideoProcessingOptions): Promise<ProcessedVideo>;
  cancelProcessing(jobId: string): void;
  getProcessingStats(): ProcessingStats;
}

export interface IFaceBlurService {
  initialize(): Promise<void>;
  processVideo(videoUri: string, options: FaceBlurOptions): Promise<FaceBlurResult>;
  isAvailable(): Promise<boolean>;
}

export interface IVoiceProcessingService {
  initialize(): Promise<void>;
  processAudio(audioUri: string, options: VoiceProcessingOptions): Promise<VoiceProcessingResult>;
}

export interface ProcessingStats {
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  queueLength: number;
  activeJobs: number;
}

// ============================================
// Type Guards
// ============================================

export function isVideoQuality(value: unknown): value is VideoQuality {
  return typeof value === 'string' && ['highest', 'high', 'medium', 'low'].includes(value);
}

export function isVoiceEffect(value: unknown): value is VoiceEffect {
  return typeof value === 'string' && ['none', 'deep', 'light'].includes(value);
}

export function isVideoFormat(value: unknown): value is VideoFormat {
  return typeof value === 'string' && ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp', 'webm'].includes(value);
}

export function isProcessedVideo(value: unknown): value is ProcessedVideo {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ProcessedVideo>;
  return typeof v?.uri === 'string' && typeof v?.duration === 'number';
}

export function isCameraFacing(value: unknown): value is CameraFacing {
  return typeof value === 'string' && ['front', 'back'].includes(value);
}

// ============================================
// Constants
// ============================================

export const VIDEO_CONSTANTS = {
  MAX_DURATION: 60, // seconds
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  DEFAULT_QUALITY: 'medium' as VideoQuality,
  DEFAULT_BLUR_INTENSITY: 15,
  DEFAULT_VOICE_EFFECT: 'deep' as VoiceEffect,
  POLL_INTERVAL: 5000, // 5 seconds
  MAX_RETRIES: 60, // 5 minutes with 5-second intervals
} as const;

// ============================================
// Utility Types
// ============================================

export type PartialProcessingOptions = Partial<VideoProcessingOptions>;
export type ProcessingCallback = (progress: ProcessingProgress) => void;
export type RecordingCallback = (state: VideoRecordingState) => void;
export type PlayerCallback = (state: VideoPlayerState) => void;
