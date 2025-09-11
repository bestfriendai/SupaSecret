import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY;

// Create a flag to track if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "Missing required Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or provide the legacy *_VIBECODE_* vars).";
  if (__DEV__) {
    // Surface a clearer message in development rather than a silent failure
    // eslint-disable-next-line no-console
    console.error(msg);
    console.warn("Supabase client will be created with dummy values - app functionality will be limited");
  }

  // Don't throw immediately - create a dummy client that will fail gracefully
  // This prevents app crashes during development/CI when env vars might not be set
}

// SDK 53: Secure storage adapter for enhanced security on iOS 18
const supabaseStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// SDK 53: Enhanced Supabase configuration with secure storage and improved security
// Use fallback values if environment variables are missing to prevent crashes
const clientUrl = supabaseUrl || "https://dummy.supabase.co";
const clientKey = supabaseAnonKey || "dummy-anon-key";

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
