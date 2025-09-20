import {
  BaseVideoError,
  VideoErrorCode,
  VideoErrorSeverity,
  VideoLoadError,
  VideoNetworkError,
  VideoPlaybackError,
} from "../types/videoErrors";
import {
  createErrorRecoveryStrategy,
  ErrorRecoveryStrategy,
  ErrorContext,
  isRecoverableError,
  extractErrorContext,
  getRecoverySuggestions,
  errorRateLimiter,
  errorCorrelator,
  analyzeErrorPatterns,
} from "../utils/videoErrors";
import { createRetryableOperation, RetryConfig, RetryResult } from "../utils/retryLogic";
import { VideoDataService } from "./VideoDataService";
import { isOnline } from "../lib/offlineQueue";

// Recovery policies configuration
export interface RecoveryPolicy {
  errorCode: VideoErrorCode;
  maxRetries: number;
  backoffStrategy: "exponential" | "linear" | "fixed";
  cooldownPeriod: number;
  fallbackEnabled: boolean;
  userNotificationThreshold: number;
}

// Fallback video source management
export interface FallbackSource {
  url: string;
  quality: "high" | "medium" | "low";
  isLocal: boolean;
  priority: number;
}

// Recovery result tracking
export interface RecoveryResult {
  success: boolean;
  errorCode: VideoErrorCode;
  recoveryStrategy: ErrorRecoveryStrategy;
  attemptCount: number;
  duration: number;
  timestamp: number; // Comment 4: Added timestamp field
  fallbackUsed: boolean;
  userNotified: boolean;
}

// Circuit breaker state for different error types
interface CircuitBreakerState {
  errorCode: VideoErrorCode;
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  nextRetryTime: number;
}

// Error queue for batch processing
interface QueuedError {
  error: BaseVideoError;
  context: ErrorContext;
  timestamp: number;
  retryCount: number;
  priority: number;
}

// Service configuration
export interface VideoErrorRecoveryConfig {
  enableAutoRecovery: boolean;
  enableFallbacks: boolean;
  enableUserNotifications: boolean;
  enableAnalytics: boolean;
  maxConcurrentRecoveries: number;
  recoveryTimeout: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

/**
 * Comprehensive video error recovery service
 */
export class VideoErrorRecoveryService {
  private static instance: VideoErrorRecoveryService;

  private config: VideoErrorRecoveryConfig;
  private recoveryPolicies: Map<VideoErrorCode, RecoveryPolicy>;
  private fallbackSources: FallbackSource[];
  private circuitBreakers: Map<VideoErrorCode, CircuitBreakerState>;
  private errorQueue: QueuedError[];
  private activeRecoveries: Map<string, Promise<RecoveryResult>>;
  private recoveryHistory: RecoveryResult[];
  private isProcessing: boolean;
  private offlineQueue: BaseVideoError[];

  private constructor(config?: Partial<VideoErrorRecoveryConfig>) {
    this.config = {
      enableAutoRecovery: true,
      enableFallbacks: true,
      enableUserNotifications: true,
      enableAnalytics: true,
      maxConcurrentRecoveries: 3,
      recoveryTimeout: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      ...config,
    };

    this.recoveryPolicies = this.initializeDefaultPolicies();
    this.fallbackSources = this.initializeDefaultFallbacks();
    this.circuitBreakers = new Map();
    this.errorQueue = [];
    this.activeRecoveries = new Map();
    this.recoveryHistory = [];
    this.isProcessing = false;
    this.offlineQueue = [];

    // Start queue processor
    this.startQueueProcessor();

    // Monitor network status
    this.monitorNetworkStatus();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<VideoErrorRecoveryConfig>): VideoErrorRecoveryService {
    if (!VideoErrorRecoveryService.instance) {
      VideoErrorRecoveryService.instance = new VideoErrorRecoveryService(config);
    }
    return VideoErrorRecoveryService.instance;
  }

