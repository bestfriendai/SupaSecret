import { StandardError } from "./errorHandling";
import { createApiRetry } from "./retryLogic";

// Legacy error classes - these should be migrated to StandardError
export class AppError extends Error {
  code: string;
  status?: number;
  details?: any;
  retryable?: boolean;
  userMessage?: string;

  constructor(message: string, options?: { code?: string; status?: number; details?: any; retryable?: boolean; userMessage?: string }) {
    super(message);
    this.name = "AppError";
    this.code = options?.code || "UNKNOWN_ERROR";
    this.status = options?.status;
    this.details = options?.details;
    this.retryable = options?.retryable;
    this.userMessage = options?.userMessage;
  }
}

export class NetworkError extends AppError {
  constructor(message: string, options?: { details?: any; userMessage?: string }) {
    super(message, { ...options, code: "NETWORK_ERROR", retryable: true });
    this.name = "NetworkError";
  }
}

export class ValidationError extends AppError {
  validationErrors?: any;

  constructor(message: string, options?: { details?: any; validationErrors?: any }) {
    super(message, { ...options, code: "VALIDATION_ERROR" });
    this.name = "ValidationError";
    this.validationErrors = options?.validationErrors;
  }
}

export class AuthError extends AppError {
  constructor(message: string, options?: { details?: any }) {
    super(message, { ...options, code: "AUTH_ERROR" });
    this.name = "AuthError";
  }
}

export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  return new AppError(String(error));
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: AppError;
  success: boolean;
}

export interface ApiRequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

/**
 * Enhanced API client with comprehensive error handling
 */
export class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private retryConfig: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
  };

  constructor(
    baseURL: string = "",
    options: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    } = {}
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = options.timeout || 30000;
    this.retryConfig = {
      maxAttempts: options.retries || 3,
      initialDelay: options.retryDelay || 1000,
      maxDelay: 10000,
    };
  }

  /**
   * Makes an API request with error handling and retry logic
   */
  async request<T = any>(endpoint: string, options: RequestInit & ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.retryConfig.maxAttempts,
      retryDelay = this.retryConfig.initialDelay,
      headers = {},
      onProgress,
      ...fetchOptions
    } = options;

    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`;

    const retryableRequest = createApiRetry({
      maxAttempts: retries,
      initialDelay: retryDelay,
      maxDelay: this.retryConfig.maxDelay,
    });

    try {
      const response = await retryableRequest(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            ...fetchOptions,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (fetchError) {
          clearTimeout(timeoutId);

          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw new NetworkError("Request timeout", { details: { cause: fetchError } });
          }

          throw fetchError;
        }
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw this.createHttpError(response.status, errorData);
      }

      // Parse successful response
      const data = await this.parseResponse<T>(response, onProgress);
      return { data, success: true };
    } catch (error) {
      const appError = parseError(error);
      return { error: appError, success: false };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Upload file with progress
   */
  async upload<T = any>(
    endpoint: string,
    file: File | Blob,
    options: ApiRequestOptions & {
      fieldName?: string;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { fieldName = "file", onProgress, ...requestOptions } = options;

    const formData = new FormData();
    formData.append(fieldName, file);

    return this.request<T>(endpoint, {
      ...requestOptions,
      method: "POST",
      body: formData,
      headers: {
        // Let browser set Content-Type for FormData
        ...requestOptions.headers,
      },
    });
  }

  private async parseResponse<T>(response: Response, onProgress?: (progress: number) => void): Promise<T> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json();
    }

    if (contentType?.includes("text/")) {
      return response.text() as any;
    }

    // For binary data or unknown types, return as blob
    return response.blob() as any;
  }

  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch {
      return { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  }

  private createHttpError(status: number, errorData: any): AppError {
    const message = errorData?.message || errorData?.error || `HTTP ${status} error`;

    switch (status) {
      case 400:
        return new ValidationError(message, {
          details: errorData,
          validationErrors: errorData?.errors,
        });

      case 401:
      case 403:
        return new AuthError(message, { details: errorData });

      case 404:
        return new AppError(message, {
          code: "NOT_FOUND",
          status,
          details: errorData,
          userMessage: "The requested resource was not found.",
        });

      case 422:
        return new ValidationError(message, {
          details: errorData,
          validationErrors: errorData?.errors,
        });

      case 429:
        return new AppError(message, {
          code: "RATE_LIMITED",
          status,
          details: errorData,
          retryable: true,
          userMessage: "Too many requests. Please try again later.",
        });

      case 500:
      case 502:
      case 503:
      case 504:
        return new NetworkError(message, {
          details: errorData,
          userMessage: "Server error. Please try again later.",
        });

      default:
        return new AppError(message, {
          code: `HTTP_${status}`,
          status,
          details: errorData,
          retryable: status >= 500,
        });
    }
  }
}

/**
 * Supabase-specific API client
 */
export class SupabaseApiClient extends ApiClient {
  constructor(supabaseUrl: string, supabaseKey: string) {
    super(supabaseUrl, { timeout: 30000, retries: 3 });
    this.defaultHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
  }

  private defaultHeaders: Record<string, string> = {};

  async supabaseRequest<T = any>(
    endpoint: string,
    options: RequestInit & ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    });
  }

  async supabaseQuery<T = any>(
    table: string,
    query: Record<string, any> = {},
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T[]>> {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const endpoint = `/rest/v1/${table}?${params.toString()}`;
    return this.supabaseRequest<T[]>(endpoint, { ...options, method: "GET" });
  }

  async supabaseInsert<T = any>(table: string, data: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    const endpoint = `/rest/v1/${table}`;
    return this.supabaseRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async supabaseUpdate<T = any>(
    table: string,
    id: string | number,
    data: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const endpoint = `/rest/v1/${table}?id=eq.${id}`;
    return this.supabaseRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async supabaseDelete(table: string, id: string | number, options?: ApiRequestOptions): Promise<ApiResponse<void>> {
    const endpoint = `/rest/v1/${table}?id=eq.${id}`;
    return this.supabaseRequest<void>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

/**
 * React hook for API operations with error handling
 */
export function useApiClient(baseURL?: string) {
  const client = new ApiClient(baseURL);

  return {
    client,
    get: <T = any>(endpoint: string, options?: ApiRequestOptions) => client.get<T>(endpoint, options),
    post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
      client.post<T>(endpoint, data, options),
    put: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) => client.put<T>(endpoint, data, options),
    delete: <T = any>(endpoint: string, options?: ApiRequestOptions) => client.delete<T>(endpoint, options),
    upload: <T = any>(
      endpoint: string,
      file: File | Blob,
      options?: ApiRequestOptions & { fieldName?: string; onProgress?: (progress: number) => void }
    ) => client.upload<T>(endpoint, file, options),
  };
}
