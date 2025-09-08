/**
 * Offline Queue System
 * Manages offline actions and syncs them when connection is restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueuedOperation {
  action: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

class OfflineQueueManager {
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  private listeners: ((isOnline: boolean) => void)[] = [];
  private isOnline = true;
  private netInfoUnsubscribe: (() => void) | null = null;

  private readonly STORAGE_KEY = 'offline_queue';
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly DEFAULT_MAX_RETRIES = 3;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load persisted queue
    await this.loadQueue();
    
    // Set up network monitoring
    this.setupNetworkMonitoring();
    
    // Check initial network state
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;
    
    if (this.isOnline && this.queue.length > 0) {
      this.processQueue();
    }
  }

  private setupNetworkMonitoring() {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));
      
      // Process queue when coming back online
      if (!wasOnline && this.isOnline && this.queue.length > 0) {
        if (__DEV__) {
          console.log('📶 Network restored, processing offline queue...');
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
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add an action to the offline queue
   */
  async enqueue(
    type: string,
    payload: any,
    maxRetries: number = this.DEFAULT_MAX_RETRIES
  ): Promise<string> {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.queue.push(action);
    
    // Limit queue size
    if (this.queue.length > this.MAX_QUEUE_SIZE) {
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
    const actionsToProcess = [...this.queue];
    
    if (__DEV__) {
      console.log(`🔄 Processing ${actionsToProcess.length} offline actions...`);
    }

    for (const action of actionsToProcess) {
      try {
        await this.processAction(action);
        // Remove successful action from queue
        this.queue = this.queue.filter(a => a.id !== action.id);
      } catch (error) {
        // Increment retry count
        const actionIndex = this.queue.findIndex(a => a.id === action.id);
        if (actionIndex !== -1) {
          this.queue[actionIndex].retryCount++;
          
          // Remove if max retries exceeded
          if (this.queue[actionIndex].retryCount >= action.maxRetries) {
            if (__DEV__) {
              console.warn(`❌ Max retries exceeded for action: ${action.type}`, error);
            }
            this.queue.splice(actionIndex, 1);
          }
        }
      }
    }

    await this.saveQueue();
    this.isProcessing = false;

    if (__DEV__) {
      console.log(`✅ Offline queue processing complete. ${this.queue.length} actions remaining.`);
    }
  }

  /**
   * Process a single action based on its type
   */
  private async processAction(action: OfflineAction): Promise<void> {
    // Import stores dynamically to avoid circular dependencies
    const { processOfflineAction } = await import('./offlineActionProcessor');
    await processOfflineAction(action);
  }

  /**
   * Register a network status listener
   */
  onNetworkChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
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
      console.log('🗑️ Offline queue cleared');
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
    this.listeners = [];
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

// Action types for different operations
export const OFFLINE_ACTIONS = {
  LIKE_CONFESSION: 'LIKE_CONFESSION',
  UNLIKE_CONFESSION: 'UNLIKE_CONFESSION',
  SAVE_CONFESSION: 'SAVE_CONFESSION',
  UNSAVE_CONFESSION: 'UNSAVE_CONFESSION',
  DELETE_CONFESSION: 'DELETE_CONFESSION',
  CREATE_REPLY: 'CREATE_REPLY',
  DELETE_REPLY: 'DELETE_REPLY',
  LIKE_REPLY: 'LIKE_REPLY',
  UNLIKE_REPLY: 'UNLIKE_REPLY',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
} as const;

export type OfflineActionType = typeof OFFLINE_ACTIONS[keyof typeof OFFLINE_ACTIONS];
