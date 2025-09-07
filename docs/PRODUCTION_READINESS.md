# SupaSecret Production Readiness & Bug Elimination Guide (Revised)

According to Byterover memory layer and the latest repo updates, this revision acknowledges newly added utilities, screens, SQL migrations, and fixes across components while sharpening remaining gaps to reach a production‑grade, reliable, secure, and observable release.

Grounding context (current tech + notable updates):

- Runtime: Expo SDK 53, React Native 0.79, TypeScript 5.x
- State: Zustand stores under `src/state/` (auth, confession, reply, report, saved, trending, membership, notification)
- API/data: Supabase (`src/lib/supabase.ts`, SQL migrations under `supabase/`) with RLS migration `20250906140300_implement_rls_policies.sql`
- Utilities: error handling (`src/utils/errorHandling.ts`), robust retries (`src/utils/retryLogic.ts`, `src/utils/supabaseWithRetry.ts`), caching, push notifications, video processing/cache manager
- Features: New/updated screens (notifications, membership/paywall, profile, my secrets), richer components (skeletons, segmented tabs, action sheets)
- Entry: `index.ts`, `App.tsx` (init flow + store rehydration logs)

This document is a prioritized plan with concrete actions, code pointers, and rollout guidance. Items marked Already in place reflect your recent updates; Next step focuses on closing gaps.

---

## 1) Security & Secrets Management

Priority: Critical

- Supabase secrets (Next step): `src/lib/supabase.ts` still contains fallback URL/anon key literals. Remove these fallbacks and fail fast when envs are missing in production.
  - Why: Prevents accidental connection to the wrong project and avoids leaking usable credentials.
  - Action: Require `EXPO_PUBLIC_VIBECODE_SUPABASE_URL` and `EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY`; throw in non‑dev if missing.
- Client‑side keys (Already in place + Next step): You correctly route transcription via a server endpoint (`src/api/transcribe-audio.ts`). Continue this approach for any provider where a secret grants privileged/billable access.
  - Keep only public identifiers in EXPO_PUBLIC_*.
  - For image generation (`src/api/image-generation.ts`), confirm the Vibecode endpoint does not require a secret key on the client. If it does, proxy behind your server.
- RLS (Already in place): `20250906140300_implement_rls_policies.sql` enables policies on core tables.
  - Next step: Add a minimal “RLS verification” test that attempts reads/writes with anon creds for non‑permitted scenarios to assert DENY.
- Storage: Validate private vs public buckets and short‑lived signed URLs where privacy matters. Add CORS for mobile if needed.
- Privacy/Compliance: Document data deletion/export procedures; ensure TOS/PP references in the app and stores.

---

## 2) Configuration Strategy

Priority: Critical

- Environments & channels (Next step): Formalize dev/preview/prod channels and map branches.
  - Dev → `development` channel; Staging → `preview`; Prod → `production`.
- Secrets (Next step): Move privileged values to EAS Secrets; keep only non‑sensitive identifiers in EXPO_PUBLIC_*.
- Startup validation (Next step): Add a small config guard that validates required vars on boot and throws in production when missing.

Example (pseudocode)
```ts
const required = [
  'EXPO_PUBLIC_VIBECODE_SUPABASE_URL',
  'EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_VIBECODE_PROJECT_ID',
];
required.forEach((k) => {
  if (!process.env[k]) {
    if (__DEV__) console.warn(`Missing env: ${k}`);
    else throw new Error(`Missing required config: ${k}`);
  }
});
```

---

## 3) Reliability: Error Handling, Retries, Offline, Idempotency

Priority: High

- Error handling (Already in place → Expand): `src/utils/errorHandling.ts` exists. Ensure all async store methods and API services adopt `withErrorHandling` consistently.
- Retries (Already in place → Tune): `src/utils/retryLogic.ts` and `src/utils/supabaseWithRetry.ts` are present. Calibrate policies per domain:
  - Supabase CRUD: 3 attempts, backoff 1s → 8s with jitter.
  - External APIs: slightly longer delays, include 429 handling.
- Idempotency (Next step): Use unique keys/upserts on hot paths (posts/likes/report) to avoid duplicates under retries.
- Offline (Next step):
  - Leverage MMKV/SQLite to cache last‑known reads.
  - Queue mutations when offline; replay with backoff.
  - Surface clear offline banners via `@react-native-community/netinfo`.
- Timeouts (Next step): Standardize fetch timeouts and user messages for timeouts/network errors.

---

## 4) Performance Tuning (Mobile‑First)

Priority: High

- Lists: Use FlashList where possible (`@shopify/flash-list` is included). Ensure item keys and `estimatedItemSize` are set.
- Video: Audit `src/utils/videoCacheManager.ts`, `src/components/EnhancedVideoItem.tsx` and related. Recommendations:
  - Lazy‑load thumbnails, prefetch next items sparingly.
  - Ensure cache invalidation strategy in `src/utils/cacheInvalidation.ts` fits usage.
  - Use `expo-video` with hardware decoding, set reasonable buffer configs.
