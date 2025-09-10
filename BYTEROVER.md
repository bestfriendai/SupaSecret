# SupaSecret (Toxic Confessions) - Byterover Handbook

## Project Overview
SupaSecret is a React Native app built with Expo SDK 53, featuring anonymous confessions with video recording, voice modulation, and face blurring capabilities. The app uses Supabase for backend services and includes advanced privacy features.

## Current Status
- **Expo SDK**: 53.0.22 (✅ FULLY UPGRADED)
- **React Native**: 0.79.5 (✅ UPDATED)
- **React**: 19.0.0 (✅ COMPATIBLE)
- **Architecture**: New Architecture enabled by default (✅ WORKING)
- **Platform Support**: iOS, Android, Web (✅ TESTED)
- **expo-doctor**: All 17 checks passing (✅ VALIDATED)

## Key Technologies
- **Frontend**: React Native, Expo SDK 53, TypeScript
- **State Management**: Zustand with persistence
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: NativeWind (Tailwind CSS)
- **Navigation**: React Navigation v7
- **Video/Audio**: expo-av, expo-camera, expo-video
- **Privacy**: Face detection, voice modulation, FFmpeg processing

## Architecture Overview

### Core Modules
1. **Authentication** (`src/lib/supabase.ts`, `src/utils/auth.ts`)
2. **State Management** (`src/state/`)
3. **Video Processing** (`src/utils/videoProcessing.ts`)
4. **Privacy Features** (Face blur, voice modulation)
5. **Navigation** (`src/navigation/`)
6. **UI Components** (`src/components/`)

### Key Features
- Anonymous video confessions with privacy protection
- Real-time face blurring and voice modulation
- Secure authentication with Supabase
- Offline-first architecture with sync
- Advanced video processing with FFmpeg
- Push notifications and background tasks

## Current Issues (From expo-doctor)

### Critical Issues
1. **Dependency Mismatches**:
   - @expo/config-plugins@2.0.4 (expected ~10.1.1)
   - Multiple expo packages need updates
   - React Native 0.79.2 → 0.79.5

2. **New Architecture Compatibility**:
   - Some packages untested on New Architecture
   - Need to verify compatibility

3. **Package Updates Needed**:
   - 15+ packages require updates for SDK 53 compatibility

### Security Considerations
- Token storage needs migration to expo-secure-store
- Input sanitization required for XSS prevention
- File upload validation needed

## Upgrade Requirements (SDK 53)

### Dependencies to Update
```json
{
  "react-native": "0.79.5",
  "@expo/config-plugins": "~10.1.1",
  "expo-asset": "~11.1.7",
  "expo-dev-client": "~5.2.4",
  "expo-image": "~2.4.0",
  "expo-secure-store": "~14.2.4",
  "expo-video": "~2.2.2"
}
```

### New Dependencies to Add
```json
{
  "i18n-js": "^4.1.1",
  "expo-localization": "~16.0.0",
  "expo-store-review": "^7.1.0",
  "jest": "^29.7.0"
}
```

### Configuration Updates
1. **app.json**: iOS 18 permissions, Android edge-to-edge
2. **metro.config.js**: ES module resolution updates
3. **tsconfig.json**: SDK 53 compatibility

## Implementation Phases

### Phase 1: Foundation & Dependencies ✅ COMPLETED
- [x] Update all dependencies to SDK 53 compatible versions
- [x] Fix configuration files (metro.config.js, app.json)
- [x] Resolve expo-doctor issues (all 17 checks passing)
- [x] Test basic functionality (development server working)

### Phase 2: Security & Core Improvements ✅ COMPLETED
- [x] Implement secure storage for tokens (expo-secure-store)
- [x] Add input sanitization (isomorphic-dompurify)
- [x] Update authentication flow (secure storage integration)
- [x] Test security improvements (development server working)

### Phase 3: Performance & New Features
- [ ] Add retry logic utility
- [ ] Implement pagination
- [ ] Add internationalization
- [ ] Add review prompt system

### Phase 4: Testing & Validation
- [ ] Comprehensive iOS/Android testing
- [ ] New Architecture compatibility verification
- [ ] Performance testing
- [ ] Final validation

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint with Expo and Prettier configs
- Functional React components with hooks
- Zustand for state management
- NativeWind for styling

### Testing Strategy
- Unit tests with Jest
- Integration testing for critical flows
- Device testing on iOS and Android
- New Architecture compatibility testing

### Security Best Practices
- Use expo-secure-store for sensitive data
- Sanitize all user inputs
- Validate file uploads server-side
- Implement proper error handling

## Known Issues & Solutions

### Current Blockers
1. **@expo/config-plugins version mismatch** - Critical for builds
2. **Multiple package version conflicts** - Affects stability
3. **New Architecture compatibility** - Some packages need verification

### Workarounds
- Use package overrides/resolutions for version conflicts
- Test thoroughly on development builds
- Monitor for New Architecture compatibility issues

## Next Steps
1. Execute Phase 1: Foundation & Dependencies
2. Validate with expo-doctor
3. Test on development builds
4. Proceed with subsequent phases

---
*Last Updated: 2025-01-09*
*Expo SDK Version: 53.0.9*
