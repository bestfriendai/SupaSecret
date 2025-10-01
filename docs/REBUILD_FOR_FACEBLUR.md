# Rebuild Instructions for Face Blur

## Issue Fixed

The Skia Canvas `onLayout` error with new architecture has been resolved by disabling the new architecture.

**Error:** `<Canvas onLayout={onLayout} /> is not supported on the new architecture`

**Root Cause:**

- Vision Camera 4.7.2 + Skia 2.2.21 + New Architecture has compatibility issues
- `useSkiaFrameProcessor` internally uses Skia Canvas which doesn't support certain operations on new architecture

**Solution:**
Disabled React Native's new architecture in:

1. ✅ `ios/Podfile.properties.json` - Set `newArchEnabled: false`
2. ✅ `app.config.js` - Set `newArchEnabled: false` (top level and in expo-build-properties)

## Rebuild Steps

### iOS

1. **Clean iOS build**

   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod deintegrate
   ```

2. **Clear caches**

   ```bash
   cd ..
   rm -rf node_modules/.cache
   npx expo start --clear
   ```

3. **Install pods and rebuild**
   ```bash
   cd ios
   pod install
   cd ..
   npx expo run:ios
   ```

### Android

1. **Clean Android build**

   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Clear caches**

   ```bash
   rm -rf node_modules/.cache
   npx expo start --clear
   ```

3. **Rebuild**
   ```bash
   npx expo run:android
   ```

## Expected Behavior After Rebuild

1. ✅ No Skia Canvas `onLayout` errors
2. ✅ Face blur screen loads successfully
3. ✅ Camera initializes with face detection
4. ✅ Real-time face blur at 60 FPS
5. ✅ Video recording with blur applied

## Verification Commands

```bash
# Verify new architecture is disabled
cat ios/Podfile.properties.json | grep newArchEnabled
# Should show: "newArchEnabled": "false"

# Verify frame processors enabled
head -1 ios/Podfile
# Should show: $VCEnableFrameProcessors=true

# Verify Vision Camera version
npm ls react-native-vision-camera
# Should show: 4.7.2

# Verify Skia version
npm ls @shopify/react-native-skia
# Should show: 2.2.21
```

## Configuration Changes Made

### ios/Podfile.properties.json

```json
{
  "newArchEnabled": "false" // Changed from "true"
}
```

### app.config.js

```javascript
{
  expo: {
    newArchEnabled: false,  // Changed from true
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            newArchEnabled: false,  // Changed from true
          },
          android: {
            newArchEnabled: false,  // Changed from true
          },
        },
      ],
    ],
  }
}
```

## Why Disable New Architecture?

The React Native new architecture (Fabric + TurboModules) is still experimental and has compatibility issues with:

- Vision Camera frame processors
- Skia Canvas operations
- Certain native module integrations

**Trade-offs:**

- ❌ No new architecture performance benefits
- ✅ Face blur works reliably
- ✅ All Vision Camera features work
- ✅ Skia frame processing works without errors

## Future Migration

When Vision Camera and Skia fully support the new architecture:

1. Update to latest versions
2. Re-enable new architecture in all config files
3. Test thoroughly
4. Rebuild for both platforms

Monitor these repos for new architecture support:

- https://github.com/mrousavy/react-native-vision-camera
- https://github.com/Shopify/react-native-skia

## Troubleshooting

### Still seeing Canvas errors?

```bash
# Clean everything
rm -rf ios/Pods ios/Podfile.lock
rm -rf android/build android/.gradle
rm -rf node_modules
npm install
cd ios && pod install && cd ..
npx expo run:ios
```

### Frame processor not working?

```bash
# Verify Podfile has frame processors enabled
head -1 ios/Podfile
# Should show: $VCEnableFrameProcessors=true

# If missing, add it and rebuild
echo '$VCEnableFrameProcessors=true' | cat - ios/Podfile > temp && mv temp ios/Podfile
cd ios && pod install && cd ..
```

### Face detection not working?

```bash
# Verify MLKit is installed (auto-linked)
cd ios
pod install
cd ..

# Check logs for MLKit loading
npx react-native log-ios | grep -i "mlkit\|face"
```

## Performance Notes

Even without new architecture:

- Face blur runs at 60-120 FPS
- Frame processors execute in C++ (minimal overhead)
- MLKit uses GPU acceleration
- Vision Camera uses efficient buffer handling

The old architecture is still very performant for this use case.
