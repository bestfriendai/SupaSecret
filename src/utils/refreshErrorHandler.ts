/**
 * Error handling utilities for pull-to-refresh functionality
 * 
 * Provides centralized error handling and recovery for refresh operations
 */

import { Alert } from "react-native";

export interface RefreshError {
  type: 'network' | 'timeout' | 'auth' | 'unknown';
  message: string;
  originalError?: Error;
  timestamp: number;
}

/**
 * Categorize and handle refresh errors
 */
export function handleRefreshError(error: unknown, context: string = 'refresh'): RefreshError {
  const timestamp = Date.now();
  
  if (error instanceof Error) {
    // Network errors
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('connection')) {
      return {
        type: 'network',
        message: 'Network connection failed. Please check your internet connection.',
        originalError: error,
        timestamp,
      };
    }
    
    // Timeout errors
    if (error.message.toLowerCase().includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. Please try again.',
        originalError: error,
        timestamp,
      };
    }
    
    // Auth errors
    if (error.message.toLowerCase().includes('auth') || 
        error.message.toLowerCase().includes('unauthorized')) {
      return {
        type: 'auth',
        message: 'Authentication failed. Please sign in again.',
        originalError: error,
        timestamp,
      };
    }
    
    // Generic error
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      originalError: error,
      timestamp,
    };
  }
  
  // Non-Error objects
  return {
    type: 'unknown',
    message: String(error) || 'An unexpected error occurred.',
    timestamp,
  };
}

/**
 * Show user-friendly error message for refresh failures
 */
export function showRefreshErrorAlert(refreshError: RefreshError, onRetry?: () => void): void {
  const { type, message } = refreshError;
  
  const buttons = [
    { text: 'OK', style: 'cancel' as const },
  ];
  
  if (onRetry) {
    buttons.unshift({ text: 'Retry', onPress: onRetry });
  }
  
  Alert.alert(
    getErrorTitle(type),
    message,
    buttons,
    { cancelable: true }
  );
}

/**
 * Get appropriate error title based on error type
 */
function getErrorTitle(type: RefreshError['type']): string {
  switch (type) {
    case 'network':
      return 'Connection Error';
    case 'timeout':
      return 'Request Timeout';
    case 'auth':
      return 'Authentication Error';
    default:
      return 'Refresh Failed';
  }
}

/**
 * Log refresh errors for debugging
 */
export function logRefreshError(refreshError: RefreshError, context: string): void {
  if (__DEV__) {
    console.group(`🔄 Refresh Error [${context}]`);
    console.error('Type:', refreshError.type);
    console.error('Message:', refreshError.message);
    console.error('Timestamp:', new Date(refreshError.timestamp).toISOString());
    if (refreshError.originalError) {
      console.error('Original Error:', refreshError.originalError);
    }
    console.groupEnd();
  }
}

/**
 * Wrapper for refresh operations with error handling
 */
export async function withRefreshErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = 'refresh',
  showAlert: boolean = false,
  onRetry?: () => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const refreshError = handleRefreshError(error, context);
    logRefreshError(refreshError, context);
    
    if (showAlert) {
      showRefreshErrorAlert(refreshError, onRetry);
    }
    
    return null;
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(refreshError: RefreshError): boolean {
  return refreshError.type === 'network' || refreshError.type === 'timeout';
}

/**
 * Get retry delay based on error type (in milliseconds)
 */
export function getRetryDelay(refreshError: RefreshError, attempt: number = 1): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  
  switch (refreshError.type) {
    case 'network':
      return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    case 'timeout':
      return Math.min(baseDelay * attempt, maxDelay);
    default:
      return baseDelay;
  }
}
