import { useState, useCallback } from "react";
import { ApiResponse, ApiRequestOptions } from "../utils/apiErrorHandler";
import { useErrorHandler } from "../utils/errorHandling";
import { useNetworkRecovery } from "./useNetworkRecovery";

interface UseApiOptions extends ApiRequestOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  enableNetworkRecovery?: boolean;
}

export function useApiWithErrorHandling<T = any>(
  apiCall: (options?: ApiRequestOptions) => Promise<ApiResponse<T>>,
  defaultOptions: UseApiOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);

  const { handleError, handleSuccess } = useErrorHandler();
  const { isConnected, manualRetry } = useNetworkRecovery({
    autoRetry: defaultOptions.enableNetworkRecovery ?? true,
  });

  const execute = useCallback(
    async (options: UseApiOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      const {
        showErrorToast = true,
        showSuccessToast = false,
        successMessage,
        onSuccess,
        onError,
        enableNetworkRecovery = true,
        ...apiOptions
      } = mergedOptions;

      setLoading(true);
      setError(null);

      try {
        // Check network connectivity if recovery is enabled
        if (enableNetworkRecovery && !isConnected) {
          await manualRetry();
        }

        const response = await apiCall(apiOptions);

        if (response.success && response.data) {
          setData(response.data);

          if (showSuccessToast && successMessage) {
            handleSuccess(successMessage);
          }

          onSuccess?.(response.data);
          return response.data;
        } else if (response.error) {
          setError(response.error);

          if (showErrorToast) {
            handleError(response.error, {
              context: {
                action: "api_call",
                severity: response.error.retryable ? "medium" : "high",
                tags: ["api", "error"],
              },
            });
          }

          onError?.(response.error);
          return null;
        }

        // Handle unexpected response format
        return null;
      } catch (err) {
        const appError = handleError(err, {
          showToast: showErrorToast,
          context: {
            action: "api_call",
            severity: "high",
            tags: ["api", "exception"],
          },
        });

        setError(appError);
        onError?.(appError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiCall, defaultOptions, isConnected, manualRetry, handleError, handleSuccess]
  );

  const retry = useCallback(() => {
    if (error?.retryable) {
      return execute();
    }
    return Promise.resolve(null);
  }, [error, execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    retry,
    reset,
    loading,
    data,
    error,
    isConnected,
  };
}