  /**
   * Handle video error with automatic recovery
   */
  async handleError(
    error: BaseVideoError,
    context?: Partial<ErrorContext>
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const fullContext = {
      ...extractErrorContext(error),
      ...context,
    };

    // Record error for correlation analysis
    errorCorrelator.recordError(error.code);

    // Check rate limiting
    const errorKey = `${error.code}_${fullContext.videoId || "unknown"}`;
    if (!errorRateLimiter.shouldReportError(errorKey)) {
      return this.createRecoveryResult(false, error.code, "none", 0, Date.now() - startTime);
    }

    // Check circuit breaker
    const breaker = this.getOrCreateCircuitBreaker(error.code);
    if (breaker.state === "open") {
      if (Date.now() < breaker.nextRetryTime) {
        return this.createRecoveryResult(false, error.code, "none", 0, Date.now() - startTime);
      }
      // Move to half-open state
      breaker.state = "half-open";
    }

    // Check if error is recoverable
    if (!isRecoverableError(error)) {
      this.handleUnrecoverableError(error, fullContext);
      return this.createRecoveryResult(false, error.code, "manual", 0, Date.now() - startTime);
    }

    // Create recovery strategy
    const strategy = createErrorRecoveryStrategy(error, fullContext);

    // Queue or process immediately based on strategy
    if (strategy.type === "immediate") {
      return this.processRecovery(error, fullContext, strategy);
    } else {
      this.queueError(error, fullContext, strategy);
      return this.createRecoveryResult(false, error.code, strategy.type, 0, Date.now() - startTime);
    }
  }

