-- Migration: Add trending functionality support
-- This migration adds database functions to support trending hashtags and secrets

-- Function to extract hashtags from text
CREATE OR REPLACE FUNCTION extract_hashtags(text_content TEXT)
RETURNS TEXT[] AS $$
BEGIN
  -- Extract hashtags using regex pattern
  RETURN regexp_split_to_array(
    regexp_replace(
      lower(text_content), 
      '.*?(#[a-zA-Z0-9_\u00c0-\u024f\u1e00-\u1eff]+).*?', 
      '\1 ', 
      'g'
    ), 
    '\s+'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get trending hashtags for a time period
CREATE OR REPLACE FUNCTION get_trending_hashtags(hours_back INTEGER DEFAULT 24, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  hashtag TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH hashtag_counts AS (
    SELECT 
      unnest(
        extract_hashtags(c.content) || 
        COALESCE(extract_hashtags(c.transcription), ARRAY[]::TEXT[])
      ) as hashtag,
      COUNT(*) as hashtag_count
    FROM confessions c
    WHERE c.created_at >= NOW() - INTERVAL '1 hour' * hours_back
      AND c.content IS NOT NULL
    GROUP BY hashtag
    HAVING hashtag IS NOT NULL AND hashtag != ''
  ),
  total_hashtags AS (
    SELECT SUM(hashtag_count) as total_count
    FROM hashtag_counts
  )
  SELECT 
    hc.hashtag,
    hc.hashtag_count as count,
    ROUND((hc.hashtag_count::NUMERIC / NULLIF(tc.total_count, 0)) * 100, 2) as percentage
  FROM hashtag_counts hc
  CROSS JOIN total_hashtags tc
  ORDER BY hc.hashtag_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  confession_likes INTEGER,
  confession_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS NUMERIC AS $$
DECLARE
  hours_old NUMERIC;
  decay_factor NUMERIC;
BEGIN
  -- Calculate hours since creation
  hours_old := EXTRACT(EPOCH FROM (NOW() - confession_created_at)) / 3600;
  
  -- Apply exponential decay (half-life of 24 hours)
  decay_factor := EXP(-hours_old / 24.0);
  
  -- Return engagement score
  RETURN COALESCE(confession_likes, 0) * decay_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get trending secrets
CREATE OR REPLACE FUNCTION get_trending_secrets(hours_back INTEGER DEFAULT 24, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  id TEXT,
  user_id TEXT,
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

-- Function to search confessions by hashtag
CREATE OR REPLACE FUNCTION search_confessions_by_hashtag(search_hashtag TEXT)
RETURNS TABLE(
  id TEXT,
  user_id TEXT,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_likes ON confessions(likes DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_content_hashtags ON confessions USING gin(to_tsvector('english', content));

-- Add RLS policies for the functions (they should respect existing confession access rules)
-- Note: These functions will inherit the RLS policies of the confessions table

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_hashtags(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_score(INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_secrets(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_confessions_by_hashtag(TEXT) TO authenticated;

-- Grant execute permissions to anonymous users (for public trending data)
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_trending_hashtags(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION calculate_engagement_score(INTEGER, TIMESTAMP WITH TIME ZONE) TO anon;
GRANT EXECUTE ON FUNCTION get_trending_secrets(INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION search_confessions_by_hashtag(TEXT) TO anon;
