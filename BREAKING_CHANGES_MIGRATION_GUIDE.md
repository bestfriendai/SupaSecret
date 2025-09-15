# Breaking Changes Migration Guide - September 2025

## Overview

This guide provides step-by-step migration instructions for all major dependency upgrades that introduce breaking changes. Each section includes code examples, testing procedures, and rollback instructions.

## 1. React Navigation v7 Migration

**Status**: ✅ Dependencies updated, ❌ Code not migrated yet
**Reference**: See `REACT_NAVIGATION_V7_MIGRATION.md` for detailed steps
**Priority**: HIGH - App will not run until migration is complete

### Key Breaking Changes
- Navigation state structure changes
- New Navigation ID system required
- TypeScript type updates needed
- Screen option prop changes

### Files Requiring Updates
- `src/navigation/AppNavigator.tsx`
- `src/navigation/BottomTabNavigator.tsx` 
- `src/navigation/DrawerNavigator.tsx`
- `src/screens/*.tsx` (all screen components)
- `src/types/navigation.ts`

### Migration Timeline
**Estimated Time**: 2-3 days
**Testing Required**: All navigation flows

## 2. Firebase SDK Major Upgrade (19.x → 23.x)

**Current**: 19.2.2 → **Target**: 23.3.1
**Priority**: HIGH - Security and feature updates

### Breaking Changes Summary

#### Analytics API Changes
```typescript
// Before (v19)
import analytics from '@react-native-firebase/analytics';
analytics().logEvent('user_action', { action: 'click' });

// After (v23)
import analytics from '@react-native-firebase/analytics';
await analytics().logEvent('user_action', { action: 'click' });
```

#### Crashlytics Configuration Updates
```typescript
// Before (v19)
import crashlytics from '@react-native-firebase/crashlytics';
crashlytics().recordError(error);

// After (v23)
import crashlytics from '@react-native-firebase/crashlytics';
await crashlytics().recordError(error);
```

### Native Configuration Changes

#### iOS Configuration (ios/Podfile)
```ruby
# Update Firebase iOS SDK version
pod 'Firebase/Analytics', '~> 10.0'
pod 'Firebase/Crashlytics', '~> 10.0'
```

#### Android Configuration (android/build.gradle)
```gradle
// Update Firebase Android SDK
implementation 'com.google.firebase:firebase-analytics:21.5.0'
implementation 'com.google.firebase:firebase-crashlytics:18.6.0'
```

### Migration Steps
1. **Update package versions**:
   ```bash
   npm install @react-native-firebase/analytics@23.3.1
   npm install @react-native-firebase/crashlytics@23.3.1
   ```

2. **Update native configurations**
3. **Update API calls** to use async/await pattern
4. **Test analytics and crash reporting**
5. **Verify remote config** if used

### Testing Checklist
- [ ] Analytics events are logged correctly
- [ ] Crashlytics reports crashes properly
- [ ] Remote config values are fetched
- [ ] Performance monitoring works
- [ ] No build errors on iOS/Android

## 3. Vision Camera Stable Upgrade (beta.13 → 4.7.2)

**Current**: 4.0.0-beta.13 → **Target**: 4.7.2
**Priority**: CRITICAL - Move from beta to stable

### API Changes

#### Camera Configuration
```typescript
// Before (beta)
const camera = useCamera({
  video: true,
  audio: true,
  enableHighQualityPhotos: true
});

// After (stable)
const camera = useCamera({
  video: {
    fileType: 'mp4',
    videoCodec: 'h264',
    videoBitRate: 'normal'
  },
  audio: {
    sampleRate: 44100,
    numberOfChannels: 2
  },
  photo: {
    qualityPrioritization: 'quality'
  }
});
```

#### Video Recording API
```typescript
// Before (beta)
const startRecording = () => {
  camera.current?.startRecording({
    onRecordingFinished: (video) => {
      console.log('Video recorded:', video.path);
    }
  });
};

// After (stable)
const startRecording = async () => {
  try {
    const video = await camera.current?.startRecording({
      fileType: 'mp4',
      videoCodec: 'h264'
    });
    console.log('Video recorded:', video.path);
  } catch (error) {
    console.error('Recording failed:', error);
  }
};
```

### Migration Steps
1. **Update package**:
   ```bash
   npm install react-native-vision-camera@4.7.2
   ```

2. **Update camera configurations** throughout the app
3. **Update video recording logic**
4. **Test camera functionality** thoroughly
5. **Update TypeScript types**

### Testing Checklist
- [ ] Camera preview works correctly
- [ ] Photo capture functions properly
- [ ] Video recording works as expected
- [ ] Frame processors function correctly
- [ ] Permissions are handled properly

