-- Enhanced Video Analytics Schema Migration
-- This migration adds comprehensive video analytics capabilities

-- Create video_events table for storing individual analytics events
CREATE TABLE IF NOT EXISTS video_events (
    id BIGSERIAL PRIMARY KEY,
    confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for video_events
CREATE INDEX IF NOT EXISTS idx_video_events_confession_id ON video_events(confession_id);
CREATE INDEX IF NOT EXISTS idx_video_events_session_id ON video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_user_id ON video_events(user_id);
CREATE INDEX IF NOT EXISTS idx_video_events_event_type ON video_events(event_type);
CREATE INDEX IF NOT EXISTS idx_video_events_timestamp ON video_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_video_events_confession_session ON video_events(confession_id, session_id);

-- Enhance existing video_analytics table
ALTER TABLE video_analytics
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS event_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS watch_duration BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS seek_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS buffer_time BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_switches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for enhanced video_analytics
CREATE INDEX IF NOT EXISTS idx_video_analytics_session_id ON video_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_user_id ON video_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_event_timestamp ON video_analytics(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_video_analytics_engagement_score ON video_analytics(engagement_score);

-- Create video_analytics_daily table for pre-aggregated daily metrics
CREATE TABLE IF NOT EXISTS video_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_watch_time BIGINT DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    average_engagement_score DECIMAL(5,2) DEFAULT 0,
    peak_hour INTEGER,
    quality_distribution JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(confession_id, date)
);

-- Add indexes for daily analytics
CREATE INDEX IF NOT EXISTS idx_video_analytics_daily_confession_id ON video_analytics_daily(confession_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_daily_date ON video_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_video_analytics_daily_views ON video_analytics_daily(total_views);
CREATE INDEX IF NOT EXISTS idx_video_analytics_daily_engagement ON video_analytics_daily(average_engagement_score);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW video_engagement_summary AS
SELECT
    confession_id,
    COUNT(DISTINCT session_id) as unique_sessions,
    SUM(watch_time) as total_watch_time,
    AVG(watch_time) as average_watch_time,
    AVG(completion_rate) as average_completion_rate,
    AVG(engagement_score) as average_engagement_score,
    SUM(interactions) as total_interactions,
    MAX(updated_at) as last_updated
FROM video_analytics
WHERE session_id IS NOT NULL
GROUP BY confession_id;

-- Create view for trending videos
CREATE OR REPLACE VIEW trending_videos AS
SELECT
    c.id,
    c.content,
    c.video_uri,
    c.created_at,
    COALESCE(ves.unique_sessions, 0) as unique_sessions,
    COALESCE(ves.total_watch_time, 0) as total_watch_time,
    COALESCE(ves.average_completion_rate, 0) as average_completion_rate,
    COALESCE(ves.average_engagement_score, 0) as average_engagement_score,
    COALESCE(ves.total_interactions, 0) as total_interactions,
    -- Calculate trend score
    (
        COALESCE(ves.average_engagement_score, 0) * 0.4 +
        COALESCE(ves.average_completion_rate, 0) * 0.3 +
        LEAST(COALESCE(ves.unique_sessions, 0), 100) * 0.3
    ) as trend_score
FROM confessions c
LEFT JOIN video_engagement_summary ves ON c.id = ves.confession_id
WHERE c.type = 'video'
AND c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY trend_score DESC;

-- Create stored procedures for analytics aggregation

-- Function to get video engagement summary
CREATE OR REPLACE FUNCTION get_video_engagement_summary(
    period text DEFAULT 'week'
)
RETURNS TABLE (
    total_watch_time bigint,
    average_watch_time numeric,
    average_completion_rate numeric,
    total_views bigint,
    unique_viewers bigint,
    engagement_rate numeric,
    top_videos jsonb,
    time_distribution jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    start_date timestamptz;
    video_data jsonb;
    time_data jsonb;
BEGIN
    -- Determine start date based on period
    CASE period
        WHEN 'day' THEN start_date := NOW() - INTERVAL '1 day';
        WHEN 'week' THEN start_date := NOW() - INTERVAL '1 week';
        WHEN 'month' THEN start_date := NOW() - INTERVAL '1 month';
        ELSE start_date := NOW() - INTERVAL '1 week';
    END CASE;

    -- Get top videos
    SELECT jsonb_agg(
        jsonb_build_object(
            'videoId', confession_id,
            'watchTime', total_watch_time,
            'completionRate', average_completion_rate,
            'engagementScore', average_engagement_score
        )
    ) INTO video_data
    FROM (
        SELECT
            confession_id,
            SUM(watch_time) as total_watch_time,
            AVG(completion_rate) as average_completion_rate,
            AVG(engagement_score) as average_engagement_score
        FROM video_analytics
        WHERE created_at >= start_date
        GROUP BY confession_id
        ORDER BY AVG(engagement_score) DESC
        LIMIT 10
    ) top_videos_query;

    -- Get time distribution
    SELECT jsonb_agg(
        jsonb_build_object(
            'hour', hour,
            'views', view_count,
            'watchTime', total_watch_time
        )
    ) INTO time_data
    FROM (
        SELECT
            EXTRACT(hour FROM event_timestamp) as hour,
            COUNT(*) as view_count,
            SUM(watch_time) as total_watch_time
        FROM video_analytics
        WHERE created_at >= start_date
        AND event_timestamp IS NOT NULL
        GROUP BY EXTRACT(hour FROM event_timestamp)
        ORDER BY hour
    ) time_dist_query;

    -- Return aggregated data
    RETURN QUERY
    SELECT
        COALESCE(SUM(va.watch_time), 0)::bigint as total_watch_time,
        COALESCE(AVG(va.watch_time), 0)::numeric as average_watch_time,
        COALESCE(AVG(va.completion_rate), 0)::numeric as average_completion_rate,
        COUNT(DISTINCT va.session_id)::bigint as total_views,
        COUNT(DISTINCT va.user_id)::bigint as unique_viewers,
        CASE
            WHEN COUNT(DISTINCT va.session_id) > 0
            THEN (COUNT(DISTINCT CASE WHEN va.interactions > 0 THEN va.session_id END)::numeric / COUNT(DISTINCT va.session_id)::numeric * 100)
            ELSE 0::numeric
        END as engagement_rate,
        COALESCE(video_data, '[]'::jsonb) as top_videos,
        COALESCE(time_data, '[]'::jsonb) as time_distribution
    FROM video_analytics va
    WHERE va.created_at >= start_date;
END;
$$;

-- Function to get watch time analytics
CREATE OR REPLACE FUNCTION get_watch_time_analytics(
    video_id uuid DEFAULT NULL
)
RETURNS TABLE (
    total_watch_time bigint,
    average_watch_time numeric,
    sessions bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(va.watch_time), 0)::bigint as total_watch_time,
        COALESCE(AVG(va.watch_time), 0)::numeric as average_watch_time,
        COUNT(DISTINCT va.session_id)::bigint as sessions
    FROM video_analytics va
    WHERE (video_id IS NULL OR va.confession_id = video_id);
END;
$$;

-- Function to get completion rate statistics
CREATE OR REPLACE FUNCTION get_completion_rate_stats()
RETURNS TABLE (
    average_completion_rate numeric,
    completed_videos bigint,
    total_videos bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(AVG(va.completion_rate), 0)::numeric as average_completion_rate,
        COUNT(CASE WHEN va.completion_rate >= 80 THEN 1 END)::bigint as completed_videos,
        COUNT(DISTINCT va.confession_id)::bigint as total_videos
    FROM video_analytics va
    WHERE va.completion_rate > 0;
END;
$$;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_video_analytics_updated_at ON video_analytics;
CREATE TRIGGER update_video_analytics_updated_at
    BEFORE UPDATE ON video_analytics
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_analytics_daily_updated_at ON video_analytics_daily;
CREATE TRIGGER update_video_analytics_daily_updated_at
    BEFORE UPDATE ON video_analytics_daily
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies for security

-- Enable RLS on video_events
ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;

-- Policy for video_events - users can only see their own events or public events
CREATE POLICY "Users can view their own video events" ON video_events
    FOR SELECT USING (
        auth.uid() = user_id OR
        user_id IS NULL OR
        EXISTS (
            SELECT 1 FROM confessions c
            WHERE c.id = confession_id
            AND (c.is_anonymous = true OR c.user_id = auth.uid())
        )
    );

-- Policy for inserting video events
CREATE POLICY "Users can insert video events" ON video_events
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        user_id IS NULL
    );

-- Enable RLS on video_analytics_daily
ALTER TABLE video_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Policy for daily analytics - readable by authenticated users
CREATE POLICY "Authenticated users can view daily analytics" ON video_analytics_daily
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for service role to manage daily analytics
CREATE POLICY "Service role can manage daily analytics" ON video_analytics_daily
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance optimization with time-based partitioning consideration
CREATE INDEX IF NOT EXISTS idx_video_events_created_at_desc ON video_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created_at_desc ON video_analytics(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE video_events IS 'Stores individual video analytics events for detailed tracking';
COMMENT ON TABLE video_analytics_daily IS 'Pre-aggregated daily video analytics for performance';
COMMENT ON FUNCTION get_video_engagement_summary IS 'Returns comprehensive video engagement metrics for a given period';
COMMENT ON FUNCTION get_watch_time_analytics IS 'Returns watch time statistics, optionally filtered by video';
COMMENT ON FUNCTION get_completion_rate_stats IS 'Returns completion rate statistics across all videos';

-- Data retention policy (optional - can be implemented with pg_cron if available)
-- This would typically be handled by a scheduled job to clean up old analytics data

-- Example: Create a function to clean up old video events (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_video_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM video_events
    WHERE created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup operation
    INSERT INTO video_events (
        confession_id,
        session_id,
        event_type,
        event_timestamp,
        event_data
    ) VALUES (
        NULL,
        'system',
        'cleanup',
        NOW(),
        jsonb_build_object('deleted_events', deleted_count)
    );

    RETURN deleted_count;
END;
$$;

-- Grant necessary permissions for the application
GRANT SELECT, INSERT, UPDATE ON video_events TO authenticated;
GRANT SELECT ON video_analytics_daily TO authenticated;
GRANT SELECT ON video_engagement_summary TO authenticated;
GRANT SELECT ON trending_videos TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_engagement_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_watch_time_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_completion_rate_stats TO authenticated;