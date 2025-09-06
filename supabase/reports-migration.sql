-- Reports table migration for SupaSecret
-- Run this in Supabase SQL editor after the main setup.sql

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.replies(id) ON DELETE CASCADE,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'inappropriate_content',
    'spam',
    'harassment',
    'false_information',
    'violence',
    'hate_speech',
    'other'
  )),
  additional_details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  
  -- Ensure either confession_id or reply_id is provided, but not both
  CONSTRAINT reports_target_check CHECK (
    (confession_id IS NOT NULL AND reply_id IS NULL) OR
    (confession_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports table
-- Drop existing policies first (in case they exist)
DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
DROP POLICY IF EXISTS "reports_update_service_role" ON public.reports;

-- Users can create reports
CREATE POLICY "reports_insert_authenticated" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

-- Users can view their own reports
CREATE POLICY "reports_select_own" ON public.reports
FOR SELECT TO authenticated
USING (reporter_user_id = auth.uid());

-- Only service role can update reports (for admin functionality later)
CREATE POLICY "reports_update_service_role" ON public.reports
FOR UPDATE TO service_role
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS reports_confession_id_idx ON public.reports(confession_id);
CREATE INDEX IF NOT EXISTS reports_reply_id_idx ON public.reports(reply_id);
CREATE INDEX IF NOT EXISTS reports_reporter_user_id_idx ON public.reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at DESC);

-- Prevent duplicate reports from same user for same content
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_confession_user 
ON public.reports(reporter_user_id, confession_id) 
WHERE confession_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reply_user 
ON public.reports(reporter_user_id, reply_id) 
WHERE reply_id IS NOT NULL;

-- Function to get report count for a confession (optional, for admin use)
CREATE OR REPLACE FUNCTION public.get_confession_report_count(confession_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.reports 
    WHERE confession_id = confession_uuid AND status = 'pending'
  );
END;
$$;

-- Function to get report count for a reply (optional, for admin use)
CREATE OR REPLACE FUNCTION public.get_reply_report_count(reply_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.reports 
    WHERE reply_id = reply_uuid AND status = 'pending'
  );
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
