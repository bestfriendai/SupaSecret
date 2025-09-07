-- Add performance indexes for frequently queried fields
-- This migration improves query performance across the application

-- Confessions table indexes
CREATE INDEX IF NOT EXISTS idx_confessions_timestamp ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
CREATE INDEX IF NOT EXISTS idx_confessions_is_anonymous ON confessions(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_confessions_likes ON confessions(likes DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_timestamp ON confessions(user_id, created_at DESC);

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

-- User preferences table indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Additional composite indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_onboarded ON user_profiles(id, is_onboarded);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_users ON user_profiles(last_login_at DESC) WHERE is_onboarded = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_confessions_public_recent ON confessions(created_at DESC) WHERE is_anonymous = true;
CREATE INDEX IF NOT EXISTS idx_confessions_user_recent ON confessions(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_confessions_timestamp IS 'Optimizes ordering confessions by creation time';
COMMENT ON INDEX idx_confessions_user_id IS 'Optimizes filtering confessions by user';
COMMENT ON INDEX idx_replies_confession_timestamp IS 'Optimizes loading replies for a confession ordered by time';
COMMENT ON INDEX idx_user_likes_user_confession IS 'Optimizes checking if user liked a confession';
COMMENT ON INDEX idx_video_analytics_confession_id IS 'Optimizes video analytics lookups by confession';
COMMENT ON INDEX idx_user_profiles_username IS 'Optimizes user profile lookups by username';
