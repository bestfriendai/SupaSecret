

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_engagement_score"("likes_count" integer, "created_at_param" timestamp with time zone) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$ BEGIN RETURN COALESCE(likes_count, 0) * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - created_at_param)) / 3600.0)); END; $$;


ALTER FUNCTION "public"."calculate_engagement_score"("likes_count" integer, "created_at_param" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_confession_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ DECLARE confession_owner_id uuid; BEGIN SELECT user_id INTO confession_owner_id FROM confessions WHERE id = NEW.confession_id; IF confession_owner_id IS NULL OR NEW.user_id = confession_owner_id THEN RETURN NEW; END IF; IF EXISTS (SELECT 1 FROM notification_preferences WHERE user_id = confession_owner_id AND likes_enabled = true) OR NOT EXISTS (SELECT 1 FROM notification_preferences WHERE user_id = confession_owner_id) THEN INSERT INTO notifications (user_id, type, entity_id, entity_type, actor_user_id, message) VALUES (confession_owner_id, 'like', NEW.confession_id, 'confession', NEW.user_id, 'Someone liked your secret'); END IF; RETURN NEW; END; $$;


ALTER FUNCTION "public"."create_confession_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_reply_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Don't create notification if user likes their own reply
  IF NEW.user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user has like notifications enabled
  IF EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id)
    AND likes_enabled = true
  ) OR NOT EXISTS (
    SELECT 1 FROM notification_preferences 
    WHERE user_id = (SELECT user_id FROM replies WHERE id = NEW.reply_id)
  ) THEN
    INSERT INTO notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      actor_user_id,
      message
    ) VALUES (
      (SELECT user_id FROM replies WHERE id = NEW.reply_id),
      'like',
      NEW.reply_id,
      'reply',
      NEW.user_id,
      'Someone liked your reply'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_reply_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_reply_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    confession_user_id UUID;
BEGIN
    -- Get the user_id of the confession owner
    SELECT user_id INTO confession_user_id 
    FROM confessions 
    WHERE id = NEW.confession_id;
    
    -- Don't create notification if:
    -- 1. The confession is anonymous (user_id is NULL)
    -- 2. User replies to their own confession
    IF confession_user_id IS NULL OR NEW.user_id = confession_user_id THEN
        RETURN NEW;
    END IF;

    -- Check if user has reply notifications enabled
    IF EXISTS (
        SELECT 1 FROM notification_preferences 
        WHERE user_id = confession_user_id
        AND replies_enabled = true
    ) OR NOT EXISTS (
        SELECT 1 FROM notification_preferences 
        WHERE user_id = confession_user_id
    ) THEN
        INSERT INTO notifications (
            user_id,
            type,
            entity_id,
            entity_type,
            actor_user_id,
            message
        ) VALUES (
            confession_user_id,
            'reply',
            NEW.confession_id,
            'confession',
            NEW.user_id,
            'Someone replied to your secret'
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_reply_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN BEGIN INSERT INTO public.user_memberships (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error inserting user_membership for user %: %', NEW.id, SQLERRM; END; RETURN NEW; END; $$;


ALTER FUNCTION "public"."create_user_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_hashtags"("text_content" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."extract_hashtags"("text_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_confession_report_count"("confession_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.reports 
    WHERE confession_id = confession_uuid AND status = 'pending'
  );
END;
$$;


ALTER FUNCTION "public"."get_confession_report_count"("confession_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reaction_counts"("reply_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT json_object_agg(type, count)
        FROM (
            SELECT type, COUNT(*) as count
            FROM comment_reactions
            WHERE reply_id = reply_uuid
            GROUP BY type
        ) reaction_counts
    );
END;
$$;


ALTER FUNCTION "public"."get_reaction_counts"("reply_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reply_count"("confession_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM replies WHERE confession_id = confession_uuid);
END;
$$;


ALTER FUNCTION "public"."get_reply_count"("confession_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reply_report_count"("reply_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.reports 
    WHERE reply_id = reply_uuid AND status = 'pending'
  );
END;
$$;


ALTER FUNCTION "public"."get_reply_report_count"("reply_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_thread_reply_count"("parent_reply_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM replies WHERE parent_id = parent_reply_uuid);
END;
$$;


ALTER FUNCTION "public"."get_thread_reply_count"("parent_reply_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_hashtags"("hours_back" integer, "limit_count" integer DEFAULT 10) RETURNS TABLE("hashtag" "text", "count" bigint, "percentage" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  with params as (
    select
      case when coalesce(hours_back, 0) <= 0 then 24 else hours_back end as hours_back,
      case when coalesce(limit_count, 0) <= 0 then 10 else limit_count end as limit_count
  ),
  recent_confessions as (
    select content, transcription
    from public.confessions
    where created_at >= now() - make_interval(hours => (select hours_back from params))
  ),
  extracted as (
    select lower(match[1]) as hashtag
    from recent_confessions,
    lateral regexp_matches(
      coalesce(content, '') || ' ' || coalesce(transcription, ''),
      '#([\p{L}\p{N}_]+)',
      'g'
    ) as match
  ),
  aggregated as (
    select hashtag, count(*) as count
    from extracted
    group by hashtag
  ),
  totals as (
    select coalesce(sum(count), 0) as total_count from aggregated
  )
  select
    a.hashtag,
    a.count,
    case
      when t.total_count = 0 then 0
      else round((a.count::numeric / t.total_count::numeric) * 100, 2)
    end as percentage
  from aggregated a
  cross join totals t
  order by a.count desc
  limit (select limit_count from params);
$$;


ALTER FUNCTION "public"."get_trending_hashtags"("hours_back" integer, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_secrets"("hours_back" integer, "limit_count" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "type" "text", "content" "text", "video_uri" "text", "video_url" "text", "transcription" "text", "created_at" timestamp with time zone, "likes" integer, "views" integer, "engagement_score" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  with params as (
    select
      case when coalesce(hours_back, 0) <= 0 then 24 else hours_back end as hours_back,
      case when coalesce(limit_count, 0) <= 0 then 20 else limit_count end as limit_count
  ),
  recent as (
    select
      c.*,
      greatest(0, extract(epoch from (now() - c.created_at)) / 3600.0) as hours_old
    from public.confessions c
    where c.created_at >= now() - make_interval(hours => (select hours_back from params))
  ),
  scored as (
    select
      r.id,
      r.type,
      r.content,
      r.video_uri,
      r.video_url,
      r.transcription,
      r.created_at,
      coalesce(r.likes, 0) as likes,
      coalesce(r.views, 0) as views,
      (
        (coalesce(r.likes, 0)::numeric) +
        (coalesce(r.views, 0)::numeric * 0.15)
      ) * exp(-r.hours_old / 24.0) as engagement_score
    from recent r
  )
  select *
  from scored
  order by engagement_score desc
  limit (select limit_count from params);
$$;


ALTER FUNCTION "public"."get_trending_secrets"("hours_back" integer, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM notifications
    WHERE user_id = target_user_id
    AND read_at IS NULL
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tier"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  user_tier text;
BEGIN
  SELECT 
    CASE 
      WHEN expires_at IS NULL OR expires_at > now() THEN tier
      ELSE 'free'
    END
  INTO user_tier
  FROM user_memberships
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_tier, 'free');
END;
$$;


ALTER FUNCTION "public"."get_user_tier"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN BEGIN INSERT INTO public.user_profiles (id, is_onboarded, created_at, last_login_at) VALUES (NEW.id, true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error inserting user_profiles for user %: %', NEW.id, SQLERRM; END; BEGIN INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error inserting user_preferences for user %: %', NEW.id, SQLERRM; END; RETURN NEW; END; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_membership"("target_user_id" "uuid", "required_tier" "text" DEFAULT 'plus'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_memberships
    WHERE user_id = target_user_id
    AND tier = required_tier
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;


ALTER FUNCTION "public"."has_active_membership"("target_user_id" "uuid", "required_tier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_views"("confession_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ BEGIN UPDATE public.confessions SET views = views + 1 WHERE id = confession_uuid AND type = 'video'; RETURN FOUND; END; $$;


ALTER FUNCTION "public"."increment_video_views"("confession_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_confessions_by_hashtag"("search_hashtag" "text", "limit_count" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "type" "text", "content" "text", "video_uri" "text", "video_url" "text", "transcription" "text", "created_at" timestamp with time zone, "likes" integer, "views" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  normalized_tag text;
  plain_query tsquery;
begin
  if search_hashtag is null or length(trim(search_hashtag)) = 0 then
    return;
  end if;

  normalized_tag := lower(trim(search_hashtag));
  if left(normalized_tag, 1) <> '#' then
    normalized_tag := '#' || normalized_tag;
  end if;

  plain_query := plainto_tsquery('simple', replace(normalized_tag, '#', ' '));

  return query
  select
    c.id,
    c.type,
    c.content,
    c.video_uri,
    c.video_url,
    c.transcription,
    c.created_at,
    coalesce(c.likes, 0) as likes,
    coalesce(c.views, 0) as views
  from public.confessions c
  where
    (
      to_tsvector('simple', coalesce(c.content, '') || ' ' || coalesce(c.transcription, '')) @@ plain_query
    )
    or (
      coalesce(c.content, '') ~* ('\\y' || regexp_replace(normalized_tag, '#', '', 'g') || '\\y')
      or coalesce(c.transcription, '') ~* ('\\y' || regexp_replace(normalized_tag, '#', '', 'g') || '\\y')
    )
  order by c.created_at desc
  limit case when coalesce(limit_count, 0) <= 0 then 50 else limit_count end;
end;
$$;


ALTER FUNCTION "public"."search_confessions_by_hashtag"("search_hashtag" "text", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_confession_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."set_confession_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_confession_like"("confession_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ DECLARE current_likes integer; user_has_liked boolean := false; BEGIN SELECT likes INTO current_likes FROM public.confessions WHERE id = confession_uuid; IF current_likes IS NULL THEN RETURN false; END IF; IF current_likes % 2 = 0 THEN UPDATE public.confessions SET likes = likes + 1 WHERE id = confession_uuid; user_has_liked := true; ELSE UPDATE public.confessions SET likes = greatest(0, likes - 1) WHERE id = confession_uuid; user_has_liked := false; END IF; RETURN user_has_liked; END; $$;


ALTER FUNCTION "public"."toggle_confession_like"("confession_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Automatically updates updated_at timestamp on row updates';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comment_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reply_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_reactions_type_check" CHECK (("type" = ANY (ARRAY['heart'::"text", 'laugh'::"text", 'sad'::"text", 'angry'::"text", 'wow'::"text", 'thumbs_up'::"text"])))
);


ALTER TABLE "public"."comment_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."confessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "video_uri" "text",
    "transcription" "text",
    "is_anonymous" boolean DEFAULT true NOT NULL,
    "likes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "video_url" "text",
    "video_processing_status" "text" DEFAULT 'pending'::"text",
    "video_duration" integer,
    "video_thumbnail_url" "text",
    "video_quality" "text" DEFAULT 'auto'::"text",
    "video_file_size" bigint,
    "views" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "check_content_length" CHECK ((("length"("content") > 0) AND ("length"("content") <= 280))),
    CONSTRAINT "check_likes_non_negative" CHECK (("likes" >= 0)),
    CONSTRAINT "check_video_duration_positive" CHECK ((("video_duration" IS NULL) OR ("video_duration" > 0))),
    CONSTRAINT "check_video_file_size_positive" CHECK ((("video_file_size" IS NULL) OR ("video_file_size" > 0))),
    CONSTRAINT "confessions_type_check" CHECK (("type" = ANY (ARRAY['text'::"text", 'video'::"text"]))),
    CONSTRAINT "confessions_video_processing_status_check" CHECK (("video_processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "confessions_video_quality_check" CHECK (("video_quality" = ANY (ARRAY['auto'::"text", 'high'::"text", 'medium'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."confessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."confessions"."transcription" IS 'Auto-generated transcription for accessibility and search';



COMMENT ON COLUMN "public"."confessions"."video_url" IS 'Processed video URL for streaming';



COMMENT ON COLUMN "public"."confessions"."video_processing_status" IS 'Current status of video processing pipeline';



COMMENT ON COLUMN "public"."confessions"."video_duration" IS 'Video duration in seconds';



COMMENT ON COLUMN "public"."confessions"."video_thumbnail_url" IS 'Thumbnail image URL for video previews';



COMMENT ON COLUMN "public"."confessions"."video_quality" IS 'Video quality setting used for processing';



COMMENT ON COLUMN "public"."confessions"."video_file_size" IS 'Video file size in bytes';



COMMENT ON CONSTRAINT "check_content_length" ON "public"."confessions" IS 'Ensures confession content is within limits';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "likes_enabled" boolean DEFAULT true,
    "replies_enabled" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT false,
    "quiet_hours_start" time without time zone DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '08:00:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "actor_user_id" "uuid",
    "message" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['confession'::"text", 'reply'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['like'::"text", 'reply'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_confessions" AS
 SELECT "id",
    "type",
    "content",
    "video_uri",
    "transcription",
    "is_anonymous",
    "likes",
    "created_at"
   FROM "public"."confessions" "c"
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."public_confessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "confession_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "is_anonymous" boolean DEFAULT true NOT NULL,
    "likes" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid",
    CONSTRAINT "check_reply_content_length" CHECK ((("length"("content") > 0) AND ("length"("content") <= 280))),
    CONSTRAINT "check_reply_likes_non_negative" CHECK (("likes" >= 0))
);


ALTER TABLE "public"."replies" OWNER TO "postgres";


COMMENT ON TABLE "public"."replies" IS 'Stores user replies to confessions - created by migration 20250109000000';



COMMENT ON CONSTRAINT "check_reply_content_length" ON "public"."replies" IS 'Ensures reply content is within limits';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "confession_id" "uuid",
    "reply_id" "uuid",
    "reporter_user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "additional_details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "reports_reason_check" CHECK (("reason" = ANY (ARRAY['inappropriate_content'::"text", 'spam'::"text", 'harassment'::"text", 'false_information'::"text", 'violence'::"text", 'hate_speech'::"text", 'other'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "reports_target_check" CHECK (((("confession_id" IS NOT NULL) AND ("reply_id" IS NULL)) OR (("confession_id" IS NULL) AND ("reply_id" IS NOT NULL))))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "confession_id" "uuid",
    "reply_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_likes_target_check" CHECK (((("confession_id" IS NOT NULL) AND ("reply_id" IS NULL)) OR (("confession_id" IS NULL) AND ("reply_id" IS NOT NULL))))
);


ALTER TABLE "public"."user_likes" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_likes" IS 'Stores user likes for confessions and replies - created by migration 20250109000000';



CREATE TABLE IF NOT EXISTS "public"."user_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "plan_id" "text",
    "subscription_id" "text",
    "expires_at" timestamp with time zone,
    "auto_renew" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_memberships_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'plus'::"text"])))
);


ALTER TABLE "public"."user_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "autoplay" boolean DEFAULT true,
    "sound_enabled" boolean DEFAULT true,
    "quality_preference" "text" DEFAULT 'auto'::"text",
    "data_usage_mode" "text" DEFAULT 'unlimited'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "captions_default" boolean DEFAULT true,
    "haptics_enabled" boolean DEFAULT true,
    "reduced_motion" boolean DEFAULT false,
    CONSTRAINT "user_preferences_data_usage_mode_check" CHECK (("data_usage_mode" = ANY (ARRAY['unlimited'::"text", 'wifi-only'::"text", 'minimal'::"text"]))),
    CONSTRAINT "user_preferences_quality_preference_check" CHECK (("quality_preference" = ANY (ARRAY['auto'::"text", 'high'::"text", 'medium'::"text", 'low'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "is_onboarded" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_analytics" (
    "confession_id" "uuid" NOT NULL,
    "watch_time" integer DEFAULT 0,
    "completion_rate" real DEFAULT 0,
    "last_watched" timestamp with time zone DEFAULT "now"(),
    "interactions" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_analytics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_reply_id_user_id_type_key" UNIQUE ("reply_id", "user_id", "type");



ALTER TABLE ONLY "public"."confessions"
    ADD CONSTRAINT "confessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_platform_key" UNIQUE ("user_id", "platform");



ALTER TABLE ONLY "public"."replies"
    ADD CONSTRAINT "replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "unique_user_confession_like" UNIQUE ("user_id", "confession_id") DEFERRABLE INITIALLY DEFERRED;



COMMENT ON CONSTRAINT "unique_user_confession_like" ON "public"."user_likes" IS 'Prevents duplicate likes on confessions';



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "unique_user_reply_like" UNIQUE ("user_id", "reply_id") DEFERRABLE INITIALLY DEFERRED;



COMMENT ON CONSTRAINT "unique_user_reply_like" ON "public"."user_likes" IS 'Prevents duplicate likes on replies';



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_unique_confession" UNIQUE ("user_id", "confession_id");



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_unique_reply" UNIQUE ("user_id", "reply_id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_pkey" PRIMARY KEY ("confession_id");



CREATE INDEX "confessions_content_transcription_search_idx" ON "public"."confessions" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((COALESCE("content", ''::"text") || ' '::"text") || COALESCE("transcription", ''::"text"))));



CREATE INDEX "confessions_created_at_idx" ON "public"."confessions" USING "brin" ("created_at");



CREATE INDEX "confessions_type_idx" ON "public"."confessions" USING "btree" ("type");



CREATE INDEX "confessions_user_id_idx" ON "public"."confessions" USING "btree" ("user_id");



CREATE INDEX "confessions_views_idx" ON "public"."confessions" USING "btree" ("views" DESC);



CREATE INDEX "idx_comment_reactions_reply_id" ON "public"."comment_reactions" USING "btree" ("reply_id");



CREATE INDEX "idx_comment_reactions_type" ON "public"."comment_reactions" USING "btree" ("type");



CREATE INDEX "idx_comment_reactions_user_id" ON "public"."comment_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_confessions_is_anonymous" ON "public"."confessions" USING "btree" ("is_anonymous");



CREATE INDEX "idx_confessions_likes" ON "public"."confessions" USING "btree" ("likes" DESC);



CREATE INDEX "idx_confessions_public_recent" ON "public"."confessions" USING "btree" ("created_at" DESC) WHERE ("is_anonymous" = true);



CREATE INDEX "idx_confessions_timestamp" ON "public"."confessions" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."idx_confessions_timestamp" IS 'Optimizes ordering confessions by creation time';



CREATE INDEX "idx_confessions_user_id" ON "public"."confessions" USING "btree" ("user_id");



COMMENT ON INDEX "public"."idx_confessions_user_id" IS 'Optimizes filtering confessions by user';



CREATE INDEX "idx_confessions_user_recent" ON "public"."confessions" USING "btree" ("user_id", "created_at" DESC) WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_confessions_user_timestamp" ON "public"."confessions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_confessions_video_duration" ON "public"."confessions" USING "btree" ("video_duration" DESC) WHERE ("type" = 'video'::"text");



CREATE INDEX "idx_confessions_video_status" ON "public"."confessions" USING "btree" ("video_processing_status");



CREATE INDEX "idx_confessions_video_type" ON "public"."confessions" USING "btree" ("type") WHERE ("type" = 'video'::"text");



CREATE INDEX "idx_replies_confession_id" ON "public"."replies" USING "btree" ("confession_id");



CREATE INDEX "idx_replies_confession_parent" ON "public"."replies" USING "btree" ("confession_id", "parent_id");



CREATE INDEX "idx_replies_confession_timestamp" ON "public"."replies" USING "btree" ("confession_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_replies_confession_timestamp" IS 'Optimizes loading replies for a confession ordered by time';



CREATE INDEX "idx_replies_created_at" ON "public"."replies" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_replies_likes" ON "public"."replies" USING "btree" ("likes" DESC);



CREATE INDEX "idx_replies_parent_id" ON "public"."replies" USING "btree" ("parent_id");



CREATE INDEX "idx_replies_timestamp" ON "public"."replies" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_replies_user_id" ON "public"."replies" USING "btree" ("user_id");



CREATE INDEX "idx_user_likes_confession_id" ON "public"."user_likes" USING "btree" ("confession_id");



CREATE INDEX "idx_user_likes_reply_id" ON "public"."user_likes" USING "btree" ("reply_id");



CREATE INDEX "idx_user_likes_user_confession" ON "public"."user_likes" USING "btree" ("user_id", "confession_id");



COMMENT ON INDEX "public"."idx_user_likes_user_confession" IS 'Optimizes checking if user liked a confession';



CREATE INDEX "idx_user_likes_user_id" ON "public"."user_likes" USING "btree" ("user_id");



CREATE INDEX "idx_user_likes_user_reply" ON "public"."user_likes" USING "btree" ("user_id", "reply_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_active_users" ON "public"."user_profiles" USING "btree" ("last_login_at" DESC) WHERE ("is_onboarded" = true);



CREATE INDEX "idx_user_profiles_last_login" ON "public"."user_profiles" USING "btree" ("last_login_at" DESC);



CREATE INDEX "idx_user_profiles_onboarded" ON "public"."user_profiles" USING "btree" ("is_onboarded");



CREATE INDEX "idx_user_profiles_user_onboarded" ON "public"."user_profiles" USING "btree" ("id", "is_onboarded");



CREATE INDEX "idx_user_profiles_username" ON "public"."user_profiles" USING "btree" ("username");



COMMENT ON INDEX "public"."idx_user_profiles_username" IS 'Optimizes user profile lookups by username';



CREATE INDEX "idx_video_analytics_completion_rate" ON "public"."video_analytics" USING "btree" ("completion_rate" DESC);



CREATE INDEX "idx_video_analytics_confession_id" ON "public"."video_analytics" USING "btree" ("confession_id");



COMMENT ON INDEX "public"."idx_video_analytics_confession_id" IS 'Optimizes video analytics lookups by confession';



CREATE INDEX "idx_video_analytics_last_watched" ON "public"."video_analytics" USING "btree" ("last_watched" DESC);



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_read_at_idx" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "notifications_type_idx" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "push_tokens_platform_idx" ON "public"."push_tokens" USING "btree" ("platform");



CREATE INDEX "push_tokens_user_id_idx" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "replies_confession_id_idx" ON "public"."replies" USING "btree" ("confession_id");



CREATE INDEX "replies_created_at_idx" ON "public"."replies" USING "btree" ("created_at" DESC);



CREATE INDEX "replies_user_id_idx" ON "public"."replies" USING "btree" ("user_id");



CREATE INDEX "reports_confession_id_idx" ON "public"."reports" USING "btree" ("confession_id");



CREATE INDEX "reports_created_at_idx" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "reports_reply_id_idx" ON "public"."reports" USING "btree" ("reply_id");



CREATE INDEX "reports_reporter_id_idx" ON "public"."reports" USING "btree" ("reporter_user_id");



CREATE INDEX "reports_reporter_user_id_idx" ON "public"."reports" USING "btree" ("reporter_user_id");



CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status");



CREATE UNIQUE INDEX "reports_unique_confession_user" ON "public"."reports" USING "btree" ("reporter_user_id", "confession_id") WHERE ("confession_id" IS NOT NULL);



CREATE UNIQUE INDEX "reports_unique_reply_user" ON "public"."reports" USING "btree" ("reporter_user_id", "reply_id") WHERE ("reply_id" IS NOT NULL);



CREATE INDEX "user_likes_confession_id_idx" ON "public"."user_likes" USING "btree" ("confession_id");



CREATE INDEX "user_likes_reply_id_idx" ON "public"."user_likes" USING "btree" ("reply_id");



CREATE INDEX "user_likes_user_id_idx" ON "public"."user_likes" USING "btree" ("user_id");



CREATE INDEX "user_memberships_expires_at_idx" ON "public"."user_memberships" USING "btree" ("expires_at");



CREATE INDEX "user_memberships_tier_idx" ON "public"."user_memberships" USING "btree" ("tier");



CREATE INDEX "user_memberships_user_id_idx" ON "public"."user_memberships" USING "btree" ("user_id");



CREATE INDEX "user_profiles_username_idx" ON "public"."user_profiles" USING "btree" ("username");



CREATE OR REPLACE TRIGGER "confession_like_notification_trigger" AFTER INSERT ON "public"."user_likes" FOR EACH ROW WHEN (("new"."confession_id" IS NOT NULL)) EXECUTE FUNCTION "public"."create_confession_like_notification"();



CREATE OR REPLACE TRIGGER "reply_like_notification_trigger" AFTER INSERT ON "public"."user_likes" FOR EACH ROW WHEN (("new"."reply_id" IS NOT NULL)) EXECUTE FUNCTION "public"."create_reply_like_notification"();



CREATE OR REPLACE TRIGGER "reply_notification_trigger" AFTER INSERT ON "public"."replies" FOR EACH ROW EXECUTE FUNCTION "public"."create_reply_notification"();



CREATE OR REPLACE TRIGGER "trg_confessions_set_user" BEFORE INSERT ON "public"."confessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_confession_user_id"();



CREATE OR REPLACE TRIGGER "update_confessions_updated_at" BEFORE UPDATE ON "public"."confessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_replies_updated_at" BEFORE UPDATE ON "public"."replies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_analytics_updated_at" BEFORE UPDATE ON "public"."video_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_reactions"
    ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."confessions"
    ADD CONSTRAINT "confessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "fk_video_analytics_confession" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replies"
    ADD CONSTRAINT "replies_confession_id_fkey" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replies"
    ADD CONSTRAINT "replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replies"
    ADD CONSTRAINT "replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_confession_id_fkey" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_confession_id_fkey" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_likes"
    ADD CONSTRAINT "user_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memberships"
    ADD CONSTRAINT "user_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_analytics"
    ADD CONSTRAINT "video_analytics_confession_id_fkey" FOREIGN KEY ("confession_id") REFERENCES "public"."confessions"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage reports" ON "public"."reports" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Anyone can view confessions" ON "public"."confessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view replies" ON "public"."replies" FOR SELECT USING (true);



CREATE POLICY "Anyone can view video analytics" ON "public"."video_analytics" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert analytics" ON "public"."video_analytics" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert confessions" ON "public"."confessions" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("user_id" = "auth"."uid"()) OR ("user_id" IS NULL))));



CREATE POLICY "Authenticated users can insert replies" ON "public"."replies" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("user_id" = "auth"."uid"()) OR ("user_id" IS NULL))));



CREATE POLICY "Authenticated users can update analytics" ON "public"."video_analytics" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "No one can delete reports" ON "public"."reports" FOR DELETE USING (false);



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("reporter_user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own confessions" ON "public"."confessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comment reactions" ON "public"."comment_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own confessions" ON "public"."confessions" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own replies" ON "public"."replies" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own comment reactions" ON "public"."comment_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own membership" ON "public"."user_memberships" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage analytics for their confessions" ON "public"."video_analytics" USING ((EXISTS ( SELECT 1
   FROM "public"."confessions"
  WHERE (("confessions"."id" = "video_analytics"."confession_id") AND ("confessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own likes" ON "public"."user_likes" USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can manage their own preferences" ON "public"."user_preferences" USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update own confessions" ON "public"."confessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own confessions" ON "public"."confessions" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own membership" ON "public"."user_memberships" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own replies" ON "public"."replies" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view all comment reactions" ON "public"."comment_reactions" FOR SELECT USING (true);



CREATE POLICY "Users can view all likes" ON "public"."user_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view analytics for their confessions" ON "public"."video_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."confessions"
  WHERE (("confessions"."id" = "video_analytics"."confession_id") AND ("confessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own membership" ON "public"."user_memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their reports" ON "public"."reports" FOR SELECT USING (("reporter_user_id" = "auth"."uid"()));



CREATE POLICY "analytics select authenticated" ON "public"."video_analytics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "analytics update authenticated" ON "public"."video_analytics" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "analytics upsert authenticated" ON "public"."video_analytics" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."comment_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."confessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "confessions delete owner" ON "public"."confessions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "confessions insert self" ON "public"."confessions" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "confessions select authenticated" ON "public"."confessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "confessions update owner" ON "public"."confessions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "likes delete self" ON "public"."user_likes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "likes insert self" ON "public"."user_likes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "likes select self" ON "public"."user_likes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prefs select self" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs update self" ON "public"."user_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs upsert self" ON "public"."user_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "profiles select self" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles update self" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "replies delete owner" ON "public"."replies" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "replies insert self" ON "public"."replies" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "replies select authenticated" ON "public"."replies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "replies update owner" ON "public"."replies" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert_authenticated" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_user_id" = "auth"."uid"()));



CREATE POLICY "reports_select_own" ON "public"."reports" FOR SELECT TO "authenticated" USING (("reporter_user_id" = "auth"."uid"()));



CREATE POLICY "reports_update_service_role" ON "public"."reports" FOR UPDATE TO "service_role" USING (true);



ALTER TABLE "public"."user_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_analytics" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("likes_count" integer, "created_at_param" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("likes_count" integer, "created_at_param" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("likes_count" integer, "created_at_param" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_confession_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_confession_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_confession_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reply_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_reply_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reply_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reply_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_reply_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reply_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_hashtags"("text_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."extract_hashtags"("text_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_hashtags"("text_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_confession_report_count"("confession_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_confession_report_count"("confession_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_confession_report_count"("confession_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reaction_counts"("reply_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reaction_counts"("reply_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reaction_counts"("reply_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reply_count"("confession_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reply_count"("confession_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reply_count"("confession_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reply_report_count"("reply_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reply_report_count"("reply_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reply_report_count"("reply_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_thread_reply_count"("parent_reply_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_thread_reply_count"("parent_reply_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_thread_reply_count"("parent_reply_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("hours_back" integer, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("hours_back" integer, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("hours_back" integer, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_secrets"("hours_back" integer, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_secrets"("hours_back" integer, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_secrets"("hours_back" integer, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tier"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tier"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tier"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_active_membership"("target_user_id" "uuid", "required_tier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_membership"("target_user_id" "uuid", "required_tier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_membership"("target_user_id" "uuid", "required_tier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_video_views"("confession_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_video_views"("confession_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_video_views"("confession_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_confessions_by_hashtag"("search_hashtag" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_confessions_by_hashtag"("search_hashtag" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_confessions_by_hashtag"("search_hashtag" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_confession_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_confession_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_confession_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_confession_like"("confession_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_confession_like"("confession_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_confession_like"("confession_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."comment_reactions" TO "anon";
GRANT ALL ON TABLE "public"."comment_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."confessions" TO "anon";
GRANT ALL ON TABLE "public"."confessions" TO "authenticated";
GRANT ALL ON TABLE "public"."confessions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."public_confessions" TO "anon";
GRANT ALL ON TABLE "public"."public_confessions" TO "authenticated";
GRANT ALL ON TABLE "public"."public_confessions" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."replies" TO "anon";
GRANT ALL ON TABLE "public"."replies" TO "authenticated";
GRANT ALL ON TABLE "public"."replies" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."user_likes" TO "anon";
GRANT ALL ON TABLE "public"."user_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."user_likes" TO "service_role";



GRANT ALL ON TABLE "public"."user_memberships" TO "anon";
GRANT ALL ON TABLE "public"."user_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."video_analytics" TO "anon";
GRANT ALL ON TABLE "public"."video_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."video_analytics" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
