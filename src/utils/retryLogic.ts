/**
 * Retry logic utilities with exponential backoff
 * Provides robust error handling for transient network errors
 */

import { isRetryableSupabaseError } from "../types/supabaseError";
// Global retry event subscription for lightweight UX signals
export type RetryEventSource = "supabase" | "api" | "unknown";
export interface RetryEvent {
  source: RetryEventSource;
  attempt: number;
  delay: number;
  error: unknown;
}

const retryListeners = new Set<(e: RetryEvent) => void>();
export const subscribeRetryEvents = (listener: (e: RetryEvent) => void) => {
  retryListeners.add(listener);
  return () => retryListeners.delete(listener);
};
const emitRetryEvent = (event: RetryEvent) => {
  retryListeners.forEach((l) => {
    try {
      l(event);
    } catch {
      // ignore listener errors
    }
  });
};

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Jitter factor to add randomness (default: 0.1) */
  jitterFactor?: number;
  /** Function to determine if error should trigger retry */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback for retry attempts */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry condition - retries on network errors and 5xx status codes
 */
const defaultShouldRetry = (error: unknown, attempt: number): boolean => {
  if (attempt >= 3) return false;

  // Use Supabase error checking first
  if (isRetryableSupabaseError(error)) {
    return true;
  }

  // Retry on network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout") ||
      message.includes("connection")
    ) {
      return true;
    }
  }

  // Retry on HTTP 5xx errors
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as any).status;
    return status >= 500 && status < 600;
  }

  return false;
};

/**
 * Calculate delay with exponential backoff and jitter
 */
const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitterFactor: number,
): number => {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
};

/**
 * Sleep utility for delays
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async operation with exponential backoff
 */
export const withRetry = async <T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const _startTime = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if shouldn't retry
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        break;
      }

      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, jitterFactor);

      if (__DEV__) {
        console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`, error);
      }

      onRetry?.(error, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Retry with detailed result information
 */
export const withRetryResult = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> => {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const data = await withRetry(async () => {
      attempts++;
      return await operation();
    }, options);

    return {
      success: true,
      data,
      attempts,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts,
      totalTime: Date.now() - startTime,
    };
  }
};

/**
 * Create a retry wrapper for Supabase operations
 */
export const createSupabaseRetry = (options: RetryOptions = {}) => {
  const onRetryCombined = (error: unknown, attempt: number, delay: number) => {
    emitRetryEvent({ source: "supabase", attempt, delay, error });
    options.onRetry?.(error, attempt, delay);
  };

  const supabaseOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    shouldRetry: (error, attempt) => {
      // Custom Supabase retry logic
      if (attempt >= 3) return false;

      if (typeof error === "object" && error !== null) {
        const errorObj = error as any;

        // Retry on connection errors
        if (
          errorObj.message?.includes("Failed to fetch") ||
          errorObj.message?.includes("NetworkError") ||
          errorObj.message?.includes("timeout")
        ) {
          return true;
        }

        // Retry on specific Supabase error codes
        if (errorObj.code && ["PGRST301", "PGRST302", "08000", "08003", "08006"].includes(errorObj.code)) {
          return true;
        }

        // Retry on 5xx HTTP errors
        if (errorObj.status >= 500 && errorObj.status < 600) {
          return true;
        }
      }

      return false;
    },
    onRetry: onRetryCombined,
    ...options,
  };

  return <T>(operation: () => Promise<T>) => withRetry(operation, supabaseOptions);
};

/**
 * Create a retry wrapper for API calls
 */
export const createApiRetry = (options: RetryOptions = {}) => {
  const onRetryCombined = (error: unknown, attempt: number, delay: number) => {
    emitRetryEvent({ source: "api", attempt, delay, error });
    options.onRetry?.(error, attempt, delay);
  };

  const apiOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    shouldRetry: (error, attempt) => {
      if (attempt >= 3) return false;

      // Retry on network errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
          return true;
        }
      }

      // Retry on 5xx and some 4xx errors
      if (typeof error === "object" && error !== null && "status" in error) {
        const status = (error as any).status;
        return status >= 500 || status === 408 || status === 429;
      }

      return false;
    },
    onRetry: onRetryCombined,
    ...options,
  };

  return <T>(operation: () => Promise<T>) => withRetry(operation, apiOptions);
};
