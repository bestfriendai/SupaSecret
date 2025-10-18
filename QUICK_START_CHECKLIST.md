# AI Engagement System - Quick Start Checklist

## 🎯 What You're Building

An automated AI system that:
- Posts **4 realistic secrets per minute** (5,760/day)
- Generates **30-800 likes** and **5-150 comments** per secret
- Gives real users **2.5x more engagement** (up to 3000 likes!)
- Sends **push notifications** with comment previews
- Creates **trending hashtags** that update every 15 minutes
- Makes your app look **buzzing with activity** from day one

---

## ✅ Implementation Checklist

### Phase 1: Database Setup

- [ ] **Add columns to confessions table:**
  ```sql
  ALTER TABLE confessions ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
  ALTER TABLE confessions ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
  CREATE INDEX IF NOT EXISTS idx_confessions_is_ai_generated ON confessions(is_ai_generated);
  CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
  ```

- [ ] **Add columns to comments table:**
  ```sql
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
  CREATE INDEX IF NOT EXISTS idx_comments_is_ai_generated ON comments(is_ai_generated);
  ```

- [ ] **Create push_tokens table:**
  ```sql
  CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token)
  );
  CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
  ```

- [ ] **Create hashtag extraction function and trending view:**
  ```sql
  -- See AI_ENGAGEMENT_SYSTEM.md lines 1050-1170 for full SQL
  ```

### Phase 2: Create AI User Account

- [ ] **Create 1 AI user in Supabase Auth:**
  - Go to Supabase Dashboard → Authentication → Users
  - Click "Add User"
  - Email: `ai-user@toxicconfessions.app`
  - Password: (generate secure password)
  - Copy the user UUID

- [ ] **Save AI_USER_ID for later:**
  ```
  AI_USER_ID=<paste-uuid-here>
  ```

### Phase 3: Deploy Edge Functions

- [ ] **Install Supabase CLI:**
  ```bash
  npm install -g supabase
  supabase login
  ```

- [ ] **Create Edge Functions directory:**
  ```bash
  mkdir -p supabase/functions
  ```

- [ ] **Create 3 Edge Functions:**
  1. `generate-ai-secret` - Generates realistic secrets
  2. `add-engagement` - Adds likes/comments to secrets
  3. `send-push-notification` - Sends push notifications
  4. `engage-with-real-users` - Engages with real user posts

  **Copy code from AI_ENGAGEMENT_SYSTEM.md:**
  - Lines 223-395 for `generate-ai-secret`
  - Lines 603-900 for `add-engagement`
  - Lines 950-1100 for `send-push-notification`
  - Lines 1311-1450 for `engage-with-real-users`

- [ ] **Deploy Edge Functions:**
  ```bash
  supabase functions deploy generate-ai-secret
  supabase functions deploy add-engagement
  supabase functions deploy send-push-notification
  supabase functions deploy engage-with-real-users
  ```

- [ ] **Set environment variables:**
  ```bash
  supabase secrets set GEMINI_API_KEY=AIzaSyDCMEoUoBAd0TUiCWiyO9JBDYCe_mD5wpc
  supabase secrets set AI_USER_ID=<your-ai-user-uuid>
  ```

### Phase 4: Set Up Cron Jobs

