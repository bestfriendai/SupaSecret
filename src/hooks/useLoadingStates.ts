import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
  lastUpdated: number | null;
}

export interface LoadingStates {
  [key: string]: LoadingState;
}

export interface LoadingOptions {
  key: string;
  minLoadingTime?: number; // Minimum time to show loading state (prevents flashing)
  timeout?: number; // Timeout for the operation
  retryCount?: number; // Number of automatic retries
  retryDelay?: number; // Delay between retries in ms
}

/**
 * Hook for managing consistent loading states across the application
 * Provides unified loading, error, and success states with retry logic
 */
export const useLoadingStates = () => {
  const [states, setStates] = useState<LoadingStates>({});
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retriesRef = useRef<Map<string, number>>(new Map());
  const callTokensRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);

  // Initialize a loading state
  const initializeState = useCallback((key: string, initialData?: any) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: false,
        error: null,
        data: initialData || null,
        lastUpdated: null,
      },
    }));
  }, []);

  // Set loading state
  const setLoading = useCallback((key: string, isLoading: boolean) => {
    if (!isMountedRef.current) return;

    setStates(prev => {
      const existing = prev[key] ?? { isLoading: false, error: null, data: null, lastUpdated: null };
      return {
        ...prev,
        [key]: {
          ...existing,
          isLoading,
          error: isLoading ? null : existing.error,
        },
      };
    });
  }, []);

  // Set error state
  const setError = useCallback((key: string, error: string | null) => {
    if (!isMountedRef.current) return;

    setStates(prev => {
      const existing = prev[key] ?? { isLoading: false, error: null, data: null, lastUpdated: null };
      return {
        ...prev,
        [key]: {
          ...existing,
          isLoading: false,
          error,
        },
      };
    });
  }, []);

  // Set success state with data
  const setSuccess = useCallback((key: string, data: any) => {
    if (!isMountedRef.current) return;

    setStates(prev => {
      const existing = prev[key] ?? { isLoading: false, error: null, data: null, lastUpdated: null };
      return {
        ...prev,
        [key]: {
          ...existing,
          isLoading: false,
          error: null,
          data,
          lastUpdated: Date.now(),
        },
      };
    });

    // Clear retry count on success
    retriesRef.current.delete(key);
  }, []);

  // Execute an async operation with loading state management
  const executeWithLoading = useCallback(async <T>(
    options: LoadingOptions,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    const { key, minLoadingTime = 300, timeout = 30000, retryCount = 0, retryDelay = 1000 } = options;

    // Generate call token to prevent race conditions
    const currentToken = (callTokensRef.current.get(key) || 0) + 1;
    callTokensRef.current.set(key, currentToken);

    const startTime = Date.now();
    setLoading(key, true);

    // Clear any existing timeout
    const existingTimeout = timeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, timeout);
        timeoutsRef.current.set(key, timeoutId);
      });

      // Execute operation with timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Clear timeout
      const timeoutId = timeoutsRef.current.get(key);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutsRef.current.delete(key);
      }

      // Ensure minimum loading time
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      // Only update state if this is still the latest call and component is mounted
      if (callTokensRef.current.get(key) === currentToken && isMountedRef.current) {
        setSuccess(key, result);
      }
      return result;
    } catch (error) {
      // Clear timeout
      const timeoutId = timeoutsRef.current.get(key);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutsRef.current.delete(key);
      }

      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      // Handle retries
      const currentRetries = retriesRef.current.get(key) || 0;
      if (currentRetries < retryCount) {
        retriesRef.current.set(key, currentRetries + 1);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Retry the operation
        return executeWithLoading(options, operation);
      }

      // Ensure minimum loading time even for errors
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      // Only update state if this is still the latest call and component is mounted
      if (callTokensRef.current.get(key) === currentToken && isMountedRef.current) {
        setError(key, errorMessage);
      }
      return null;
    }
  }, [states, initializeState, setLoading, setSuccess, setError]);

  // Retry a failed operation
  const retry = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>,
    options?: Partial<LoadingOptions>
  ): Promise<T | null> => {
    // Reset retry count
    retriesRef.current.delete(key);
    
    return executeWithLoading(
      { key, ...options },
      operation
    );
  }, [executeWithLoading]);

  // Clear a specific state
  const clearState = useCallback((key: string) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
    
    // Clear any associated timeouts and retries
    const timeoutId = timeoutsRef.current.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(key);
    }
    retriesRef.current.delete(key);
  }, []);

  // Clear all states
  const clearAllStates = useCallback(() => {
    setStates({});
    
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    retriesRef.current.clear();
  }, []);

  // Get state for a specific key
  const getState = useCallback((key: string): LoadingState => {
    return states[key] || {
      isLoading: false,
      error: null,
      data: null,
      lastUpdated: null,
    };
  }, [states]);

  // Check if any state is loading
  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(state => state.isLoading);
  }, [states]);

  // Get all errors
  const getAllErrors = useCallback(() => {
    return Object.entries(states)
      .filter(([_, state]) => state.error)
      .map(([key, state]) => ({ key, error: state.error }));
  }, [states]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
      callTokensRef.current.clear();
    };
  }, []);

  return {
    states,
    initializeState,
    setLoading,
    setError,
    setSuccess,
    executeWithLoading,
    retry,
    clearState,
    clearAllStates,
    getState,
    isAnyLoading,
    getAllErrors,
  };
};

// Singleton instance for global loading states
let globalLoadingStates: ReturnType<typeof useLoadingStates> | null = null;

export const useGlobalLoadingStates = () => {
  if (!globalLoadingStates) {
    // This is a simplified version - in a real app you'd use a proper state management solution
    throw new Error('Global loading states not initialized. Use useLoadingStates() instead.');
  }
  return globalLoadingStates;
};
