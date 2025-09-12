/**
 * Debouncing utilities for user interactions
 * Prevents excessive API calls and improves performance
 */

import * as React from "react";
import { useCallback, useRef, useEffect } from "react";
import { logger } from "./logger";

/**
 * Generic debounce function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  // Use ReturnType<typeof setTimeout> to be compatible across environments
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay) as ReturnType<typeof setTimeout>;
  };
}

/**
 * Hook for debounced callbacks
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = [],
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Keep a stable debounced function in a ref so that callers can use a stable reference
  const debouncedRef = useRef<(...args: Parameters<T>) => void>(() => {});

  useEffect(() => {
    debouncedRef.current = debounce((...args: Parameters<T>) => callbackRef.current(...args), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);

  return useCallback((...args: Parameters<T>) => debouncedRef.current(...args), []);
}

/**
 * Hook for debounced value updates
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced refresh hook for pull-to-refresh functionality
 */
export function useDebouncedRefresh(refreshFunction: () => Promise<void> | void, delay: number = 1000) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const lastRefreshTime = useRef(0);

  const debouncedRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;

    // Prevent refresh if called too recently
    if (timeSinceLastRefresh < delay) {
      return;
    }

    setIsRefreshing(true);
    lastRefreshTime.current = now;

    try {
      await refreshFunction();
    } catch (error) {
      logger.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFunction, delay]);

  return {
    isRefreshing,
    refresh: debouncedRefresh,
  };
}

/**
 * Debounced search hook
 */
export function useDebouncedSearch(searchFunction: (query: string) => Promise<void> | void, delay: number = 300) {
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Use the stable debounced hook to avoid recreating the debounced function
  const debouncedSearch = useDebounce(
    async (query: string) => {
      if (!query.trim()) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        await searchFunction(query);
      } catch (error) {
        logger.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    },
    delay,
    [searchFunction],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch],
  );

  return {
    searchQuery,
    isSearching,
    handleSearchChange,
    setSearchQuery,
  };
}

/**
 * useDebouncedSearch
 *
 * A hook that manages a search input state with a debounced side-effect.
 *
 * Inputs:
 * - searchFunction: async function to call with the query when typing stops
 * - delay: debounce delay in ms
 *
 * Outputs:
 * - searchQuery: current input string
 * - isSearching: boolean showing whether the debounced search is executing
 * - handleSearchChange: update function to call from onChangeText
 * - setSearchQuery: immediate setter for cases where caller needs to set programmatically
 *
 * Error handling: errors from searchFunction are logged via the centralized logger.
 */

/**
 * Debounced like toggle to prevent rapid clicking
 */
export function useDebouncedLikeToggle(likeFunction: (id: string) => Promise<void> | void, delay: number = 500) {
  const pendingLikes = useRef(new Set<string>());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debouncedToggleLike = useCallback(
    async (id: string) => {
      // Prevent multiple rapid clicks on the same item
      if (pendingLikes.current.has(id)) {
        return;
      }

      pendingLikes.current.add(id);

      try {
        await likeFunction(id);
      } catch (error) {
        console.error("Like toggle failed:", error);
      } finally {
        // Remove from pending after delay to prevent rapid clicking
        const timeoutId = setTimeout(() => {
          pendingLikes.current.delete(id);
          timeoutRefs.current.delete(id);
        }, delay) as ReturnType<typeof setTimeout>;

        // Store timeout reference for cleanup
        timeoutRefs.current.set(id, timeoutId);
      }
    },
    [likeFunction, delay],
  );

  // Cleanup on unmount
  useEffect(() => {
    const refs = timeoutRefs.current;
    return () => {
      // Copy refs to avoid mutation issues during cleanup
      const timeouts = Array.from(refs.values());
      timeouts.forEach((timeout) => clearTimeout(timeout));
      refs.clear();
    };
  }, []);

  return debouncedToggleLike;
}

/**
 * Debounced form submission
 */
export function useDebouncedSubmit<T>(submitFunction: (data: T) => Promise<void> | void, delay: number = 1000) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const lastSubmitTime = useRef(0);

  const debouncedSubmit = useCallback(
    async (data: T) => {
      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitTime.current;

      // Prevent submission if called too recently
      if (timeSinceLastSubmit < delay || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      lastSubmitTime.current = now;

      try {
        await submitFunction(data);
      } catch (error) {
        console.error("Submit failed:", error);
        throw error; // Re-throw to allow error handling in component
      } finally {
        setIsSubmitting(false);
      }
    },
    [submitFunction, delay, isSubmitting],
  );

  return {
    isSubmitting,
    submit: debouncedSubmit,
  };
}
