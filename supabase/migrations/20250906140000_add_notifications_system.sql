-- Migration: Add notifications system
-- This migration creates the notifications table and triggers for likes and replies

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'reply')),
  entity_id uuid NOT NULL, -- confession_id or reply_id
  entity_type text NOT NULL CHECK (entity_type IN ('confession', 'reply')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- who performed the action
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  likes_enabled boolean DEFAULT true,
  replies_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);

-- Function to create notification for confession likes
CREATE OR REPLACE FUNCTION create_confession_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't create notification if user likes their own confession
  IF NEW.user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user has like notifications enabled
  IF EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id)
    AND likes_enabled = true
  ) OR NOT EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id)
  ) THEN
    INSERT INTO notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      actor_user_id,
      message
    ) VALUES (
      (SELECT user_id FROM confessions WHERE id = NEW.confession_id),
      'like',
      NEW.confession_id,
      'confession',
      NEW.user_id,
      'Someone liked your secret'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for reply likes
CREATE OR REPLACE FUNCTION create_reply_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't create notification if user likes their own reply
  IF NEW.user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user has like notifications enabled
  IF EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id)
    AND likes_enabled = true
  ) OR NOT EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id)
  ) THEN
    INSERT INTO notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      actor_user_id,
      message
    ) VALUES (
      (SELECT user_id FROM replies WHERE id = NEW.reply_id),
      'like',
      NEW.reply_id,
      'reply',
      NEW.user_id,
      'Someone liked your reply'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for new replies
CREATE OR REPLACE FUNCTION create_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't create notification if user replies to their own confession
  IF NEW.user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user has reply notifications enabled
  IF EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id)
    AND replies_enabled = true
  ) OR NOT EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM confessions WHERE id = NEW.confession_id)
  ) THEN
    INSERT INTO notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      actor_user_id,
      message
    ) VALUES (
      (SELECT user_id FROM confessions WHERE id = NEW.confession_id),
      'reply',
      NEW.confession_id,
      'confession',
      NEW.user_id,
      'Someone replied to your secret'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS confession_like_notification_trigger ON user_likes;
CREATE TRIGGER confession_like_notification_trigger
  AFTER INSERT ON user_likes
  FOR EACH ROW
  WHEN (NEW.confession_id IS NOT NULL)
  EXECUTE FUNCTION create_confession_like_notification();

DROP TRIGGER IF EXISTS reply_like_notification_trigger ON user_likes;
CREATE TRIGGER reply_like_notification_trigger
  AFTER INSERT ON user_likes
  FOR EACH ROW
  WHEN (NEW.reply_id IS NOT NULL)
  EXECUTE FUNCTION create_reply_like_notification();

DROP TRIGGER IF EXISTS reply_notification_trigger ON replies;
CREATE TRIGGER reply_notification_trigger
  AFTER INSERT ON replies
  FOR EACH ROW
  EXECUTE FUNCTION create_reply_notification();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notifications
    WHERE user_id = target_user_id
    AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on notifications tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for notification preferences (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
