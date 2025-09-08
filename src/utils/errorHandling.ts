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
    const supabaseMessage = translateSupabaseError(code);
    message = customMessage || supabaseMessage || getSupabaseErrorMessage(error);
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
    if (error.name === "NetworkError" || 
        error.message.toLowerCase().includes("network") ||
        error.message.toLowerCase().includes("fetch") ||
        error.message.toLowerCase().includes("connection") ||
        error.message.toLowerCase().includes("unreachable") ||
        (error as any).code === "NETWORK_ERROR") {
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
 * Enhanced Supabase error code translations
 */
export function translateSupabaseError(code?: string): string | undefined {
  switch (code) {
    case 'invalid_login_credentials':
      return 'Incorrect email or password. Please try again.';
    case 'user_not_found':
      return 'No account found with this email address.';
    case 'user_already_exists':
      return 'An account with this email already exists.';
    case 'invalid_email':
      return 'Please enter a valid email address.';
    case 'weak_password':
      return 'Password must be at least 6 characters long.';
    case 'network_error':
      return 'Network error. Please check your connection and try again.';
    case 'email_not_confirmed':
      return 'Please verify your email address before signing in.';
    case 'too_many_requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'signup_disabled':
      return 'New registrations are temporarily disabled.';
    case 'invalid_credentials':
      return 'Invalid email or password. Please check your credentials.';
    case 'email_address_invalid':
      return 'Please enter a valid email address.';
    case 'password_too_short':
      return 'Password must be at least 6 characters long.';
    case 'email_address_not_authorized':
      return 'This email address is not authorized to sign up.';
    case 'captcha_failed':
      return 'Security verification failed. Please try again.';
    case 'over_email_send_rate_limit':
      return 'Too many emails sent. Please wait before requesting another.';
    case 'email_not_confirmed':
      return 'Please check your email and verify your account first.';
    case 'invalid_request':
      return 'Invalid request. Please check your information and try again.';
    case 'session_not_found':
      return 'Your session has expired. Please sign in again.';
    case 'refresh_token_not_found':
      return 'Session expired. Please sign in again.';
    case 'invalid_refresh_token':
      return 'Session expired. Please sign in again.';
    default:
      return undefined;
  }
}

/**
 * User-friendly error messages for common error codes
 */
export const getUserFriendlyMessage = (error: StandardError): string => {
  // First try to get Supabase-specific error message
  const supabaseMessage = translateSupabaseError(error.code);
  if (supabaseMessage) {
    return supabaseMessage;
  }

  // Fall back to generic error codes
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
    case "INVALID_CREDENTIALS":
      return "Invalid email or password. Please check your credentials and try again.";
    case "EMAIL_NOT_CONFIRMED":
      return "Please check your email and click the confirmation link before signing in.";
    case "TOO_MANY_REQUESTS":
      return "Too many sign-in attempts. Please wait a moment and try again.";
    case "USER_EXISTS":
      return "An account with this email already exists. Please sign in instead.";
    case "WEAK_PASSWORD":
      return "Password must be at least 6 characters long.";
    case "INVALID_EMAIL":
      return "Please enter a valid email address.";
    case "PASSWORD_MISMATCH":
      return "Passwords do not match.";
    case "MISSING_PASSWORD":
      return "Please enter your password.";
    case "SIGNIN_ERROR":
      return "Sign in failed. Please try again.";
    default:
      return error.message;
  }
};
