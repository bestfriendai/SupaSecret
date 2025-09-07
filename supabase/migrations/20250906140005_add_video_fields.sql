-- Add missing video_url and transcription fields to confessions table
-- This migration adds proper video storage handling capabilities

-- Add video_url field for storing processed video URLs
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add transcription field for video accessibility and search
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS transcription TEXT;

-- Add video processing status field to track video processing state
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_processing_status TEXT 
  DEFAULT 'pending' CHECK (video_processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add video duration field for better video management
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_duration INTEGER;

-- Add video thumbnail URL for better UI performance
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- Add video quality metadata
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_quality TEXT 
  DEFAULT 'auto' CHECK (video_quality IN ('auto', 'high', 'medium', 'low'));

-- Add video file size for storage management
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS video_file_size BIGINT;

-- Create indexes for video-related queries
CREATE INDEX IF NOT EXISTS idx_confessions_video_status ON confessions(video_processing_status);
CREATE INDEX IF NOT EXISTS idx_confessions_video_type ON confessions(type) WHERE type = 'video';
CREATE INDEX IF NOT EXISTS idx_confessions_video_duration ON confessions(video_duration DESC) WHERE type = 'video';

-- Add constraints for video fields
ALTER TABLE confessions ADD CONSTRAINT check_video_fields 
  CHECK (
    (type = 'text' AND video_uri IS NULL AND video_url IS NULL AND transcription IS NULL) OR
    (type = 'video' AND (video_uri IS NOT NULL OR video_url IS NOT NULL))
  );

ALTER TABLE confessions ADD CONSTRAINT check_video_duration_positive 
  CHECK (video_duration IS NULL OR video_duration > 0);

ALTER TABLE confessions ADD CONSTRAINT check_video_file_size_positive 
  CHECK (video_file_size IS NULL OR video_file_size > 0);

-- Add comments for documentation
COMMENT ON COLUMN confessions.video_url IS 'Processed video URL for streaming';
COMMENT ON COLUMN confessions.transcription IS 'Auto-generated transcription for accessibility and search';
COMMENT ON COLUMN confessions.video_processing_status IS 'Current status of video processing pipeline';
COMMENT ON COLUMN confessions.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN confessions.video_thumbnail_url IS 'Thumbnail image URL for video previews';
COMMENT ON COLUMN confessions.video_quality IS 'Video quality setting used for processing';
COMMENT ON COLUMN confessions.video_file_size IS 'Video file size in bytes';

COMMENT ON CONSTRAINT check_video_fields ON confessions IS 'Ensures video fields are consistent with confession type';
COMMENT ON CONSTRAINT check_video_duration_positive ON confessions IS 'Ensures video duration is positive';
COMMENT ON CONSTRAINT check_video_file_size_positive ON confessions IS 'Ensures video file size is positive';
