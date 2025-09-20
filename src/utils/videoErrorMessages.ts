import { VideoError, VideoErrorType } from "../types/videoErrors";
import { VideoErrorRecoveryService } from "../services/VideoErrorRecoveryService";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import * as Device from "expo-device";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";
export type ErrorContext = "loading" | "playback" | "network" | "format" | "permission";

export interface UserFriendlyError {
  title: string;
  message: string;
  actionText?: string;
  secondaryActionText?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  technicalDetails?: string;
  retryStrategy: RetryStrategy;
}

export interface RetryStrategy {
  shouldRetry: boolean;
  maxRetries: number;
  backoffMs: number[];
  explanation: string;
}

export interface ErrorAnalytics {
  errorCode: string;
  errorType: VideoErrorType;
  deviceInfo: {
    model: string | null;
    osVersion: string | null;
    memory: number | null;
  };
  networkInfo?: NetInfoState;
  timestamp: number;
  attemptNumber: number;
}

export class VideoErrorMessages {
  private static retryAttempts: Map<string, number> = new Map();
  private static errorHistory: ErrorAnalytics[] = [];
  private static maxHistorySize = 50;

  static getUserFriendlyError(
    error: VideoError,
    attemptNumber: number = 1,
    userState?: { isOffline?: boolean; isLowBandwidth?: boolean }
  ): UserFriendlyError {
    const errorKey = `${error.type}-${error.code}`;
    this.retryAttempts.set(errorKey, attemptNumber);

    if (userState?.isOffline) {
      return this.getOfflineError();
    }

    switch (error.type) {
      case VideoErrorType.NETWORK:
        return this.getNetworkError(error, attemptNumber, userState?.isLowBandwidth);

      case VideoErrorType.DECODE:
      case VideoErrorType.FORMAT:
        return this.getFormatError(error, attemptNumber);

      case VideoErrorType.PERMISSION:
        return this.getPermissionError(error);

      case VideoErrorType.MEMORY:
        return this.getMemoryError(error, attemptNumber);

      case VideoErrorType.SERVER:
        return this.getServerError(error, attemptNumber);

      case VideoErrorType.TIMEOUT:
        return this.getTimeoutError(error, attemptNumber);

      case VideoErrorType.UNKNOWN:
      default:
        return this.getGenericError(error, attemptNumber);
    }
  }

  private static getOfflineError(): UserFriendlyError {
    return {
      title: "You're offline",
      message: "Connect to the internet to load videos",
      actionText: "Check settings",
      secondaryActionText: "View downloaded",
      severity: "medium",
      context: "network",
      retryStrategy: {
        shouldRetry: true,
        maxRetries: Infinity,
        backoffMs: [1000, 2000, 5000],
        explanation: "Will retry automatically when connection restored"
      }
    };
  }

  private static getNetworkError(
    error: VideoError,
    attemptNumber: number,
    isLowBandwidth?: boolean
  ): UserFriendlyError {
    if (isLowBandwidth) {
      return {
        title: "Slow connection detected",
        message: "Video quality adjusted for your connection speed",
        actionText: "Load anyway",
        secondaryActionText: "Settings",
        severity: "low",
        context: "network",
        technicalDetails: error.debugInfo,
        retryStrategy: {
          shouldRetry: true,
          maxRetries: 5,
          backoffMs: [500, 1000, 2000, 4000, 8000],
          explanation: "Retrying with lower quality settings"
        }
      };
    }

    const messages = [
      "Having trouble connecting. Let's try again!",
      "Connection hiccup. Trying once more...",
      "Network is being stubborn. One more attempt...",
      "Connection issues persist. Last try!"
    ];

    const messageIndex = Math.min(attemptNumber - 1, messages.length - 1);

    return {
      title: attemptNumber === 1 ? "Connection issue" : "Still having trouble",
      message: messages[messageIndex],
      actionText: "Retry now",
      secondaryActionText: attemptNumber > 2 ? "Report issue" : undefined,
      severity: attemptNumber > 3 ? "high" : "medium",
      context: "network",
      technicalDetails: error.debugInfo,
      retryStrategy: {
        shouldRetry: attemptNumber < 4,
        maxRetries: 4,
        backoffMs: [1000, 2000, 4000, 8000],
        explanation: `Retry ${attemptNumber}/4 with exponential backoff`
      }
    };
  }

