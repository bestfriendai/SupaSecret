# Video & Trending Production Readiness (Expo SDK 54)

## Stack Compatibility Overview

- **Expo Camera (~17.0.8)** – Supported in Expo Go and development builds. Provides the fallback capture path used by `VideoRecordScreen`. Requires both camera and microphone permissions via `Camera.requestCameraPermissionsAsync` and `Camera.requestMicrophonePermissionsAsync`.
- **Expo Video (~3.0.11)** – Backed by `expo-video` + `useVideoPlayer`; safe in Expo Go and dev builds. `useVideoPlayers` pools players and auto-pauses on tab blur/app background.
- **react-native-vision-camera (4.5.2)** – Development builds only. Configured through `app.config.js` with `enableFrameProcessors`. Exposed through `UnifiedVideoService` for capability checks so UI can surface availability and fall back automatically.
- **ffmpeg-kit-react-native (6.0.2)** – Dev builds only; verified via `UnifiedVideoProcessingService.checkFFmpegAvailability()`. Expo Go routes through server-side processing (`ProcessingMode.SERVER`).
- **Speech/voice pipeline** – Real-time overlay simulates in Expo Go and hydrates with live transcription when native speech APIs are present. Voice modulation uses FFmpeg filters in dev builds and server fallback otherwise.

## Implementation Changes

### Video Capture & Processing

- `VideoRecordScreen.tsx` now consumes `useVideoRecorder` with production toggles (face blur, voice modulation, voice effect, live captions) and capability awareness via `useVideoCapabilities`.
- Processed videos are enqueued through `confessionStore.queueTempConfession`, preserving face blur/voice metadata for optimistic UI and offline resilience.
- Added processing overlay with progress + status sourced from `UnifiedVideoProcessingService` progress callbacks.
- Updated `TranscriptionOverlay` to accept externally supplied transcription text for real-time display.

### Trending Topics

- New Supabase SQL functions (`get_trending_hashtags`, `get_trending_secrets`, `search_confessions_by_hashtag`) provide server-side aggregation with time decay and view weighting. Backed by GIN/BRIN indexes for performance.
- `trendingStore` now tracks request params, avoids stale cache reuse, and establishes a throttled realtime channel that force-refreshes when confessions mutate.
- Utility scoring (`calculateEngagementScore`) includes weighted views to mirror backend logic; added Jest coverage in `src/utils/__tests__/trendingUtils.test.ts`.

## Testing Checklist

1. `npm run lint` – surfaces lint warnings (project contains legacy warnings; new paths lint clean).
2. `npm run typecheck` – validates TS (optional but recommended before release).
3. **Device validation**
   - Dev build (iOS + Android): record video with face blur + voice mod enabled; confirm processed asset appears in feed.
   - Expo Go: confirm fallback pipeline queues server processing and UI exposes capability banner.
4. Supabase verification: run new migration, then `supabase functions list` to ensure RPCs deploy; smoke test via `scripts/test-supabase-functions.js`.
5. Trending feed exercise: create confessions with hashtags across sessions; observe Trending tab auto-refresh within ~1.5s.

## Troubleshooting Notes

| Issue | Symptom | Resolution |
| --- | --- | --- |
| Missing Vision Camera | Capability banner shows "Using Expo Camera fallback" in dev build | Rebuild with `expo prebuild` + native pods, ensure device not running Expo Go |
| FFmpeg unavailable | Processing overlay stalls at low percentage | Confirm dev build, check `ffmpeg-kit-react-native` installation, fall back to server mode via `ProcessingMode.SERVER` |
| Live transcription blank | Expo Go or speech service disabled | Overlay now defaults to simulation; verify speech permissions on iOS (Settings → Privacy → Speech Recognition) |
| Trending RPC errors | Store logs "Failed to load trending" | Reapply migration, ensure `pg_trgm` extension enabled, grant execute to anon/auth roles |
| Hashtag search misses results | Query lacks `#` prefix | Function normalizes input; ensure migrations run and `confessions_content_transcription_search_idx` index created |

## Known Limitations / Compatibility

- Vision Camera & FFmpeg remain unsupported in Expo Go; advanced anonymization runs server-side in that context.
- Real-time speech recognition requires platform APIs (iOS Speech framework / Android SpeechRecognizer). Simulation runs otherwise.
- Trending refresh is throttled to 1.2s; extremely high write volumes may require server-side scheduled recompute (Supabase cron) for consistency.

