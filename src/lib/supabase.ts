import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Database } from "../types/database";
import {
  detectEnvironment,
  getEnvVarWithFallback,
  isProductionBuild,
  logValidationResults,
  validateSupabaseConfig,
} from "../utils/environmentValidation";
import { startNetworkWatcher } from "./offlineQueue";

// Resolve environment variables with robust fallbacks
const resolvedSupabaseUrl =
  getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_VIBECODE_SUPABASE_URL") ||
  (Constants?.expoConfig as any)?.extra?.nonSensitive?.supabaseUrl;

const resolvedSupabaseAnonKey =
  getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY") ||
  (Constants?.expoConfig as any)?.extra?.nonSensitive?.supabaseAnonKey;

// DEBUG LOGGING: Validate environment variable resolution
console.log("[SUPABASE DEBUG] Environment variable resolution:", {
  resolvedSupabaseUrl: resolvedSupabaseUrl ? `${resolvedSupabaseUrl.substring(0, 20)}...` : "UNDEFINED",
  resolvedSupabaseAnonKey: resolvedSupabaseAnonKey ? `${resolvedSupabaseAnonKey.substring(0, 20)}...` : "UNDEFINED",
  constantsExpoConfigExists: !!Constants?.expoConfig,
  constantsExtraExists: !!(Constants?.expoConfig as any)?.extra,
  constantsExtraNonSensitiveExists: !!(Constants?.expoConfig as any)?.extra?.nonSensitive,
  constantsExtraNonSensitiveUrl: !!(Constants?.expoConfig as any)?.extra?.nonSensitive?.supabaseUrl,
  constantsExtraNonSensitiveKey: !!(Constants?.expoConfig as any)?.extra?.nonSensitive?.supabaseAnonKey,
});

// Create a flag to track if Supabase is properly configured
export const isSupabaseConfigured = !!(resolvedSupabaseUrl && resolvedSupabaseAnonKey);

// Validate configuration and report issues
(() => {
  console.log("[DIAG] supabase.ts: Starting validation IIFE...");
  try {
    const { ok, report } = logValidationResults();
    console.log("[DIAG] supabase.ts: logValidationResults completed", { ok });

    const supabaseValidation = validateSupabaseConfig();
    console.log("[DIAG] supabase.ts: validateSupabaseConfig completed", { ok: supabaseValidation.ok });

    if (!supabaseValidation.ok || !ok) {
      const msg =
        "Missing or invalid Supabase environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.";
      if (isProductionBuild()) {
        // Fail fast in production for critical misconfigurations
        // eslint-disable-next-line no-console
        console.error(msg, report);
      } else {
        // eslint-disable-next-line no-console
        console.warn(msg, report);
      }
    }
    console.log("[DIAG] supabase.ts: Validation IIFE completed successfully");
  } catch (error) {
    console.error("[DIAG] supabase.ts: Validation IIFE FAILED:", error);
    throw error;
  }
})();

// Start connectivity watcher for offline queue will be called from App.tsx
// after safe initialization to avoid module-scope async imports
console.log("[DIAG] supabase.ts: Skipping module-scope startNetworkWatcher() call");
console.log("[DIAG] supabase.ts: Network watcher will be initialized from App.tsx");

// SDK 53: Secure storage adapter for enhanced security on iOS 18
// Added error handling to prevent "Value is undefined, expected an Object" errors
const supabaseStorage = {
  getItem: async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      // Return null if value is undefined to prevent GoTrueClient errors
      return value ?? null;
    } catch (error) {
      console.warn(`[Supabase Storage] Failed to get item "${key}":`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // Validate that value is not undefined
      if (value === undefined) {
        console.warn(`[Supabase Storage] Attempted to set undefined value for key "${key}"`);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[Supabase Storage] Failed to set item "${key}":`, error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[Supabase Storage] Failed to remove item "${key}":`, error);
    }
  },
};

