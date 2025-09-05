import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || 'https://xhtqobjcbjgzxkgfyvdj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodHFvYmpjYmpnenhrZ2Z5dmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDg3MjAsImV4cCI6MjA3MDEyNDcyMH0.pRMiejad4ILuHM5N7z9oBMcbCekjSl-1cM41lP1o9-g';

// 2025 Best Practices: Enhanced Supabase configuration with proper storage and error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for React Native session persistence
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Note: PKCE flow might cause issues with React Native, using default for now
    // flowType: 'pkce', // Use PKCE flow for better security
  },
  // Global configuration for better performance
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
  // Database configuration
  db: {
    schema: 'public',
  },
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
