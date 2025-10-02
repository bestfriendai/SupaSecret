-- Add face blur and voice change tracking columns to confessions table
-- This migration adds columns to track privacy features applied to video confessions

-- Add has_face_blur column
ALTER TABLE confessions 
ADD COLUMN IF NOT EXISTS has_face_blur boolean DEFAULT false;

-- Add has_voice_change column
ALTER TABLE confessions 
ADD COLUMN IF NOT EXISTS has_voice_change boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN confessions.has_face_blur IS 'Indicates if face blur was applied to the video';
COMMENT ON COLUMN confessions.has_voice_change IS 'Indicates if voice modification was applied to the video';

-- Create index for filtering videos with privacy features
CREATE INDEX IF NOT EXISTS idx_confessions_privacy_features 
ON confessions(has_face_blur, has_voice_change) 
WHERE type = 'video';

