-- Add sample video confessions for testing the TikTok-style video feed
-- This migration adds 5 sample video confessions with realistic data

-- First, let's ensure we have the necessary columns in the confessions table
-- Add video_url column if it doesn't exist (alternative to video_uri)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'confessions' AND column_name = 'video_url') THEN
        ALTER TABLE public.confessions ADD COLUMN video_url text;
    END IF;
END $$;

-- Add views column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'confessions' AND column_name = 'views') THEN
        ALTER TABLE public.confessions ADD COLUMN views integer DEFAULT 0;
    END IF;
END $$;

-- Add likes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'confessions' AND column_name = 'likes') THEN
        ALTER TABLE public.confessions ADD COLUMN likes integer DEFAULT 0;
    END IF;
END $$;

-- Insert sample video confessions
INSERT INTO public.confessions (
    id,
    type,
    content,
    video_uri,
    video_url,
    transcription,
    created_at,
    is_anonymous,
    likes,
    views
) VALUES 
-- Video 1: Nature/Sunset
(
    gen_random_uuid(),
    'video',
    'Check out this amazing sunset! 🌅 The colors are absolutely breathtaking. Nature never fails to amaze me. #nature #sunset #beautiful #peaceful',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'This is a beautiful sunset video with amazing colors painting the sky. The peaceful atmosphere and natural beauty create a perfect moment of tranquility.',
    now() - interval '2 hours',
    true,
    42,
    156
),

-- Video 2: Dance/Fun
(
    gen_random_uuid(),
    'video',
    'Dancing in the rain! 💃 Sometimes you just have to let loose and enjoy life. Who cares if you get wet? #dance #fun #rain #happiness #yolo',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'A fun dance video in the rain showing pure joy and freedom. The energy is infectious and reminds us to embrace spontaneous moments.',
    now() - interval '4 hours',
    true,
    89,
    234
),

-- Video 3: Cooking/Food
(
    gen_random_uuid(),
    'video',
    'Cooking my favorite pasta recipe! 👨‍🍳 This has been in my family for generations. The secret ingredient is love (and a lot of garlic). #cooking #food #recipe #pasta #family',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Step by step cooking tutorial for delicious pasta. Watch as I prepare this traditional family recipe with fresh ingredients and time-honored techniques.',
    now() - interval '6 hours',
    true,
    67,
    189
),

-- Video 4: Fitness/Motivation
(
    gen_random_uuid(),
    'video',
    'Morning workout complete! 💪 Started my day with a 5K run and some strength training. Feeling energized and ready to conquer the day! #fitness #motivation #workout #health #morning',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'High-energy workout video showing morning exercise routine. Demonstrates various exercises and motivational tips for staying fit and healthy.',
    now() - interval '8 hours',
    true,
    123,
    298
),

-- Video 5: Travel/Adventure
(
    gen_random_uuid(),
    'video',
    'Exploring hidden gems in the city! 🏙️ Found this amazing street art and cozy café tucked away in an alley. Sometimes the best adventures are right in your backyard. #travel #explore #city #streetart #adventure',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'Urban exploration video showcasing hidden spots in the city. Features beautiful street art, local culture, and the excitement of discovering new places.',
    now() - interval '12 hours',
    true,
    78,
    167
);

-- Create or update the toggle_confession_like function
CREATE OR REPLACE FUNCTION public.toggle_confession_like(confession_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_likes integer;
    user_has_liked boolean := false;
BEGIN
    -- Get current likes count
    SELECT likes INTO current_likes 
    FROM public.confessions 
    WHERE id = confession_uuid;
    
    IF current_likes IS NULL THEN
        RETURN false; -- Confession not found
    END IF;
    
    -- For now, we'll just increment/decrement likes
    -- In a real app, you'd check user_likes table to see if user already liked
    -- This is a simplified version for testing
    
    -- Simulate toggling: if likes is even, increment (like), if odd, decrement (unlike)
    IF current_likes % 2 = 0 THEN
        -- Like the confession
        UPDATE public.confessions 
        SET likes = likes + 1 
        WHERE id = confession_uuid;
        user_has_liked := true;
    ELSE
        -- Unlike the confession
        UPDATE public.confessions 
        SET likes = greatest(0, likes - 1) 
        WHERE id = confession_uuid;
        user_has_liked := false;
    END IF;
    
    RETURN user_has_liked;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.toggle_confession_like(uuid) TO anon, authenticated, service_role;

-- Create function to increment video views
CREATE OR REPLACE FUNCTION public.increment_video_views(confession_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.confessions 
    SET views = views + 1 
    WHERE id = confession_uuid AND type = 'video';
    
    RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_video_views(uuid) TO anon, authenticated, service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS confessions_type_video_idx ON public.confessions (type) WHERE type = 'video';
CREATE INDEX IF NOT EXISTS confessions_video_uri_idx ON public.confessions (video_uri) WHERE video_uri IS NOT NULL;
CREATE INDEX IF NOT EXISTS confessions_likes_idx ON public.confessions (likes DESC);
CREATE INDEX IF NOT EXISTS confessions_views_idx ON public.confessions (views DESC);

-- Update the existing confessions to have some baseline likes and views if they don't already
UPDATE public.confessions 
SET 
    likes = COALESCE(likes, floor(random() * 50)::integer),
    views = COALESCE(views, floor(random() * 200 + 50)::integer)
WHERE likes IS NULL OR views IS NULL;

-- Add some comments to explain the sample data
COMMENT ON TABLE public.confessions IS 'Confessions table with support for text and video content';
COMMENT ON COLUMN public.confessions.video_uri IS 'Primary video URL field';
COMMENT ON COLUMN public.confessions.video_url IS 'Alternative video URL field for compatibility';
COMMENT ON COLUMN public.confessions.likes IS 'Number of likes for this confession';
COMMENT ON COLUMN public.confessions.views IS 'Number of views for this confession';
COMMENT ON COLUMN public.confessions.transcription IS 'Video transcription or additional text content';
