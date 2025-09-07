SupaSecret Upgrade and Fixes — September 2025
============================================

This document summarizes the codebase-wide improvements, schema upgrades, lint/format pipeline fixes, and TypeScript error resolutions applied to make the app build cleanly and run reliably.

What Changed
------------

- Database
  - Enabled `pgcrypto` for `gen_random_uuid()`.
  - Added robust membership subsystem:
    - `public.user_memberships` table with RLS, `updated_at` trigger, and default row trigger upon `auth.users` insert.
    - Helper functions `public.has_active_membership(uuid, text)` and `public.get_user_tier(uuid)` with execute grants.
  - Notifications & Push tokens alignment:
    - `public.push_tokens` upsert via composite unique `(user_id, platform)`.
    - RPC `get_unread_notification_count` wired to client store.
  - Qualified all functions and policies with `public.` schema for clarity and safety.

- Client Types and Stores
  - Supabase `Database` types expanded:
    - Tables: `user_memberships`, `push_tokens`, `notifications`, `notification_preferences`.
    - Functions: `exec_sql`, `get_unread_notification_count`, `has_active_membership`, `get_user_tier`, `toggle_confession_like`, `toggle_reply_like`, `get_trending_hashtags`, `get_trending_secrets`, `search_confessions_by_hashtag`.
  - Membership TS interface aligned to DB nullability; upsert uses `{ onConflict: 'user_id' }`.
  - Push token storage normalized `Platform.OS` to `'ios'|'android'|'web'` and uses `{ onConflict: 'user_id,platform' }`.
  - Confessions store fixes:
    - Guarded user access, removed reliance on absent `user_id` in `Confession` type.
    - Mapped `user_preferences` columns and defaulted `playbackSpeed`.
  - Trending store fixes:
    - RPC typing added; null → undefined normalization for `videoUri`/`transcription`.
  - Notifications types fixed (`actor_user_id`, `read_at` allow null) and store logic uses typed rows.

- UI/Components
  - Fixed Reanimated/Animated style typing in `ConfessionSkeleton`.
  - Fixed conditional hook in `EnhancedVideoFeed` by moving effects above early return.
  - Refactored `ProgressIndicator` to child `ProgressDot` component (rules-of-hooks compliant).
  - Refactored `OptimizedVideoList` to let `EnhancedVideoItem` own its player via `useVideoPlayer`.
  - Navigation typing corrected in `HashtagText` (navigates to Tab route `Trending`).
  - Profile screen uses `createdAt` (camelCase) from our `User` type.

- Tooling
  - ESLint: Switched to v8 (legacy config), added Prettier integration and scripts:
    - `npm run lint` — runs ESLint with Prettier.
    - `npm run typecheck` — runs `tsc --noEmit`.
  - Auto-format: Applied `npm run lint -- --fix` across repo.

Files Touched (Highlights)
--------------------------

- `supabase/migrations/20250906131400_create_base_schema.sql`: add `pgcrypto`.
- `supabase/migrations/20250906140200_add_user_memberships.sql`: hardening, triggers, grants.
- `src/types/database.ts`: new tables and RPC typings.
- `src/types/membership.ts`, `src/state/membershipStore.ts`: nullable fields + upsert `onConflict`.
- `src/utils/pushNotifications.ts`: NotificationBehavior fields, platform normalization, upsert.
- `src/state/confessionStore.ts`: guards, preferences mapping, clear-all fixes.
- `src/state/trendingStore.ts`: RPC typing, null→undefined mapping.
- `src/types/notification.ts`, `src/state/notificationStore.ts`: null-safe fields.
- `src/components/*`: hook and style fixes in skeletons, progress indicator, video feed and list.
- `package.json`: ESLint v8 + Prettier devDeps and scripts.

How to Apply and Verify
-----------------------

1) Install dependencies
- `npm install`

2) Database migrations
- Apply the migrations in `supabase/migrations/` to your Supabase project.
- Ensure `pgcrypto` is enabled (first migration covers it).

3) Lint & Format
- `npm run lint` (to view)
- `npm run lint -- --fix` (to auto-fix)

4) Type-check
- `npm run typecheck` — should complete with no errors.

5) Run app
- `npm start` (choose platform)

Notes & Rationale
-----------------

- Upserts must target the correct unique columns: user memberships by `user_id`; push tokens by `(user_id,platform)`.
- Trigger functions that write into RLS tables must be `SECURITY DEFINER` with `SET search_path = public` to avoid policy failures and function hijacking.
- Client DB typings remove `never` overload errors and enforce correct RPC/table usage.
- Hook rule compliance prevents runtime bugs and ensures consistent rendering order.

Next Opportunities
------------------

- Reduce eslint warnings (missing deps in hooks) by stabilizing callbacks and values.
- Add integration tests for stores with mocked Supabase responses.
- Consider a typed API client wrapper for RPCs to avoid ad-hoc `any` conversions.

