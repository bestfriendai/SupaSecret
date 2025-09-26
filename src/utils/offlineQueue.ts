/**
 * Offline Queue System
 * Manages offline actions and syncs them when connection is restored
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Robust UUID generation function
const generateUniqueId = (): string => {
  // Try crypto.randomUUID() first (available in newer environments)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to a robust custom implementation
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substr(2, 9);
  const randomPart2 = Math.random().toString(36).substr(2, 9);
  const counter = (Math.random() * 1000000).toString(36);

  return `${timestamp}-${randomPart1}-${randomPart2}-${counter}`;
};

// Action types for different operations
export const OFFLINE_ACTIONS = {
  LIKE_CONFESSION: "LIKE_CONFESSION",
  UNLIKE_CONFESSION: "UNLIKE_CONFESSION",
  SAVE_CONFESSION: "SAVE_CONFESSION",
  UNSAVE_CONFESSION: "UNSAVE_CONFESSION",
  DELETE_CONFESSION: "DELETE_CONFESSION",
  CREATE_CONFESSION: "CREATE_CONFESSION",
  CREATE_REPLY: "CREATE_REPLY",
  DELETE_REPLY: "DELETE_REPLY",
  LIKE_REPLY: "LIKE_REPLY",
  UNLIKE_REPLY: "UNLIKE_REPLY",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",
} as const;

export type OfflineActionType = (typeof OFFLINE_ACTIONS)[keyof typeof OFFLINE_ACTIONS];

/**
 * Interface for offline action that needs to be queued
 */
export interface OfflineAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of the action (e.g., 'create_confession', 'like_reply') */
  type: string;
  /** Payload data for the action */
  payload: Record<string, unknown>;
  /** Timestamp when the action was created */
  timestamp: number;
  /** Current retry count */
  retryCount: number;
  /** Maximum number of retries allowed */
  maxRetries: number;
  /** Timestamp for next retry attempt */
  nextAttempt?: number;
  /** Priority level for action processing (higher number = higher priority) */
  priority?: number;
  /** Whether this action requires network connectivity */
  requiresNetwork?: boolean;
  /** Error details from last failed attempt */
  lastError?: {
    message: string;
    code?: string;
    timestamp: number;
    isRetryable: boolean;
  };
  /** State reconciliation data for complex actions */
  reconciliation?: {
    /** Temporary local ID that needs to be replaced with server ID */
    tempId?: string;
    /** Target store to update when reconciled */
    targetStore?: string;
    /** Additional metadata for state updates */
    metadata?: Record<string, unknown>;
  };
}

/**
 * Interface for queued operations with callbacks
 */
export interface QueuedOperation<T = unknown> {
  /** The async operation to execute */
  action: () => Promise<T>;
  /** Callback for successful execution */
  onSuccess?: (result: T) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

class OfflineQueueManager {
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  private listeners: ((isOnline: boolean) => void)[] = [];
  private isOnline = true;
  private netInfoUnsubscribe: (() => void) | null = null;
  private scheduledTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly STORAGE_KEY = "offline_queue";
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000; // 1 second base delay
  private readonly MAX_DELAY_MS = 30000; // 30 seconds max delay

  // Action-specific configuration
  private readonly ACTION_CONFIG = {
    [OFFLINE_ACTIONS.CREATE_CONFESSION]: { maxRetries: 5, priority: 10 },
    [OFFLINE_ACTIONS.LIKE_CONFESSION]: { maxRetries: 3, priority: 5 },
    [OFFLINE_ACTIONS.UNLIKE_CONFESSION]: { maxRetries: 3, priority: 5 },
    [OFFLINE_ACTIONS.SAVE_CONFESSION]: { maxRetries: 3, priority: 4 },
    [OFFLINE_ACTIONS.UNSAVE_CONFESSION]: { maxRetries: 3, priority: 4 },
    [OFFLINE_ACTIONS.DELETE_CONFESSION]: { maxRetries: 4, priority: 8 },
    [OFFLINE_ACTIONS.CREATE_REPLY]: { maxRetries: 5, priority: 7 },
    [OFFLINE_ACTIONS.DELETE_REPLY]: { maxRetries: 4, priority: 6 },
    [OFFLINE_ACTIONS.LIKE_REPLY]: { maxRetries: 3, priority: 3 },
    [OFFLINE_ACTIONS.UNLIKE_REPLY]: { maxRetries: 3, priority: 3 },
    [OFFLINE_ACTIONS.MARK_NOTIFICATION_READ]: { maxRetries: 2, priority: 1 },
  } as const;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Load persisted queue with error handling
      await this.loadQueue();
    } catch (error) {
      console.error("Failed to load offline queue during initialization:", error);
      // Ensure safe fallback state
      this.queue = [];
    }

