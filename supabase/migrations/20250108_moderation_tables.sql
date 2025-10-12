-- Moderation Tables for App Store Guideline 1.2 Compliance
-- Handles user blocking, content hiding, and moderation actions

-- Table: blocked_users
-- Users can block other users to prevent seeing their content
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can't block the same user twice
  UNIQUE(user_id, blocked_user_id),
  
  -- Prevent self-blocking
  CHECK (user_id != blocked_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- RLS Policies
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own blocks
CREATE POLICY "Users can view their own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own blocks
CREATE POLICY "Users can create their own blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = user_id);

-- Table: hidden_content
-- Users can hide specific content from their feed
CREATE TABLE IF NOT EXISTS hidden_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('confession', 'reply')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can't hide the same content twice
  UNIQUE(user_id, content_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hidden_content_user_id ON hidden_content(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_content_content_id ON hidden_content(content_id);

-- RLS Policies
ALTER TABLE hidden_content ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden content
CREATE POLICY "Users can view their own hidden content"
  ON hidden_content FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own hidden content
CREATE POLICY "Users can create their own hidden content"
  ON hidden_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own hidden content
CREATE POLICY "Users can delete their own hidden content"
  ON hidden_content FOR DELETE
  USING (auth.uid() = user_id);

-- Table: content_moderation_queue
-- Admin queue for reviewing reported content
CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('confession', 'reply')),
  report_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'removed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  first_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(content_id, content_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON content_moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON content_moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON content_moderation_queue(content_id, content_type);

-- RLS Policies (Admin only)
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view moderation queue
CREATE POLICY "Admins can view moderation queue"
  ON content_moderation_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update moderation queue
CREATE POLICY "Admins can update moderation queue"
  ON content_moderation_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function: Add content to moderation queue when reported
CREATE OR REPLACE FUNCTION add_to_moderation_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update moderation queue entry
  INSERT INTO content_moderation_queue (
    content_id,
    content_type,
    report_count,
    last_reported_at,
    priority
  )
  VALUES (
    COALESCE(NEW.confession_id, NEW.reply_id),
    CASE WHEN NEW.confession_id IS NOT NULL THEN 'confession' ELSE 'reply' END,
    1,
    NOW(),
    -- Set priority based on reason
    CASE 
      WHEN NEW.reason IN ('violence', 'hate_speech', 'harassment') THEN 'urgent'
      WHEN NEW.reason IN ('inappropriate_content', 'spam') THEN 'high'
      ELSE 'normal'
    END
  )
  ON CONFLICT (content_id, content_type) DO UPDATE SET
    report_count = content_moderation_queue.report_count + 1,
    last_reported_at = NOW(),
    priority = CASE 
      WHEN content_moderation_queue.report_count + 1 >= 5 THEN 'urgent'
      WHEN content_moderation_queue.report_count + 1 >= 3 THEN 'high'
      ELSE content_moderation_queue.priority
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Add to moderation queue when report is created
DROP TRIGGER IF EXISTS trigger_add_to_moderation_queue ON reports;
CREATE TRIGGER trigger_add_to_moderation_queue
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION add_to_moderation_queue();

-- Function: Auto-remove content with high report count
CREATE OR REPLACE FUNCTION auto_remove_reported_content()
RETURNS TRIGGER AS $$
BEGIN
  -- If report count reaches threshold, auto-remove content
  IF NEW.report_count >= 10 AND NEW.status = 'pending' THEN
    -- Update status to removed
    UPDATE content_moderation_queue
    SET 
      status = 'removed',
      action_taken = 'auto_removed_high_reports',
      reviewed_at = NOW()
    WHERE id = NEW.id;
    
    -- Hide the content (soft delete)
    IF NEW.content_type = 'confession' THEN
      UPDATE confessions
      SET is_hidden = true, hidden_reason = 'auto_removed_high_reports'
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'reply' THEN
      UPDATE replies
      SET is_hidden = true, hidden_reason = 'auto_removed_high_reports'
      WHERE id = NEW.content_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-remove content with high report count
DROP TRIGGER IF EXISTS trigger_auto_remove_content ON content_moderation_queue;
CREATE TRIGGER trigger_auto_remove_content
  AFTER UPDATE OF report_count ON content_moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_remove_reported_content();

-- Add is_hidden column to confessions and replies if not exists
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

-- Create indexes for hidden content filtering
CREATE INDEX IF NOT EXISTS idx_confessions_is_hidden ON confessions(is_hidden) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_replies_is_hidden ON replies(is_hidden) WHERE is_hidden = FALSE;