  /**
   * Process recovery for an error
   */
  private async processRecovery(
    error: BaseVideoError,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const recoveryKey = `${error.code}_${context.videoId || Date.now()}`;

    // Check if already recovering
    const existingRecovery = this.activeRecoveries.get(recoveryKey);
    if (existingRecovery) {
      return existingRecovery;
    }

    // Create recovery promise
    const recoveryPromise = this.executeRecovery(error, context, strategy, startTime);
    this.activeRecoveries.set(recoveryKey, recoveryPromise);

    try {
      const result = await recoveryPromise;
      this.updateCircuitBreaker(error.code, result.success);
      this.recordRecoveryResult(result);
      return result;
    } finally {
      this.activeRecoveries.delete(recoveryKey);
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecovery(
    error: BaseVideoError,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy,
    startTime: number
  ): Promise<RecoveryResult> {
    const policy = this.recoveryPolicies.get(error.code);
    let attemptCount = 0;
    let success = false;
    let fallbackUsed = false;

    // Implement retry logic if configured
    if (strategy.retryConfig && policy) {
      const retryOperation = createRetryableOperation(
        async () => {
          attemptCount++;
          return this.attemptRecovery(error, context);
        },
        strategy.retryConfig
      );

      try {
        const result = await Promise.race([
          retryOperation(),
          this.timeout(this.config.recoveryTimeout),
        ]);

        success = result.success;
      } catch (retryError) {
        console.warn(`Recovery failed after retries: ${retryError}`);
      }
    }

    // Attempt fallback if primary recovery failed
    if (!success && this.config.enableFallbacks && strategy.type === "fallback") {
      try {
        const fallbackResult = await this.attemptFallback(error, context);
        success = fallbackResult.success;
        fallbackUsed = fallbackResult.fallbackUsed;
      } catch (fallbackError) {
        console.warn(`Fallback failed: ${fallbackError}`);
      }
    }

    // Notify user if necessary
    const userNotified = this.shouldNotifyUser(error, attemptCount, success);
    if (userNotified && strategy.userMessage) {
      this.notifyUser(strategy.userMessage, getRecoverySuggestions(error));
    }

    return this.createRecoveryResult(
      success,
      error.code,
      strategy.type,
      attemptCount,
      Date.now() - startTime,
      fallbackUsed,
      userNotified
    );
  }

  /**
   * Attempt to recover from error
   */
  private async attemptRecovery(
    error: BaseVideoError,
    context: ErrorContext
  ): Promise<{ success: boolean }> {
    switch (error.code) {
      case VideoErrorCode.NETWORK_ERROR:
      case VideoErrorCode.CONNECTION_FAILED:
        return this.recoverFromNetworkError(context);

      case VideoErrorCode.LOAD_FAILED:
        return this.recoverFromLoadError(context);

      case VideoErrorCode.PLAYBACK_STALLED:
      case VideoErrorCode.BUFFERING_TIMEOUT:
        return this.recoverFromPlaybackError(context);

      case VideoErrorCode.SOURCE_NOT_FOUND:
      case VideoErrorCode.SOURCE_INVALID:
        return this.recoverFromSourceError(context);

      case VideoErrorCode.RATE_LIMITED:
        return this.recoverFromRateLimit(context);

      default:
        return { success: false };
    }
  }

  /**
   * Network error recovery
   */
  private async recoverFromNetworkError(context: ErrorContext): Promise<{ success: boolean }> {
    // Wait for network to be available
    if (!isOnline()) {
      await this.waitForNetwork();
    }

    // Retry the operation
    try {
      if (context.videoId) {
        await VideoDataService.retryFailedRequest(context.videoId);
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Load error recovery
   */
  private async recoverFromLoadError(context: ErrorContext): Promise<{ success: boolean }> {
    try {
      // Try alternative source
      if (context.source) {
        const alternativeSource = await this.findAlternativeSource(context.source);
        if (alternativeSource) {
          return { success: true };
        }
      }

      // Refresh video data
      if (context.videoId) {
        await VideoDataService.refreshVideoData(context.videoId);
        return { success: true };
      }
    } catch {
      // Fall through
    }

    return { success: false };
  }

  /**
   * Playback error recovery
   */
  private async recoverFromPlaybackError(context: ErrorContext): Promise<{ success: boolean }> {
    // Implement progressive quality reduction
    if (context.source) {
      const lowerQualitySource = await this.getLowerQualitySource(context.source);
      if (lowerQualitySource) {
        return { success: true };
      }
    }

    return { success: false };
  }

  /**
   * Source error recovery
   */
  private async recoverFromSourceError(context: ErrorContext): Promise<{ success: boolean }> {
    // Find alternative source
    const fallback = this.getNextFallbackSource();
    if (fallback) {
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Rate limit recovery
   */
  private async recoverFromRateLimit(context: ErrorContext): Promise<{ success: boolean }> {
    // Wait for cooldown period
    const policy = this.recoveryPolicies.get(VideoErrorCode.RATE_LIMITED);
    if (policy) {
      await new Promise(resolve => setTimeout(resolve, policy.cooldownPeriod));
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Attempt fallback recovery
   */
  private async attemptFallback(
    error: BaseVideoError,
    context: ErrorContext
  ): Promise<{ success: boolean; fallbackUsed: boolean }> {
    const fallbackSource = this.getNextFallbackSource();

    if (!fallbackSource) {
      return { success: false, fallbackUsed: false };
    }

    try {
      // Load fallback source
      if (context.videoId) {
        await VideoDataService.loadFallbackVideo(context.videoId, fallbackSource.url);
      }
      return { success: true, fallbackUsed: true };
    } catch {
      return { success: false, fallbackUsed: true };
    }
  }

  /**
   * Get next available fallback source
   */
  private getNextFallbackSource(): FallbackSource | null {
    // Sort by priority and filter available sources
    const availableSources = this.fallbackSources
      .filter(source => !source.isLocal || isOnline())
      .sort((a, b) => a.priority - b.priority);

    return availableSources[0] || null;
  }

  /**
   * Find alternative video source
   */
  private async findAlternativeSource(currentSource: string): Promise<string | null> {
    // Implementation would check for CDN alternatives, different qualities, etc.
    return null;
  }

  /**
   * Get lower quality source
   */
  private async getLowerQualitySource(currentSource: string): Promise<string | null> {
    // Implementation would return a lower quality version of the video
    return null;
  }

  /**
   * Queue error for delayed processing
   */
  private queueError(
    error: BaseVideoError,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): void {
    const priority = this.calculateErrorPriority(error);

    this.errorQueue.push({
      error,
      context,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    });

    // Sort by priority
    this.errorQueue.sort((a, b) => b.priority - a.priority);

    // Trigger processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process error queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.errorQueue.length > 0 && this.activeRecoveries.size < this.config.maxConcurrentRecoveries) {
      const queuedError = this.errorQueue.shift();
      if (!queuedError) continue;

      const strategy = createErrorRecoveryStrategy(queuedError.error, queuedError.context);
      this.processRecovery(queuedError.error, queuedError.context, strategy);
    }

    this.isProcessing = false;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
      this.cleanupOldHistory();
      this.analyzeAndOptimize();
    }, 5000);
  }

  /**
   * Monitor network status
   */
  private monitorNetworkStatus(): void {
    setInterval(() => {
      if (isOnline() && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    }, 10000);
  }

  /**
   * Process offline queue
   */
  private async processOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const error = this.offlineQueue.shift();
      if (error) {
        await this.handleError(error);
      }
    }
  }

  /**
   * Wait for network connection
   */
  private async waitForNetwork(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (!isOnline() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!isOnline()) {
      throw new Error("Network timeout");
    }
  }

  /**
   * Handle unrecoverable error
   */
  private handleUnrecoverableError(error: BaseVideoError, context: ErrorContext): void {
    // Log for analytics
    if (this.config.enableAnalytics) {
      this.logError(error, context, false);
    }

    // Add to offline queue if network error
    if (!isOnline()) {
      this.offlineQueue.push(error);
    }
  }

  /**
   * Calculate error priority
   */
  private calculateErrorPriority(error: BaseVideoError): number {
    let priority = 0;

    // Severity-based priority
    switch (error.severity) {
      case VideoErrorSeverity.CRITICAL:
        priority += 100;
        break;
      case VideoErrorSeverity.ERROR:
        priority += 50;
        break;
      case VideoErrorSeverity.WARNING:
        priority += 25;
        break;
    }

    // Type-based priority
    switch (error.code) {
      case VideoErrorCode.PLAYBACK_STALLED:
      case VideoErrorCode.BUFFERING_TIMEOUT:
        priority += 30; // User-facing issues get higher priority
        break;
      case VideoErrorCode.NETWORK_ERROR:
        priority += 20;
        break;
      case VideoErrorCode.DISPOSAL_ERROR:
        priority += 10; // Background issues get lower priority
        break;
    }

    return priority;
  }

  /**
   * Should notify user about error
   */
  private shouldNotifyUser(error: BaseVideoError, attemptCount: number, success: boolean): boolean {
    if (!this.config.enableUserNotifications) {
      return false;
    }

    const policy = this.recoveryPolicies.get(error.code);
    if (!policy) {
      return false;
    }

    return !success && attemptCount >= policy.userNotificationThreshold;
  }

  /**
   * Notify user about error
   */
  private notifyUser(message: string, suggestions: string[]): void {
    // Implementation would show user notification
    console.log(`User notification: ${message}`, suggestions);
  }

  /**
   * Get or create circuit breaker for error type
   */
  private getOrCreateCircuitBreaker(errorCode: VideoErrorCode): CircuitBreakerState {
    let breaker = this.circuitBreakers.get(errorCode);

    if (!breaker) {
      breaker = {
        errorCode,
        state: "closed",
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        nextRetryTime: 0,
      };
      this.circuitBreakers.set(errorCode, breaker);
    }

    return breaker;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(errorCode: VideoErrorCode, success: boolean): void {
    const breaker = this.getOrCreateCircuitBreaker(errorCode);

    if (success) {
      breaker.successCount++;
      if (breaker.state === "half-open") {
        breaker.state = "closed";
        breaker.failureCount = 0;
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
        breaker.state = "open";
        breaker.nextRetryTime = Date.now() + this.config.circuitBreakerTimeout;
      }
    }
  }

  /**
   * Create recovery result
   */
  private createRecoveryResult(
    success: boolean,
    errorCode: VideoErrorCode,
    strategyType: string,
    attemptCount: number,
    duration: number,
    fallbackUsed = false,
    userNotified = false
  ): RecoveryResult {
    return {
      success,
      errorCode,
      recoveryStrategy: { type: strategyType as any },
      attemptCount,
      duration,
      timestamp: Date.now(), // Comment 4: Populate timestamp
      fallbackUsed,
      userNotified,
    };
  }

  /**
   * Record recovery result for analytics
   */
  private recordRecoveryResult(result: RecoveryResult): void {
    this.recoveryHistory.push(result);

    if (this.config.enableAnalytics) {
      this.logRecovery(result);
    }
  }

  /**
   * Log error for analytics
   */
  private logError(error: BaseVideoError, context: ErrorContext, recoverable: boolean): void {
    // Implementation would send to analytics service
    console.log("Error logged:", { error, context, recoverable });
  }

  /**
   * Log recovery for analytics
   */
  private logRecovery(result: RecoveryResult): void {
    // Implementation would send to analytics service
    console.log("Recovery logged:", result);
  }

  /**
   * Clean up old history
   */
  private cleanupOldHistory(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    // Comment 4: Filter by timestamp instead of duration
    this.recoveryHistory = this.recoveryHistory.filter(
      result => result.timestamp > cutoffTime
    );
  }

  /**
   * Analyze patterns and optimize policies
   */
  private analyzeAndOptimize(): void {
    if (!this.config.enableAnalytics) {
      return;
    }

    const patterns = analyzeErrorPatterns();

    // Adjust policies based on patterns
    if (patterns.recentTrend === "increasing") {
      // Increase circuit breaker thresholds temporarily
      this.config.circuitBreakerThreshold = Math.min(10, this.config.circuitBreakerThreshold + 1);
    } else if (patterns.recentTrend === "decreasing") {
      // Restore normal thresholds
      this.config.circuitBreakerThreshold = Math.max(5, this.config.circuitBreakerThreshold - 1);
    }

    // Update policies for frequent errors
    for (const errorCode of patterns.mostFrequent) {
      const policy = this.recoveryPolicies.get(errorCode);
      if (policy && policy.maxRetries > 1) {
        // Reduce retries for consistently failing errors
        const successRate = this.calculateSuccessRate(errorCode);
        if (successRate < 0.2) {
          policy.maxRetries = Math.max(1, policy.maxRetries - 1);
        }
      }
    }
  }

  /**
   * Calculate success rate for error type
   */
  private calculateSuccessRate(errorCode: VideoErrorCode): number {
    const relevantResults = this.recoveryHistory.filter(r => r.errorCode === errorCode);

    if (relevantResults.length === 0) {
      return 0;
    }

    const successCount = relevantResults.filter(r => r.success).length;
    return successCount / relevantResults.length;
  }

  /**
   * Timeout utility
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Recovery timeout")), ms);
    });
  }

  /**
   * Initialize default recovery policies
   */
  private initializeDefaultPolicies(): Map<VideoErrorCode, RecoveryPolicy> {
    const policies = new Map<VideoErrorCode, RecoveryPolicy>();

    // Network errors
    policies.set(VideoErrorCode.NETWORK_ERROR, {
      errorCode: VideoErrorCode.NETWORK_ERROR,
      maxRetries: 5,
      backoffStrategy: "exponential",
      cooldownPeriod: 2000,
      fallbackEnabled: true,
      userNotificationThreshold: 3,
    });

    // Playback errors
    policies.set(VideoErrorCode.PLAYBACK_STALLED, {
      errorCode: VideoErrorCode.PLAYBACK_STALLED,
      maxRetries: 3,
      backoffStrategy: "exponential",
      cooldownPeriod: 1000,
      fallbackEnabled: true,
      userNotificationThreshold: 2,
    });

    // Rate limit errors
    policies.set(VideoErrorCode.RATE_LIMITED, {
      errorCode: VideoErrorCode.RATE_LIMITED,
      maxRetries: 3,
      backoffStrategy: "exponential",
      cooldownPeriod: 30000,
      fallbackEnabled: false,
      userNotificationThreshold: 1,
    });

    // Source errors
    policies.set(VideoErrorCode.SOURCE_NOT_FOUND, {
      errorCode: VideoErrorCode.SOURCE_NOT_FOUND,
      maxRetries: 2,
      backoffStrategy: "linear",
      cooldownPeriod: 1000,
      fallbackEnabled: true,
      userNotificationThreshold: 1,
    });

    // Disposal errors
    policies.set(VideoErrorCode.DISPOSAL_ERROR, {
      errorCode: VideoErrorCode.DISPOSAL_ERROR,
      maxRetries: 3,
      backoffStrategy: "fixed",
      cooldownPeriod: 100,
      fallbackEnabled: false,
      userNotificationThreshold: 99, // Don't notify for disposal errors
    });

    return policies;
  }

  /**
   * Initialize default fallback sources
   */
  private initializeDefaultFallbacks(): FallbackSource[] {
    return [
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        quality: "high",
        isLocal: false,
        priority: 1,
      },
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        quality: "medium",
        isLocal: false,
        priority: 2,
      },
      {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        quality: "low",
        isLocal: false,
        priority: 3,
      },
    ];
  }

  /**
   * Get current service status
   */
  getStatus(): {
    activeRecoveries: number;
    queuedErrors: number;
    circuitBreakers: Array<{ code: VideoErrorCode; state: string }>;
    successRate: number;
    recentErrors: number;
  } {
    // Comment 4: Check timestamp for recent errors
    const recentErrors = this.recoveryHistory.filter(
      r => r.timestamp > Date.now() - 5 * 60 * 1000
    ).length;

    const successRate = this.calculateOverallSuccessRate();

    return {
      activeRecoveries: this.activeRecoveries.size,
      queuedErrors: this.errorQueue.length,
      circuitBreakers: Array.from(this.circuitBreakers.values()).map(b => ({
        code: b.errorCode,
        state: b.state,
      })),
      successRate,
      recentErrors,
    };
  }

  /**
   * Calculate overall success rate
   */
  private calculateOverallSuccessRate(): number {
    if (this.recoveryHistory.length === 0) {
      return 1;
    }

    const successCount = this.recoveryHistory.filter(r => r.success).length;
    return successCount / this.recoveryHistory.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VideoErrorRecoveryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Update recovery policy
   */
  updatePolicy(errorCode: VideoErrorCode, policy: Partial<RecoveryPolicy>): void {
    const existingPolicy = this.recoveryPolicies.get(errorCode);
    if (existingPolicy) {
      this.recoveryPolicies.set(errorCode, {
        ...existingPolicy,
        ...policy,
      });
    }
  }

  /**
   * Add fallback source
   */
  addFallbackSource(source: FallbackSource): void {
    this.fallbackSources.push(source);
    this.fallbackSources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear recovery history
   */
  clearHistory(): void {
    this.recoveryHistory = [];
  }

  /**
   * Reset circuit breakers
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * Reset service
   */
  reset(): void {
    this.errorQueue = [];
    this.activeRecoveries.clear();
    this.recoveryHistory = [];
    this.circuitBreakers.clear();
    this.offlineQueue = [];
    this.isProcessing = false;
  }
}

// Export singleton instance
export const videoErrorRecoveryService = VideoErrorRecoveryService.getInstance();