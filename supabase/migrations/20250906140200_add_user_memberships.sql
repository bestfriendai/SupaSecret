-- Migration: Add user memberships table for subscription management
-- This migration creates the user_memberships table for tracking user subscriptions

-- Create user_memberships table
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('free', 'plus')) DEFAULT 'free',
  plan_id text,
  subscription_id text,
  expires_at timestamp with time zone,
  auto_renew boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_memberships_user_id_idx ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS user_memberships_tier_idx ON public.user_memberships(tier);
CREATE INDEX IF NOT EXISTS user_memberships_expires_at_idx ON public.user_memberships(expires_at);

-- Function to check if user has active membership
CREATE OR REPLACE FUNCTION public.has_active_membership(target_user_id uuid, required_tier text DEFAULT 'plus')
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = target_user_id
    AND tier = required_tier
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_tier(target_user_id uuid)
RETURNS text AS $$
DECLARE
  user_tier text;
BEGIN
  SELECT 
    CASE 
      WHEN expires_at IS NULL OR expires_at > now() THEN tier
      ELSE 'free'
    END
  INTO user_tier
  FROM public.user_memberships
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_memberships
CREATE POLICY "Users can view their own membership" ON public.user_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own membership" ON public.user_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership" ON public.user_memberships
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to automatically create free membership for new users
CREATE OR REPLACE FUNCTION public.create_user_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_memberships (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS create_user_membership_trigger ON auth.users;
CREATE TRIGGER create_user_membership_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_membership();

-- Utility: updated_at maintenance
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_memberships_set_updated_at ON public.user_memberships;
CREATE TRIGGER user_memberships_set_updated_at
  BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Optional: allow RPC execution of helper functions (if needed via PostgREST)
GRANT EXECUTE ON FUNCTION public.has_active_membership(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated, anon;
