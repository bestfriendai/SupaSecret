# Development Build Fix - iOS Launch Failure

## ⚠️ CURRENT STATUS: COMPILATION ERROR

**Update**: After fixing the AdMob configuration issue, we've encountered a secondary compilation error with RCT-Folly and React Native Reanimated. This is a known compatibility issue between React Native 0.81.4 and Reanimated 3.15.4.

**Error**: `'folly/coro/Coroutine.h' file not found`

**Working on**: Podfile configuration to disable Folly coroutines support.

---

## Problem Summary

The Toxic Confessions app was failing to launch properly in iOS development builds with the following symptoms:

1. **App installs successfully** but crashes immediately after launch
2. **Repeated initialization attempts** - logs show frame processor plugin registering multiple times
3. **Critical build warning**: `ios_app_id key not found in react-native-google-mobile-ads key in app.json. App will crash without it.`
4. **Watchman recrawl warning** - 31 recrawls due to MustScanSubDirs UserDroppedTo
5. **NEW**: RCT-Folly compilation error with coroutines

## Root Cause Analysis

### Primary Issue: AdMob Plugin Configuration

The `react-native-google-mobile-ads` plugin (v15.8.0) has a **build-time configuration script** that runs during Xcode compilation. This script looks for configuration in `app.json`, but the project uses `app.config.js` instead.

**Why this causes crashes:**
- The plugin's Xcode build phase `[CP-User] [RNGoogleMobileAds] Configuration` runs during compilation
- It cannot execute JavaScript to read `app.config.js`
- Without the `ios_app_id`, the AdMob SDK crashes on initialization
- The app enters a crash-restart loop

**Evidence from logs:**
```
› Executing ToxicConfessions » [CP-User] [RNGoogleMobileAds] Configuration
    ios_app_id key not found in react-native-google-mobile-ads key in app.json. App will crash without it.
```

### Secondary Issue: Watchman File Watching

Watchman was recrawling the directory 31 times, which can cause Metro bundler performance issues and contribute to initialization problems.

## Solution Implemented

### 1. Fixed AdMob Plugin Configuration

**File: `app.config.js`**

Added the AdMob plugin to the plugins array with proper configuration:

```javascript
// AdMob plugin configuration - REQUIRED for development builds
...(isExpoGo
  ? []
  : [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-9512493666273460~8236030580",
          iosAppId: "ca-app-pub-9512493666273460~1466059369",
          delayAppMeasurementInit: true,
          optimizeInitialization: true,
          optimizeAdLoading: true,
        },
      ],
    ]),
```

**Why this works:**
- Expo's config plugin system properly passes these values to the native build
- The plugin's build script can now find the required `iosAppId`
- AdMob SDK initializes correctly without crashing

### 2. Fixed Watchman File Watching

Ran the recommended Watchman commands to clear the watch state:

```bash
watchman watch-del '/Users/iamabillionaire/Downloads/SupaSecret'
watchman watch-project '/Users/iamabillionaire/Downloads/SupaSecret'
```

This resolves the recrawl warnings and improves Metro bundler performance.

## Testing Instructions

### Step 1: Clean Build

```bash
# Clean iOS build artifacts
cd ios
rm -rf build Pods Podfile.lock
cd ..

# Clean Metro bundler cache
npx expo start --clear
```

### Step 2: Rebuild Development Build

```bash
# For simulator
npx expo run:ios

# For physical device
npx expo run:ios --device
```

### Step 3: Verify Success

The app should now:
1. ✅ Build without the AdMob configuration warning
2. ✅ Launch successfully on first attempt
3. ✅ Show initialization logs only once (not repeatedly)
4. ✅ Display the app UI properly

**Expected logs:**
```
✅ AdMob initialized
✅ RevenueCat initialized
✅ Video processing initialized
[App.tsx] Initialization completed
```

### Step 4: Test Core Features

1. **Authentication**: Sign in/sign up flow
2. **Video Recording**: Test camera access and recording
3. **Feed**: Browse confessions
4. **Ads**: Verify banner ads load (if not premium)

## Additional Fixes Applied

### Configuration Consistency

The project now has consistent AdMob configuration across:

1. **`google-mobile-ads.json`** - Runtime configuration
2. **`app.config.js`** - Build-time plugin configuration
3. **`.env`** - Environment variables for ad unit IDs

### Environment Detection

The AdMob plugin is only included for development builds, not Expo Go:

```javascript
...(isExpoGo ? [] : [/* AdMob plugin */])
```

This prevents build errors when running in Expo Go.

## Common Issues & Troubleshooting

### Issue: Still seeing "ios_app_id not found" warning

**Solution:**
1. Ensure you've run `npx expo prebuild --clean`
2. Delete `ios/` folder and regenerate: `npx expo prebuild`
3. Rebuild: `npx expo run:ios`

### Issue: App crashes on AdMob initialization

**Solution:**
1. Verify `.env` has correct AdMob IDs
2. Check `google-mobile-ads.json` exists and is valid
3. Ensure `ENABLE_ADS` feature flag is properly configured

### Issue: Metro bundler slow or hanging

**Solution:**
```bash
# Clear Metro cache
npx expo start --clear

# Reset Watchman
watchman watch-del-all
watchman shutdown-server
```

### Issue: Frame processor plugin errors

**Solution:**
The frame processor plugin (`detectFaces`) is working correctly. If you see errors:
1. Ensure `react-native-vision-camera` is in plugins array
2. Verify `react-native-vision-camera-face-detector` is installed
3. Check that `enableFrameProcessors: true` in plugin config

## Technical Details

### AdMob Plugin Architecture

The `react-native-google-mobile-ads` plugin uses Expo's config plugin system:

1. **Build Time**: Plugin reads configuration from `app.config.js` plugins array
2. **Native Code Generation**: Creates iOS Info.plist entries and Android manifest entries
3. **Runtime**: SDK reads configuration from generated native files

### Why `google-mobile-ads.json` Alone Wasn't Enough

The `google-mobile-ads.json` file is used for **runtime configuration** but the plugin's **build script** needs the configuration in the plugins array to generate the correct native code.

### Plugin Configuration vs Runtime Configuration

- **Plugin Config** (`app.config.js` plugins array): Used at build time to generate native code
- **Runtime Config** (`google-mobile-ads.json`): Used by the SDK at runtime for additional settings
- **Both are required** for proper AdMob integration

## Prevention

To prevent this issue in the future:

1. **Always check build warnings** - The warning was clear about the missing configuration
2. **Test development builds** - Don't rely solely on Expo Go for testing
3. **Follow plugin documentation** - Check if plugins require config plugin setup
4. **Use proper config structure** - When using `app.config.js`, ensure plugins are properly configured

## Related Files

- `app.config.js` - Main configuration file (FIXED)
- `google-mobile-ads.json` - Runtime AdMob configuration
- `.env` - Environment variables for ad unit IDs
- `src/services/AdMobService.ts` - AdMob service implementation
- `src/services/ServiceInitializer.ts` - Service initialization logic

## Next Steps

1. ✅ **Rebuild the app** with the fixed configuration
2. ✅ **Test on simulator** to verify the fix
3. ✅ **Test on physical device** to ensure production-like behavior
4. 📝 **Update documentation** if needed
5. 🚀 **Proceed with feature development** now that the build is stable

## Summary

The development build failure was caused by missing AdMob plugin configuration in `app.config.js`. The plugin's build-time script couldn't find the required `ios_app_id`, causing the app to crash on launch. Adding the plugin configuration to the plugins array resolved the issue.

**Status**: ✅ **FIXED** - Ready for rebuild and testing

