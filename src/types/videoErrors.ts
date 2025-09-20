export enum VideoErrorCode {
  // Loading errors
  NetworkError = 'NETWORK_ERROR',
  InvalidUrl = 'INVALID_URL',
  UnsupportedFormat = 'UNSUPPORTED_FORMAT',
  DecodingError = 'DECODING_ERROR',

  // Playback errors
  PlaybackFailed = 'PLAYBACK_FAILED',
  BufferingTimeout = 'BUFFERING_TIMEOUT',
  SeekFailed = 'SEEK_FAILED',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',

  // Disposal errors
  DisposalFailed = 'DISPOSAL_FAILED',
  ResourceLeak = 'RESOURCE_LEAK',

  // Interaction errors
  InteractionFailed = 'INTERACTION_FAILED',
  GestureNotSupported = 'GESTURE_NOT_SUPPORTED',
  PermissionDenied = 'PERMISSION_DENIED',

  // Generic
  Unknown = 'UNKNOWN_ERROR',

  // Legacy aliases for compatibility
  NETWORK_ERROR = 'NETWORK_ERROR',
  DECODE_ERROR = 'DECODING_ERROR',
  PLAYBACK_STALLED = 'PLAYBACK_FAILED',
  RATE_LIMITED = 'RATE_LIMIT_EXCEEDED',
  LOAD_FAILED = 'NETWORK_ERROR'
}

// Additional error types for the new error handling system
export enum VideoErrorType {
  NETWORK = 'NETWORK',
  DECODE = 'DECODE',
  FORMAT = 'FORMAT',
  PERMISSION = 'PERMISSION',
  MEMORY = 'MEMORY',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum VideoErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  // Legacy aliases
  ERROR = 'high',
  WARNING = 'medium'
}

// VideoError interface for the new error messages system
export interface VideoError {
  type: VideoErrorType;
  code: string;
  message?: string;
  debugInfo?: string;
  timestamp?: number;
  recoverable?: boolean;
}

export class BaseVideoError extends Error {
  code: VideoErrorCode;
  metadata?: Record<string, unknown>;
  timestamp: number;
  recoverable: boolean;

  constructor(
    code: VideoErrorCode,
    message: string,
    metadata?: Record<string, unknown>,
    recoverable = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
    this.timestamp = Date.now();
    this.recoverable = recoverable;
  }
}

export class VideoLoadError extends BaseVideoError {
  constructor(
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(VideoErrorCode.NetworkError, message, metadata, true);
  }
}

// Alias for compatibility
export class VideoNetworkError extends VideoLoadError {}

export class VideoPlaybackError extends BaseVideoError {
  constructor(
    code: VideoErrorCode = VideoErrorCode.PlaybackFailed,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(code, message, metadata, true);
  }
}

export class VideoDisposalError extends BaseVideoError {
  constructor(
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(VideoErrorCode.DisposalFailed, message, metadata, false);
  }
}

export class VideoInteractionError extends BaseVideoError {
  interactionType: string;

  constructor(
    interactionType: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    super(VideoErrorCode.InteractionFailed, message, metadata, true);
    this.interactionType = interactionType;
  }
}

export type VideoPlayerError =
  | VideoLoadError
  | VideoPlaybackError
  | VideoDisposalError
  | VideoInteractionError
  | BaseVideoError;

export function normalizeVideoError(error: unknown): VideoPlayerError {
  if (error instanceof BaseVideoError) {
    return error;
  }

  if (error instanceof Error) {
    const metadata = {
      originalError: error.name,
      stack: error.stack
    };

    // Try to classify based on error message
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('load')) {
      return new VideoLoadError(error.message, metadata);
    }

    if (message.includes('play') || message.includes('buffer') || message.includes('seek')) {
      return new VideoPlaybackError(VideoErrorCode.PlaybackFailed, error.message, metadata);
    }

    if (message.includes('dispose') || message.includes('cleanup') || message.includes('release')) {
      return new VideoDisposalError(error.message, metadata);
    }

    return new BaseVideoError(VideoErrorCode.Unknown, error.message, metadata);
  }

  // For non-Error objects
  const message = String(error);
  return new BaseVideoError(
    VideoErrorCode.Unknown,
    message,
    { originalValue: error }
  );
}