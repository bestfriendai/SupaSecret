import {
  VideoErrorCode,
  VideoErrorSeverity,
  BaseVideoError,
  VideoDisposalError,
  VideoLoadError,
  VideoNetworkError,
  VideoPlaybackError,
  VideoPermissionError,
  VideoSourceError,
} from "../types/videoErrors";
import { RetryConfig } from "./retryLogic";

// Comprehensive error classification patterns
const ERROR_PATTERNS = {
  disposal: [
    "NativeSharedObjectNotFoundException",
    "FunctionCallException",
    "Unable to find the native shared object",
    "already released",
    "disposed",
    "deallocated",
    "null reference",
    "JSI",
    "Hermes",
  ],
  network: [
    "NetworkError",
    "Failed to fetch",
    "ERR_NETWORK",
    "ERR_INTERNET_DISCONNECTED",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "network_error",
    "offline",
    "no internet",
    "connection failed",
  ],
  decode: [
    "decode",
    "codec",
    "unsupported format",
    "invalid video",
    "corrupted",
    "malformed",
    "ERR_VIDEO_DECODE",
  ],
  source: [
    "404",
    "403",
    "401",
    "not found",
    "forbidden",
    "unauthorized",
    "invalid url",
    "source not available",
  ],
  permission: [
    "permission denied",
    "not allowed",
    "access denied",
    "unauthorized",
    "forbidden",
  ],
  rateLimit: [
    "rate limit",
    "too many requests",
    "429",
    "throttled",
    "quota exceeded",
  ],
  playback: [
    "playback",
    "stalled",
    "buffering",
    "stuck",
    "not playing",
    "player error",
  ],
  memory: [
    "out of memory",
    "memory",
    "allocation failed",
    "OOM",
    "memory leak",
  ],
};

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  type: "immediate" | "delayed" | "manual" | "fallback" | "none";
  retryConfig?: RetryConfig;
  fallbackAction?: () => Promise<void>;
  userMessage?: string;
  requiresUserAction?: boolean;
  canAutoRecover?: boolean;
}

// Error context for better debugging
export interface ErrorContext {
  timestamp: number;
  videoId?: string;
  source?: string;
  playerState?: string;
  networkStatus?: boolean;
  deviceInfo?: {
    platform: string;
    version: string;
    isHermes: boolean;
  };
  previousErrors?: BaseVideoError[];
}

// Error metrics for tracking
export interface ErrorMetrics {
  errorCode: VideoErrorCode;
  count: number;
  lastOccurrence: number;
  recoveryAttempts: number;
  recoverySuccesses: number;
  averageRecoveryTime?: number;
}

class VideoErrorAnalyzer {
  private static errorHistory: Map<string, ErrorMetrics> = new Map();
  private static errorPatternCache: Map<string, VideoErrorCode> = new Map();

  /**
   * Detect the specific type of video error from an unknown error
   */
  static detectVideoErrorType(error: unknown): VideoErrorCode {
    if (!error) return VideoErrorCode.UNKNOWN;

    const errorStr = this.getErrorString(error);

    // Check cache first
    const cached = this.errorPatternCache.get(errorStr);
    if (cached) return cached;

    // Check each pattern category
    for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (this.matchesPatterns(errorStr, patterns)) {
        const errorCode = this.categoryToErrorCode(category);
        this.errorPatternCache.set(errorStr, errorCode);
        return errorCode;
      }
    }

