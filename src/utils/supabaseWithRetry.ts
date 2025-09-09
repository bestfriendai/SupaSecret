/**
 * Supabase operations with retry logic
 * Wraps common Supabase operations with exponential backoff retry
 */

import { supabase } from "../lib/supabase";
import { createSupabaseRetry, RetryOptions } from "./retryLogic";

// Create default retry wrapper for Supabase operations
const defaultRetry = createSupabaseRetry({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  onRetry: (error, attempt, delay) => {
    if (__DEV__) {
      console.warn(`[Supabase Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
    }
  },
});

/**
 * Retry wrapper for Supabase select operations
 */
export const selectWithRetry = async <T = any>(table: string, query?: string, options?: RetryOptions) => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return retry(async () => {
    let queryBuilder = supabase.from(table).select(query || "*");
    const { data, error } = await queryBuilder;

    if (error) throw error;
    return data as T[];
  });
};

/**
 * Retry wrapper for Supabase insert operations
 */
export const insertWithRetry = async <T = any>(table: string, values: any | any[], options?: RetryOptions) => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return retry(async () => {
    const { data, error } = await supabase.from(table).insert(values).select();

    if (error) throw error;
    return data as T[];
  });
};

/**
 * Retry wrapper for Supabase update operations
 */
export const updateWithRetry = async <T = any>(
  table: string,
  values: any,
  filters: Record<string, any>,
  options?: RetryOptions,
) => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return retry(async () => {
    let queryBuilder = supabase.from(table).update(values);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { data, error } = await queryBuilder.select();

    if (error) throw error;
    return data as T[];
  });
};

/**
 * Retry wrapper for Supabase delete operations
 */
export const deleteWithRetry = async (table: string, filters: Record<string, any>, options?: RetryOptions) => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return retry(async () => {
    let queryBuilder = supabase.from(table).delete();

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });

    const { error } = await queryBuilder;

    if (error) throw error;
    return true;
  });
};

/**
 * Retry wrapper for Supabase RPC calls
 */
export const rpcWithRetry = async <T = any>(functionName: string, params?: any, options?: RetryOptions) => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return retry(async () => {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) throw error;
    return data as T;
  });
};

/**
 * Retry wrapper for Supabase auth operations
 */
export const authWithRetry = {
  signUp: async (credentials: { email: string; password: string }, options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      return data;
    });
  },

  signIn: async (credentials: { email: string; password: string }, options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return data;
    });
  },

  signOut: async (options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    });
  },

  getUser: async (options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data;
    });
  },
};

/**
 * Retry wrapper for Supabase storage operations
 */
export const storageWithRetry = {
  upload: async (
    bucket: string,
    path: string,
    file: File | Blob,
    options?: { upsert?: boolean; retryOptions?: RetryOptions },
  ) => {
    const retry = options?.retryOptions ? createSupabaseRetry(options.retryOptions) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: options?.upsert });

      if (error) throw error;
      return data;
    });
  },

  download: async (bucket: string, path: string, options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.storage.from(bucket).download(path);

      if (error) throw error;
      return data;
    });
  },

  getPublicUrl: (bucket: string, path: string) => {
    // Public URL generation doesn't need retry as it's synchronous
    return supabase.storage.from(bucket).getPublicUrl(path);
  },

  createSignedUrl: async (bucket: string, path: string, expiresIn: number, options?: RetryOptions) => {
    const retry = options ? createSupabaseRetry(options) : defaultRetry;

    return retry(async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data;
    });
  },
};

/**
 * Utility to wrap any Supabase operation with retry logic
 */
export const wrapWithRetry = <T extends (...args: any[]) => Promise<any>>(operation: T, options?: RetryOptions): T => {
  const retry = options ? createSupabaseRetry(options) : defaultRetry;

  return ((...args: Parameters<T>) => {
    return retry(() => operation(...args));
  }) as T;
};
