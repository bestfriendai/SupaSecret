/**
 * Supabase error types and utilities
 * Provides proper typing for Supabase errors throughout the application
 */

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface PostgrestError extends SupabaseError {
  code: string;
  details: string;
  hint: string;
}

export interface AuthError extends SupabaseError {
  status?: number;
  name?: string;
}

export interface StorageError extends SupabaseError {
  statusCode?: string;
}

export interface RealtimeError extends SupabaseError {
  type?: string;
}

// Common Supabase error codes
export const SUPABASE_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: "invalid_credentials",
  USER_NOT_FOUND: "user_not_found",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  SIGNUP_DISABLED: "signup_disabled",
  WEAK_PASSWORD: "weak_password",

  // Database errors
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",

  // Connection errors
  CONNECTION_FAILURE: "08000",
  CONNECTION_EXCEPTION: "08003",
  CONNECTION_DOES_NOT_EXIST: "08006",

  // Permission errors
  INSUFFICIENT_PRIVILEGE: "42501",
  PERMISSION_DENIED: "PGRST301",

  // Rate limiting
  TOO_MANY_REQUESTS: "PGRST302",

  // Storage errors
  OBJECT_NOT_FOUND: "object_not_found",
  BUCKET_NOT_FOUND: "bucket_not_found",
  INVALID_BUCKET_NAME: "invalid_bucket_name",

  // Generic errors
  INTERNAL_ERROR: "50000",
  NETWORK_ERROR: "network_error",
  TIMEOUT_ERROR: "timeout_error",
} as const;

export type SupabaseErrorCode = (typeof SUPABASE_ERROR_CODES)[keyof typeof SUPABASE_ERROR_CODES];

/**
 * Type guard to check if error is a Supabase error
 */
export const isSupabaseError = (error: unknown): error is SupabaseError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as SupabaseError).message === "string"
  );
};

/**
 * Type guard to check if error is a Postgrest error
 */
export const isPostgrestError = (error: unknown): error is PostgrestError => {
  return (
    isSupabaseError(error) &&
    "code" in error &&
    "details" in error &&
    "hint" in error &&
    typeof (error as PostgrestError).code === "string" &&
    typeof (error as PostgrestError).details === "string" &&
    typeof (error as PostgrestError).hint === "string"
  );
};

/**
 * Type guard to check if error is an Auth error
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return isSupabaseError(error) && ("status" in error || "name" in error);
};

/**
 * Type guard to check if error is a Storage error
 */
export const isStorageError = (error: unknown): error is StorageError => {
  return isSupabaseError(error) && "statusCode" in error;
};

/**
 * Extract error code from various Supabase error types
 */
export const getSupabaseErrorCode = (error: unknown): string | undefined => {
  if (isPostgrestError(error)) {
    return error.code;
  }

  if (isStorageError(error)) {
    return error.statusCode;
  }

  if (isSupabaseError(error) && "code" in error) {
    return (error as SupabaseError).code;
  }

  return undefined;
};

/**
 * Get user-friendly error message based on error code
 */
export const getSupabaseErrorMessage = (error: unknown): string => {
  const code = getSupabaseErrorCode(error);
  const defaultMessage = isSupabaseError(error) ? error.message : "An unknown error occurred";

  switch (code) {
    case SUPABASE_ERROR_CODES.INVALID_CREDENTIALS:
      return "Invalid email or password. Please check your credentials and try again.";

    case SUPABASE_ERROR_CODES.USER_NOT_FOUND:
      return "No account found with this email address.";

    case SUPABASE_ERROR_CODES.EMAIL_NOT_CONFIRMED:
      return "Please check your email and click the confirmation link before signing in.";

    case SUPABASE_ERROR_CODES.SIGNUP_DISABLED:
      return "Account registration is currently disabled.";

    case SUPABASE_ERROR_CODES.WEAK_PASSWORD:
      return "Password is too weak. Please choose a stronger password.";

    case SUPABASE_ERROR_CODES.UNIQUE_VIOLATION:
      return "This item already exists. Please try with different information.";

    case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return "Cannot complete this action due to related data constraints.";

    case SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION:
      return "Required information is missing. Please fill in all required fields.";

    case SUPABASE_ERROR_CODES.CONNECTION_FAILURE:
    case SUPABASE_ERROR_CODES.CONNECTION_EXCEPTION:
    case SUPABASE_ERROR_CODES.CONNECTION_DOES_NOT_EXIST:
      return "Connection failed. Please check your internet connection and try again.";

    case SUPABASE_ERROR_CODES.INSUFFICIENT_PRIVILEGE:
    case SUPABASE_ERROR_CODES.PERMISSION_DENIED:
      return "You do not have permission to perform this action.";

    case SUPABASE_ERROR_CODES.TOO_MANY_REQUESTS:
      return "Too many requests. Please wait a moment and try again.";

    case SUPABASE_ERROR_CODES.OBJECT_NOT_FOUND:
      return "The requested file could not be found.";

    case SUPABASE_ERROR_CODES.BUCKET_NOT_FOUND:
      return "Storage location not found.";

    case SUPABASE_ERROR_CODES.NETWORK_ERROR:
      return "Network error. Please check your internet connection.";

    case SUPABASE_ERROR_CODES.TIMEOUT_ERROR:
      return "Request timed out. Please try again.";

    default:
      return defaultMessage;
  }
};

/**
 * Check if error is retryable based on error code
 */
export const isRetryableSupabaseError = (error: unknown): boolean => {
  const code = getSupabaseErrorCode(error);

  const retryableCodes: SupabaseErrorCode[] = [
    SUPABASE_ERROR_CODES.CONNECTION_FAILURE,
    SUPABASE_ERROR_CODES.CONNECTION_EXCEPTION,
    SUPABASE_ERROR_CODES.CONNECTION_DOES_NOT_EXIST,
    SUPABASE_ERROR_CODES.TOO_MANY_REQUESTS,
    SUPABASE_ERROR_CODES.INTERNAL_ERROR,
    SUPABASE_ERROR_CODES.NETWORK_ERROR,
    SUPABASE_ERROR_CODES.TIMEOUT_ERROR,
  ];

  return code ? retryableCodes.includes(code as SupabaseErrorCode) : false;
};

/**
 * Create a standardized error object from Supabase error
 */
export const createStandardizedSupabaseError = (error: unknown) => {
  return {
    code: getSupabaseErrorCode(error) || "UNKNOWN_ERROR",
    message: getSupabaseErrorMessage(error),
    timestamp: Date.now(),
    context: "supabase",
    originalError: error,
    isRetryable: isRetryableSupabaseError(error),
  };
};

/**
 * Log Supabase error with proper context
 */
export const logSupabaseError = (error: unknown, context: string): void => {
  if (__DEV__) {
    const errorCode = getSupabaseErrorCode(error);
    const errorMessage = getSupabaseErrorMessage(error);

    console.error(`[Supabase Error] ${context}:`, {
      code: errorCode,
      message: errorMessage,
      isRetryable: isRetryableSupabaseError(error),
      originalError: error,
    });
  }
};