- [ ] **Enable pg_cron extension:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
  ```

- [ ] **Schedule secret generation (4 jobs for 4 secrets/minute):**
  ```sql
  -- See AI_ENGAGEMENT_SYSTEM.md lines 1450-1550 for full SQL
  -- Creates 4 cron jobs with 15-second offsets
  ```

- [ ] **Schedule real user engagement (2 jobs for every 30 seconds):**
  ```sql
  -- See AI_ENGAGEMENT_SYSTEM.md lines 1550-1600 for full SQL
  ```

- [ ] **Schedule trending hashtags refresh (every 15 minutes):**
  ```sql
  SELECT cron.schedule(
    'refresh-trending-hashtags',
    '*/15 * * * *',
    $$ REFRESH MATERIALIZED VIEW trending_hashtags; $$
  );
  ```

### Phase 5: Set Up Database Trigger for Instant Engagement

- [ ] **Create trigger function:**
  ```sql
  -- See AI_ENGAGEMENT_SYSTEM.md lines 1600-1700 for full SQL
  -- Triggers AI engagement immediately when real user posts
  ```

### Phase 6: React Native App Integration

- [ ] **Install Expo Notifications:**
  ```bash
  npx expo install expo-notifications expo-device
  ```

- [ ] **Create notifications utility file:**
  - Copy code from AI_ENGAGEMENT_SYSTEM.md lines 1150-1250
  - Save as `app/utils/notifications.ts`

- [ ] **Integrate in App.tsx:**
  - Register for push notifications on login
  - Save push token to database
  - Set up notification listeners
  - Handle deep linking to confession detail

- [ ] **Update app.json for push notifications:**
  ```json
  {
    "expo": {
      "notification": {
        "icon": "./assets/notification-icon.png",
        "color": "#FF0000"
      }
    }
  }
  ```

### Phase 7: Testing

- [ ] **Test AI secret generation:**
  ```bash
  curl -X POST \
    https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-secret \
    -H "Authorization: Bearer YOUR_ANON_KEY"
  ```

- [ ] **Test push notifications:**
  - Create a real user account
  - Post a secret
  - Wait 2 minutes
  - Check for push notification

- [ ] **Verify in Supabase Dashboard:**
  - Check confessions table for AI secrets
  - Verify `is_ai_generated` flag is set
  - Check likes_count is incrementing
  - Verify comments are being added
  - Check trending_hashtags view

### Phase 8: Monitoring

- [ ] **Set up monitoring queries:**
  ```sql
  -- Count AI vs real secrets
  SELECT is_ai_generated, COUNT(*) 
  FROM confessions 
  GROUP BY is_ai_generated;
  
  -- Check engagement levels
  SELECT AVG(likes_count), MAX(likes_count) 
  FROM confessions 
  WHERE created_at > NOW() - INTERVAL '24 hours';
  
  -- View trending hashtags
  SELECT * FROM trending_hashtags LIMIT 10;
  ```

- [ ] **Monitor costs:**
  - Check Gemini API usage
  - Monitor Supabase Edge Function invocations
  - Adjust cron frequency if needed

---

## 🎛️ Configuration Options

### Budget-Friendly (FREE - $5/month)
- **1-2 cron jobs** = 1-2 secrets/minute
- 1,440-2,880 secrets/day
- Still creates active feed
- Stays closer to free tier

### Recommended ($5-15/month)
- **2 cron jobs** = 2 secrets/minute
- 2,880 secrets/day
- Good balance of activity and cost
- **START HERE**

### Maximum Activity ($20-50/month)
- **4 cron jobs** = 4 secrets/minute
- 5,760 secrets/day
- Maximum engagement
- Scale to this later

---

## 🚀 Expected Results

### Immediately After Launch:
- ✅ New secret every 15-60 seconds
- ✅ 30-800 likes per secret
- ✅ 5-150 comments per secret
- ✅ Trending hashtags updating every 15 minutes
- ✅ Feed looks VERY active

### When First Real User Posts:
- ✅ First like within 2 minutes
- ✅ Push notification: "❤️ Someone liked your secret"
- ✅ First comment within 5-15 minutes
- ✅ Push notification: "💬 New comment: [preview]"
- ✅ 75-2000 likes over 24 hours (text)
- ✅ 112-3000 likes over 24 hours (video)
- ✅ Mixed comments: supportive, harsh, hilarious
- ✅ User feels EXTREMELY welcomed
- ✅ High retention rate

---

## 📊 Success Metrics

Track these in your Supabase dashboard:

1. **AI Content Generation:** 1-4 secrets/minute ✅
2. **Engagement Levels:** 30-800 likes, 5-150 comments ✅
3. **Real User Engagement:** First like within 2 minutes ✅
4. **Push Notifications:** Sent within seconds ✅
5. **Trending Hashtags:** 20-30 unique hashtags ✅
6. **User Retention:** % who post again within 24 hours ✅
7. **Cost:** Stay within budget ✅

---

## 🎉 You're Done!

Your app now has:
- ✅ Constant stream of realistic AI-generated secrets
- ✅ Massive engagement on all posts
- ✅ Real users get 2.5x MORE engagement
- ✅ Push notifications with comment previews
- ✅ Trending hashtags system
- ✅ Mixed comment tones (supportive, harsh, hilarious)
- ✅ Looks like thousands of active users from day one

**The app will feel ALIVE and BUZZING from the moment you launch!** 🚀🔥

