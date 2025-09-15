import { useCallback, useRef } from 'react';
import { useLoadingStates } from './useLoadingStates';
import { getUserFriendlyMessage, getScreenSpecificMessage, StandardError } from '../utils/errorHandling';

interface ScreenStatusOptions {
  screenName: string;
  loadingTimeout?: number;
  enableRetry?: boolean;
}

interface ScreenStatus {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;
  clearError: () => void;
  executeWithLoading: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: any) => void;
      errorContext?: string;
    }
  ) => Promise<T | null>;
  retry: () => void;
}

export const useScreenStatus = ({
  screenName,
  loadingTimeout = 30000,
  enableRetry = true,
}: ScreenStatusOptions): ScreenStatus => {
  const { getState, setLoading: setLoadingState, setError: setErrorState } = useLoadingStates();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastAsyncFnRef = useRef<(() => Promise<any>) | null>(null);
  const lastOptionsRef = useRef<any>(null);

  // Get the primary loading state for this screen
  const screenState = getState(`${screenName}_main`);
  const isLoading = screenState.isLoading;

  // Get the primary error for this screen
  const errorMessage = screenState.error;

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      setLoadingState(`${screenName}_main`, true);

      // Set timeout for long-running operations
      if (loadingTimeout > 0) {
        timeoutRef.current = setTimeout(() => {
          setLoadingState(`${screenName}_main`, false);
          setErrorState(
            `${screenName}_main`,
            'This operation is taking longer than expected. Please try again.'
          );
        }, loadingTimeout);
      }
    } else {
      setLoadingState(`${screenName}_main`, false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  }, [screenName, setLoadingState, setErrorState, loadingTimeout]);

  const setError = useCallback((error: any) => {
    if (!error) {
      setErrorState(`${screenName}_main`, null);
      return;
    }

    let errorMessage: string;

    // Convert error to StandardError format if needed
    const standardError: StandardError = {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || String(error),
      details: error?.details,
      statusCode: error?.statusCode,
    };

    // Get screen-specific error message
    errorMessage = getScreenSpecificMessage(standardError, screenName);

    // Fallback to general user-friendly message if no screen-specific message
    if (errorMessage === standardError.message) {
      errorMessage = getUserFriendlyMessage(standardError);
    }

    setErrorState(`${screenName}_main`, errorMessage);
  }, [screenName, setErrorState]);

  const clearErrorWrapper = useCallback(() => {
    setErrorState(`${screenName}_main`, null);
  }, [screenName, setErrorState]);

  const executeWithLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: any) => void;
      errorContext?: string;
    }
  ): Promise<T | null> => {
    // Store for retry functionality
    lastAsyncFnRef.current = asyncFn;
    lastOptionsRef.current = options;

    setLoading(true);
    clearErrorWrapper();

    try {
      const result = await asyncFn();
      setLoading(false);
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      setLoading(false);

      // Add context to error if provided
      const contextualError = options?.errorContext
        ? { ...(typeof error === 'object' && error !== null ? error : { message: String(error) }), context: options.errorContext }
        : error;

      setError(contextualError);
      options?.onError?.(error);

      if (__DEV__) {
        console.error(`[${screenName}] Error:`, error);
      }

      return null;
    }
  }, [screenName, setLoading, setError, clearErrorWrapper]);

  const retry = useCallback(() => {
    if (!enableRetry || !lastAsyncFnRef.current) {
      console.warn(`[${screenName}] Retry not available`);
      return;
    }

    executeWithLoading(lastAsyncFnRef.current, lastOptionsRef.current);
  }, [enableRetry, screenName, executeWithLoading]);

  return {
    isLoading,
    error: errorMessage,
    setLoading,
    setError,
    clearError: clearErrorWrapper,
    executeWithLoading,
    retry,
  };
};

// Helper hook for screens that need multiple loading states
export const useMultipleScreenStatus = (
  screenName: string,
  operations: string[]
): Record<string, ScreenStatus> => {
  const statuses: Record<string, ScreenStatus> = {};

  operations.forEach(operation => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    statuses[operation] = useScreenStatus({
      screenName: `${screenName}_${operation}`,
      enableRetry: true,
    });
  });

  return statuses;
};