// SDK 53: Enhanced Supabase configuration with secure storage and improved security
// Use fallback values if environment variables are missing to prevent crashes
const clientUrl = resolvedSupabaseUrl || "https://dummy.supabase.co";
const clientKey = resolvedSupabaseAnonKey || "dummy-anon-key";

// DEBUG LOGGING: Validate client initialization values
console.log("[SUPABASE DEBUG] Client initialization:", {
  clientUrl: clientUrl ? `${clientUrl.substring(0, 20)}...` : "UNDEFINED",
  clientKey: clientKey ? `${clientKey.substring(0, 20)}...` : "UNDEFINED",
  isUsingFallbackUrl: clientUrl === "https://dummy.supabase.co",
  isUsingFallbackKey: clientKey === "dummy-anon-key",
});

console.log("[DIAG] supabase.ts: About to create Supabase client...");
export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    // Use expo-secure-store for enhanced security on iOS 18
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Enhanced React Native specific options
    flowType: "pkce", // Use PKCE flow for better security in React Native
    debug: __DEV__, // Enable debug mode in development
    storageKey: "supabase-auth-token", // Custom storage key
  },
  // Global configuration for better performance
  global: {
    headers: {
      "X-Client-Info": "supabase-js-react-native",
    },
  },
  // Database configuration
  db: {
    schema: "public",
  },
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Utility function to check if Supabase operations should proceed
 * Returns false if Supabase is not properly configured
 */
export const checkSupabaseConfig = (): boolean => {
  if (!isSupabaseConfigured) {
    if (__DEV__) {
      console.warn("Supabase operation skipped - missing environment variables");
    }
    return false;
  }
  return true;
};

/**
 * Wrapper for Supabase operations that handles configuration errors gracefully
 */
export const withSupabaseConfig = async <T>(operation: () => Promise<T>, fallbackValue?: T): Promise<T | null> => {
  if (!checkSupabaseConfig()) {
    return fallbackValue ?? null;
  }

  try {
    return await operation();
  } catch (error) {
    if (__DEV__) {
      console.error("Supabase operation failed:", error);
    }
    return fallbackValue ?? null;
  }
};

export async function withSupabaseRetry<T>(op: () => Promise<T>, retries = 3, base = 300): Promise<T> {
  let last: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await op();
    } catch (e: any) {
      last = e;
      const msg = (e?.message || "").toLowerCase();
      if (!/network|timeout|fetch|503|429/.test(msg) || i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, base * Math.pow(2, i)));
    }
  }
  throw last;
}

/**
 * Health checks and diagnostics for production readiness.
 */
export const testSupabaseConnection = async (): Promise<{ ok: boolean; error?: unknown }> => {
  try {
    if (!checkSupabaseConfig()) return { ok: false, error: new Error("Supabase not configured") };
    // Lightweight call: get current timestamp from Postgrest
    const { error } = await supabase.from("user_profiles").select("id").limit(1);
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const checkRealtimeConnection = async (): Promise<{ ok: boolean; error?: unknown }> => {
  try {
    if (!checkSupabaseConfig()) return { ok: false, error: new Error("Supabase not configured") };
    // Attempt to create and immediately unsubscribe a dummy channel
    const channel = supabase.channel("health_check");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await channel.unsubscribe();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const validateAuthConfiguration = async (): Promise<{ ok: boolean; error?: unknown }> => {
  try {
    // Basic check: ensure auth methods are accessible
    await supabase.auth.getSession();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const monitorSupabaseHealth = (intervalMs = 60000): (() => void) => {
  // Periodic health logging (no-op in production unless explicitly enabled)
  const env = detectEnvironment();
  const enabled = __DEV__ || env !== "production";
  if (!enabled) return () => void 0;
  const handle = setInterval(async () => {
    const [conn, auth] = await Promise.all([testSupabaseConnection(), validateAuthConfiguration()]);
    if (!conn.ok || !auth.ok) {
      // eslint-disable-next-line no-console
      console.warn("[supabase] health check failed", { conn, auth });
    }
  }, intervalMs);
  return () => clearInterval(handle);
};
