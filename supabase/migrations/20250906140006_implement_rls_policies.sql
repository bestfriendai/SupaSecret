-- Implement comprehensive Row Level Security (RLS) policies
-- This migration ensures data security and proper access control

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Anyone can view confessions" ON confessions;
DROP POLICY IF EXISTS "Users can insert their own confessions" ON confessions;
DROP POLICY IF EXISTS "Users can update their own confessions" ON confessions;
DROP POLICY IF EXISTS "Users can delete their own confessions" ON confessions;

DROP POLICY IF EXISTS "Anyone can view replies" ON replies;
DROP POLICY IF EXISTS "Users can insert replies" ON replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON replies;

DROP POLICY IF EXISTS "Users can view their own likes" ON user_likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON user_likes;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view their own analytics" ON video_analytics;
DROP POLICY IF EXISTS "Users can manage their own analytics" ON video_analytics;

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

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own profile" ON user_profiles IS 'Users can only access their own profile data';
COMMENT ON POLICY "Anyone can view confessions" ON confessions IS 'Confessions are publicly viewable for the feed';
COMMENT ON POLICY "Users can manage their own likes" ON user_likes IS 'Users can only manage their own likes';
COMMENT ON POLICY "Users can view analytics for their confessions" ON video_analytics IS 'Users can only view analytics for their own confessions';
