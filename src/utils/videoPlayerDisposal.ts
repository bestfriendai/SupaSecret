import { VideoPlayerInterface, VideoPlayerState, VideoPlayerCapabilities } from "../types/videoPlayer";
import { VideoDisposalError, VideoErrorCode, VideoErrorSeverity } from "../types/videoErrors";
import { isHermesError } from "./videoErrors";

// Disposal strategy types
export enum DisposalStrategy {
  GRACEFUL = "graceful",
  FORCED = "forced",
  EMERGENCY = "emergency",
  SCHEDULED = "scheduled",
}

// Disposal configuration
export interface DisposalConfig {
  strategy: DisposalStrategy;
  timeout: number;
  retries: number;
  fallbackStrategy?: DisposalStrategy;
  enableMemoryCleanup: boolean;
  enableHermesWorkarounds: boolean;
}

// Disposal result
export interface DisposalResult {
  success: boolean;
  strategy: DisposalStrategy;
  duration: number;
  retryCount: number;
  error?: VideoDisposalError;
  memoryFreed?: number;
}

// Player disposal state
interface PlayerDisposalState {
  playerId: string;
  player: VideoPlayerInterface;
  state: VideoPlayerState;
  disposalAttempts: number;
  lastDisposalTime?: number;
  isDisposed: boolean;
  hermesCompatibilityMode: boolean;
}

// Memory tracking
interface MemoryMetrics {
  beforeDisposal: number;
  afterDisposal: number;
  freed: number;
  timestamp: number;
}

// Disposal queue item
interface QueuedDisposal {
  playerId: string;
  player: VideoPlayerInterface;
  config: DisposalConfig;
  priority: number;
  scheduledTime?: number;
}

/**
 * Enhanced video player disposal utility with Hermes compatibility
 */
export class EnhancedVideoPlayerDisposal {
  private static instance: EnhancedVideoPlayerDisposal;

  private readonly DISPOSAL_TIMEOUT_DEFAULT = 500;
  private readonly DISPOSAL_TIMEOUT_HERMES = 1000;
  private readonly DISPOSAL_TIMEOUT_EMERGENCY = 100;
  private readonly MAX_DISPOSAL_ATTEMPTS = 3;
  private readonly MEMORY_CLEANUP_DELAY = 100;
  private readonly DISPOSAL_QUEUE_CHECK_INTERVAL = 1000;

  private disposalStates: Map<string, PlayerDisposalState>;
  private disposalQueue: QueuedDisposal[];
  private memoryMetrics: MemoryMetrics[];
  private isHermesRuntime: boolean;
  private queueProcessor?: NodeJS.Timeout;
  private disposalInProgress: Set<string>;