    try {
      // Set up network monitoring with error handling
      this.setupNetworkMonitoring();

      // Check initial network state
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      // Only process queue if initialization was successful and we're online
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    } catch (error) {
      console.error("Failed to setup network monitoring during initialization:", error);
      // Set safe defaults
      this.isOnline = false;
    }
  }

  private setupNetworkMonitoring() {
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Notify listeners
      this.listeners.forEach((listener) => listener(this.isOnline));

      // Process queue when coming back online
      if (!wasOnline && this.isOnline && this.queue.length > 0) {
        if (__DEV__) {
          console.log("📶 Network restored, processing offline queue...");
        }
        this.processQueue();
      }
    });
  }

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        if (__DEV__) {
          console.log(`📱 Loaded ${this.queue.length} offline actions from storage`);
        }
      }
    } catch (error) {
      console.error("Failed to load offline queue:", error);
      this.queue = [];
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }

  /**
   * Add an action to the offline queue
   */
  async enqueue(
    type: string,
    payload: any,
    options?: {
      maxRetries?: number;
      priority?: number;
      requiresNetwork?: boolean;
      reconciliation?: {
        tempId?: string;
        targetStore?: string;
        metadata?: Record<string, unknown>;
      };
    },
  ): Promise<string> {
    const action: OfflineAction = {
      id: generateUniqueId(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.getDefaultMaxRetries(type),
      priority: options?.priority ?? this.getDefaultPriority(type),
      requiresNetwork: options?.requiresNetwork ?? true,
      reconciliation: options?.reconciliation,
    };

    // Insert action in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(
      (existingAction) => (existingAction.priority || 0) < (action.priority || 0),
    );

    if (insertIndex === -1) {
      this.queue.push(action);
    } else {
      this.queue.splice(insertIndex, 0, action);
    }

    // Limit queue size and handle overflow
    if (this.queue.length > this.MAX_QUEUE_SIZE) {
      const droppedCount = this.queue.length - this.MAX_QUEUE_SIZE;
      const droppedActions = this.queue.slice(0, droppedCount);

      // Log warning about dropped actions
      if (__DEV__) {
        console.warn(`⚠️ Queue overflow: dropping ${droppedCount} oldest actions`);
        droppedActions.forEach((droppedAction) => {
          console.warn(
            `  - Dropped: ${droppedAction.type} (id: ${droppedAction.id}, age: ${Date.now() - droppedAction.timestamp}ms)`,
          );
        });
      }

      // Trim queue to max size
      this.queue = this.queue.slice(-this.MAX_QUEUE_SIZE);
    }

    await this.saveQueue();

    if (__DEV__) {
      console.log(`📝 Queued offline action: ${type}`, payload);
    }

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  /**
   * Process all queued actions
   */
  private async processQueue() {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const now = Date.now();

    // Filter actions that are ready to be processed (past their nextAttempt time)
    const actionsToProcess = this.queue.filter((action) => !action.nextAttempt || action.nextAttempt <= now);

    if (__DEV__) {
      console.log(
        `🔄 Processing ${actionsToProcess.length} offline actions (${this.queue.length - actionsToProcess.length} delayed)...`,
      );
    }

    for (const action of actionsToProcess) {
      try {
        await this.processAction(action);
        // Remove successful action from queue
        this.queue = this.queue.filter((a) => a.id !== action.id);
      } catch (error) {
        // Enhanced error handling with retry logic
        const actionIndex = this.queue.findIndex((a) => a.id === action.id);
        if (actionIndex !== -1) {
          const isRetryable = this.isRetryableError(error);

          // Update action with error details
          this.queue[actionIndex].lastError = {
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
            isRetryable,
          };

          this.queue[actionIndex].retryCount++;

          // Remove if error is not retryable or max retries exceeded
          if (!isRetryable || this.queue[actionIndex].retryCount >= action.maxRetries) {
            if (__DEV__) {
              const reason = !isRetryable ? "non-retryable error" : "max retries exceeded";
              console.warn(`❌ Removing action ${action.type} due to ${reason}:`, error);
            }
            this.queue.splice(actionIndex, 1);
          } else {
            // Calculate intelligent backoff delay based on error type and priority
            let baseDelay = this.BASE_DELAY_MS;

            // Shorter delays for high-priority actions
            if (action.priority && action.priority > 7) {
              baseDelay = Math.max(500, this.BASE_DELAY_MS / 2);
            }

            // Longer delays for network-related errors
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
            if (errorMessage.includes("network") || errorMessage.includes("connection")) {
              baseDelay = this.BASE_DELAY_MS * 2;
            }

            const exponentialDelay = baseDelay * Math.pow(2, this.queue[actionIndex].retryCount - 1);
            const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
            const delay = Math.min(exponentialDelay + jitter, this.MAX_DELAY_MS);

            this.queue[actionIndex].nextAttempt = Date.now() + delay;

            if (__DEV__) {
              console.log(
                `⏰ Scheduling retry for ${action.type} in ${Math.round(delay)}ms (attempt ${this.queue[actionIndex].retryCount}/${action.maxRetries})`,
              );
            }
          }
        }
      }
    }

    await this.saveQueue();
    this.isProcessing = false;

    // Schedule next run for delayed actions
    this.scheduleNextRun();

    if (__DEV__) {
      console.log(`✅ Offline queue processing complete. ${this.queue.length} actions remaining.`);
    }
  }

  /**
   * Process a single action based on its type
   */
  /**
   * Get default max retries for action type
   */
  private getDefaultMaxRetries(type: string): number {
    return (this.ACTION_CONFIG as any)[type]?.maxRetries ?? this.DEFAULT_MAX_RETRIES;
  }

  /**
   * Get default priority for action type
   */
  private getDefaultPriority(type: string): number {
    return (this.ACTION_CONFIG as any)[type]?.priority ?? 1;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Non-retryable errors (validation, auth, etc.)
    const nonRetryablePatterns = [
      "invalid processing options",
      "unsupported video format",
      "video size must be less than",
      "video must be between",
      "please enter your confession",
      "too short",
      "too long",
      "video file is required",
      "user not authenticated",
      "unauthorized",
      "forbidden",
      "not found",
      "conflict",
      "duplicate",
      "unique constraint",
    ];

    if (nonRetryablePatterns.some((pattern) => lowerMessage.includes(pattern))) {
      return false;
    }

    // Retryable errors (network, temporary server issues)
    const retryablePatterns = [
      "network",
      "connection",
      "timeout",
      "server error",
      "internal server error",
      "bad gateway",
      "service unavailable",
      "gateway timeout",
      "temporarily unavailable",
    ];

    return (
      retryablePatterns.some((pattern) => lowerMessage.includes(pattern)) ||
      (lowerMessage.includes("5") && lowerMessage.includes("error"))
    ); // 5xx errors
  }

  /**
   * Schedule next run based on the earliest nextAttempt time
   */
  private scheduleNextRun(): void {
    // Clear existing timer
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    // Find the earliest nextAttempt time
    const now = Date.now();
    let earliestAttempt = Infinity;

    for (const action of this.queue) {
      if (action.nextAttempt && action.nextAttempt > now) {
        earliestAttempt = Math.min(earliestAttempt, action.nextAttempt);
      }
    }

    if (earliestAttempt === Infinity || earliestAttempt <= now) {
      return; // No future attempts or all are ready now
    }

    const delay = earliestAttempt - now;
    if (__DEV__) {
      console.log(`📅 Scheduling next queue run in ${Math.round(delay)}ms`);
    }

    this.scheduledTimer = setTimeout(() => {
      this.scheduledTimer = null;
      this.processQueue();
    }, delay);
  }

  private async processAction(action: OfflineAction): Promise<void> {
    // Import stores dynamically to avoid circular dependencies
    const { processOfflineAction } = await import("./offlineActionProcessor");
    await processOfflineAction(action);
  }

  /**
   * Register a network status listener
   */
  onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();

    if (__DEV__) {
      console.log("🗑️ Offline queue cleared");
    }
  }

  /**
   * Get queue contents for debugging
   */
  getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }
    this.listeners = [];
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();
