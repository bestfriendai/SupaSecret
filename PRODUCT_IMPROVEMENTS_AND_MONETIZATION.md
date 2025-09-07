 # SupaSecret — Product Improvements & Monetization Strategy

 Date: 2025-09-06

 According to Byterover memory layer and based on memory extracted from Byterover, this document synthesizes the current app state and proposes pragmatic UX improvements, feature additions, and monetization paths that align with the existing Expo + React Native + Supabase architecture.

 ---

 ## Executive Summary

 SupaSecret is a privacy-first social app for anonymous text/video confessions with trending discovery and lightweight interactions. The codebase is solid: FlashList feeds, TikTok-style video flow, Supabase-backed data, and a consistent dark UI. To make the app feel complete and delightful, we recommend:

 - Unify pull-to-refresh UX across Home and Videos with a premium animated indicator and contextual messaging.
 - Polish the Videos tab with preloading, skeletons, and subtle guidance affordances.
 - Add a My Secrets management area (view + delete own posts) under a new Profile hub that replaces the standalone Settings tab.
 - Introduce a Notifications center (likes/replies) with optional push via Expo Notifications.
 - Ship a thoughtful monetization mix: tasteful in-feed ads, an ad-free membership with value-add features, and optional cosmetic upgrades.

 ---

 ## Current State Overview

 - Navigation: Root stack + tabs (Home, Videos, Create, Trending, Settings) with dark theme header.
   - `src/navigation/AppNavigator.tsx:1`
 - Home feed: FlashList of confessions, native RefreshControl, infinite scroll.
   - `src/screens/HomeScreen.tsx:1`
 - Videos feed: Enhanced video experience with gestures, overlays, captions, and a custom PullToRefresh overlay.
   - `src/components/EnhancedVideoFeed.tsx:1`
   - `src/components/PullToRefresh.tsx:1`
 - Trending: Header TrendingBar + full Trending screen with RPC + fallback.
   - `src/components/TrendingBar.tsx:1`
   - `src/screens/TrendingScreen.tsx:1`
 - Data: Supabase tables + RPCs for likes and trending; private storage with signed URLs.
   - `supabase/setup.sql:1`, `supabase/migrations/`

 From Byterover memory tools: React Native swipe-to-refresh with infinite scroll and Supabase RPC fallback patterns strongly match the current implementation, so changes can stay incremental.

 ---

 ## UX Improvements

 ### 1) Pull-to-Refresh (Home + Videos)

 Goals: Make refresh delightful, informative, and consistent across tabs.

 - Unify component:
   - Reuse/enhance `PullToRefresh` from Videos on Home to replace native RefreshControl for a consistent experience.
   - Files to touch: `src/screens/HomeScreen.tsx:1`, `src/components/PullToRefresh.tsx:1`.
 - Animated indicator:
   - Use Lottie RN (already installed) for a lightweight spinner/emoji that morphs as the user pulls.
   - Respect `reducedMotion` preference (gate heavy animation).
 - Contextual microcopy (dynamic):
   - Below threshold: “Pull to refresh secrets”
   - Near threshold: “Release to refresh — fetching freshest confessions”
   - Refreshing: “Refreshing… new secrets secure and anonymous”
 - Progressive affordance:
   - Show a circular progress arc filling to the threshold; swap to checkmark at trigger.
 - Trending hint:
   - On refresh complete, briefly show a “Top tag: #...” pill sourced from `useTrendingStore()`.

 Engineering sketch:
 - Add a `pullDistance` shared value on Home like in EnhancedVideoFeed; render `PullToRefresh` absolutely over the list.
 - Keep FlashList’s `onRefresh` but disable native indicator (set `refreshing` false and rely on overlay visuals).
 - Use `reducedMotion` to choose between Lottie vs simple rotate.

 ### 2) Videos Tab Polish

 Goals: Improve perceived performance, guidance, and control without clutter.

 - Preload neighbors:
   - Warm up next/previous video in `useVideoPlayers` to reduce start latency.
 - Skeleton + first frame blur:
   - Show a blurred thumbnail/skeleton while player becomes ready.
 - Subtle guidance:
   - First-time users see a one-time tip (“Swipe up for next, double-tap to like”).
 - Speed and captions control:
   - Add a compact speed toggle (0.75×/1×/1.25×) and persist last choice in preferences.
   - Keep existing CC toggle; only show when transcription exists.
 - Watch progress:
   - Track per-video watch progress (analytics map exists) to show a thin progress bar on thumbnails in a future grid view.
 - Haptics & reduced motion:
   - Wrap major animations and haptics behind `userPreferences` gates.

 Files: `src/components/EnhancedVideoFeed.tsx:1`, `src/hooks/useVideoPlayers.ts:1`.

 ### 3) Feed Refinements

 - Inline actions:
   - Long-press to open action sheet (save, share, report) — already present via `FeedActionSheet`; expose long-press affordance.
 - Content clarity:
   - For video items on Home, include duration and a mini progress indicator beside the “Video confession” label.
 - Empty and error states:
   - Tune copy and add a “Compose” CTA on empty; show a retry chip on network errors.

 Files: `src/screens/HomeScreen.tsx:1`, `src/components/ConfessionSkeleton.tsx:1`.

 ---

 ## New Features

 ### 4) My Secrets (View & Delete)

 Purpose: Give users control over their own posts, aligned with existing deletion logic.

 - New screen: `MySecretsScreen`
   - Lists confessions where `user_id = auth.uid()` sorted by `created_at desc`.
   - Filter chips: All, Text, Video. Search by content/hashtag.
   - Row actions: View, Delete (confirm), Copy text, Share.
   - Bulk actions: “Delete All” with strong confirmation.
 - Data hooks:
   - Reuse `confessionStore.deleteConfession(id)` and a new query method `loadUserConfessions()`.
 - Navigation:
   - From Profile hub (see next section).

 Files to add/touch: `src/screens/MySecretsScreen.tsx`, `src/state/confessionStore.ts:1` (add loader), `src/navigation/AppNavigator.tsx:1` (route).

 ### 5) Profile Hub (replace Settings tab)

 Purpose: Make Settings part of a richer Profile experience: Posts, Saved, Notifications, Settings.

 - New tab: `Profile` replacing `Settings`.
 - Top header:
   - Avatar placeholder (anonymous), username or “Anonymous User”, member since.
 - Segmented tabs:
   - Posts → `MySecretsScreen`
   - Saved → saved list (`useSavedStore`) with quick-unsave
   - Notifications → in-app activity feed (below)
   - Settings → existing Settings content
 - Badges:
   - Show unread count dot on the Notifications tab segment.

 Files: `src/screens/SettingsScreen.tsx:1` (move content under Profile routes), `src/navigation/AppNavigator.tsx:1`.

 ### 6) Notifications (In-App + Push)

 Purpose: Close the loop on engagement — notify users about likes and replies.

 - Database:
   - Table `notifications` (id, user_id, type: 'like'|'reply', entity_id, created_at, read_at null).
   - Triggers on `user_likes` insert and `replies` insert create notifications for the post owner.
 - In-app feed:
   - Screen `NotificationsScreen` showing grouped items with mark-read and clear-all.
 - Push (optional, opt-in):
   - Register Expo push tokens; edge function fans out to target user on new notification rows.
   - Respect quiet hours and frequency caps.

 Files: `supabase/migrations/` (table + triggers), `src/screens/NotificationsScreen.tsx`, `src/utils/notifications.ts` (register/token store), `src/state` (unread count).

 ---

 ## Completeness & Quality Bar

 - Accessibility: Respect reduced motion, color contrast (already good), larger hit targets on key actions.
 - Error handling: Toasts/snackbars for network failures; retry controls.
 - Offline: Gracefully degrade (cached feed), queue likes and reconcile later.
 - Analytics: Track core events (view, like, refresh, share) with `expo-insights`.
 - Moderation: Add server-side moderation hook on insert; client-side block/report already present.

 ---

 ## Monetization Strategy

 From Byterover memory tools: for anonymous social apps, tasteful native ads, optional memberships, and cosmetic upgrades fit best while preserving trust.

 ### A) Ads (Tasteful, Privacy-Respecting)

 - Native in-feed placements:
   - Insert every ~8–12 items on Home and Trending; exclude Videos full-screen flow.
   - Frequency capping and category filters; clearly labeled “Sponsored”.
 - Formats:
   - Static card with CTA; optional lightweight video muted by default.
 - Tech:
   - Use `react-native-google-mobile-ads` for AdMob or a mediated SDK; load ads ahead of scroll index.
 - Controls:
   - Respect user preferences and data usage mode; reduce on minimal data mode.

 ### B) Memberships (SupaSecret Plus)

 - Ad-free experience.
 - Video perks: longer uploads, faster processing priority, higher quality cap.
 - UX perks: advanced filters in My Secrets, unlimited saves, profile customization (themes/app icons).
 - Early access: staged rollout of new features to Plus.
 - Billing:
   - Use `expo-in-app-purchases` or RevenueCat SDK; store entitlements in Supabase and gate features in UI.

 ### C) Cosmetic Upgrades (One-time)

 - App icon packs and color themes (client-only, anonymous-friendly).
 - Seasonal animations for pull-to-refresh (e.g., winter confetti) purchasable or Plus-exclusive.

 ### D) Experiments & Safeguards

 - A/B test ad density and membership pricing; collect opt-in analytics.
 - Enforce content safety for ad requests; never place ads in sensitive content contexts.
 - Regional pricing and currency support.

 ---

 ## Implementation Roadmap (90-day)

 1. Pull-to-refresh unification + Videos polish (Week 1–2)
 2. Profile hub with My Secrets + Saved (Week 2–4)
 3. Notifications DB + in-app feed (Week 4–6), optional push (Week 6–7)
 4. Ads integration (feature-flagged, Week 6–8)
 5. Memberships (entitlements + paywall, Week 8–12)

 ---

 ## Engineering Notes

 - Likes: Use RPC first; fall back to direct update on error — already implemented (`src/state/confessionStore.ts:1`).
 - Storage: Keep bucket private; always sign URLs (`src/utils/storage.ts:1`).
 - Trending: Favor RPC; cache results and validate expiry (`src/state/trendingStore.ts:1`).
 - Performance: Always set `estimatedItemSize` for FlashList and memoize render items.

 ---

 ## Acceptance Criteria (Phase 1)

 - Home uses the same animated pull-to-refresh component as Videos with contextual copy.
 - Videos feed shows preload/skeleton and a one-time gesture tip.
 - Profile hub exists with tabs: Posts (My Secrets), Saved, Notifications, Settings.
 - My Secrets lists only the user’s posts with delete single/all.
 - No regressions in auth routing or feed pagination.

