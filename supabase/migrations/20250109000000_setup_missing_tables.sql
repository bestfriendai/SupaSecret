-- Migration: Setup missing tables for SupaSecret app
-- This migration creates the replies and user_likes tables if they don't exist
-- and sets up proper RLS policies

-- Create replies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confession_id UUID REFERENCES public.confessions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES public.replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure either confession_id or reply_id is set, but not both
    CONSTRAINT user_likes_target_check CHECK (
        (confession_id IS NOT NULL AND reply_id IS NULL) OR 
        (confession_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_replies_confession_id ON public.replies(confession_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON public.replies(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON public.replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_confession_timestamp ON public.replies(confession_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON public.user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_confession_id ON public.user_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_reply_id ON public.user_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_confession ON public.user_likes(user_id, confession_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_reply ON public.user_likes(user_id, reply_id);

-- Create unique constraints to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_confession_like 
ON public.user_likes(user_id, confession_id) 
WHERE confession_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_reply_like 
ON public.user_likes(user_id, reply_id) 
WHERE reply_id IS NOT NULL;

-- Add constraints for data validation (with error handling)
DO $$
BEGIN
    -- Add content length constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_reply_content_length'
        AND table_name = 'replies'
    ) THEN
        ALTER TABLE public.replies
        ADD CONSTRAINT check_reply_content_length
        CHECK (length(content) > 0 AND length(content) <= 500);
    END IF;

    -- Add likes constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_reply_likes_non_negative'
        AND table_name = 'replies'
    ) THEN
        ALTER TABLE public.replies
        ADD CONSTRAINT check_reply_likes_non_negative
        CHECK (likes >= 0);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view replies" ON public.replies;
DROP POLICY IF EXISTS "Authenticated users can insert replies" ON public.replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON public.replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON public.replies;

DROP POLICY IF EXISTS "Users can view all likes" ON public.user_likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.user_likes;

-- Create RLS policies for replies table
CREATE POLICY "Anyone can view replies" ON public.replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert replies" ON public.replies
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (user_id = auth.uid() OR user_id IS NULL)
    );

CREATE POLICY "Users can update their own replies" ON public.replies
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

CREATE POLICY "Users can delete their own replies" ON public.replies
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- Create RLS policies for user_likes table
CREATE POLICY "Users can view all likes" ON public.user_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON public.user_likes
    FOR ALL USING (
        auth.uid() IS NOT NULL AND 
        user_id = auth.uid()
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_replies_updated_at ON public.replies;
CREATE TRIGGER update_replies_updated_at
    BEFORE UPDATE ON public.replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.replies TO anon, authenticated;
GRANT ALL ON public.user_likes TO anon, authenticated;

-- Insert some test data to verify everything works
-- (This will be ignored if data already exists due to unique constraints)
INSERT INTO public.replies (confession_id, user_id, content, is_anonymous, likes)
SELECT 
    c.id,
    NULL, -- Anonymous reply
    'This is a test reply to verify the replies system is working.',
    true,
    0
FROM public.confessions c
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add a comment to track this migration
COMMENT ON TABLE public.replies IS 'Stores user replies to confessions - created by migration 20250109000000';
COMMENT ON TABLE public.user_likes IS 'Stores user likes for confessions and replies - created by migration 20250109000000';
