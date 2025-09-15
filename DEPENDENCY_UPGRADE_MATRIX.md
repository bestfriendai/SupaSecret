# Dependency Upgrade Matrix - September 2025

## Current vs Latest Versions Analysis

### Critical Upgrades Required

| Package | Current | Latest Stable | Status | Breaking Changes | Priority |
|---------|---------|---------------|--------|------------------|----------|
| `react-native-vision-camera` | 4.0.0-beta.13 | 4.7.2 | ⚠️ Beta → Stable | API changes | CRITICAL |
| `@react-native-firebase/analytics` | 19.2.2 | 23.3.1 | ❌ Major behind | Config changes | HIGH |
| `@react-native-firebase/crashlytics` | 19.2.2 | 23.3.1 | ❌ Major behind | Config changes | HIGH |
| `@sentry/react-native` | 6.20.0 | 8.40.0 | ❌ Major behind | API changes | HIGH |
| `@react-native-voice/voice` | 3.2.4 | 3.1.5 | ⚠️ Downgrade | Security fix | HIGH |

### Moderate Priority Upgrades

| Package | Current | Latest Stable | Status | Breaking Changes | Priority |
|---------|---------|---------------|--------|------------------|----------|
| `@shopify/flash-list` | 2.0.2 | 2.0.1 | ⚠️ Ahead | Verify compatibility | MEDIUM |
| `react-native-markdown-display` | 7.0.2 | 7.0.2 | ✅ Current | None | LOW |
| `ffmpeg-kit-react-native` | 6.0.2 | 6.0.2 | ✅ Current | None | LOW |
| `react-native-mmkv` | 2.12.2 | 3.1.0 | ⚠️ Major behind | API changes | MEDIUM |

### Already Up-to-Date

| Package | Current | Latest Stable | Status | Notes |
|---------|---------|---------------|--------|-------|
| `expo` | 54.0.6 | 54.0.6 | ✅ Current | SDK 54 latest |
| `react` | 19.1.0 | 19.1.0 | ✅ Current | Aligned with RN |
| `react-native` | 0.81.4 | 0.81.4 | ✅ Current | Expo SDK 54 requirement |
| `react-native-reanimated` | 4.1.0 | 4.1.0 | ✅ Current | Latest stable |
| `@react-navigation/*` | 7.0.0 | 7.0.0 | ✅ Current | Recently upgraded |

## Expo SDK 54 Compatibility Matrix

### ✅ Fully Compatible
- All `expo-*` packages at correct versions
- React Navigation v7 packages
- React 19.1.0 and React Native 0.81.4
- NativeWind 4.1.23 (with known TypeScript issues)

### ⚠️ Requires Config Plugins
| Package | Plugin Required | Min Version | Notes |
|---------|----------------|-------------|-------|
| `@react-native-firebase/analytics` | Yes | Latest | Native Firebase SDK |
| `react-native-google-mobile-ads` | Yes | Latest | AdMob integration |
| `react-native-vision-camera` | Yes | Latest | Camera permissions |
| `@react-native-ml-kit/face-detection` | Yes | Latest | ML Kit integration |

### ❌ Incompatible with Expo Go
- All Firebase packages (require native modules)
- `ffmpeg-kit-react-native` (native binaries)
- `react-native-mmkv` (native storage)
- `react-native-video-processing` (native processing)

## Breaking Changes Summary

### React Native Vision Camera (beta.13 → 4.7.2)
**API Changes**:
- Camera configuration props updated
- Video recording API stabilized
- Performance improvements

**Migration Steps**:
1. Update camera configuration
2. Test video recording functionality
3. Verify frame processor compatibility
4. Update TypeScript types

**Code Example**:
```typescript
// Before (beta)
const camera = useCamera({
  video: true,
  audio: true
});

// After (stable)
const camera = useCamera({
  video: {
    fileType: 'mp4',
    videoCodec: 'h264'
  },
  audio: {
    sampleRate: 44100
  }
});
```

### Firebase SDK (19.x → 23.x)
**Major Changes**:
- Analytics API updates
- Crashlytics configuration changes
- New Firebase features available
- Native configuration updates required

**Migration Steps**:
1. Update native iOS/Android configurations
2. Update analytics tracking calls
3. Test crashlytics reporting
4. Verify remote config integration

### Sentry SDK (6.20.0 → 8.40.0)
**Breaking Changes**:
- Initialization API changes
- Performance monitoring updates
- Error boundary integration changes

**Migration Steps**:
1. Update Sentry initialization
2. Update error tracking configuration
3. Test crash reporting
4. Verify performance monitoring

## Native Module Requirements

### Development Build Required
| Package | Reason | EAS Build Config |
|---------|--------|------------------|
| `@react-native-firebase/*` | Native Firebase SDK | Firebase config plugin |
| `react-native-google-mobile-ads` | Native AdMob SDK | AdMob config plugin |
| `react-native-vision-camera` | Camera native module | Camera permissions |
| `ffmpeg-kit-react-native` | Native FFmpeg binaries | Custom build config |
| `react-native-mmkv` | Native storage | MMKV config plugin |
| `@react-native-voice/voice` | Native speech recognition | Microphone permissions |
| `@react-native-ml-kit/face-detection` | Native ML Kit | ML Kit config plugin |

### JavaScript Only (Expo Go Compatible)
- All `expo-*` modules
- `@react-navigation/*` packages
- `zustand`, `date-fns`, `clsx`
- `react-native-web` components

## Upgrade Sequence Recommendations

### Phase 1: Security Fixes (Week 1)
1. **Downgrade @react-native-voice/voice** to 3.1.5
2. **Remove vulnerable Babel packages** if unused
3. **Test app functionality** after security fixes

### Phase 2: Critical Upgrades (Week 2)
1. **Upgrade react-native-vision-camera** to 4.7.2
2. **Update Firebase SDK** to 23.x series
3. **Implement breaking changes** for each upgrade
4. **Test native functionality** in development builds

### Phase 3: Moderate Upgrades (Week 3)
1. **Update Sentry SDK** to latest version
2. **Upgrade react-native-mmkv** if needed
3. **Review and update** other moderate priority packages
4. **Final integration testing**

### Phase 4: Validation (Week 4)
1. **Comprehensive testing** of all features
2. **Performance testing** and optimization
3. **Security validation** and audit
4. **Production deployment** preparation

## Testing Checkpoints

### After Each Phase
- [ ] TypeScript compilation successful
- [ ] Development build creation successful
- [ ] Core app functionality working
- [ ] Native modules functioning correctly
- [ ] No new security vulnerabilities introduced

### Critical Feature Testing
- [ ] Camera and video recording
- [ ] Firebase analytics and crashlytics
- [ ] Voice recognition functionality
- [ ] Video processing pipeline
- [ ] Face detection features
- [ ] Navigation flows

## Rollback Procedures

### Emergency Rollback
1. **Revert package.json** to previous working state
2. **Clear node_modules** and package-lock.json
3. **Reinstall dependencies** with `npm ci`
4. **Test critical functionality**

### Selective Rollback
1. **Identify problematic package**
2. **Revert specific package** to previous version
3. **Test affected functionality**
4. **Document issues** for future resolution

## Success Metrics

- ✅ Zero critical security vulnerabilities
- ✅ All packages on stable releases
- ✅ Successful development build creation
- ✅ All native modules functional
- ✅ TypeScript compilation without errors
- ✅ Performance benchmarks maintained

---

**Matrix Last Updated**: September 13, 2025
**Next Review**: After Phase 1 completion
