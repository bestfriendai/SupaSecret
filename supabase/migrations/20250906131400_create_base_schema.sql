-- Migration: Create base database schema for SupaSecret
-- This migration creates all the core tables needed for the application

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text,
  is_onboarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone DEFAULT now()
);

-- Create confessions table
CREATE TABLE IF NOT EXISTS public.confessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'video')),
  content text NOT NULL,
  video_uri text,
  transcription text,
  is_anonymous boolean DEFAULT false,
  likes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create replies table
CREATE TABLE IF NOT EXISTS public.replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  likes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_likes table
CREATE TABLE IF NOT EXISTS public.user_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.replies(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Ensure either confession_id or reply_id is provided, but not both
  CONSTRAINT user_likes_target_check CHECK (
    (confession_id IS NOT NULL AND reply_id IS NULL) OR
    (confession_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  autoplay boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  quality_preference text DEFAULT 'auto' CHECK (quality_preference IN ('auto', 'high', 'medium', 'low')),
  data_usage_mode text DEFAULT 'unlimited' CHECK (data_usage_mode IN ('unlimited', 'wifi-only', 'minimal')),
  captions_default boolean DEFAULT true,
  haptics_enabled boolean DEFAULT true,
  reduced_motion boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create video_analytics table
CREATE TABLE IF NOT EXISTS public.video_analytics (
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE PRIMARY KEY,
  watch_time integer DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  last_watched timestamp with time zone DEFAULT now(),
  interactions integer DEFAULT 0
);

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS confessions_user_id_idx ON public.confessions(user_id);
CREATE INDEX IF NOT EXISTS confessions_created_at_idx ON public.confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS confessions_type_idx ON public.confessions(type);
CREATE INDEX IF NOT EXISTS replies_confession_id_idx ON public.replies(confession_id);
CREATE INDEX IF NOT EXISTS replies_user_id_idx ON public.replies(user_id);
CREATE INDEX IF NOT EXISTS replies_created_at_idx ON public.replies(created_at DESC);
CREATE INDEX IF NOT EXISTS user_likes_user_id_idx ON public.user_likes(user_id);
CREATE INDEX IF NOT EXISTS user_likes_confession_id_idx ON public.user_likes(confession_id);
CREATE INDEX IF NOT EXISTS user_likes_reply_id_idx ON public.user_likes(reply_id);

-- Create unique constraints for user_likes to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS user_likes_unique_confession 
ON public.user_likes(user_id, confession_id) WHERE confession_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_likes_unique_reply 
ON public.user_likes(user_id, reply_id) WHERE reply_id IS NOT NULL;
