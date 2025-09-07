-- Add missing timestamps, constraints, and defaults
-- This migration improves data integrity and consistency

-- Add updated_at columns where missing and set up triggers
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE replies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE video_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure created_at has proper defaults
ALTER TABLE confessions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE replies ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_likes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_preferences ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_profiles ALTER COLUMN created_at SET DEFAULT NOW();

-- Add NOT NULL constraints where appropriate
ALTER TABLE confessions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE confessions ALTER COLUMN content SET NOT NULL;
ALTER TABLE confessions ALTER COLUMN is_anonymous SET NOT NULL;
ALTER TABLE confessions ALTER COLUMN likes SET DEFAULT 0;
ALTER TABLE confessions ALTER COLUMN likes SET NOT NULL;

ALTER TABLE replies ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE replies ALTER COLUMN confession_id SET NOT NULL;
ALTER TABLE replies ALTER COLUMN content SET NOT NULL;
ALTER TABLE replies ALTER COLUMN is_anonymous SET NOT NULL;
ALTER TABLE replies ALTER COLUMN likes SET DEFAULT 0;
ALTER TABLE replies ALTER COLUMN likes SET NOT NULL;

ALTER TABLE user_likes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE user_likes ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE user_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE user_profiles ALTER COLUMN is_onboarded SET NOT NULL;

-- Add unique constraints to prevent duplicates
ALTER TABLE user_likes ADD CONSTRAINT unique_user_confession_like
  UNIQUE (user_id, confession_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE user_likes ADD CONSTRAINT unique_user_reply_like
  UNIQUE (user_id, reply_id) DEFERRABLE INITIALLY DEFERRED;

-- Add check constraints for data validation
ALTER TABLE confessions ADD CONSTRAINT check_content_length 
  CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 280);

ALTER TABLE replies ADD CONSTRAINT check_reply_content_length 
  CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 280);

ALTER TABLE confessions ADD CONSTRAINT check_likes_non_negative 
  CHECK (likes >= 0);

ALTER TABLE replies ADD CONSTRAINT check_reply_likes_non_negative 
  CHECK (likes >= 0);

-- Add proper foreign key constraints with cascading (most already exist, adding missing ones)
-- Note: Most foreign keys already exist in the base schema, only adding missing ones

ALTER TABLE video_analytics ADD CONSTRAINT fk_video_analytics_confession
  FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
CREATE TRIGGER update_confessions_updated_at BEFORE UPDATE ON confessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_analytics_updated_at BEFORE UPDATE ON video_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON CONSTRAINT unique_user_confession_like ON user_likes IS 'Prevents duplicate likes on confessions';
COMMENT ON CONSTRAINT unique_user_reply_like ON user_likes IS 'Prevents duplicate likes on replies';
COMMENT ON CONSTRAINT check_content_length ON confessions IS 'Ensures confession content is within limits';
COMMENT ON CONSTRAINT check_reply_content_length ON replies IS 'Ensures reply content is within limits';
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row updates';
