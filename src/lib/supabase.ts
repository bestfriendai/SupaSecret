import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Database } from "../types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing required Supabase environment variables. Please check your .env file.");
}

// 2025 Best Practices: Enhanced Supabase configuration with proper storage and error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for React Native session persistence
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Enhanced React Native specific options
    flowType: "pkce", // Use PKCE flow for better security in React Native
    debug: __DEV__, // Enable debug mode in development
    storageKey: "supabase-auth-token", // Custom storage key
    // Improved session management
    sessionRefreshInterval: 1000 * 60 * 30, // 30 minutes
    retryOnFailure: true,
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
