-- Trending functions for hashtags and secrets

-- Ensure useful extensions exist
create extension if not exists pg_trgm;

-- Drop existing functions for idempotency
drop function if exists public.get_trending_hashtags(integer, integer);
drop function if exists public.get_trending_secrets(integer, integer);
drop function if exists public.search_confessions_by_hashtag(text, integer);
drop function if exists public.search_confessions_by_hashtag(text);

create or replace function public.get_trending_hashtags(hours_back integer, limit_count integer default 10)
returns table (
  hashtag text,
  count bigint,
  percentage numeric
)
language sql
security definer
set search_path = public, extensions
as $$
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

grant execute on function public.get_trending_hashtags(integer, integer) to anon, authenticated, service_role;

create or replace function public.get_trending_secrets(hours_back integer, limit_count integer default 20)
returns table (
  id uuid,
  type text,
  content text,
  video_uri text,
  video_url text,
  transcription text,
  created_at timestamptz,
  likes integer,
  views integer,
  engagement_score numeric
)
language sql
security definer
set search_path = public, extensions
as $$
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

grant execute on function public.get_trending_secrets(integer, integer) to anon, authenticated, service_role;

create or replace function public.search_confessions_by_hashtag(search_hashtag text, limit_count integer default 50)
returns table (
  id uuid,
  type text,
  content text,
  video_uri text,
  video_url text,
  transcription text,
  created_at timestamptz,
  likes integer,
  views integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
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

grant execute on function public.search_confessions_by_hashtag(text, integer) to anon, authenticated, service_role;

drop index if exists public.confessions_created_at_idx;
create index if not exists confessions_created_at_idx on public.confessions using brin (created_at);

create index if not exists confessions_content_transcription_search_idx
  on public.confessions
  using gin (to_tsvector('simple', coalesce(content, '') || ' ' || coalesce(transcription, '')));
