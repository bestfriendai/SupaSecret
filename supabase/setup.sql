-- SupaSecret backend setup
-- Run this in Supabase SQL editor as the service role or owner.

-- 1) Storage bucket (private)
select storage.create_bucket('confessions', public => false);

-- 2) Recommend: Limit file paths to per-user folder convention videos/{uid}/...
-- Storage RLS policies on storage.objects
-- Note: Signed URLs bypass RLS for reads; keep bucket private.

create policy "objects insert own path"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'confessions'
  and ( storage.foldername(name) like ('videos/' || auth.uid() || '/%') )
);

create policy "objects delete own path"
on storage.objects for delete to authenticated
using (
  bucket_id = 'confessions'
  and ( storage.foldername(name) like ('videos/' || auth.uid() || '/%') )
);

-- Optional: allow selects by owner; playback should use signed URLs anyway
create policy "objects select own path"
on storage.objects for select to authenticated
using (
  bucket_id = 'confessions'
  and ( storage.foldername(name) like ('videos/' || auth.uid() || '/%') )
);

-- 3) Tables RLS and policies
alter table public.confessions enable row level security;
alter table public.replies enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.video_analytics enable row level security;
alter table public.user_likes enable row level security;

-- confessions
create policy "confessions select authenticated" on public.confessions
for select to authenticated using ( true );

create policy "confessions insert self" on public.confessions
for insert to authenticated with check ( user_id = auth.uid() or user_id is null );

create policy "confessions update owner" on public.confessions
for update to authenticated using ( user_id = auth.uid() );

create policy "confessions delete owner" on public.confessions
for delete to authenticated using ( user_id = auth.uid() );

-- replies
create policy "replies select authenticated" on public.replies
for select to authenticated using ( true );

create policy "replies insert self" on public.replies
for insert to authenticated with check ( user_id = auth.uid() or user_id is null );

create policy "replies update owner" on public.replies
for update to authenticated using ( user_id = auth.uid() );

create policy "replies delete owner" on public.replies
for delete to authenticated using ( user_id = auth.uid() );

-- user_profiles
create policy "profiles select self" on public.user_profiles
for select to authenticated using ( id = auth.uid() );

create policy "profiles update self" on public.user_profiles
for update to authenticated using ( id = auth.uid() );

-- user_preferences
create policy "prefs select self" on public.user_preferences
for select to authenticated using ( user_id = auth.uid() );

create policy "prefs upsert self" on public.user_preferences
for insert to authenticated with check ( user_id = auth.uid() );

create policy "prefs update self" on public.user_preferences
for update to authenticated using ( user_id = auth.uid() );

-- video_analytics
create policy "analytics select authenticated" on public.video_analytics
for select to authenticated using ( true );

create policy "analytics upsert authenticated" on public.video_analytics
for insert to authenticated with check ( true );

create policy "analytics update authenticated" on public.video_analytics
for update to authenticated using ( true );

-- user_likes
create policy "likes select self" on public.user_likes
for select to authenticated using ( user_id = auth.uid() );

create policy "likes insert self" on public.user_likes
for insert to authenticated with check ( user_id = auth.uid() );

create policy "likes delete self" on public.user_likes
for delete to authenticated using ( user_id = auth.uid() );

-- 4) Indices and constraints
create unique index if not exists user_likes_unique_confession 
on public.user_likes(user_id, confession_id) where confession_id is not null;

create unique index if not exists user_likes_unique_reply 
on public.user_likes(user_id, reply_id) where reply_id is not null;

create index if not exists confessions_created_at_idx on public.confessions(created_at desc);
create index if not exists replies_confession_id_idx on public.replies(confession_id);

-- 5) Public view with safe columns
drop view if exists public.public_confessions;
create view public.public_confessions as
select 
  c.id,
  c.type,
  c.content,
  c.video_uri,
  c.transcription,
  c.is_anonymous,
  c.likes,
  c.created_at
from public.confessions c
order by c.created_at desc;

-- 6) RPC to toggle likes atomically and return count
create or replace function public.toggle_confession_like(confession_uuid uuid)
returns table (likes_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select exists(
    select 1 from public.user_likes ul
    where ul.user_id = v_user and ul.confession_id = confession_uuid
  ) into v_exists;

  if v_exists then
    delete from public.user_likes where user_id = v_user and confession_id = confession_uuid;
  else
    insert into public.user_likes (id, user_id, confession_id)
    values (gen_random_uuid(), v_user, confession_uuid);
  end if;

  return query
  with cnt as (
    select count(*)::int as c from public.user_likes where confession_id = confession_uuid
  )
  update public.confessions c
  set likes = cnt.c
  from cnt
  where c.id = confession_uuid
  returning cnt.c as likes_count;
end;
$$;

-- 7) Optional trigger to enforce user_id on insert if omitted
create or replace function public.set_confession_user_id()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end; $$;

drop trigger if exists trg_confessions_set_user on public.confessions;
create trigger trg_confessions_set_user
before insert on public.confessions
for each row execute function public.set_confession_user_id();

-- 8) RPC to toggle reply likes atomically and return count
create or replace function public.toggle_reply_like(reply_uuid uuid)
returns table (likes_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select exists(
    select 1 from public.user_likes ul
    where ul.user_id = v_user and ul.reply_id = reply_uuid
  ) into v_exists;

  if v_exists then
    delete from public.user_likes where user_id = v_user and reply_id = reply_uuid;
  else
    insert into public.user_likes (id, user_id, reply_id)
    values (gen_random_uuid(), v_user, reply_uuid);
  end if;

  return query
  with cnt as (
    select count(*)::int as c from public.user_likes where reply_id = reply_uuid
  )
  update public.replies r
  set likes = cnt.c
  from cnt
  where r.id = reply_uuid
  returning cnt.c as likes_count;
end;
$$;

