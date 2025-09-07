-- SupaSecret Complete Schema Update
-- This file contains all Phase 2 database improvements in a single deployable script
-- Run this in your Supabase SQL editor to implement all backend enhancements

-- =============================================================================
-- PART 1: ADD MISSING COLUMNS AND VIDEO FIELDS
-- =============================================================================

-- Add updated_at columns where missing
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE replies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE video_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add video-related fields to confessions table
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS transcription TEXT;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_processing_status TEXT 
  DEFAULT 'pending' CHECK (video_processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_duration INTEGER;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_quality TEXT 
  DEFAULT 'auto' CHECK (video_quality IN ('auto', 'high', 'medium', 'low'));
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_file_size BIGINT;

-- =============================================================================
-- PART 2: SET PROPER DEFAULTS AND NOT NULL CONSTRAINTS
-- =============================================================================

-- Ensure created_at has proper defaults (with column existence checks)
DO $$
BEGIN
    -- Set defaults for columns that exist
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'confessions' AND column_name = 'created_at') THEN
        ALTER TABLE confessions ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'created_at') THEN
        ALTER TABLE replies ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_likes' AND column_name = 'created_at') THEN
        ALTER TABLE user_likes ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
        ALTER TABLE user_profiles ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to user_preferences if it doesn't exist
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set default for user_preferences created_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_preferences' AND column_name = 'created_at') THEN
        ALTER TABLE user_preferences ALTER COLUMN created_at SET DEFAULT NOW();
    END IF;
END $$;

-- Add NOT NULL constraints where appropriate (with column existence checks)
DO $$
BEGIN
    -- Confessions table constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'confessions' AND column_name = 'created_at') THEN
        ALTER TABLE confessions ALTER COLUMN created_at SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'confessions' AND column_name = 'content') THEN
        ALTER TABLE confessions ALTER COLUMN content SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'confessions' AND column_name = 'is_anonymous') THEN
        ALTER TABLE confessions ALTER COLUMN is_anonymous SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'confessions' AND column_name = 'likes') THEN
        ALTER TABLE confessions ALTER COLUMN likes SET DEFAULT 0;
        ALTER TABLE confessions ALTER COLUMN likes SET NOT NULL;
    END IF;

    -- Replies table constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'created_at') THEN
        ALTER TABLE replies ALTER COLUMN created_at SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'confession_id') THEN
        ALTER TABLE replies ALTER COLUMN confession_id SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'content') THEN
        ALTER TABLE replies ALTER COLUMN content SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'is_anonymous') THEN
        ALTER TABLE replies ALTER COLUMN is_anonymous SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'replies' AND column_name = 'likes') THEN
        ALTER TABLE replies ALTER COLUMN likes SET DEFAULT 0;
        ALTER TABLE replies ALTER COLUMN likes SET NOT NULL;
    END IF;

    -- User likes table constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_likes' AND column_name = 'created_at') THEN
        ALTER TABLE user_likes ALTER COLUMN created_at SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_likes' AND column_name = 'user_id') THEN
        ALTER TABLE user_likes ALTER COLUMN user_id SET NOT NULL;
    END IF;

    -- User profiles table constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
        ALTER TABLE user_profiles ALTER COLUMN created_at SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_profiles' AND column_name = 'is_onboarded') THEN
        ALTER TABLE user_profiles ALTER COLUMN is_onboarded SET NOT NULL;
    END IF;

    -- User preferences table constraints
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_preferences' AND column_name = 'created_at') THEN
        ALTER TABLE user_preferences ALTER COLUMN created_at SET NOT NULL;
    END IF;
END $$;

-- =============================================================================
-- PART 3: ADD UNIQUE CONSTRAINTS AND CHECK CONSTRAINTS
-- =============================================================================

-- Add unique constraints to prevent duplicates (with error handling)
DO $$
BEGIN
    -- Add unique constraint for user confession likes
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'unique_user_confession_like' AND table_name = 'user_likes') THEN
        ALTER TABLE user_likes ADD CONSTRAINT unique_user_confession_like
          UNIQUE (user_id, confession_id) DEFERRABLE INITIALLY DEFERRED;
    END IF;

    -- Add unique constraint for user reply likes
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'unique_user_reply_like' AND table_name = 'user_likes') THEN
        ALTER TABLE user_likes ADD CONSTRAINT unique_user_reply_like
          UNIQUE (user_id, reply_id) DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- Add check constraints for data validation (with error handling)
