/**
 * Hook for offline queue integration
 * Provides easy access to offline queue functionality
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { offlineQueue, OfflineActionType } from "../utils/offlineQueue";

/**
 * Return type for useOfflineQueue hook
 */
export interface UseOfflineQueueReturn {
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Current number of items in the offline queue */
  queueSize: number;
  /** Enqueue an action for offline execution */
  enqueueAction: (type: OfflineActionType, payload: Record<string, unknown>, maxRetries?: number) => Promise<string>;
  /** Execute an action or queue it if offline */
  executeOrQueue: <T>(
    action: () => Promise<T>,
    fallbackType: OfflineActionType,
    fallbackPayload: Record<string, unknown>,
    maxRetries?: number,
  ) => Promise<T | string>;
}

/**
 * Hook to manage offline queue operations
 */
export const useOfflineQueue = (): UseOfflineQueueReturn => {
  const [isOnline, setIsOnline] = useState(offlineQueue.getNetworkStatus());
  const [queueSize, setQueueSize] = useState(offlineQueue.getQueueSize());
  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = offlineQueue.onNetworkChange((online) => {
      setIsOnline(online);
      isOnlineRef.current = online; // Keep ref in sync
      setQueueSize(offlineQueue.getQueueSize());
    });

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineQueue.getQueueSize());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const enqueueAction = useCallback(
    async (type: OfflineActionType, payload: any, maxRetries: number = 3): Promise<string> => {
      return await offlineQueue.enqueue(type, payload, { maxRetries });
    },
    [],
  );

  const executeOrQueue = useCallback(
    async <T>(
      action: () => Promise<T>,
      fallbackType: OfflineActionType,
      fallbackPayload: any,
      maxRetries: number = 3,
    ): Promise<T | string> => {
      // Read current network status at execution time to avoid stale closure
      const currentlyOnline = offlineQueue.getNetworkStatus();

      if (currentlyOnline) {
        try {
          return await action();
        } catch (error) {
          // If action fails and we're online, still queue it for retry
          if (__DEV__) {
            console.warn("Online action failed, queuing for retry:", error);
          }
          return await enqueueAction(fallbackType, fallbackPayload, maxRetries);
        }
      } else {
        // Queue the action for later execution
        return await enqueueAction(fallbackType, fallbackPayload, maxRetries);
      }
    },
    [enqueueAction],
  );

  return {
    isOnline,
    queueSize,
    enqueueAction,
    executeOrQueue,
  };
};

/**
 * Hook for network status only
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(offlineQueue.getNetworkStatus());

  useEffect(() => {
    const unsubscribe = offlineQueue.onNetworkChange(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
};
