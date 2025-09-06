-- Migration: Fix trending secrets function types
-- This migration fixes the type mismatch in get_trending_secrets function

-- Drop and recreate the get_trending_secrets function with correct types
DROP FUNCTION IF EXISTS get_trending_secrets(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_trending_secrets(hours_back INTEGER DEFAULT 24, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  type TEXT,
  content TEXT,
  video_uri TEXT,
  transcription TEXT,
  is_anonymous BOOLEAN,
  likes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  engagement_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.type::TEXT,
    c.content,
    c.video_uri,
    c.transcription,
    c.is_anonymous,
    c.likes,
    c.created_at,
    calculate_engagement_score(c.likes, c.created_at) as engagement_score
  FROM confessions c
  WHERE c.created_at >= NOW() - INTERVAL '1 hour' * hours_back
  ORDER BY calculate_engagement_score(c.likes, c.created_at) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Also fix the search_confessions_by_hashtag function
DROP FUNCTION IF EXISTS search_confessions_by_hashtag(TEXT);

CREATE OR REPLACE FUNCTION search_confessions_by_hashtag(search_hashtag TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  type TEXT,
  content TEXT,
  video_uri TEXT,
  transcription TEXT,
  is_anonymous BOOLEAN,
  likes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  normalized_hashtag TEXT;
BEGIN
  -- Normalize hashtag (ensure it starts with # and is lowercase)
  normalized_hashtag := lower(
    CASE 
      WHEN search_hashtag LIKE '#%' THEN search_hashtag
      ELSE '#' || search_hashtag
    END
  );
  
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.type::TEXT,
    c.content,
    c.video_uri,
    c.transcription,
    c.is_anonymous,
    c.likes,
    c.created_at
  FROM confessions c
  WHERE 
    normalized_hashtag = ANY(
      extract_hashtags(c.content) || 
      COALESCE(extract_hashtags(c.transcription), ARRAY[]::TEXT[])
    )
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trending_secrets(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_secrets(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION search_confessions_by_hashtag(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_confessions_by_hashtag(TEXT) TO anon;