DO $$
BEGIN
    -- Content length constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_content_length' AND table_name = 'confessions') THEN
        ALTER TABLE confessions ADD CONSTRAINT check_content_length
          CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 280);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_reply_content_length' AND table_name = 'replies') THEN
        ALTER TABLE replies ADD CONSTRAINT check_reply_content_length
          CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 280);
    END IF;

    -- Likes non-negative constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_likes_non_negative' AND table_name = 'confessions') THEN
        ALTER TABLE confessions ADD CONSTRAINT check_likes_non_negative
          CHECK (likes >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_reply_likes_non_negative' AND table_name = 'replies') THEN
        ALTER TABLE replies ADD CONSTRAINT check_reply_likes_non_negative
          CHECK (likes >= 0);
    END IF;

    -- Skip the video fields constraint for now to avoid issues with existing data
    -- This can be added later once data is cleaned up manually if needed

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_video_duration_positive' AND table_name = 'confessions') THEN
        ALTER TABLE confessions ADD CONSTRAINT check_video_duration_positive
          CHECK (video_duration IS NULL OR video_duration > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'check_video_file_size_positive' AND table_name = 'confessions') THEN
        ALTER TABLE confessions ADD CONSTRAINT check_video_file_size_positive
          CHECK (video_file_size IS NULL OR video_file_size > 0);
    END IF;
END $$;

-- =============================================================================
-- PART 4: ADD MISSING FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add proper foreign key constraints with cascading (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_video_analytics_confession') THEN
        ALTER TABLE video_analytics ADD CONSTRAINT fk_video_analytics_confession 
          FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================================================
-- PART 5: CREATE UPDATED_AT TRIGGER FUNCTION AND TRIGGERS
-- =============================================================================

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
DROP TRIGGER IF EXISTS update_confessions_updated_at ON confessions;
CREATE TRIGGER update_confessions_updated_at BEFORE UPDATE ON confessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_replies_updated_at ON replies;
CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_analytics_updated_at ON video_analytics;
CREATE TRIGGER update_video_analytics_updated_at BEFORE UPDATE ON video_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 6: ADD PERFORMANCE INDEXES
-- =============================================================================

-- Confessions table indexes
CREATE INDEX IF NOT EXISTS idx_confessions_timestamp ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
CREATE INDEX IF NOT EXISTS idx_confessions_is_anonymous ON confessions(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_confessions_likes ON confessions(likes DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_timestamp ON confessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_video_status ON confessions(video_processing_status);
CREATE INDEX IF NOT EXISTS idx_confessions_video_type ON confessions(type) WHERE type = 'video';
CREATE INDEX IF NOT EXISTS idx_confessions_video_duration ON confessions(video_duration DESC) WHERE type = 'video';

-- Replies table indexes
CREATE INDEX IF NOT EXISTS idx_replies_confession_id ON replies(confession_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON replies(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_timestamp ON replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_confession_timestamp ON replies(confession_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_likes ON replies(likes DESC);

-- User likes table indexes (for efficient like checking)
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_confession_id ON user_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_reply_id ON user_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_confession ON user_likes(user_id, confession_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_reply ON user_likes(user_id, reply_id);

-- Video analytics table indexes
CREATE INDEX IF NOT EXISTS idx_video_analytics_confession_id ON video_analytics(confession_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_last_watched ON video_analytics(last_watched DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_completion_rate ON video_analytics(completion_rate DESC);

-- User profiles table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarded ON user_profiles(is_onboarded);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_onboarded ON user_profiles(id, is_onboarded);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_users ON user_profiles(last_login_at DESC) WHERE is_onboarded = true;

-- User preferences table indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_confessions_public_recent ON confessions(created_at DESC) WHERE is_anonymous = true;
CREATE INDEX IF NOT EXISTS idx_confessions_user_recent ON confessions(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- =============================================================================
-- PART 7: ENABLE ROW LEVEL SECURITY (RLS) AND CREATE POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
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

-- =============================================================================
-- PART 8: ADD DOCUMENTATION COMMENTS
-- =============================================================================

-- Add comments for documentation
COMMENT ON COLUMN confessions.video_url IS 'Processed video URL for streaming';
COMMENT ON COLUMN confessions.transcription IS 'Auto-generated transcription for accessibility and search';
COMMENT ON COLUMN confessions.video_processing_status IS 'Current status of video processing pipeline';
COMMENT ON COLUMN confessions.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN confessions.video_thumbnail_url IS 'Thumbnail image URL for video previews';
COMMENT ON COLUMN confessions.video_quality IS 'Video quality setting used for processing';
COMMENT ON COLUMN confessions.video_file_size IS 'Video file size in bytes';

COMMENT ON CONSTRAINT unique_user_confession_like ON user_likes IS 'Prevents duplicate likes on confessions';
COMMENT ON CONSTRAINT unique_user_reply_like ON user_likes IS 'Prevents duplicate likes on replies';
COMMENT ON CONSTRAINT check_content_length ON confessions IS 'Ensures confession content is within limits';
COMMENT ON CONSTRAINT check_reply_content_length ON replies IS 'Ensures reply content is within limits';

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row updates';

COMMENT ON INDEX idx_confessions_timestamp IS 'Optimizes ordering confessions by creation time';
COMMENT ON INDEX idx_confessions_user_id IS 'Optimizes filtering confessions by user';
COMMENT ON INDEX idx_replies_confession_timestamp IS 'Optimizes loading replies for a confession ordered by time';
COMMENT ON INDEX idx_user_likes_user_confession IS 'Optimizes checking if user liked a confession';
COMMENT ON INDEX idx_video_analytics_confession_id IS 'Optimizes video analytics lookups by confession';
COMMENT ON INDEX idx_user_profiles_username IS 'Optimizes user profile lookups by username';

-- =============================================================================
-- DEPLOYMENT COMPLETE
-- =============================================================================

-- This completes all Phase 2 backend improvements:
-- ✅ Added missing columns and video fields
-- ✅ Set proper defaults and NOT NULL constraints
-- ✅ Added unique constraints and check constraints
-- ✅ Added missing foreign key constraints
-- ✅ Created updated_at triggers for all tables
-- ✅ Added 25+ performance indexes
-- ✅ Enabled RLS and created comprehensive security policies
-- ✅ Added documentation comments

SELECT 'SupaSecret Phase 2 Backend Schema Update Complete!' as status;