  private static getFormatError(error: VideoError, attemptNumber: number): UserFriendlyError {
    const isCodecIssue = error.debugInfo?.includes("codec") || error.debugInfo?.includes("h264");

    return {
      title: "Video format issue",
      message: isCodecIssue
        ? "This video format isn't supported on your device"
        : "Unable to play this video format",
      actionText: attemptNumber === 1 ? "Try different quality" : "Skip video",
      secondaryActionText: "Report problem",
      severity: "medium",
      context: "format",
      technicalDetails: error.debugInfo,
      retryStrategy: {
        shouldRetry: attemptNumber === 1 && !isCodecIssue,
        maxRetries: 1,
        backoffMs: [500],
        explanation: isCodecIssue
          ? "Device doesn't support this codec"
          : "Trying alternative format"
      }
    };
  }

  private static getPermissionError(error: VideoError): UserFriendlyError {
    return {
      title: "Permission needed",
      message: "Allow app to access media to play videos",
      actionText: "Open settings",
      secondaryActionText: "Learn why",
      severity: "high",
      context: "permission",
      technicalDetails: error.debugInfo,
      retryStrategy: {
        shouldRetry: false,
        maxRetries: 0,
        backoffMs: [],
        explanation: "User needs to grant permissions manually"
      }
    };
  }

  private static getMemoryError(error: VideoError, attemptNumber: number): UserFriendlyError {
    const deviceMemory = Device.totalMemory;
    const isLowEndDevice = deviceMemory && deviceMemory < 2 * 1024 * 1024 * 1024;

    return {
      title: "Memory issue",
      message: isLowEndDevice
        ? "Close other apps to free up memory for videos"
        : "Too many videos loaded. Clearing cache...",
      actionText: attemptNumber === 1 ? "Clear & retry" : "Restart app",
      severity: "high",
      context: "playback",
      technicalDetails: `Available memory: ${deviceMemory}, ${error.debugInfo}`,
      retryStrategy: {
        shouldRetry: attemptNumber === 1,
        maxRetries: 1,
        backoffMs: [2000],
        explanation: "Clearing memory and retrying once"
      }
    };
  }

  private static getServerError(error: VideoError, attemptNumber: number): UserFriendlyError {
    const statusCode = parseInt(error.code) || 500;

    if (statusCode === 404) {
      return {
        title: "Video not found",
        message: "This video may have been removed or moved",
        actionText: "Browse other videos",
        severity: "low",
        context: "loading",
        retryStrategy: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: [],
          explanation: "Video doesn't exist"
        }
      };
    }

    if (statusCode >= 500) {
      return {
        title: "Server issue",
        message: "Our servers are having a moment. We're on it!",
        actionText: "Try again",
        secondaryActionText: "Check status",
        severity: attemptNumber > 2 ? "critical" : "medium",
        context: "network",
        technicalDetails: `HTTP ${statusCode}: ${error.debugInfo}`,
        retryStrategy: {
          shouldRetry: attemptNumber < 3,
          maxRetries: 3,
          backoffMs: [2000, 5000, 10000],
          explanation: "Server error, retrying with longer delays"
        }
      };
    }

