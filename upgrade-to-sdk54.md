# Upgrade to Expo SDK 54 and React Native 0.81

## Current Status

- **Current Expo SDK**: 51 (needs upgrade to 54)
- **Current React Native**: 0.74.1 (needs upgrade to 0.81)
- **Node version required**: 20.19.4+
- **Xcode required**: 16.1+ (recommended: 26)

## Key Changes & Breaking Updates

### 1. Major Version Updates Needed

- expo: ~51.0.8 → ~54.0.0
- react-native: 0.74.1 → 0.81.0
- react: 18.2.0 → 19.1.0
- TypeScript: ~5.3.3 → ~5.9.2

### 2. Breaking Changes to Address

#### React Native 0.81 Changes

- First-party JSC support removed (must use Hermes or community JSC)
- Edge-to-edge is now always enabled on Android (cannot be disabled)
- Android now targets API 36 (Android 16)
- Precompiled React Native for iOS (faster builds)
- SafeAreaView deprecated (use react-native-safe-area-context)

#### Expo SDK 54 Changes

- expo-av will be removed in SDK 55 (migrate to expo-audio and expo-video)
- expo-file-system API changed (legacy API at expo-file-system/legacy)
- Reanimated v4 only supports New Architecture
- Metro internal imports changed (metro/src/.. → metro/private/..)
- expo-notifications deprecated functions removed

### 3. Dependencies to Update

#### Core Dependencies

```json
{
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-native": "0.81.0",
  "react-dom": "19.1.0",
  "typescript": "~5.9.2"
}
```

#### Updated Expo Packages (all to SDK 54 versions)

- All expo-\* packages need to be updated to their SDK 54 versions
- @react-navigation packages should be latest
- react-native-reanimated: ~3.10.1 (or 4.x if using New Architecture)
- react-native-screens: latest compatible
- react-native-gesture-handler: latest compatible

### 4. Configuration Updates Needed

#### app.json

- Add `newArchEnabled: true` if not present
- Update Android `compileSdkVersion` to 36
- Update Android `targetSdkVersion` to 36
- iOS minimum version: 15.1+
- Consider enabling `android.predictiveBackGestureEnabled`

#### metro.config.js

- Remove any metro/metro-resolver overrides
- experimentalImportSupport is now default (can remove)
- Update for new autolinking behavior

#### babel.config.js

- React Compiler is now enabled by default
- @babel/plugin-transform-class-static-block added by default

### 5. Code Updates Required

#### Import Changes

- expo-file-system → expo-file-system/legacy (or migrate to new API)
- Remove usage of React Native's SafeAreaView
- Update any metro/src imports to metro/private

#### Deprecated APIs

- expo-av → migrate to expo-audio and expo-video
- notification config field → use expo-notifications config plugin
- Remove any expo-notifications deprecated function calls

### 6. New Features Available

#### iOS 26 Features

- Liquid Glass icons support via Icon Composer
- expo-glass-effect for Liquid Glass views
- Native tabs with liquid glass effect

#### Performance Improvements

- Precompiled React Native for iOS (10x faster clean builds)
- React Compiler enabled by default
- Import stack traces for better debugging

#### New Packages

- expo-app-integrity: App store verification
- expo-blob: Binary large object handling
- expo-glass-effect: iOS 26 Liquid Glass effects
- expo-ui: SwiftUI primitives (beta)

## Upgrade Steps

### Step 1: Update EAS CLI

```bash
npm i -g eas-cli@latest
```

### Step 2: Run Expo Upgrade Command

```bash
npx expo install expo@^54.0.0 --fix
```

### Step 3: Update All Dependencies

```bash
# Update core dependencies
npm install react@19.1.0 react-native@0.81.0 react-dom@19.1.0

# Update TypeScript
npm install --save-dev typescript@~5.9.2

# Fix any remaining dependencies
npx expo install --fix
```

### Step 4: Clean and Rebuild

```bash
# Clean caches
npx expo start -c
rm -rf node_modules
npm install

# If using pods
cd ios && pod install && cd ..
```

### Step 5: Update Native Projects (if not using CNG)

- Run `npx pod-install` if you have an ios directory
- Apply changes from Native project upgrade helper
- Create new development builds

### Step 6: Test and Fix Issues

```bash
# Run doctor to check for issues
npx expo-doctor@latest

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Compatibility Matrix

| Package                                   | Current | Target         | Notes                |
| ----------------------------------------- | ------- | -------------- | -------------------- |
| expo                                      | ~51.0.8 | ~54.0.0        | Major upgrade        |
| react-native                              | 0.74.1  | 0.81.0         | Major upgrade        |
| react                                     | 18.2.0  | 19.1.0         | Major upgrade        |
| @react-native-async-storage/async-storage | 1.23.1  | 2.1.0+         | Update needed        |
| react-native-reanimated                   | ~3.10.1 | ~3.16.0 or 4.x | v4 requires New Arch |
| react-native-screens                      | 3.31.1  | 4.4.0+         | Update needed        |
| react-native-safe-area-context            | 4.10.1  | 4.14.0+        | Update needed        |
| react-native-gesture-handler              | ~2.16.1 | ~2.22.0        | Update needed        |

## Testing Checklist

- [ ] App builds successfully for iOS
- [ ] App builds successfully for Android
- [ ] Navigation works correctly
- [ ] Animations work (Reanimated)
- [ ] Camera/Video features work
- [ ] Audio features work
- [ ] File system operations work
- [ ] Push notifications work
- [ ] All screens render correctly
- [ ] No TypeScript errors
- [ ] No lint errors

## Rollback Plan

If issues arise:

1. Restore package.json from git
2. Run `npm install`
3. Clean caches: `npx expo start -c`
4. Rebuild native projects if needed
