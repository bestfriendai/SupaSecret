-- Migration: Fix hashtag extraction function v2
-- This migration fixes the variable naming conflict

-- Drop and recreate the extract_hashtags function with proper variable naming
DROP FUNCTION IF EXISTS extract_hashtags(TEXT);

CREATE OR REPLACE FUNCTION extract_hashtags(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
  result_array TEXT[];
BEGIN
  -- Return empty array if input is null or empty
  IF text_content IS NULL OR text_content = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Extract hashtags using regex and return with # prefix
  SELECT ARRAY(
    SELECT DISTINCT '#' || lower(match[1])
    FROM regexp_matches(text_content, '#([a-zA-Z0-9_]+)', 'g') AS match
    WHERE length(match[1]) > 0
  ) INTO result_array;
  
  RETURN COALESCE(result_array, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO anon;