- Images: Prefer `expo-image` with caching and contentFit; avoid large inline base64.
- Reanimated/Gesture: Confirm Babel plugin and config are correct; keep animations on UI thread where possible.
- Bundles: Enable Hermes (default with Expo), enable minification/obfuscation. Split code by feature if bundle size grows.

---

## 5) Observability: Logging, Crashes, Metrics

Priority: High

- Crashes & performance (Next step): Integrate Sentry (`sentry-expo`) for error/crash capture and traces.
- Structured logs: Add a lightweight logger that can be silenced in production and writes to console in dev.
- User feedback: Provide a quick report sheet (you already have `ReportModal.tsx`) and correlate with logs.
- Backend observability: Enable Supabase logs and monitor RLS denials, slow queries, and error rates.

---

## 6) Testing Strategy

Priority: High

- Unit tests (Jest):
  - Target utils: `src/utils/*` (error handling, retry, trending calculations, storage utils).
  - Stores: test Zustand reducers and effects (mock Supabase and network calls).
- Integration tests:
  - Auth flows: sign in/out, rehydration (`useAuthStore`, `checkAuthState`).
  - Feed interactions: loading, refreshing, posting, liking, reporting.
- E2E tests (Detox):
  - Onboarding → sign‑in → feed → detail → create content → settings.
- Supabase tests:
  - Use the included test helpers (`src/utils/testDatabase.ts`, `src/utils/testAuth.ts`, `src/utils/testReportSystem.ts`).
  - Spin up Supabase locally (`supabase start`), run migrations, seed minimal data.
- Static analysis:
  - `npm run typecheck` and `npm run lint` must pass in CI.

Example test commands
```bash
# Run typecheck + lint locally
npm run typecheck && npm run lint

# Jest (if added)
npx jest --config ./jest.config.js

# Detox (example)
detox test --configuration ios.sim.debug
```

---

## 7) CI/CD with Expo EAS

Priority: High

- CI jobs (GitHub Actions):
  - Install deps → `npm run typecheck` → `npm run lint` → run unit tests → build artifact (EAS build for preview).
  - Cache `~/.npm`, `~/.cache/expo`, and `node_modules` where appropriate.
- Environments & channels:
  - Map branches to channels: `main` → `production`, `develop` → `preview`, feature branches → `development`.
  - Use EAS Update for OTA for non‑native changes.
- Code signing:
  - Configure iOS and Android signing in EAS; store credentials in EAS secret store, not in repo.
- Supabase migrations in CI:
  - Lint SQL; on main merges, apply migrations via pipeline (if you host a managed Supabase project, coordinate through a controlled path; otherwise use manual approval gates).

---

## 8) Supabase: Schema, Policies, Indexes, Migrations

Priority: High

- Migrations hygiene (Already in place → Maintain): Keep `supabase/migrations/` linear and reviewed. Never edit past migrations; add new ones.
- RLS review (Already in place → Verify): Validate each table used by the client has least‑privilege RLS. Add tests that perform read/write with an anon token to ensure denials are expected.
- Indexing (Already in place → Review): Confirm indexes for high‑cardinality filters and ordering (e.g., created_at DESC, trending score, user_id FKs). Cross‑check slow queries.
- RPC functions: Encapsulate complex logic in RPCs with security definer where needed; expose only what the client needs.
- Rate limiting: Consider edge function or PostgREST rate limits (and client‑side backoff) for hot endpoints.

---

## 9) Authentication & Session Management

Priority: High

- Store rehydration (Already in place → Test): `useAuthStore` persists state with versioning. Add tests ensuring rehydration behaves as expected.
- Auth listener lifecycle (Already in place): You export `cleanupAuthListener`. Ensure it’s called on app unmount/sign‑out.
- Social providers (Next step): If adding OAuth, use deep links and test refresh paths thoroughly.
- Secure profile updates (Next step): Route sensitive updates via RLS‑protected tables or edge functions that validate the caller.

---

## 10) UX Resilience & Edge Cases

Priority: Medium

- Loading states (Already in place → Audit): Skeletons are present (`ConfessionSkeleton`, `VideoSkeleton`, `NotificationSkeleton`, `TrendingSkeleton`). Ensure `isLoading` flags toggle consistently across screens.
- Pull‑to‑refresh (Already in place → Verify): `components/PullToRefresh.tsx` exists — verify it cancels stale requests and debounces.
- Pagination (Next step): Ensure no double‑fetch; guard against race conditions when switching tabs quickly.
- Background/foreground (Next step): Pause/resume video, stop heavy timers/jobs when app backgrounded.
- Notifications (Already in place → Verify): Verify token registration (`src/utils/pushNotifications.ts`) and permission handling across platforms. Handle revoked tokens and uninstalls.

