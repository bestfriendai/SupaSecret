/**
 * API error types and utilities
 * Provides proper typing for API errors throughout the application
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  service: string;
  timestamp: number;
  isRetryable: boolean;
}

export interface AnthropicApiError extends ApiError {
  service: "anthropic";
  type?: string;
}

export interface OpenAIApiError extends ApiError {
  service: "openai";
  type?: string;
  param?: string;
}

export interface GrokApiError extends ApiError {
  service: "grok";
  type?: string;
  param?: string;
}

export interface ImageGenerationApiError extends ApiError {
  service: "image-generation";
}

export interface TranscriptionApiError extends ApiError {
  service: "transcription";
}

export type AnyApiError =
  | AnthropicApiError
  | OpenAIApiError
  | GrokApiError
  | ImageGenerationApiError
  | TranscriptionApiError;

// Common API error codes
export const API_ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: "invalid_api_key",
  API_KEY_NOT_FOUND: "api_key_not_found",
  UNAUTHORIZED: "unauthorized",

  // Rate limiting
  RATE_LIMITED: "rate_limited",
  TOO_MANY_REQUESTS: "too_many_requests",

  // Request errors
  INVALID_REQUEST: "invalid_request",
  MISSING_PARAMETER: "missing_parameter",
  INVALID_PARAMETER: "invalid_parameter",

  // Server errors
  INTERNAL_ERROR: "internal_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  TIMEOUT: "timeout",

  // Network errors
  NETWORK_ERROR: "network_error",
  CONNECTION_ERROR: "connection_error",

  // Content errors
  CONTENT_FILTERED: "content_filtered",
  CONTENT_POLICY_VIOLATION: "content_policy_violation",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Type guard to check if error is an API error
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "service" in error &&
    typeof (error as ApiError).message === "string" &&
    typeof (error as ApiError).service === "string"
  );
};

/**
 * Type guard to check if error is an Anthropic API error
 */
export const isAnthropicApiError = (error: unknown): error is AnthropicApiError => {
  return isApiError(error) && (error as ApiError).service === "anthropic";
};

/**
 * Type guard to check if error is an OpenAI API error
 */
export const isOpenAIApiError = (error: unknown): error is OpenAIApiError => {
  return isApiError(error) && (error as ApiError).service === "openai";
};

/**
 * Type guard to check if error is a Grok API error
 */
export const isGrokApiError = (error: unknown): error is GrokApiError => {
  return isApiError(error) && (error as ApiError).service === "grok";
};

/**
 * Type guard to check if error is an Image Generation API error
 */
export const isImageGenerationApiError = (error: unknown): error is ImageGenerationApiError => {
  return isApiError(error) && (error as ApiError).service === "image-generation";
};

/**
 * Type guard to check if error is a Transcription API error
 */
export const isTranscriptionApiError = (error: unknown): error is TranscriptionApiError => {
  return isApiError(error) && (error as ApiError).service === "transcription";
};

/**
 * Extract error code from various API error types
 */
export const getApiErrorCode = (error: unknown): string | undefined => {
  if (isApiError(error)) {
    return error.code;
  }
  return undefined;
};

/**
 * Get user-friendly error message based on error code
 */
export const getApiErrorMessage = (error: unknown): string => {
  const code = getApiErrorCode(error);
  const defaultMessage = isApiError(error) ? error.message : "An unknown API error occurred";

  switch (code) {
    case API_ERROR_CODES.INVALID_API_KEY:
    case API_ERROR_CODES.API_KEY_NOT_FOUND:
      return "API key is invalid or missing. Please check your configuration.";

    case API_ERROR_CODES.UNAUTHORIZED:
      return "Unauthorized access. Please check your API credentials.";

    case API_ERROR_CODES.RATE_LIMITED:
    case API_ERROR_CODES.TOO_MANY_REQUESTS:
      return "Too many requests. Please wait a moment and try again.";

    case API_ERROR_CODES.INVALID_REQUEST:
      return "Invalid request. Please check your input and try again.";

    case API_ERROR_CODES.MISSING_PARAMETER:
      return "Required parameter is missing. Please check your request.";

    case API_ERROR_CODES.INVALID_PARAMETER:
      return "Invalid parameter value. Please check your input.";

    case API_ERROR_CODES.INTERNAL_ERROR:
    case API_ERROR_CODES.SERVICE_UNAVAILABLE:
      return "Service is temporarily unavailable. Please try again later.";

    case API_ERROR_CODES.TIMEOUT:
      return "Request timed out. Please check your connection and try again.";

    case API_ERROR_CODES.NETWORK_ERROR:
    case API_ERROR_CODES.CONNECTION_ERROR:
      return "Network error. Please check your internet connection.";

    case API_ERROR_CODES.CONTENT_FILTERED:
    case API_ERROR_CODES.CONTENT_POLICY_VIOLATION:
      return "Content was filtered due to policy restrictions.";

    default:
      return defaultMessage;
  }
};

/**
 * Check if error is retryable based on error code
 */
export const isRetryableApiError = (error: unknown): boolean => {
  const code = getApiErrorCode(error);

  const retryableCodes: ApiErrorCode[] = [
    API_ERROR_CODES.RATE_LIMITED,
    API_ERROR_CODES.TOO_MANY_REQUESTS,
    API_ERROR_CODES.INTERNAL_ERROR,
    API_ERROR_CODES.SERVICE_UNAVAILABLE,
    API_ERROR_CODES.TIMEOUT,
    API_ERROR_CODES.NETWORK_ERROR,
    API_ERROR_CODES.CONNECTION_ERROR,
  ];

  return code ? retryableCodes.includes(code as ApiErrorCode) : false;
};

/**
 * Create a standardized API error object
 */
export const createApiError = (
  service: AnyApiError["service"],
  message: string,
  code?: string,
  status?: number,
  details?: unknown,
  isRetryable: boolean = false,
): AnyApiError => {
  const baseError: ApiError = {
    message,
    code,
    status,
    details,
    service,
    timestamp: Date.now(),
    isRetryable,
  };

  switch (service) {
    case "anthropic":
      return { ...baseError, service: "anthropic" } as AnthropicApiError;
    case "openai":
      return { ...baseError, service: "openai" } as OpenAIApiError;
    case "grok":
      return { ...baseError, service: "grok" } as GrokApiError;
    case "image-generation":
      return { ...baseError, service: "image-generation" } as ImageGenerationApiError;
    case "transcription":
      return { ...baseError, service: "transcription" } as TranscriptionApiError;
    default:
      return baseError as AnyApiError;
  }
};

/**
 * Log API error with proper context
 */
export const logApiError = (error: unknown, context: string): void => {
  if (process.env.NODE_ENV === "development") {
    const errorCode = getApiErrorCode(error);
    const errorMessage = getApiErrorMessage(error);
    const serviceName = isApiError(error) ? error.service : "unknown";

    console.error(`[API Error] ${context} (${serviceName}):`, {
      code: errorCode,
      message: errorMessage,
      isRetryable: isRetryableApiError(error),
      originalError: error,
    });
  }
};
