-- Add sample video data for testing
-- This migration adds sample video confessions to test the video functionality

-- Insert sample video confessions (only if they don't exist)
INSERT INTO public.confessions (id, type, content, video_uri, transcription, is_anonymous, likes, created_at)
SELECT id::uuid, type, content, video_uri, transcription, is_anonymous, likes, created_at FROM (VALUES
  ('11111111-1111-1111-1111-111111111111', 'video', 'Video confession with face blur and voice change applied', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'I judge people on social media way too much. Someone posts vacation pics and I immediately think they''re showing off. I hate that I''m like this but I can''t stop. #socialmedia #jealousy #mentalhealth', true, 128, NOW() - INTERVAL '2 hours'),
  ('22222222-2222-2222-2222-222222222222', 'video', 'Anonymous video confession', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'I''ve been eating my roommate''s food and replacing it before they notice. I know it''s wrong but I''m too broke to buy groceries and too proud to ask for help. #money #roommates #shame #pride', true, 76, NOW() - INTERVAL '8 hours'),
  ('33333333-3333-3333-3333-333333333333', 'video', 'Protected video secret', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'I pretend to be busy at work but I actually spend most of my day on social media. My boss thinks I''m super productive but I''m just good at looking busy. #work #productivity #guilt', true, 45, NOW() - INTERVAL '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'video', 'Video confession with privacy protection', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 'I still sleep with a stuffed animal and I''m 25. It helps me feel safe and I don''t care if people think it''s weird. #comfort #adulting #nostalgia', true, 92, NOW() - INTERVAL '3 hours')
) AS new_data(id, type, content, video_uri, transcription, is_anonymous, likes, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.confessions WHERE confessions.id = new_data.id::uuid
);

-- Add video analytics for the sample videos (only if they don't exist)
INSERT INTO public.video_analytics (confession_id, watch_time, completion_rate, last_watched, interactions)
SELECT confession_id::uuid, watch_time, completion_rate, last_watched, interactions FROM (VALUES
  ('11111111-1111-1111-1111-111111111111', 45, 0.75, NOW() - INTERVAL '1 hour', 5),
  ('22222222-2222-2222-2222-222222222222', 32, 0.60, NOW() - INTERVAL '2 hours', 3),
  ('33333333-3333-3333-3333-333333333333', 28, 0.85, NOW() - INTERVAL '6 hours', 2),
  ('44444444-4444-4444-4444-444444444444', 51, 0.90, NOW() - INTERVAL '30 minutes', 7)
) AS new_analytics(confession_id, watch_time, completion_rate, last_watched, interactions)
WHERE NOT EXISTS (
  SELECT 1 FROM public.video_analytics WHERE video_analytics.confession_id = new_analytics.confession_id::uuid
);
