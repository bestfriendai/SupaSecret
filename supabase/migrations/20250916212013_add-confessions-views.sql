-- Migration: add confessions.views column
-- Description: Adds a NOT NULL integer views column with default 0 to public.confessions
-- Reversible: Yes

BEGIN;

-- Up
ALTER TABLE public.confessions
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- Optional performance index if you sort/filter by views frequently
CREATE INDEX IF NOT EXISTS confessions_views_idx ON public.confessions (views DESC);

COMMIT;