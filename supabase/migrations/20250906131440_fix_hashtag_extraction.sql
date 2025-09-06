-- Migration: Fix hashtag extraction function
-- This migration fixes the regex pattern for extracting hashtags

-- Drop and recreate the extract_hashtags function with a better implementation
DROP FUNCTION IF EXISTS extract_hashtags(TEXT);

CREATE OR REPLACE FUNCTION extract_hashtags(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
  hashtag_array TEXT[];
  hashtag TEXT;
BEGIN
  -- Return empty array if input is null or empty
  IF text_content IS NULL OR text_content = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- Extract hashtags using a simpler approach
  -- Find all words that start with # followed by alphanumeric characters
  SELECT ARRAY(
    SELECT DISTINCT lower(match[1])
    FROM regexp_matches(text_content, '#([a-zA-Z0-9_]+)', 'g') AS match
    WHERE length(match[1]) > 0
  ) INTO hashtag_array;
  
  -- Return the array of hashtags with # prefix
  SELECT ARRAY(
    SELECT '#' || hashtag
    FROM unnest(hashtag_array) AS hashtag
  ) INTO hashtag_array;
  
  RETURN COALESCE(hashtag_array, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_hashtags(TEXT) TO anon;
