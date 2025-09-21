export enum VideoErrorCode {
  // Loading errors
  NetworkError = "NETWORK_ERROR",
  InvalidUrl = "INVALID_URL",
  UnsupportedFormat = "UNSUPPORTED_FORMAT",
  DecodingError = "DECODING_ERROR",
  ConnectionFailed = "CONNECTION_FAILED",
  LoadFailed = "LOAD_FAILED",

  // Playback errors
  PlaybackFailed = "PLAYBACK_FAILED",
  PlaybackStalled = "PLAYBACK_STALLED",
  BufferingTimeout = "BUFFERING_TIMEOUT",
  SeekFailed = "SEEK_FAILED",
  RateLimitExceeded = "RATE_LIMIT_EXCEEDED",

  // Source errors
  SourceNotFound = "SOURCE_NOT_FOUND",
  SourceInvalid = "SOURCE_INVALID",

  // Disposal errors
  DisposalError = "DISPOSAL_ERROR",
  DisposalFailed = "DISPOSAL_FAILED",
  DisposalTimeout = "DISPOSAL_TIMEOUT",
  ResourceLeak = "RESOURCE_LEAK",

  // Interaction errors
  InteractionFailed = "INTERACTION_FAILED",
  GestureNotSupported = "GESTURE_NOT_SUPPORTED",
  PermissionDenied = "PERMISSION_DENIED",
  Unauthorized = "UNAUTHORIZED",

  // Generic
  Unknown = "UNKNOWN_ERROR",

  // Legacy aliases for compatibility
  NETWORK_ERROR = "NETWORK_ERROR",
  DECODE_ERROR = "DECODING_ERROR",
  PLAYBACK_STALLED = "PLAYBACK_STALLED",
  PLAYBACK_FAILED = "PLAYBACK_FAILED",
  RATE_LIMITED = "RATE_LIMIT_EXCEEDED",
  LOAD_FAILED = "LOAD_FAILED",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SOURCE_NOT_FOUND = "SOURCE_NOT_FOUND",
  SOURCE_INVALID = "SOURCE_INVALID",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHORIZED = "UNAUTHORIZED",
  DISPOSAL_ERROR = "DISPOSAL_ERROR",
  DISPOSAL_FAILED = "DISPOSAL_FAILED",
  DISPOSAL_TIMEOUT = "DISPOSAL_TIMEOUT",
  BUFFERING_TIMEOUT = "BUFFERING_TIMEOUT",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  UNKNOWN = "UNKNOWN_ERROR",
}

// Additional error types for the new error handling system
export enum VideoErrorType {
  NETWORK = "NETWORK",
  DECODE = "DECODE",
  FORMAT = "FORMAT",
  PERMISSION = "PERMISSION",
  MEMORY = "MEMORY",
  SERVER = "SERVER",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

export enum VideoErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  // Legacy aliases
  ERROR = "high",
  WARNING = "medium",
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
  severity: VideoErrorSeverity;

  constructor(
    code: VideoErrorCode,
    message: string,
    metadata?: Record<string, unknown>,
    recoverable = true,
    severity: VideoErrorSeverity = VideoErrorSeverity.ERROR,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
    this.timestamp = Date.now();
    this.recoverable = recoverable;
    this.severity = severity;
  }
}

export class VideoLoadError extends BaseVideoError {
  constructor(message: string, metadata?: Record<string, unknown>, severity: VideoErrorSeverity = VideoErrorSeverity.ERROR) {
    super(VideoErrorCode.NetworkError, message, metadata, true, severity);
  }
}

// Alias for compatibility
export class VideoNetworkError extends VideoLoadError {}

export class VideoPlaybackError extends BaseVideoError {
  constructor(
    code: VideoErrorCode = VideoErrorCode.PlaybackFailed,
    message: string,
    metadata?: Record<string, unknown>,
    severity: VideoErrorSeverity = VideoErrorSeverity.ERROR,
  ) {
    super(code, message, metadata, true, severity);
  }
}

export class VideoDisposalError extends BaseVideoError {
  constructor(
    message: string,
    metadata?: Record<string, unknown>,
    severity: VideoErrorSeverity = VideoErrorSeverity.WARNING,
  ) {
    super(VideoErrorCode.DisposalError, message, metadata, false, severity);
  }
}

export class VideoInteractionError extends BaseVideoError {
  interactionType: string;

  constructor(
    interactionType: string,
    message: string,
    metadata?: Record<string, unknown>,
    severity: VideoErrorSeverity = VideoErrorSeverity.WARNING,
  ) {
    super(VideoErrorCode.InteractionFailed, message, metadata, true, severity);
    this.interactionType = interactionType;
  }
}

export class VideoPermissionError extends BaseVideoError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(VideoErrorCode.PermissionDenied, message, metadata, false, VideoErrorSeverity.CRITICAL);
  }
}

export class VideoSourceError extends BaseVideoError {
  constructor(
    code: VideoErrorCode = VideoErrorCode.SourceNotFound,
    message: string,
    metadata?: Record<string, unknown>,
    severity: VideoErrorSeverity = VideoErrorSeverity.ERROR,
  ) {
    super(code, message, metadata, false, severity);
  }
}

export type VideoPlayerError =
  | VideoLoadError
  | VideoPlaybackError
  | VideoDisposalError
  | VideoInteractionError
  | VideoPermissionError
  | VideoSourceError
  | BaseVideoError;

export function normalizeVideoError(error: unknown): VideoPlayerError {
  if (error instanceof BaseVideoError) {
    return error;
  }

  if (error instanceof Error) {
    const metadata = {
      originalError: error.name,
      stack: error.stack,
    };

    // Try to classify based on error message
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch") || message.includes("load")) {
      return new VideoLoadError(error.message, metadata);
    }

    if (message.includes("play") || message.includes("buffer") || message.includes("seek")) {
      return new VideoPlaybackError(VideoErrorCode.PlaybackFailed, error.message, metadata);
    }

    if (message.includes("dispose") || message.includes("cleanup") || message.includes("release")) {
      return new VideoDisposalError(error.message, metadata);
    }

    return new BaseVideoError(VideoErrorCode.Unknown, error.message, metadata);
  }

  // For non-Error objects
  const message = String(error);
  return new BaseVideoError(VideoErrorCode.Unknown, message, { originalValue: error });
}
