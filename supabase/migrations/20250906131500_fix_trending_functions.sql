-- Migration: Fix trending functions
-- This migration fixes the get_trending_hashtags function

-- Drop and recreate the get_trending_hashtags function with better logic
DROP FUNCTION IF EXISTS get_trending_hashtags(INTEGER, INTEGER);

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
      ) as hashtag_text
    FROM confessions c
    WHERE c.created_at >= NOW() - INTERVAL '1 hour' * hours_back
      AND c.content IS NOT NULL
  ),
  aggregated_counts AS (
    SELECT 
      hashtag_text as hashtag,
      COUNT(*) as hashtag_count
    FROM hashtag_counts
    WHERE hashtag_text IS NOT NULL AND hashtag_text != ''
    GROUP BY hashtag_text
  ),
  total_hashtags AS (
    SELECT SUM(hashtag_count) as total_count
    FROM aggregated_counts
  )
  SELECT 
    ac.hashtag,
    ac.hashtag_count as count,
    ROUND((ac.hashtag_count::NUMERIC / NULLIF(tc.total_count, 0)) * 100, 2) as percentage
  FROM aggregated_counts ac
  CROSS JOIN total_hashtags tc
  ORDER BY ac.hashtag_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trending_hashtags(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_hashtags(INTEGER, INTEGER) TO anon;