---

## 11) Accessibility, Internationalization, Compliance

Priority: Medium

- Accessibility: Ensure touch targets, labels, contrast, dynamic type scaling. Use `accessibilityLabel`, `accessible`, and test with VoiceOver/TalkBack.
- i18n: Introduce a simple i18n library if needed; externalize strings starting from headers and key CTAs.
- App Store requirements: Ensure permission strings and privacy usage descriptions are set in `app.json`. Add Apple privacy manifests if any SDKs require them.

---

## 12) Hardening the Build

Priority: Medium

- Production flags (Next step): Remove dev logs. Keep minimal analytics logs in production.
- Proguard/Minify (Next step): Ensure enabled. Verify no classes are over‑stripped (test thoroughly).
- Bundle size: Track with CI; alert on >X% diff.
- Deep links & intents: Whitelist expected schemes; reject unexpected external links.

---

## 13) Developer Experience & Governance

Priority: Medium

- Pre‑commit hooks (Next step): Add lint + typecheck + unit tests (husky) to prevent foot‑guns.
- Code owners: Require review for `supabase/` and `src/api/`.
- Documentation: Maintain `README`, this guide, and a simple Runbook with common incidents and resolutions.

---

## 14) Concrete Fixes to Apply Now

1) Supabase client safety (`src/lib/supabase.ts`)
- Remove fallback URL/key literals. Fail fast if envs are missing in production. Consider a `getEnv()` helper that enforces presence and centralizes error messages.

2) Central config guard
- Add `src/lib/config.ts` that reads and validates envs once, exports typed config, and is used by `supabase.ts`, API clients, and features.

3) Sentry integration
- Add `sentry-expo`, initialize early in `index.ts`, and wrap global error boundaries.

4) Logging discipline
- Replace ad‑hoc `console.log` with a `logger` util that no‑ops in production and supports levels (debug/info/warn/error).

5) Tests first targets
- `src/utils/errorHandling.ts` and `src/utils/retryLogic.ts`: cover error codes, retry conditions, and messages.
- `src/state/authStore.ts`: rehydration and auth flows.
- `src/utils/pushNotifications.ts`: permission/registration paths and failure handling.

6) CI baseline
- Add GitHub Action to run `npm ci`, `npm run typecheck`, `npm run lint`, and unit tests on every PR.

---

## 15) Example Snippets

Strict env in Supabase client
```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const url = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  const msg = 'Missing Supabase env (URL/ANON)';
  if (__DEV__) console.warn(msg);
  else throw new Error(msg);
}

export const supabase = createClient<Database>(url!, anon!, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  global: { headers: { 'X-Client-Info': 'supabase-js-react-native' } },
  db: { schema: 'public' },
  realtime: { params: { eventsPerSecond: 10 } },
});
```

Initialize Sentry (example)
```ts
// index.ts
import * as Sentry from 'sentry-expo';
Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, enableInExpoDevelopment: true, debug: __DEV__ });
```

Logger utility
```ts
// src/utils/logger.ts
export const logger = {
  debug: (...args: any[]) => { if (__DEV__) console.debug(...args); },
  info: (...args: any[]) => { if (__DEV__) console.info(...args); },
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
};
```

---

## 16) Rollout Plan

1. Week 1
- Add config guard, remove insecure fallbacks, integrate Sentry, add logger, create CI pipeline.
2. Week 2
- Add unit tests for utils/auth/notifications; implement FlashList on long lists; audit video caching.
3. Week 3
- Expand integration tests; finalize Supabase index/rls verification; introduce OTA channels; dry‑run EAS builds for preview.
4. Week 4
- Stabilize E2E tests (Detox), complete Observability dashboards, publish first production build.

---

## 17) Known Hotspots To Watch

- `src/lib/supabase.ts`: remove fallback creds.
- `src/api/*`: ensure no privileged keys in client; keep server‑only secrets server‑side.
- Video flows: ensure caching, memory, and background lifecycle are robust.
- Store errors: ensure all async store methods use `withErrorHandling` for consistency.
 - Notifications: token refresh/revocation paths and retries.

---

## 18) Definition of Done

- CI is green (typecheck, lint, unit tests).
- No hardcoded secrets; config validated at startup.
- RLS enforced; read/write paths verified with anon token.
- Crash/trace telemetry active; weekly error budget tracked.
- Core journeys covered by Detox.
- Release channels and rollback strategy documented and tested.

---

Adopting these steps will make SupaSecret production‑ready, safer with secrets, resilient to failures, observable in the wild, and easier to maintain without regressions. From Byterover memory tools, the emphasis is now on removing remaining secret fallbacks, adding Sentry, and verifying RLS/notifications paths—most other foundations are already in place.
