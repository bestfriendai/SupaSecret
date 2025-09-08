import { useState, useCallback, useRef } from 'react';
import { useReplyStore } from '../state/replyStore';
import { isValidForDatabase } from '../utils/uuid';

/**
 * Optimized hook for loading replies that prevents N+1 query problems
 * by batching requests and only loading replies for visible items
 */
export const useOptimizedReplies = () => {
  const { loadReplies } = useReplyStore();
  const [loadedReplies, setLoadedReplies] = useState<Set<string>>(new Set());
  const loadingPromises = useRef<Map<string, Promise<void>>>(new Map());

  const loadRepliesForVisibleItems = useCallback(async (visibleIds: string[]) => {
    // Filter out already loaded, currently loading items, or sample data
    const newIds = visibleIds.filter(id =>
      !loadedReplies.has(id) &&
      !loadingPromises.current.has(id) &&
      isValidForDatabase(id) // Skip sample data with invalid UUIDs
    );

    if (newIds.length === 0) return;

    // Create loading promises for each new ID
    const promises = newIds.map(id => {
      const promise = loadReplies(id)
        .then(() => {
          setLoadedReplies(prev => new Set([...prev, id]));
        })
        .catch(error => {
          if (__DEV__) {
            console.error(`Failed to load replies for confession ${id}:`, error);
          }
        })
        .finally(() => {
          loadingPromises.current.delete(id);
        });

      loadingPromises.current.set(id, promise);
      return promise;
    });

    // Wait for all promises to complete (but don't throw on individual failures)
    await Promise.allSettled(promises);
  }, [loadReplies, loadedReplies]);

  const preloadRepliesForConfession = useCallback(async (confessionId: string) => {
    // Check if it's valid for database operations (skip sample data)
    if (!isValidForDatabase(confessionId)) {
      return; // Skip sample data
    }

    if (loadedReplies.has(confessionId) || loadingPromises.current.has(confessionId)) {
      return;
    }

    const promise = loadReplies(confessionId)
      .then(() => {
        setLoadedReplies(prev => new Set([...prev, confessionId]));
      })
      .catch(error => {
        if (__DEV__) {
          console.error(`Failed to preload replies for confession ${confessionId}:`, error);
        }
      })
      .finally(() => {
        loadingPromises.current.delete(confessionId);
      });

    loadingPromises.current.set(confessionId, promise);
    await promise;
  }, [loadReplies, loadedReplies]);

  const clearLoadedReplies = useCallback(() => {
    setLoadedReplies(new Set());
    loadingPromises.current.clear();
  }, []);

  return {
    loadRepliesForVisibleItems,
    preloadRepliesForConfession,
    clearLoadedReplies,
    loadedReplies,
  };
};
