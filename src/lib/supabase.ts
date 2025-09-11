import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = "Missing required Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or provide the legacy *_VIBECODE_* vars).";
  if (__DEV__) {
    // Surface a clearer message in development rather than a silent failure
    // eslint-disable-next-line no-console
    console.error(msg);
  }
  throw new Error(msg);
}

// SDK 53: Secure storage adapter for enhanced security on iOS 18
const supabaseStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// SDK 53: Enhanced Supabase configuration with secure storage and improved security
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
