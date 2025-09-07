/**
 * Standardized error handling utilities for Zustand stores
 * Provides consistent error processing, logging, and state management
 */

import {
  isSupabaseError,
  getSupabaseErrorCode,
  getSupabaseErrorMessage,
  isRetryableSupabaseError,
  logSupabaseError,
  type SupabaseError
} from '../types/supabaseError';

export interface StandardError {
  code: string;
  message: string;
  timestamp: number;
  context?: string;
  isRetryable?: boolean;
  originalError?: unknown;
}

export interface ErrorHandlingOptions {
  /** Whether to throw the error after setting state (default: false) */
  shouldThrow?: boolean;
  /** Additional context for debugging */
  context?: string;
  /** Whether to log the error in development (default: true) */
  shouldLog?: boolean;
  /** Custom error message override */
  customMessage?: string;
}

/**
 * Processes an error into a standardized format
 */
export const processError = (
  error: unknown,
  context?: string,
  customMessage?: string
): StandardError => {
  let code = "UNKNOWN_ERROR";
  let message = customMessage || "An unknown error occurred";
  let isRetryable = false;

  // Handle Supabase errors first
  if (isSupabaseError(error)) {
    code = getSupabaseErrorCode(error) || "SUPABASE_ERROR";
    message = customMessage || getSupabaseErrorMessage(error);
    isRetryable = isRetryableSupabaseError(error);

    // Log Supabase error with context
    if (context) {
      logSupabaseError(error, context);
    }
  } else if (error instanceof Error) {
    message = customMessage || error.message;

    // Handle auth errors
    if (error.name === "AuthError") {
      code = "AUTH_ERROR";
    }

    // Handle network errors
    if (error.message.includes("fetch") || error.message.includes("NetworkError")) {
      code = "NETWORK_ERROR";
      message = customMessage || "Network connection failed. Please check your internet connection.";
      isRetryable = true;
    }

    // Handle timeout errors
    if (error.message.includes("timeout")) {
      code = "TIMEOUT_ERROR";
      message = customMessage || "Request timed out. Please try again.";
      isRetryable = true;
    }
  }

  return {
    code,
    message,
    timestamp: Date.now(),
    context,
    isRetryable,
    originalError: error,
  };
};

/**
 * Standardized error handler for Zustand stores
 * Sets error state and optionally throws based on configuration
 */
export const handleStoreError = <T extends { error: StandardError | null; isLoading?: boolean }>(
  setState: (partial: Partial<T>) => void,
  error: unknown,
  options: ErrorHandlingOptions = {}
): never | void => {
  const {
    shouldThrow = false,
    context,
    shouldLog = true,
    customMessage,
  } = options;

  const processedError = processError(error, context, customMessage);

  // Log error in development
  if (__DEV__ && shouldLog) {
    console.error(`[Store Error] ${context || "Unknown context"}:`, {
      code: processedError.code,
      message: processedError.message,
      originalError: error,
    });
  }

  // Set error state
  setState({
    error: processedError,
    isLoading: false,
  } as Partial<T>);

  // Throw if requested
  if (shouldThrow) {
    throw error;
  }
};

/**
 * Clears error state in a standardized way
 */
export const clearStoreError = <T extends { error: StandardError | null }>(
  setState: (partial: Partial<T>) => void
): void => {
  setState({ error: null } as Partial<T>);
};

/**
 * Wraps async store operations with standardized error handling
 */
export const withErrorHandling = async <T extends { error: StandardError | null; isLoading?: boolean }>(
  setState: (partial: Partial<T>) => void,
  operation: () => Promise<void>,
  options: ErrorHandlingOptions = {}
): Promise<void> => {
  try {
    // Clear previous errors and set loading
    setState({ error: null, isLoading: true } as Partial<T>);
    
    await operation();
    
    // Clear loading state on success
    setState({ isLoading: false } as Partial<T>);
  } catch (error) {
    handleStoreError(setState, error, options);
  }
};

/**
 * User-friendly error messages for common error codes
 */
export const getUserFriendlyMessage = (error: StandardError): string => {
  switch (error.code) {
    case "NETWORK_ERROR":
      return "Please check your internet connection and try again.";
    case "TIMEOUT_ERROR":
      return "The request took too long. Please try again.";
    case "AUTH_ERROR":
      return "Authentication failed. Please sign in again.";
    case "PERMISSION_DENIED":
      return "You don't have permission to perform this action.";
    case "NOT_FOUND":
      return "The requested item could not be found.";
    case "VALIDATION_ERROR":
      return "Please check your input and try again.";
    case "RATE_LIMIT_EXCEEDED":
      return "Too many requests. Please wait a moment and try again.";
    default:
      return error.message;
  }
};
