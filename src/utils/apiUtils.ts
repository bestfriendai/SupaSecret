/**
 * Common API service utilities
 * Provides shared functionality for all API services
 */

import {
  createApiError,
  isApiError,
  isRetryableApiError,
  logApiError,
  API_ERROR_CODES,
  AnyApiError,
} from "../types/apiError";
import { createApiRetry } from "./retryLogic";

/**
 * Validate that required environment variables are present
 */
export const validateEnvironmentVariables = (requiredVars: string[], serviceName: string): void => {
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    const error = createApiError(
      serviceName as AnyApiError["service"],
      `Missing required environment variables: ${missingVars.join(", ")}`,
      API_ERROR_CODES.API_KEY_NOT_FOUND,
    );
    logApiError(error, "validateEnvironmentVariables");
    throw error;
  }
};

/**
 * Handle API errors consistently across services
 */
export const handleApiError = (
  error: unknown,
  serviceName: AnyApiError["service"],
  context: string,
  isRetryable: boolean = false,
): never => {
  let apiError: AnyApiError;

  if (isApiError(error)) {
    // Cast to AnyApiError since we've verified it's an ApiError
    apiError = error as AnyApiError;
  } else {
    // Convert unknown error to ApiError
    const message = error instanceof Error ? error.message : "Unknown API error";
    apiError = createApiError(
      serviceName,
      message,
      undefined,
      undefined,
      error,
      isRetryable || isRetryableApiError(error),
    );
  }

  logApiError(apiError, context);
  throw apiError;
};

/**
 * Create a timeout promise for API requests
 */
export const createTimeoutPromise = (timeoutMs: number, errorMessage: string = "Request timed out"): Promise<never> => {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
};

/**
 * Execute API request with timeout and retry logic
 */
export const executeApiRequest = async <T>(
  operation: () => Promise<T>,
  options: {
    serviceName: AnyApiError["service"];
    context: string;
    timeoutMs?: number;
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  } = {
    serviceName: "anthropic", // Default to a valid service
    context: "API request",
    timeoutMs: 30000,
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  },
): Promise<T> => {
  const {
    serviceName,
    context,
    timeoutMs = 30000,
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
  } = options;

  try {
    // Create retry wrapper for this request
    const apiRetry = createApiRetry({
      maxAttempts: maxRetries,
      initialDelay: initialDelayMs,
      maxDelay: maxDelayMs,
      onRetry: (error, attempt, delay) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[${serviceName}] Retry attempt ${attempt}/${maxRetries} in ${delay}ms:`, error);
        }
      },
    });

    // Execute with timeout and retry
    return await Promise.race([
      apiRetry(operation),
      createTimeoutPromise(timeoutMs, `${serviceName} request timed out after ${timeoutMs}ms`),
    ]);
  } catch (error) {
    handleApiError(error, serviceName, context);
    // This line is unreachable because handleApiError always throws
    throw new Error("Unreachable code");
  }
};

/**
 * Validate API response structure
 */
export const validateApiResponse = <T>(
  response: unknown,
  requiredFields: string[],
  serviceName: AnyApiError["service"],
  context: string,
): T => {
  if (typeof response !== "object" || response === null) {
    const error = createApiError(
      serviceName,
      "Invalid API response: expected an object",
      API_ERROR_CODES.INVALID_REQUEST,
    );
    handleApiError(error, serviceName, context);
  }

  const responseObj = response as Record<string, unknown>;

  for (const field of requiredFields) {
    if (!(field in responseObj)) {
      const error = createApiError(
        serviceName,
        `Invalid API response: missing required field '${field}'`,
        API_ERROR_CODES.INVALID_REQUEST,
      );
      handleApiError(error, serviceName, context);
    }
  }

  return response as T;
};

/**
 * Sanitize API request data to remove sensitive information
 */
export const sanitizeRequestData = (data: unknown): unknown => {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sanitized = { ...(data as Record<string, unknown>) };

  // Remove potentially sensitive fields
  const sensitiveFields = ["apiKey", "api_key", "password", "token", "secret", "authorization", "auth"];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
};

/**
 * Log API request for debugging (in development only)
 */
export const logApiRequest = (serviceName: string, endpoint: string, method: string, data: unknown): void => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[API Request] ${serviceName} ${method} ${endpoint}:`, {
      data: sanitizeRequestData(data),
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Log API response for debugging (in development only)
 */
export const logApiResponse = (serviceName: string, endpoint: string, response: unknown, durationMs: number): void => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[API Response] ${serviceName} ${endpoint} (${durationMs}ms):`, {
      response,
      timestamp: new Date().toISOString(),
    });
  }
};