    return VideoErrorCode.UNKNOWN;
  }

  /**
   * Create a recovery strategy based on error type and context
   */
  static createErrorRecoveryStrategy(
    error: BaseVideoError,
    context?: ErrorContext
  ): ErrorRecoveryStrategy {
    const metrics = this.getErrorMetrics(error.code);
    const severity = error.severity || VideoErrorSeverity.ERROR;

    // Check if too many failures
    if (metrics.count > 10 && metrics.recoverySuccesses < 2) {
      return {
        type: "none",
        userMessage: "This issue appears to be persistent. Please try again later.",
        requiresUserAction: true,
        canAutoRecover: false,
      };
    }

    switch (error.code) {
      case VideoErrorCode.DISPOSAL_ERROR:
      case VideoErrorCode.DISPOSAL_FAILED:
      case VideoErrorCode.DISPOSAL_TIMEOUT:
        return {
          type: "immediate",
          retryConfig: {
            maxRetries: 3,
            initialDelay: 100,
            maxDelay: 1000,
            backoffFactor: 2,
          },
          canAutoRecover: true,
        };

      case VideoErrorCode.NETWORK_ERROR:
      case VideoErrorCode.CONNECTION_FAILED:
        return {
          type: context?.networkStatus === false ? "manual" : "delayed",
          retryConfig: {
            maxRetries: 5,
            initialDelay: 2000,
            maxDelay: 30000,
            backoffFactor: 2,
            shouldRetry: () => context?.networkStatus !== false,
          },
          userMessage: "Connection issue. Retrying...",
          canAutoRecover: true,
        };

      case VideoErrorCode.RATE_LIMITED:
        return {
          type: "delayed",
          retryConfig: {
            maxRetries: 3,
            initialDelay: 30000, // Start with 30 second delay
            maxDelay: 120000,
            backoffFactor: 2,
          },
          userMessage: "Too many requests. Please wait a moment.",
          canAutoRecover: true,
        };

      case VideoErrorCode.SOURCE_NOT_FOUND:
      case VideoErrorCode.SOURCE_INVALID:
        return {
          type: "fallback",
          fallbackAction: async () => {
            // Fallback video loading logic
            console.log("Loading fallback video source");
          },
          userMessage: "Video not available. Loading alternative...",
          canAutoRecover: true,
        };

      case VideoErrorCode.DECODE_ERROR:
      case VideoErrorCode.UNSUPPORTED_FORMAT:
        return {
          type: "fallback",
          userMessage: "This video format is not supported.",
          requiresUserAction: false,
          canAutoRecover: false,
        };

      case VideoErrorCode.PERMISSION_DENIED:
      case VideoErrorCode.UNAUTHORIZED:
        return {
          type: "manual",
          userMessage: "You don't have permission to view this content.",
          requiresUserAction: true,
          canAutoRecover: false,
        };

      case VideoErrorCode.PLAYBACK_STALLED:
      case VideoErrorCode.BUFFERING_TIMEOUT:
        return {
          type: "immediate",
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            backoffFactor: 1.5,
          },
          userMessage: "Video is buffering...",
          canAutoRecover: true,
        };

      default:
        return {
          type: severity === VideoErrorSeverity.CRITICAL ? "manual" : "delayed",
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
          },
          canAutoRecover: severity !== VideoErrorSeverity.CRITICAL,
        };
    }
  }

  /**
   * Check if an error is recoverable
   */
  static isRecoverableError(error: BaseVideoError): boolean {
    const nonRecoverableCodes = [
      VideoErrorCode.UNSUPPORTED_FORMAT,
      VideoErrorCode.PERMISSION_DENIED,
      VideoErrorCode.UNAUTHORIZED,
      VideoErrorCode.DECODE_ERROR,
    ];

    if (nonRecoverableCodes.includes(error.code)) {
      return false;
    }

    // Check severity
    if (error.severity === VideoErrorSeverity.CRITICAL) {
      return false;
    }

    // Check error history
    const metrics = this.getErrorMetrics(error.code);
    if (metrics.count > 20 && metrics.recoverySuccesses === 0) {
      return false;
    }

    return true;
  }

  /**
   * Detect Hermes-specific errors
   */
  static isHermesError(error: unknown): boolean {
    const errorStr = this.getErrorString(error);
    const hermesPatterns = [
      "HermesInternal",
      "JSI",
      "jsi::",
      "Hermes",
      "FunctionCallException",
      "NativeSharedObjectNotFoundException",
    ];

    return this.matchesPatterns(errorStr, hermesPatterns);
  }

  /**
   * Get error severity based on type and frequency
   */
  static getErrorSeverity(error: BaseVideoError): VideoErrorSeverity {
    const metrics = this.getErrorMetrics(error.code);

    // Escalate severity based on frequency
    if (metrics.count > 10) {
      if (error.severity === VideoErrorSeverity.WARNING) {
        return VideoErrorSeverity.ERROR;
      }
      if (error.severity === VideoErrorSeverity.ERROR) {
        return VideoErrorSeverity.CRITICAL;
      }
    }

    return error.severity || VideoErrorSeverity.ERROR;
  }

  /**
   * Create error with context
   */
  static createContextualError(
    code: VideoErrorCode,
    message: string,
    context?: ErrorContext
  ): BaseVideoError {
    const ErrorClass = this.getErrorClass(code);
    const severity = this.getDefaultSeverity(code);

    const error = new ErrorClass(code, message, severity);

    // Attach context
    if (context) {
      (error as any).context = context;
    }

    // Update metrics
    this.recordError(error);

    return error;
  }

  /**
   * Extract error context for debugging
   */
  static extractErrorContext(error: unknown): ErrorContext {
    const timestamp = Date.now();
    const context: ErrorContext = { timestamp };

    if (error && typeof error === "object") {
      const err = error as any;

      // Extract common properties
      if (err.videoId) context.videoId = err.videoId;
      if (err.source) context.source = err.source;
      if (err.playerState) context.playerState = err.playerState;
      if (err.networkStatus !== undefined) context.networkStatus = err.networkStatus;

      // Add device info
      context.deviceInfo = {
        platform: typeof global?.Platform?.OS === "string" ? global.Platform.OS : "unknown",
        version: typeof global?.Platform?.Version === "number" ? String(global.Platform.Version) : "unknown",
        isHermes: this.isHermesRuntime(),
      };

      // Extract stack trace info if available
      if (err.stack) {
        const stack = String(err.stack);
        // Parse relevant info from stack
      }
    }

    return context;
  }

  /**
   * Get recovery suggestions for users
   */
  static getRecoverySuggestions(error: BaseVideoError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case VideoErrorCode.NETWORK_ERROR:
      case VideoErrorCode.CONNECTION_FAILED:
        suggestions.push(
          "Check your internet connection",
          "Try switching between Wi-Fi and mobile data",
          "Restart the app"
        );
        break;

      case VideoErrorCode.PLAYBACK_STALLED:
      case VideoErrorCode.BUFFERING_TIMEOUT:
        suggestions.push(
          "Wait for the video to buffer",
          "Try lowering video quality",
          "Close other apps to free up resources"
        );
        break;

      case VideoErrorCode.SOURCE_NOT_FOUND:
        suggestions.push(
          "This video may have been removed",
          "Try refreshing the feed",
          "Check back later"
        );
        break;

      case VideoErrorCode.RATE_LIMITED:
        suggestions.push(
          "You've made too many requests",
          "Wait a few minutes before trying again",
          "Avoid rapid scrolling through videos"
        );
        break;

      default:
        suggestions.push(
          "Try again in a moment",
          "Restart the app if the problem persists",
          "Contact support if this continues"
        );
    }

    return suggestions;
  }

  /**
   * Track error patterns for optimization
   */
  static analyzeErrorPatterns(): {
    mostFrequent: VideoErrorCode[];
    recentTrend: "increasing" | "decreasing" | "stable";
    recommendations: string[];
  } {
    const now = Date.now();
    const recentWindow = 5 * 60 * 1000; // 5 minutes

    // Get most frequent errors
    const sortedErrors = Array.from(this.errorHistory.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([code]) => code as VideoErrorCode);

    // Analyze recent trend
    const recentErrors = Array.from(this.errorHistory.values())
      .filter(m => now - m.lastOccurrence < recentWindow);

    const trend = this.calculateTrend(recentErrors);

    // Generate recommendations
    const recommendations = this.generateRecommendations(sortedErrors, trend);

    return {
      mostFrequent: sortedErrors,
      recentTrend: trend,
      recommendations,
    };
  }

  // Helper methods
  private static getErrorString(error: unknown): string {
    if (!error) return "";
    if (typeof error === "string") return error.toLowerCase();
    if (error instanceof Error) return (error.message + " " + error.stack).toLowerCase();
    if (typeof error === "object" && "message" in error) {
      return String((error as any).message).toLowerCase();
    }
    return JSON.stringify(error).toLowerCase();
  }

  private static matchesPatterns(str: string, patterns: string[]): boolean {
    return patterns.some(pattern => str.includes(pattern.toLowerCase()));
  }

  private static categoryToErrorCode(category: string): VideoErrorCode {
    const mapping: Record<string, VideoErrorCode> = {
      disposal: VideoErrorCode.DISPOSAL_ERROR,
      network: VideoErrorCode.NETWORK_ERROR,
      decode: VideoErrorCode.DECODE_ERROR,
      source: VideoErrorCode.SOURCE_NOT_FOUND,
      permission: VideoErrorCode.PERMISSION_DENIED,
      rateLimit: VideoErrorCode.RATE_LIMITED,
      playback: VideoErrorCode.PLAYBACK_STALLED,
      memory: VideoErrorCode.UNKNOWN,
    };
    return mapping[category] || VideoErrorCode.UNKNOWN;
  }

  private static getErrorClass(code: VideoErrorCode): typeof BaseVideoError {
    if (code.includes("DISPOSAL")) return VideoDisposalError;
    if (code.includes("NETWORK") || code.includes("CONNECTION")) return VideoNetworkError;
    if (code.includes("LOAD")) return VideoLoadError;
    if (code.includes("PLAYBACK") || code.includes("BUFFERING")) return VideoPlaybackError;
    if (code.includes("PERMISSION") || code.includes("UNAUTHORIZED")) return VideoPermissionError;
    if (code.includes("SOURCE")) return VideoSourceError;
    return BaseVideoError;
  }

  private static getDefaultSeverity(code: VideoErrorCode): VideoErrorSeverity {
    const criticalCodes = [
      VideoErrorCode.PERMISSION_DENIED,
      VideoErrorCode.UNAUTHORIZED,
    ];

    const warningCodes = [
      VideoErrorCode.DISPOSAL_TIMEOUT,
      VideoErrorCode.BUFFERING_TIMEOUT,
    ];

    if (criticalCodes.includes(code)) return VideoErrorSeverity.CRITICAL;
    if (warningCodes.includes(code)) return VideoErrorSeverity.WARNING;
    return VideoErrorSeverity.ERROR;
  }

  private static getErrorMetrics(code: VideoErrorCode): ErrorMetrics {
    let metrics = this.errorHistory.get(code);
    if (!metrics) {
      metrics = {
        errorCode: code,
        count: 0,
        lastOccurrence: 0,
        recoveryAttempts: 0,
        recoverySuccesses: 0,
      };
      this.errorHistory.set(code, metrics);
    }
    return metrics;
  }

  private static recordError(error: BaseVideoError): void {
    const metrics = this.getErrorMetrics(error.code);
    metrics.count++;
    metrics.lastOccurrence = Date.now();

    // Cleanup old cache entries if too large
    if (this.errorPatternCache.size > 1000) {
      const entriesToDelete = Array.from(this.errorPatternCache.keys()).slice(0, 500);
      entriesToDelete.forEach(key => this.errorPatternCache.delete(key));
    }
  }

  private static isHermesRuntime(): boolean {
    try {
      // @ts-ignore
      return typeof HermesInternal !== "undefined";
    } catch {
      return false;
    }
  }

  private static calculateTrend(recentErrors: ErrorMetrics[]): "increasing" | "decreasing" | "stable" {
    if (recentErrors.length < 2) return "stable";

    // Simple trend analysis based on error frequency
    const firstHalf = recentErrors.slice(0, Math.floor(recentErrors.length / 2));
    const secondHalf = recentErrors.slice(Math.floor(recentErrors.length / 2));

    const firstHalfCount = firstHalf.reduce((sum, m) => sum + m.count, 0);
    const secondHalfCount = secondHalf.reduce((sum, m) => sum + m.count, 0);

    if (secondHalfCount > firstHalfCount * 1.2) return "increasing";
    if (secondHalfCount < firstHalfCount * 0.8) return "decreasing";
    return "stable";
  }

  private static generateRecommendations(
    frequentErrors: VideoErrorCode[],
    trend: string
  ): string[] {
    const recommendations: string[] = [];

    if (trend === "increasing") {
      recommendations.push("Error rate is increasing. Consider investigating recent changes.");
    }

    if (frequentErrors.includes(VideoErrorCode.NETWORK_ERROR)) {
      recommendations.push("Implement offline mode or better network error handling");
    }

    if (frequentErrors.includes(VideoErrorCode.DISPOSAL_ERROR)) {
      recommendations.push("Review video player disposal logic for memory leaks");
    }

    if (frequentErrors.includes(VideoErrorCode.RATE_LIMITED)) {
      recommendations.push("Implement request throttling or caching");
    }

    return recommendations;
  }
}

