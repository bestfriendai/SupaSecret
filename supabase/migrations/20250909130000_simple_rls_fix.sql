-- Simple RLS Fix - Direct approach to resolve storage policy issues

-- First, let's check what's currently there and clean it up
DO $$
BEGIN
    -- Drop all storage policies if they exist
    DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view videos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

    DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

    DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

    RAISE NOTICE 'Dropped existing storage policies';
END $$;

-- Create a simple permissive policy for testing (we'll make it secure after confirming it works)
CREATE POLICY "Allow all operations for testing" ON storage.objects
FOR ALL USING (true) WITH CHECK (true);

-- Now let's create the proper policies
DROP POLICY IF EXISTS "Allow all operations for testing" ON storage.objects;

-- Videos bucket - simple and direct
CREATE POLICY "videos_select" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "videos_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "videos_update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'videos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "videos_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'videos'
    AND auth.role() = 'authenticated'
);

-- Images bucket
CREATE POLICY "images_select" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "images_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "images_update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "images_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
);

-- Avatars bucket
CREATE POLICY "avatars_select" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "avatars_update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "avatars_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

-- Let's also ensure the buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('videos', 'videos', false, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']),
  ('images', 'images', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Test query to verify policies are working
-- This should show all storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;