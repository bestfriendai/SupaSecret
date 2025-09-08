/**
 * Hook for offline queue integration
 * Provides easy access to offline queue functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { offlineQueue, OfflineActionType } from '../utils/offlineQueue';

export interface UseOfflineQueueReturn {
  isOnline: boolean;
  queueSize: number;
  enqueueAction: (type: OfflineActionType, payload: any, maxRetries?: number) => Promise<string>;
  executeOrQueue: <T>(
    action: () => Promise<T>,
    fallbackType: OfflineActionType,
    fallbackPayload: any,
    maxRetries?: number
  ) => Promise<T | string>;
}

/**
 * Hook to manage offline queue operations
 */
export const useOfflineQueue = (): UseOfflineQueueReturn => {
  const [isOnline, setIsOnline] = useState(offlineQueue.getNetworkStatus());
  const [queueSize, setQueueSize] = useState(offlineQueue.getQueueSize());

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = offlineQueue.onNetworkChange((online) => {
      setIsOnline(online);
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

  const enqueueAction = useCallback(async (
    type: OfflineActionType,
    payload: any,
    maxRetries: number = 3
  ): Promise<string> => {
    return await offlineQueue.enqueue(type, payload, maxRetries);
  }, []);

  const executeOrQueue = useCallback(async <T>(
    action: () => Promise<T>,
    fallbackType: OfflineActionType,
    fallbackPayload: any,
    maxRetries: number = 3
  ): Promise<T | string> => {
    if (isOnline) {
      try {
        return await action();
      } catch (error) {
        // If action fails and we're online, still queue it for retry
        if (__DEV__) {
          console.warn('Online action failed, queuing for retry:', error);
        }
        return await enqueueAction(fallbackType, fallbackPayload, maxRetries);
      }
    } else {
      // Queue the action for later execution
      return await enqueueAction(fallbackType, fallbackPayload, maxRetries);
    }
  }, [isOnline, enqueueAction]);

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