// Exported functions for backward compatibility and ease of use
export const isDisposalError = (error: unknown): boolean => {
  const code = VideoErrorAnalyzer.detectVideoErrorType(error);
  return [
    VideoErrorCode.DISPOSAL_ERROR,
    VideoErrorCode.DISPOSAL_FAILED,
    VideoErrorCode.DISPOSAL_TIMEOUT,
  ].includes(code);
};

export const detectVideoErrorType = (error: unknown): VideoErrorCode => {
  return VideoErrorAnalyzer.detectVideoErrorType(error);
};

export const createErrorRecoveryStrategy = (
  error: BaseVideoError,
  context?: ErrorContext
): ErrorRecoveryStrategy => {
  return VideoErrorAnalyzer.createErrorRecoveryStrategy(error, context);
};

export const isRecoverableError = (error: BaseVideoError): boolean => {
  return VideoErrorAnalyzer.isRecoverableError(error);
};

export const isHermesError = (error: unknown): boolean => {
  return VideoErrorAnalyzer.isHermesError(error);
};

export const getErrorSeverity = (error: BaseVideoError): VideoErrorSeverity => {
  return VideoErrorAnalyzer.getErrorSeverity(error);
};

export const createContextualError = (
  code: VideoErrorCode,
  message: string,
  context?: ErrorContext
): BaseVideoError => {
  return VideoErrorAnalyzer.createContextualError(code, message, context);
};

