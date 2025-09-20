import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface VideoEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, any>;
}

interface AnalyticsPayload {
  sessionId: string;
  events: VideoEvent[];
  timestamp: number;
  videoId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const rateLimitMap = new Map<string, RateLimitInfo>();

// Batch processing configuration
const BATCH_SIZE = 50;
const MAX_EVENT_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  // CORS headers for web requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200,
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Parse request body
    const payload: AnalyticsPayload = await req.json();

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') ||
                    req.headers.get('x-real-ip') ||
                    'unknown';

    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString(),
          },
        }
      );
    }

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid payload',
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract user ID from authorization header
    const authHeader = req.headers.get('authorization');
    const userId = await extractUserId(authHeader);

    // Process analytics events
    const result = await processAnalyticsEvents(payload, userId);

    return new Response(
      JSON.stringify({
        success: true,
        processed: result.processed,
        errors: result.errors,
        sessionId: payload.sessionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Video analytics processing error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Check rate limiting for client IP.
 */
function checkRateLimit(clientIP: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries
  for (const [ip, info] of rateLimitMap.entries()) {
    if (info.resetTime <= now) {
      rateLimitMap.delete(ip);
    }
  }

  let rateLimitInfo = rateLimitMap.get(clientIP);

  if (!rateLimitInfo || rateLimitInfo.resetTime <= now) {
    // Create new rate limit window
    rateLimitInfo = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitMap.set(clientIP, rateLimitInfo);
    return { allowed: true, retryAfter: 0 };
  }

  if (rateLimitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  rateLimitInfo.count++;
  rateLimitMap.set(clientIP, rateLimitInfo);
  return { allowed: true, retryAfter: 0 };
}

/**
 * Validate analytics payload.
 */
function validatePayload(payload: AnalyticsPayload): ValidationResult {
  const errors: string[] = [];

  if (!payload.sessionId || typeof payload.sessionId !== 'string') {
    errors.push('sessionId is required and must be a string');
  }

  if (!Array.isArray(payload.events)) {
    errors.push('events must be an array');
  } else {
    // Validate events
    payload.events.forEach((event, index) => {
      if (!event.type || typeof event.type !== 'string') {
        errors.push(`Event ${index}: type is required and must be a string`);
      }

      if (!event.timestamp || typeof event.timestamp !== 'number') {
        errors.push(`Event ${index}: timestamp is required and must be a number`);
      } else {
        // Check event age
        const eventAge = Date.now() - event.timestamp;
        if (eventAge > MAX_EVENT_AGE) {
          errors.push(`Event ${index}: event is too old (max age: 24 hours)`);
        }
      }

      if (!event.sessionId || typeof event.sessionId !== 'string') {
        errors.push(`Event ${index}: sessionId is required and must be a string`);
      }
    });

    // Check batch size
    if (payload.events.length > BATCH_SIZE) {
      errors.push(`Too many events in batch (max: ${BATCH_SIZE})`);
    }
  }

  if (!payload.timestamp || typeof payload.timestamp !== 'number') {
    errors.push('timestamp is required and must be a number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract user ID from authorization header.
 */
async function extractUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn('Failed to extract user from token:', error?.message);
      return null;
    }

    return user.id;
  } catch (error) {
    console.warn('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Process analytics events and store in database.
 */
async function processAnalyticsEvents(
  payload: AnalyticsPayload,
  userId: string | null
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Deduplicate events based on timestamp and type
    const deduplicatedEvents = deduplicateEvents(payload.events);

    // Group events by video ID
    const eventsByVideo = groupEventsByVideo(deduplicatedEvents, payload);

    // Process each video's events
    for (const [videoId, events] of eventsByVideo.entries()) {
      try {
        // Calculate aggregated metrics for this video
        const metrics = calculateVideoMetrics(events);

        // Store individual events
        const eventInserts = events.map(event => ({
          confession_id: videoId,
          session_id: event.sessionId,
          user_id: userId,
          event_type: event.type,
          event_timestamp: new Date(event.timestamp).toISOString(),
          event_data: event.metadata || {},
          created_at: new Date().toISOString(),
        }));

        // Insert events in batches
        for (let i = 0; i < eventInserts.length; i += 10) {
          const batch = eventInserts.slice(i, i + 10);
          const { error: eventError } = await supabase
            .from('video_events')
            .insert(batch);

          if (eventError) {
            console.error('Error inserting events:', eventError);
            errors.push(`Failed to insert events for video ${videoId}: ${eventError.message}`);
          } else {
            processed += batch.length;
          }
        }

        // Update or insert aggregated analytics
        await upsertVideoAnalytics(videoId, payload.sessionId, metrics, userId);

        // Update daily aggregations
        await updateDailyAggregations(videoId, metrics);

      } catch (videoError) {
        console.error(`Error processing video ${videoId}:`, videoError);
        errors.push(`Failed to process video ${videoId}: ${videoError.message}`);
      }
    }

  } catch (error) {
    console.error('Error in processAnalyticsEvents:', error);
    errors.push(`Processing error: ${error.message}`);
  }

  return { processed, errors };
}

/**
 * Deduplicate events based on timestamp and type.
 */
function deduplicateEvents(events: VideoEvent[]): VideoEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = `${event.sessionId}-${event.type}-${event.timestamp}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Group events by video ID.
 */
function groupEventsByVideo(events: VideoEvent[], payload?: AnalyticsPayload): Map<string, VideoEvent[]> {
  const grouped = new Map<string, VideoEvent[]>();

  events.forEach(event => {
    const videoId = event.metadata?.videoId || event.metadata?.confession_id || payload?.videoId || 'unknown';
    const videoEvents = grouped.get(videoId) || [];
    videoEvents.push(event);
    grouped.set(videoId, videoEvents);
  });

  return grouped;
}

/**
 * Calculate video metrics from events.
 */
function calculateVideoMetrics(events: VideoEvent[]): {
  watchTime: number;
  completionRate: number;
  seekCount: number;
  bufferTime: number;
  interactions: number;
  lastWatchedPosition: number;
} {
  let watchTime = 0;
  let completionRate = 0;
  let seekCount = 0;
  let bufferTime = 0;
  let interactions = 0;
  let lastWatchedPosition = 0;

  // Sort events by timestamp
  const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

  let playStartTime: number | null = null;
  let bufferStartTime: number | null = null;

  sortedEvents.forEach(event => {
    switch (event.type) {
      case 'play':
      case 'resume':
        playStartTime = event.timestamp;
        break;
      case 'pause':
      case 'complete':
      case 'session_end':
        if (playStartTime) {
          watchTime += (event.timestamp - playStartTime) / 1000; // Convert to seconds
          playStartTime = null;
        }
        if (event.type === 'complete') {
          completionRate = event.metadata?.completionRate || 100;
        }
        break;
      case 'seek':
        seekCount++;
        if (event.metadata?.to) {
          lastWatchedPosition = event.metadata.to;
        }
        break;
      case 'buffer_start':
        bufferStartTime = event.timestamp;
        break;
      case 'buffer_end':
        if (bufferStartTime) {
          bufferTime += (event.timestamp - bufferStartTime) / 1000;
          bufferStartTime = null;
        }
        break;
      case 'like':
      case 'unlike':
      case 'comment':
      case 'share':
      case 'save':
        interactions++;
        break;
    }

    // Update last watched position from metadata
    if (event.metadata?.position !== undefined) {
      lastWatchedPosition = Math.max(lastWatchedPosition, event.metadata.position);
    }
  });

  return {
    watchTime,
    completionRate,
    seekCount,
    bufferTime,
    interactions,
    lastWatchedPosition,
  };
}

/**
 * Upsert video analytics data.
 */
async function upsertVideoAnalytics(
  videoId: string,
  sessionId: string,
  metrics: any,
  userId: string | null
): Promise<void> {
  // Check if record exists
  const { data: existing } = await supabase
    .from('video_analytics')
    .select('*')
    .eq('confession_id', videoId)
    .eq('session_id', sessionId)
    .single();

  const analyticsData = {
    confession_id: videoId,
    session_id: sessionId,
    user_id: userId,
    watch_time: metrics.watchTime,
    completion_rate: metrics.completionRate,
    interactions: metrics.interactions,
    seek_count: metrics.seekCount,
    buffer_time: metrics.bufferTime,
    last_watched: metrics.lastWatchedPosition,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('video_analytics')
      .update(analyticsData)
      .eq('confession_id', videoId)
      .eq('session_id', sessionId);

    if (error) {
      throw new Error(`Failed to update analytics: ${error.message}`);
    }
  } else {
    // Insert new record
    const { error } = await supabase
      .from('video_analytics')
      .insert({
        ...analyticsData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to insert analytics: ${error.message}`);
    }
  }
}

/**
 * Update daily aggregations.
 */
async function updateDailyAggregations(
  videoId: string,
  metrics: any
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Upsert daily aggregation
    const { error } = await supabase
      .from('video_analytics_daily')
      .upsert({
        confession_id: videoId,
        date: today,
        total_watch_time: metrics.watchTime,
        total_views: 1,
        average_completion_rate: metrics.completionRate,
        total_interactions: metrics.interactions,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'confession_id,date',
      });

    if (error) {
      console.error('Failed to update daily aggregations:', error);
    }
  } catch (error) {
    console.error('Error updating daily aggregations:', error);
  }
}