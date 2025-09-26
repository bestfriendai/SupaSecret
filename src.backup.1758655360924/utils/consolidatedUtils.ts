/**
 * Consolidated utility functions for tree-shakable imports
 * Combines sanitize, debounce, and uuid utilities
 */

import { v4 as uuidv4 } from "uuid";

// ============================================
// Sanitization Utilities
// ============================================

export namespace Sanitize {
  /**
   * Enhanced sanitizer for React Native text content with comprehensive security measures
   */
  export const text = (input: string | null | undefined): string => {
    if (!input || typeof input !== "string") return "";
    let s = input;

    // Unicode normalization to prevent homograph attacks
    s = s.normalize("NFC");

    // Remove zero-width characters
    s = s.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
    s = s.replace(/[\uFE00-\uFE0F]/g, "");

    // Remove combining characters
    s = s.replace(/[\u0300-\u036F\u20D0-\u20FF]/g, "");

    // Remove directional formatting characters
    s = s.replace(/[\u202A-\u202E]/g, "");

    // Remove control characters
    s = s.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, "");

    // Remove angle brackets
    s = s.replace(/[<>]/g, "");

    // Remove XSS patterns
    s = s.replace(/javascript:/gi, "");
    s = s.replace(/data:/gi, "");
    s = s.replace(/vbscript:/gi, "");
    s = s.replace(/on\w+\s*=/gi, "");

    // Normalize whitespace
    s = s.replace(/\s+/g, " ").trim();

    // Enforce max length
    const MAX_LEN = 5000;
    if (s.length > MAX_LEN) {
      s = s.slice(0, MAX_LEN).trim();
    }

    return s;
  };

  /**
   * Stricter sanitization for user input
   */
  export const userInput = (input: string | null | undefined): string => {
    if (!input || typeof input !== "string") return "";

    let s = text(input);

    // Remove all non-printable ASCII characters
    s = s.replace(/[^\x20-\x7E\r\n\t]/g, "");

    // Remove potentially dangerous patterns
    s = s.replace(/['"\\]/g, "");

    return s.trim();
  };

  /**
   * Sanitize for database/storage
   */
  export const forStorage = (input: string | null | undefined): string => {
    if (!input || typeof input !== "string") return "";

    let s = text(input);

    // Remove characters that could cause issues in file names or database keys
    s = s.replace(/[\\/:*?"<>|]/g, "-");

    return s;
  };
}

// ============================================
// Debounce Utilities
// ============================================

export namespace Debounce {
  /**
   * Generic debounce function
   */
  export function create<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Debounce with immediate execution option
   */
  export function createWithImmediate<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    immediate: boolean = false,
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (immediate && timeSinceLastCall > delay) {
        func(...args);
        lastCall = now;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastCall = Date.now();
        }, delay);
      }
    };
  }

  /**
   * Throttle function
   */
  export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }
}

// ============================================
// UUID Utilities
// ============================================

export namespace UUID {
  // UUID v4 regex pattern
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Check if a string is a valid UUID format
   */
  export const isValid = (id: string): boolean => {
    return UUID_REGEX.test(id);
  };

  /**
   * Check if an ID is sample data
   */
  export const isSampleData = (id: string): boolean => {
    return id.startsWith("sample-");
  };

  /**
   * Check if an ID should be used for database operations
   */
  export const isValidForDatabase = (id: string): boolean => {
    return isValid(id) && !isSampleData(id);
  };

  /**
   * Generate a new UUID v4
   */
  export const generate = (): string => {
    return uuidv4();
  };

  /**
   * Filter an array of IDs to only include valid database IDs
   */
  export const filterValidDatabaseIds = (ids: string[]): string[] => {
    return ids.filter(isValidForDatabase);
  };

  /**
   * Separate sample data from real database IDs
   */
  export const separateIds = (ids: string[]): { sampleIds: string[]; databaseIds: string[] } => {
    const sampleIds: string[] = [];
    const databaseIds: string[] = [];

    ids.forEach((id) => {
      if (isSampleData(id)) {
        sampleIds.push(id);
      } else if (isValid(id)) {
        databaseIds.push(id);
      }
    });

    return { sampleIds, databaseIds };
  };
}

// ============================================
// Additional Common Utilities
// ============================================

export namespace Common {
  /**
   * Sleep utility for async operations
   */
  export const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Clamp a number between min and max
   */
  export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  /**
   * Deep clone an object
   */
  export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;

    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  };

  /**
   * Format bytes to human readable string
   */
  export const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  /**
   * Chunk an array into smaller arrays
   */
  export const chunk = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };
}

// ============================================
// React Hooks (for debounce functionality)
// ============================================

import * as React from "react";
import { useCallback, useRef, useEffect } from "react";

/**
 * Hook for debounced callbacks
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = [],
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debouncedRef = useRef<(...args: Parameters<T>) => void>(() => {});

  useEffect(() => {
    debouncedRef.current = Debounce.create((...args: Parameters<T>) => callbackRef.current(...args), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);

  return useCallback((...args: Parameters<T>) => debouncedRef.current(...args), []);
}

/**
 * Hook for debounced value updates
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced like toggle to prevent rapid clicking
 */
export function useDebouncedLikeToggle(likeFunction: (id: string) => Promise<void> | void, delay: number = 500) {
  const pendingLikes = useRef(new Set<string>());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const debouncedToggleLike = useCallback(
    async (id: string) => {
      if (pendingLikes.current.has(id)) {
        return;
      }

      pendingLikes.current.add(id);

      try {
        await likeFunction(id);
      } catch (error) {
        console.error("Like toggle failed:", error);
      } finally {
        const timeoutId = setTimeout(() => {
          pendingLikes.current.delete(id);
          timeoutRefs.current.delete(id);
        }, delay) as ReturnType<typeof setTimeout>;

        timeoutRefs.current.set(id, timeoutId);
      }
    },
    [likeFunction, delay],
  );

  useEffect(() => {
    const refs = timeoutRefs.current;
    return () => {
      const timeouts = Array.from(refs.values());
      timeouts.forEach((timeout) => clearTimeout(timeout));
      refs.clear();
    };
  }, []);

  return debouncedToggleLike;
}

// Default exports for backward compatibility
export const sanitizeText = Sanitize.text;
export const sanitizeUserInput = Sanitize.userInput;
export const sanitizeForStorage = Sanitize.forStorage;
export const debounce = Debounce.create;
export const generateUUID = UUID.generate;
export const isValidUUID = UUID.isValid;
export const isSampleData = UUID.isSampleData;
export const isValidForDatabase = UUID.isValidForDatabase;
export const filterValidDatabaseIds = UUID.filterValidDatabaseIds;
export const separateIds = UUID.separateIds;

// Additional hook exports for compatibility
export const useDebouncedSearch = (searchTerm: string, delay: number = 300): string => {
  return useDebouncedValue(searchTerm, delay);
};

export const useDebouncedRefresh = <T extends () => Promise<void>>(refreshFn: T, delay: number = 1000): T => {
  const debouncedFn = useDebounce(refreshFn, delay);
  return debouncedFn as T;
};

export const useDebouncedCallback = useDebounce;