## 4. Sentry SDK Major Upgrade (6.20.0 → 8.40.0)

**Current**: 6.20.0 → **Target**: 8.40.0
**Priority**: HIGH - Security and performance improvements

### Breaking Changes

#### Initialization API
```typescript
// Before (v6)
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  debug: __DEV__,
  enableAutoSessionTracking: true
});

// After (v8)
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  debug: __DEV__,
  autoSessionTracking: true,
  enableTracing: true,
  tracesSampleRate: 1.0
});
```

#### Error Boundary Integration
```typescript
// Before (v6)
import { ErrorBoundary } from '@sentry/react-native';

const App = () => (
  <ErrorBoundary>
    <MyApp />
  </ErrorBoundary>
);

// After (v8)
import * as Sentry from '@sentry/react-native';

const App = Sentry.wrap(() => (
  <MyApp />
));
```

### Migration Steps
1. **Update package**:
   ```bash
   npm install @sentry/react-native@8.40.0
   ```

2. **Update initialization code**
3. **Update error boundary usage**
4. **Test error tracking**
5. **Verify performance monitoring**

### Testing Checklist
- [ ] Sentry initializes correctly
- [ ] Errors are captured and reported
- [ ] Performance monitoring works
- [ ] Breadcrumbs are recorded
- [ ] User context is set properly

## 5. React Native Voice Downgrade (3.2.4 → 3.1.5)

**Current**: 3.2.4 → **Target**: 3.1.5
**Priority**: HIGH - Security vulnerability fix
**Note**: This is a downgrade to fix security issues

### Potential Breaking Changes
- API changes between versions
- Permission handling differences
- Voice recognition accuracy changes

### Migration Steps
1. **Downgrade package**:
   ```bash
   npm install @react-native-voice/voice@3.1.5
   ```

2. **Test voice recognition functionality**
3. **Verify permissions are working**
4. **Check for API compatibility**

### Testing Checklist
- [ ] Voice recognition starts correctly
- [ ] Speech-to-text conversion works
- [ ] Permissions are requested properly
- [ ] No runtime errors occur
- [ ] Voice commands function as expected

## 6. MMKV Storage Upgrade (2.12.2 → 3.1.0)

**Current**: 2.12.2 → **Target**: 3.1.0 (Optional)
**Priority**: MEDIUM - Performance improvements available

### Breaking Changes
- API method name changes
- Initialization parameter changes
- TypeScript type updates

### Migration Example
```typescript
// Before (v2)
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
storage.set('key', 'value');
const value = storage.getString('key');

// After (v3)
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({
  id: 'user-storage',
  encryptionKey: 'encryption-key'
});
storage.set('key', 'value');
const value = storage.getString('key');
```

## Implementation Strategy

### Phase 1: Critical Security Fixes (Week 1)
1. **React Native Voice downgrade** (immediate)
2. **Remove vulnerable dependencies** (if possible)
3. **Test core functionality**

### Phase 2: Major Upgrades (Week 2)
1. **Vision Camera stable upgrade**
2. **Firebase SDK upgrade**
3. **Sentry SDK upgrade**
4. **Test native functionality**

### Phase 3: Navigation Migration (Week 3)
1. **Implement React Navigation v7 changes**
2. **Update all navigation code**
3. **Test all navigation flows**
4. **Fix TypeScript errors**

### Phase 4: Final Testing (Week 4)
1. **Comprehensive integration testing**
2. **Performance testing**
3. **Production build testing**
4. **Security validation**

## Rollback Procedures

### Emergency Rollback
```bash
# Restore previous package.json
git checkout HEAD~1 package.json package-lock.json

# Clear and reinstall
rm -rf node_modules
npm ci

# Test critical functionality
npm run typecheck
expo run:ios --device
```

### Selective Rollback
```bash
# Rollback specific package
npm install package-name@previous-version

# Test affected functionality
# Document issues for future resolution
```

## Testing Strategy

### Automated Testing
- Unit tests for updated APIs
- Integration tests for navigation flows
- E2E tests for critical user journeys

### Manual Testing
- Device testing for native modules
- Camera and video functionality
- Voice recognition features
- Error reporting and analytics

### Performance Testing
- App startup time
- Memory usage
- Battery consumption
- Network performance

## Success Criteria

- ✅ All breaking changes successfully migrated
- ✅ No runtime errors or crashes
- ✅ All features working as expected
- ✅ TypeScript compilation successful
- ✅ Production builds working
- ✅ Performance maintained or improved

---

**Migration Guide Last Updated**: September 13, 2025
**Estimated Total Migration Time**: 3-4 weeks
**Next Review**: After Phase 1 completion