export const extractErrorContext = (error: unknown): ErrorContext => {
  return VideoErrorAnalyzer.extractErrorContext(error);
};

export const getRecoverySuggestions = (error: BaseVideoError): string[] => {
  return VideoErrorAnalyzer.getRecoverySuggestions(error);
};

export const analyzeErrorPatterns = () => {
  return VideoErrorAnalyzer.analyzeErrorPatterns();
};

// Error rate limiting utility
export class ErrorRateLimiter {
  private errorCounts: Map<string, number> = new Map();
  private windowStart: number = Date.now();
  private readonly windowSize: number = 60000; // 1 minute
  private readonly maxErrors: number = 10;

  shouldReportError(errorKey: string): boolean {
    this.cleanupOldEntries();

    const count = this.errorCounts.get(errorKey) || 0;
    if (count >= this.maxErrors) {
      return false;
    }

    this.errorCounts.set(errorKey, count + 1);
    return true;
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    if (now - this.windowStart > this.windowSize) {
      this.errorCounts.clear();
      this.windowStart = now;
    }
  }
}

// Error correlation utility
export class ErrorCorrelator {
  private errorSequences: Array<{
    errors: VideoErrorCode[];
    timestamp: number;
  }> = [];

  recordError(code: VideoErrorCode): void {
    const now = Date.now();
    const recentSequence = this.errorSequences[this.errorSequences.length - 1];

    if (recentSequence && now - recentSequence.timestamp < 5000) {
      recentSequence.errors.push(code);
      recentSequence.timestamp = now;
    } else {
      this.errorSequences.push({
        errors: [code],
        timestamp: now,
      });

      // Keep only recent sequences
      if (this.errorSequences.length > 100) {
        this.errorSequences = this.errorSequences.slice(-50);
      }
    }
  }

  findCorrelatedErrors(code: VideoErrorCode): VideoErrorCode[] {
    const correlations: Map<VideoErrorCode, number> = new Map();

    for (const sequence of this.errorSequences) {
      const index = sequence.errors.indexOf(code);
      if (index !== -1) {
        // Check errors that appear before and after
        for (let i = Math.max(0, index - 2); i <= Math.min(sequence.errors.length - 1, index + 2); i++) {
          if (i !== index) {
            const relatedCode = sequence.errors[i];
            correlations.set(relatedCode, (correlations.get(relatedCode) || 0) + 1);
          }
        }
      }
    }

    // Return codes that appear together frequently
    return Array.from(correlations.entries())
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);
  }
}

// Global instances
export const errorRateLimiter = new ErrorRateLimiter();
export const errorCorrelator = new ErrorCorrelator();