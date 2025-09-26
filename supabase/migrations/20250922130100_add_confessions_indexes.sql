-- Add performance indexes for confessions table
-- Migration: 20250922130100_add_confessions_indexes

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions (user_id);

-- Create index on created_at DESC for recent content queries (trending, feeds)
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions (created_at DESC);

-- Create index on views DESC for popular content ranking
CREATE INDEX IF NOT EXISTS idx_confessions_views ON confessions (views DESC);

-- Composite index for analytics queries (user, created_at range)
CREATE INDEX IF NOT EXISTS idx_confessions_user_created ON confessions (user_id, created_at DESC);

-- Comment for future reference
COMMENT ON INDEX idx_confessions_user_id IS 'Index for user-specific confession queries';
COMMENT ON INDEX idx_confessions_created_at IS 'Index for chronological and trending queries';
COMMENT ON INDEX idx_confessions_views IS 'Index for popularity-based ranking';

-- Verify indexes created
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'confessions';
