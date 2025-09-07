 # Byterover Handbook

 *Generated: 2025-09-06*

 ## Layer 1: System Overview

 **Purpose**: Anonymous, mobile-first social app for sharing "secrets" (text or video confessions) with privacy protections (face blur, voice change), discovery via trending hashtags/secrets, and lightweight social interactions (likes, replies, saves). Auth, data, and storage are powered by Supabase.

 **Tech Stack**: Expo SDK 53, React Native 0.79, React 19, TypeScript, React Navigation (native + tabs), Zustand (persisted with AsyncStorage), @shopify/flash-list, Reanimated 3, Expo Video, @gorhom/bottom-sheet, NativeWind (Tailwind), Ionicons, Supabase (auth, PostgREST, RPC, Realtime, Storage), FFmpeg Kit RN, Expo Notifications, Lottie RN (available), date-fns.

 **Architecture**: Component-based screens over a simple layered structure: screens → components → state stores (Zustand) → lib/utils (Supabase, storage, media, haptics) with a single navigation root (`src/navigation/AppNavigator.tsx`). Supabase SQL (in `supabase/`) defines schema, RLS, RPCs for likes/trending, and storage policies.

 **Key Technical Decisions**:
 - FlashList for performant feeds; pull-to-refresh and infinite scroll patterns in place.
 - Supabase RPCs for atomic like toggling and trending; client-side fallbacks implemented.
 - Video playback via Expo Video with custom gesture system and overlays; captions supported.
 - Realtime channel subscriptions for confessions updates.
 - Persisted user preferences (autoplay, captions, data usage, haptics, motion).

 **Entry Points**: `App.tsx`, `src/navigation/AppNavigator.tsx`, `src/lib/supabase` (client), `supabase/setup.sql` and `supabase/migrations/*`.

 ---

 ## Layer 2: Module Map

 **Core Modules**:
 - Navigation: `src/navigation/AppNavigator.tsx` – Auth stack + main tabs (Home, Videos, Create, Trending, Settings) with dark theme header.
 - Feed (Home): `src/screens/HomeScreen.tsx` – FlashList of confessions with likes, replies preview, actions, refresh & pagination.
 - Video Feed: `src/components/EnhancedVideoFeed.tsx` + `src/screens/VideoFeedScreen.tsx` – TikTok-like gestures, pull-to-refresh, overlays, captions, progress.
 - Trending: `src/components/TrendingBar.tsx`, `src/components/TrendingBarItem.tsx`, `src/screens/TrendingScreen.tsx` – Hashtags/secrets with cache + RPC fallback.
 - Compose/Record: `src/screens/CreateConfessionScreen.tsx`, `src/screens/VideoRecordScreen.tsx` – Create text/video confessions, video processing utils.
 - Settings: `src/screens/SettingsScreen.tsx` – Preferences, stats, danger zone (clear all), account summary.

 **Data Layer**:
 - Stores: `src/state/confessionStore.ts`, `src/state/trendingStore.ts`, `src/state/authStore.ts`, `src/state/savedStore.ts`, `src/state/replyStore.ts` (replies), persisted via AsyncStorage.
 - Supabase: `src/utils/storage.ts` (signed URLs, upload), `src/utils/auth.ts`, SQL in `supabase/` (RLS, RPCs, functions), realtime subscriptions in `confessionStore`.

 **Integration Points**:
 - Supabase tables: `confessions`, `replies`, `user_preferences`, `user_profiles`, `user_likes`, `video_analytics`.
 - RPCs: `toggle_confession_like(confession_uuid)`, `toggle_reply_like(reply_uuid)`, `get_trending_hashtags(hours_back, limit_count)`, `get_trending_secrets(hours_back, limit_count)`, `search_confessions_by_hashtag(search_hashtag)`.
 - Storage: private bucket `confessions` with per-user folder policy; signed URL playback.

 **Utilities**:
 - `src/utils/videoProcessing.ts`, `videoCacheManager.ts`, `haptics.ts`, `trending.ts`, `links.ts`.

 **Module Dependencies**:
 - Screens depend on stores + components.
 - Stores depend on Supabase client utils and SQL/RPCs.
 - Video features depend on Expo Video, FFmpeg Kit, Reanimated, Gesture Handler.

 ---

 ## Layer 3: Integration Guide

 **API Endpoints**:
 - PostgREST: `confessions` (select/insert/update/delete with RLS), `replies`, `user_preferences`.
 - RPCs: atomic like toggles and trending/search functions (see Layer 2).

 **Configuration Files**:
 - Expo: `app.json`, Metro: `metro.config.js`, Tailwind: `tailwind.config.js`, Typescript: `tsconfig.json`.
 - Supabase CLI: `supabase/config.toml`, SQL migrations in `supabase/migrations/*`, bootstrap in `supabase/setup.sql`.

 **External Integrations**:
 - Supabase Auth, Storage, Realtime; Expo Notifications (available), Expo File System; FFmpeg Kit for media.

 **Workflows**:
 - Load → paginate confessions with FlashList; optimistic likes then RPC reconcile; realtime update syncs counts.
 - Video upload path: local → upload to Supabase Storage (per-user path) → DB row insert → signed URL for immediate playback.
 - Trending path: prefer Supabase RPCs; fallback computes hashtags/engagement client-side.

 **Interface Definitions**:
 - Confession: `{ id, type: 'text'|'video', content, videoUri?, transcription?, timestamp, isAnonymous, likes?, isLiked? }`.
 - UserPreferences: `{ autoplay, soundEnabled, qualityPreference, dataUsageMode, captionsDefault, hapticsEnabled, reducedMotion }`.

 ---

 ## Layer 4: Extension Points

 **Design Patterns**:
 - Optimistic UI with server reconciliation; cache + fallback strategies; gesture-driven media UI; persisted user settings.

 **Extension Points**:
 - Notifications: hook Expo Notifications to likes/replies via Supabase triggers and edge functions.
 - Moderation: add content moderation pipeline on insert (server-side function) and client-side filters.
 - Profile: extend Settings into a Profile hub (posts, notifications, settings).
 - Monetization: in-feed ads, premium membership entitlements toggling UI features.

 **Customization Areas**:
 - Theming via NativeWind; per-tab headers; pull-to-refresh animations via Lottie; feature flags in preferences.

 **Plugin Architecture**:
 - Encapsulate RPC calls in `utils/*` for swap-out; add edge functions for heavy workloads (e.g., trending, notifications fan-out).

 **Recent Changes**:
 - Trending RPCs and fixes in `supabase/migrations/*`; Enhanced video feed with pull-to-refresh overlay; Settings with persisted preferences.

 ---

 ## Quality Validation Checklist

 ### Required Sections
 - [x] Layer 1: System Overview completed
 - [x] Layer 2: Module Map completed  
 - [x] Layer 3: Integration Guide completed
 - [x] Layer 4: Extension Points completed

 ### Content Quality
 - [x] Architecture pattern identified and documented
 - [x] At least 3 core modules documented with purposes
 - [x] Tech stack matches actual project dependencies
 - [x] API endpoints or integration points identified
 - [x] Extension points or patterns documented

 ### Completeness
 - [x] All templates filled with actual project information
 - [x] No placeholder text remaining (no {variable} syntax)
 - [x] Information is accurate and up-to-date
 - [x] Byterover handbook provides value for navigation and onboarding

 **Completion Status**: ✅ Ready for use

