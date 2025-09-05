import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || 'https://xhtqobjcbjgzxkgfyvdj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodHFvYmpjYmpnenhrZ2Z5dmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDg3MjAsImV4cCI6MjA3MDEyNDcyMH0.pRMiejad4ILuHM5N7z9oBMcbCekjSl-1cM41lP1o9-g';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