    return this.getGenericError(error, attemptNumber);
  }

  private static getTimeoutError(error: VideoError, attemptNumber: number): UserFriendlyError {
    return {
      title: "Taking too long",
      message: attemptNumber === 1
        ? "Video is taking longer than usual to load"
        : "Still waiting for the video...",
      actionText: "Keep waiting",
      secondaryActionText: "Try lower quality",
      severity: "low",
      context: "loading",
      technicalDetails: error.debugInfo,
      retryStrategy: {
        shouldRetry: true,
        maxRetries: 3,
        backoffMs: [0, 0, 0],
        explanation: "Extending timeout duration"
      }
    };
  }

  private static getGenericError(error: VideoError, attemptNumber: number): UserFriendlyError {
    const messages = [
      "Something went wrong. Let's try that again!",
      "Still having issues. Trying a different approach...",
      "This is tricky. One more attempt..."
    ];

    return {
      title: "Oops!",
      message: messages[Math.min(attemptNumber - 1, messages.length - 1)],
      actionText: "Retry",
      secondaryActionText: attemptNumber > 2 ? "Get help" : undefined,
      severity: attemptNumber > 2 ? "medium" : "low",
      context: "loading",
      technicalDetails: `${error.type}: ${error.code} - ${error.debugInfo}`,
      retryStrategy: {
        shouldRetry: attemptNumber < 3,
        maxRetries: 3,
        backoffMs: [1000, 3000, 5000],
        explanation: "Standard retry with backoff"
      }
    };
  }

  static getProgressiveErrorMessage(
    error: VideoError,
    attemptHistory: number[]
  ): string {
    const totalAttempts = attemptHistory.reduce((sum, a) => sum + a, 0);

    if (totalAttempts === 0) {
      return "Loading video...";
    } else if (totalAttempts === 1) {
      return "Having a small hiccup...";
    } else if (totalAttempts === 2) {
      return "Taking a bit longer than expected...";
    } else if (totalAttempts === 3) {
      return "We're working on it...";
    } else {
      return "Thanks for your patience. Almost there...";
    }
  }

  static getSmartRecoverySuggestion(
    error: VideoError,
    deviceCapabilities?: {
      hasWifi?: boolean;
      batteryLevel?: number;
      freeStorage?: number;
    }
  ): string[] {
    const suggestions: string[] = [];

    if (error.type === VideoErrorType.NETWORK && !deviceCapabilities?.hasWifi) {
      suggestions.push("Connect to Wi-Fi for better video quality");
    }

    if (error.type === VideoErrorType.MEMORY && deviceCapabilities?.freeStorage) {
      if (deviceCapabilities.freeStorage < 100 * 1024 * 1024) {
        suggestions.push("Free up storage space for smoother playback");
      }
    }

    if (deviceCapabilities?.batteryLevel && deviceCapabilities.batteryLevel < 20) {
      suggestions.push("Low battery may affect video performance");
    }

    if (error.type === VideoErrorType.DECODE) {
      suggestions.push("Try updating your app for better video support");
    }

    return suggestions;
  }

  static async logErrorForAnalytics(
    error: VideoError,
    attemptNumber: number
  ): Promise<void> {
    const netInfo = await NetInfo.fetch();

    const analytics: ErrorAnalytics = {
      errorCode: error.code,
      errorType: error.type,
      deviceInfo: {
        model: Device.modelName,
        osVersion: Device.osVersion,
        memory: Device.totalMemory,
      },
      networkInfo: netInfo,
      timestamp: Date.now(),
      attemptNumber,
    };

    this.errorHistory.push(analytics);

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    if (__DEV__) {
      console.log("[VideoErrorAnalytics]", analytics);
    }
  }

  static getErrorTrend(): {
    mostCommonError?: VideoErrorType;
    averageRetries: number;
    successRate: number;
  } {
    if (this.errorHistory.length === 0) {
      return { averageRetries: 0, successRate: 1 };
    }

    const errorCounts = new Map<VideoErrorType, number>();
    let totalRetries = 0;
    let maxAttempts = 0;

    this.errorHistory.forEach(e => {
      errorCounts.set(e.errorType, (errorCounts.get(e.errorType) || 0) + 1);
      totalRetries += e.attemptNumber;
      maxAttempts = Math.max(maxAttempts, e.attemptNumber);
    });

    const mostCommonError = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const averageRetries = totalRetries / this.errorHistory.length;
    const successRate = 1 - (this.errorHistory.filter(e => e.attemptNumber >= 3).length / this.errorHistory.length);

    return { mostCommonError, averageRetries, successRate };
  }

  static clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  static shouldSuggestQualityReduction(error: VideoError): boolean {
    return (
      error.type === VideoErrorType.NETWORK ||
      error.type === VideoErrorType.TIMEOUT ||
      error.type === VideoErrorType.MEMORY ||
      (error.type === VideoErrorType.DECODE && error.debugInfo?.includes("bitrate"))
    );
  }

  static getLocalizedMessage(
    error: UserFriendlyError,
    locale: string = "en"
  ): UserFriendlyError {
    return error;
  }
}