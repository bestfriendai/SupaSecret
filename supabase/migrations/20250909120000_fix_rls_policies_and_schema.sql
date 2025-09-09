-- Migration: Fix RLS Policies and Complete Database Schema
-- This migration ensures all RLS policies are properly configured and the schema is complete

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_memberships ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Anyone can view confessions" ON confessions;
DROP POLICY IF EXISTS "Authenticated users can insert confessions" ON confessions;
DROP POLICY IF EXISTS "Users can update their own confessions" ON confessions;
DROP POLICY IF EXISTS "Users can delete their own confessions" ON confessions;

DROP POLICY IF EXISTS "Anyone can view replies" ON replies;
DROP POLICY IF EXISTS "Authenticated users can insert replies" ON replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON replies;

DROP POLICY IF EXISTS "Users can view all likes" ON user_likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON user_likes;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view analytics for their confessions" ON video_analytics;
DROP POLICY IF EXISTS "Users can manage analytics for their confessions" ON video_analytics;

DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON push_tokens;

DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Users can manage their own reports" ON reports;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;

DROP POLICY IF EXISTS "Users can view their own memberships" ON user_memberships;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON user_memberships;

-- Drop storage policies
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('videos', 'videos', false, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']),
  ('images', 'images', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- USER_PROFILES policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CONFESSIONS policies
CREATE POLICY "Anyone can view confessions" ON confessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert confessions" ON confessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Users can update their own confessions" ON confessions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own confessions" ON confessions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- REPLIES policies
CREATE POLICY "Anyone can view replies" ON replies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert replies" ON replies
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Users can update their own replies" ON replies
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own replies" ON replies
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- USER_LIKES policies
CREATE POLICY "Users can view all likes" ON user_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON user_likes
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- USER_PREFERENCES policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- VIDEO_ANALYTICS policies
CREATE POLICY "Users can view analytics for their confessions" ON video_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM confessions
      WHERE confessions.id = video_analytics.confession_id
      AND confessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage analytics for their confessions" ON video_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM confessions
      WHERE confessions.id = video_analytics.confession_id
      AND confessions.user_id = auth.uid()
    )
  );

-- PUSH_TOKENS policies
CREATE POLICY "Users can view their own push tokens" ON push_tokens
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own push tokens" ON push_tokens
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- REPORTS policies
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own reports" ON reports
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- NOTIFICATIONS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- NOTIFICATION_PREFERENCES policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- USER_MEMBERSHIPS policies
CREATE POLICY "Users can view their own memberships" ON user_memberships
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can manage their own memberships" ON user_memberships
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- STORAGE BUCKET POLICIES - FIXED FOR USER FOLDER STRUCTURE

-- Videos bucket policies
CREATE POLICY "Users can upload their own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Users can update their own videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Images bucket policies
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Avatars bucket policies
CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_confession_id ON replies(confession_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON replies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_confession_id ON user_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_confession_id ON video_analytics(confession_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Add comments for documentation
COMMENT ON POLICY "Users can upload their own videos" ON storage.objects IS 'Users can only upload videos to their own folder (user_id/filename)';
COMMENT ON POLICY "Users can view videos" ON storage.objects IS 'Anyone can view videos for the public feed';
COMMENT ON POLICY "Anyone can view confessions" ON confessions IS 'Confessions are publicly viewable for the feed';
COMMENT ON POLICY "Authenticated users can insert confessions" ON confessions IS 'Only authenticated users can create confessions';
COMMENT ON POLICY "Users can manage their own likes" ON user_likes IS 'Users can only manage their own likes';