  private constructor() {
    this.disposalStates = new Map();
    this.disposalQueue = [];
    this.memoryMetrics = [];
    this.isHermesRuntime = this.detectHermesRuntime();
    this.disposalInProgress = new Set();

    // Start queue processor
    this.startQueueProcessor();

    // Monitor memory periodically
    this.startMemoryMonitoring();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnhancedVideoPlayerDisposal {
    if (!EnhancedVideoPlayerDisposal.instance) {
      EnhancedVideoPlayerDisposal.instance = new EnhancedVideoPlayerDisposal();
    }
    return EnhancedVideoPlayerDisposal.instance;
  }

  /**
   * Dispose a video player with advanced strategies
   */
  async disposePlayer(
    playerId: string,
    player: VideoPlayerInterface,
    config?: Partial<DisposalConfig>,
  ): Promise<DisposalResult> {
    const fullConfig = this.getFullConfig(config);
    const startTime = Date.now();

    // Check if already disposing
    if (this.disposalInProgress.has(playerId)) {
      return {
        success: false,
        strategy: fullConfig.strategy,
        duration: 0,
        retryCount: 0,
        error: new VideoDisposalError("Disposal already in progress", undefined, VideoErrorSeverity.WARNING),
      };
    }

    // Mark as in progress
    this.disposalInProgress.add(playerId);

    // Get or create disposal state
    const disposalState = this.getOrCreateDisposalState(playerId, player);

    try {
      // Attempt disposal with the specified strategy
      const result = await this.attemptDisposal(disposalState, fullConfig);

      // Record metrics
      if (result.success && fullConfig.enableMemoryCleanup) {
        result.memoryFreed = await this.performMemoryCleanup(playerId);
      }

      // Update state
      disposalState.isDisposed = result.success;
      disposalState.lastDisposalTime = Date.now();

      return result;
    } catch (error) {
      return {
        success: false,
        strategy: fullConfig.strategy,
        duration: Date.now() - startTime,
        retryCount: disposalState.disposalAttempts,
        error: new VideoDisposalError(`Disposal failed: ${error}`, undefined, VideoErrorSeverity.ERROR),
      };
    } finally {
      this.disposalInProgress.delete(playerId);
    }
  }

  /**
   * Schedule disposal for later execution
   */
  scheduleDisposal(
    playerId: string,
    player: VideoPlayerInterface,
    delay: number,
    config?: Partial<DisposalConfig>,
  ): void {
    const fullConfig = this.getFullConfig({
      ...config,
      strategy: DisposalStrategy.SCHEDULED,
    });

    const queueItem: QueuedDisposal = {
      playerId,
      player,
      config: fullConfig,
      priority: this.calculateDisposalPriority(fullConfig.strategy),
      scheduledTime: Date.now() + delay,
    };

    this.disposalQueue.push(queueItem);
    this.disposalQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Dispose multiple players in batch
   */
  async disposeBatch(
    players: { playerId: string; player: VideoPlayerInterface }[],
    config?: Partial<DisposalConfig>,
  ): Promise<Map<string, DisposalResult>> {
    const results = new Map<string, DisposalResult>();
    const batchConfig = this.getFullConfig(config);

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(players, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(({ playerId, player }) =>
          this.disposePlayer(playerId, player, batchConfig).then((result) => ({ playerId, result })),
        ),
      );

      chunkResults.forEach(({ playerId, result }) => {
        results.set(playerId, result);
      });
    }

    return results;
  }

  /**
   * Attempt disposal with the specified strategy
   */
  private async attemptDisposal(state: PlayerDisposalState, config: DisposalConfig): Promise<DisposalResult> {
    const startTime = Date.now();
    let retryCount = 0;

    for (let attempt = 0; attempt < config.retries; attempt++) {
      retryCount = attempt + 1;
      state.disposalAttempts++;

      try {
        // Apply strategy-specific disposal
        await this.applyDisposalStrategy(state.player, config.strategy, config.timeout);

        // Verify disposal if in Hermes environment
        if (config.enableHermesWorkarounds && this.isHermesRuntime) {
          await this.verifyHermesDisposal(state.player);
        }

        return {
          success: true,
          strategy: config.strategy,
          duration: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        if (attempt === config.retries - 1) {
          // Last attempt failed, try fallback strategy
          if (config.fallbackStrategy && config.fallbackStrategy !== config.strategy) {
            try {
              await this.applyDisposalStrategy(state.player, config.fallbackStrategy, this.DISPOSAL_TIMEOUT_EMERGENCY);

              return {
                success: true,
                strategy: config.fallbackStrategy,
                duration: Date.now() - startTime,
                retryCount: retryCount + 1,
              };
            } catch (fallbackError) {
              throw fallbackError;
            }
          }
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }

    throw new Error("Disposal failed after all retries");
  }

  /**
   * Apply specific disposal strategy
   */
  private async applyDisposalStrategy(
    player: VideoPlayerInterface,
    strategy: DisposalStrategy,
    timeout: number,
  ): Promise<void> {
    switch (strategy) {
      case DisposalStrategy.GRACEFUL:
        await this.gracefulDisposal(player, timeout);
        break;

      case DisposalStrategy.FORCED:
        await this.forcedDisposal(player, timeout);
        break;

      case DisposalStrategy.EMERGENCY:
        await this.emergencyDisposal(player);
        break;

      case DisposalStrategy.SCHEDULED:
        await this.gracefulDisposal(player, timeout);
        break;

      default:
        throw new Error(`Unknown disposal strategy: ${strategy}`);
    }
  }

  /**
   * Graceful disposal with proper cleanup
   */
  private async gracefulDisposal(player: VideoPlayerInterface, timeout: number): Promise<void> {
    // Comment 5: For GRACEFUL, avoid aggressive prototype/property manipulation
    const operations = [
      () => this.pausePlayer(player),
      () => this.mutePlayer(player),
      () => this.releaseResources(player),
      () => this.clearEventListeners(player),
      // Don't finalize disposal for graceful strategy
    ];

    await this.executeWithTimeout(async () => {
      for (const operation of operations) {
        await operation();
      }
    }, timeout);
  }

  /**
   * Forced disposal with aggressive cleanup
   */
  private async forcedDisposal(player: VideoPlayerInterface, timeout: number): Promise<void> {
    await this.executeWithTimeout(async () => {
      // Try to pause first
      try {
        await this.pausePlayer(player);
      } catch {}

      // Force release all resources
      await this.forceReleaseResources(player);

      // Comment 5: Only clear references for FORCED/EMERGENCY or Hermes
      if (this.isHermesRuntime) {
        await this.clearAllReferences(player);
      }
      await this.finalizeDisposal(player);
    }, timeout);
  }

  /**
   * Emergency disposal - immediate cleanup
   */
  private async emergencyDisposal(player: VideoPlayerInterface): Promise<void> {
    try {
      // Mark as disposed immediately
      (player as any)._disposed = true;
      (player as any)._emergencyDisposed = true;

      // Nullify key properties
      const keys = Object.keys(player);
      for (const key of keys) {
        try {
          (player as any)[key] = null;
        } catch {}
      }
    } catch {
      // Ignore all errors in emergency disposal
    }
  }

  /**
   * Pause player safely
   */
  private async pausePlayer(player: VideoPlayerInterface): Promise<void> {
    if (typeof player.pause === "function") {
      await player.pause();
    }
  }

  /**
   * Mute player safely
   */
  private async mutePlayer(player: VideoPlayerInterface): Promise<void> {
    if (typeof player.setMuted === "function") {
      player.setMuted(true);
    } else if ("muted" in player) {
      (player as any).muted = true;
    }
  }

  /**
   * Release player resources
   */
  private async releaseResources(player: VideoPlayerInterface): Promise<void> {
    const releaseMethods = ["release", "stop", "dispose", "destroy", "cleanup"];

    for (const method of releaseMethods) {
      if (typeof (player as any)[method] === "function") {
        try {
          await (player as any)[method]();
        } catch (error) {
          // Log but continue
          if (__DEV__) {
            console.debug(`Failed to call ${method}:`, error);
          }
        }
      }
    }
  }

  /**
   * Force release all resources
   */
  private async forceReleaseResources(player: VideoPlayerInterface): Promise<void> {
    await this.releaseResources(player);

    // Additional aggressive cleanup
    try {
      // Clear video source
      if ("src" in player) {
        (player as any).src = null;
      }
      if ("source" in player) {
        (player as any).source = null;
      }

      // Clear buffers
      if ("buffer" in player) {
        (player as any).buffer = null;
      }

      // Stop all media operations
      if (typeof (player as any).abort === "function") {
        (player as any).abort();
      }
    } catch {}
  }

  /**
   * Clear event listeners
   */
  private async clearEventListeners(player: VideoPlayerInterface): Promise<void> {
    if (typeof player.removeAllListeners === "function") {
      player.removeAllListeners();
    }

    // Try common event removal methods
    const eventMethods = ["removeEventListener", "off", "unbind"];
    for (const method of eventMethods) {
      if (typeof (player as any)[method] === "function") {
        try {
          (player as any)[method]();
        } catch {}
      }
    }
  }

  /**
   * Clear all references
   */
  private async clearAllReferences(player: VideoPlayerInterface): Promise<void> {
    // Comment 5: Restrict aggressive cleanup to FORCED/EMERGENCY and Hermes
    // Set prototype to null to break reference chains
    try {
      Object.setPrototypeOf(player, null);
    } catch {}

    // Clear all enumerable properties
    const keys = Object.keys(player);
    for (const key of keys) {
      try {
        delete (player as any)[key];
      } catch {}
    }
  }

  /**
   * Finalize disposal
   */
  private async finalizeDisposal(player: VideoPlayerInterface): Promise<void> {
    // Mark as disposed
    (player as any)._disposed = true;
    (player as any)._disposedAt = Date.now();
  }

  /**
   * Verify Hermes disposal
   */
  private async verifyHermesDisposal(player: VideoPlayerInterface): Promise<void> {
    // Hermes-specific verification
    if (this.isHermesRuntime) {
      // Wait for GC
      await new Promise((resolve) => setTimeout(resolve, this.MEMORY_CLEANUP_DELAY));

      // Check if player is still accessible
      try {
        const test = (player as any)._disposed;
        if (!test) {
          throw new Error("Hermes disposal verification failed");
        }
      } catch (error) {
        if (isHermesError(error)) {
          // Expected - player is properly disposed
          return;
        }
        throw error;
      }
    }
  }

  /**
   * Perform memory cleanup
   */
  private async performMemoryCleanup(playerId: string): Promise<number> {
    const beforeMemory = this.getMemoryUsage();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, this.MEMORY_CLEANUP_DELAY));

    const afterMemory = this.getMemoryUsage();
    const freed = Math.max(0, beforeMemory - afterMemory);

    // Record metrics
    this.memoryMetrics.push({
      beforeDisposal: beforeMemory,
      afterDisposal: afterMemory,
      freed,
      timestamp: Date.now(),
    });

    // Clean up disposal state
    this.disposalStates.delete(playerId);

    return freed;
  }

  /**
   * Process disposal queue
   */
  private async processDisposalQueue(): Promise<void> {
    const now = Date.now();
    const readyItems: QueuedDisposal[] = [];

    // Find items ready for disposal
    this.disposalQueue = this.disposalQueue.filter((item) => {
      if (!item.scheduledTime || item.scheduledTime <= now) {
        readyItems.push(item);
        return false;
      }
      return true;
    });

    // Process ready items
    for (const item of readyItems) {
      if (!this.disposalInProgress.has(item.playerId)) {
        this.disposePlayer(item.playerId, item.player, item.config);
      }
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (!this.queueProcessor) {
      this.queueProcessor = setInterval(() => {
        this.processDisposalQueue();
      }, this.DISPOSAL_QUEUE_CHECK_INTERVAL);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
      this.analyzeMemoryTrends();
    }, 60000); // Every minute
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.memoryMetrics = this.memoryMetrics.filter((metric) => metric.timestamp > cutoffTime);
  }

  /**
   * Analyze memory trends
   */
  private analyzeMemoryTrends(): void {
    if (this.memoryMetrics.length < 10) return;

    const recentMetrics = this.memoryMetrics.slice(-10);
    const averageFreed = recentMetrics.reduce((sum, m) => sum + m.freed, 0) / recentMetrics.length;

    if (averageFreed < 1000) {
      // Less than 1KB freed on average - might indicate disposal issues
      if (__DEV__) {
        console.warn("Low memory freed during disposal - potential memory leak");
      }
    }
  }

  /**
   * Get or create disposal state
   */
  private getOrCreateDisposalState(playerId: string, player: VideoPlayerInterface): PlayerDisposalState {
    let state = this.disposalStates.get(playerId);

    if (!state) {
      state = {
        playerId,
        player,
          state: VideoPlayerState.Idle,
        disposalAttempts: 0,
        isDisposed: false,
        hermesCompatibilityMode: this.isHermesRuntime,
      };
      this.disposalStates.set(playerId, state);
    }

    return state;
  }

  /**
   * Get full disposal configuration
   */
  private getFullConfig(partial?: Partial<DisposalConfig>): DisposalConfig {
    const defaultTimeout = this.isHermesRuntime ? this.DISPOSAL_TIMEOUT_HERMES : this.DISPOSAL_TIMEOUT_DEFAULT;

    return {
      strategy: DisposalStrategy.GRACEFUL,
      timeout: defaultTimeout,
      retries: this.MAX_DISPOSAL_ATTEMPTS,
      fallbackStrategy: DisposalStrategy.FORCED,
      enableMemoryCleanup: true,
      enableHermesWorkarounds: this.isHermesRuntime,
      ...partial,
    };
  }

  /**
   * Calculate disposal priority
   */
  private calculateDisposalPriority(strategy: DisposalStrategy): number {
    switch (strategy) {
      case DisposalStrategy.EMERGENCY:
        return 0; // Highest priority
      case DisposalStrategy.FORCED:
        return 1;
      case DisposalStrategy.GRACEFUL:
        return 2;
      case DisposalStrategy.SCHEDULED:
        return 3; // Lowest priority
      default:
        return 99;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new VideoDisposalError(`Operation timed out after ${timeout}ms`, undefined, VideoErrorSeverity.WARNING));
        }, timeout);
      }),
    ]);
  }

  /**
   * Detect Hermes runtime
   */
  private detectHermesRuntime(): boolean {
    try {
      // @ts-ignore
      return typeof HermesInternal !== "undefined";
    } catch {
      return false;
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    try {
      // React Native specific memory API
      if ((global as any).performance?.memory) {
        return (global as any).performance.memory.usedJSHeapSize || 0;
      }

      // Fallback to process memory if available
      if (typeof process !== "undefined" && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
    } catch {}

    return 0;
  }

  /**
   * Chunk array for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get disposal statistics
   */
  getStatistics(): {
    totalDisposals: number;
    activeDisposals: number;
    queuedDisposals: number;
    averageMemoryFreed: number;
    hermesMode: boolean;
  } {
    const totalDisposals = Array.from(this.disposalStates.values()).reduce(
      (sum, state) => sum + state.disposalAttempts,
      0,
    );

    const averageMemoryFreed =
      this.memoryMetrics.length > 0
        ? this.memoryMetrics.reduce((sum, m) => sum + m.freed, 0) / this.memoryMetrics.length
        : 0;

    return {
      totalDisposals,
      activeDisposals: this.disposalInProgress.size,
      queuedDisposals: this.disposalQueue.length,
      averageMemoryFreed,
      hermesMode: this.isHermesRuntime,
    };
  }

  /**
   * Clear all disposal states
   */
  clearAll(): void {
    this.disposalStates.clear();
    this.disposalQueue = [];
    this.memoryMetrics = [];
    this.disposalInProgress.clear();
  }

  /**
   * Stop queue processor
   */
  stopQueueProcessor(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = undefined;
    }
  }
}

// Export singleton instance
export const videoPlayerDisposal = EnhancedVideoPlayerDisposal.getInstance();

// Export convenience functions
export async function disposeVideoPlayer(
  playerId: string,
  player: VideoPlayerInterface,
  config?: Partial<DisposalConfig>,
): Promise<DisposalResult> {
  return videoPlayerDisposal.disposePlayer(playerId, player, config);
}

export function scheduleVideoPlayerDisposal(
  playerId: string,
  player: VideoPlayerInterface,
  delay: number,
  config?: Partial<DisposalConfig>,
): void {
  videoPlayerDisposal.scheduleDisposal(playerId, player, delay, config);
}

export async function disposeVideoPlayersBatch(
  players: { playerId: string; player: VideoPlayerInterface }[],
  config?: Partial<DisposalConfig>,
): Promise<Map<string, DisposalResult>> {
  return videoPlayerDisposal.disposeBatch(players, config);
}
