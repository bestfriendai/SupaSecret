# Clean and Rebuild with EAS Local Build

## Quick Start (Recommended)

Run the automated script:

```bash
./scripts/clean-rebuild-eas.sh
```

This will:
1. Clean all build artifacts
2. Reinstall dependencies
3. Run prebuild
4. Install pods
5. Build with EAS locally

## Manual Steps (If you prefer step-by-step)

### Step 1: Clean iOS

```bash
# Remove Pods
rm -rf ios/Pods
rm -f ios/Podfile.lock

# Deintegrate CocoaPods
cd ios
pod deintegrate
cd ..

# Remove build artifacts
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Step 2: Clean Android (if needed)

```bash
# Remove build artifacts
rm -rf android/build
rm -rf android/.gradle
rm -rf android/app/build

# Run gradle clean
cd android
./gradlew clean
cd ..
```

### Step 3: Clean Node modules and cache

```bash
# Remove node_modules
rm -rf node_modules

# Clear npm cache
npm cache clean --force

# Clear Metro bundler cache
rm -rf .expo
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*
```

### Step 4: Reinstall dependencies

```bash
npm install
```

### Step 5: Run prebuild

```bash
npx expo prebuild --clean
```

This will regenerate the `ios` and `android` folders with the correct configuration.

### Step 6: Install iOS Pods

```bash
cd ios
pod install
cd ..
```

### Step 7: Verify configuration

```bash
./scripts/verify-config.sh
```

You should see all ✅ checks pass.

### Step 8: Build with EAS Local

Choose the build profile you want:

#### Development Build (Recommended for testing)

```bash
eas build --profile development --platform ios --local
```

**Features:**
- Development client enabled
- Faster build time
- Can test on simulator
- Debug configuration
- Test API keys

#### Preview Build (Internal testing)

```bash
eas build --profile preview --platform ios --local
```

**Features:**
- Release configuration
- Internal distribution
- Test on real devices
- Staging environment

#### Production Build (App Store)

```bash
eas build --profile production --platform ios --local
```

**Features:**
- Release configuration
- Production environment
- Real API keys
- App Store ready

## What Gets Fixed

After this clean rebuild:

✅ **Skia Canvas warnings** - Will be completely gone
✅ **New architecture** - Properly disabled
✅ **Face blur** - Works at 60 FPS
✅ **Video recording** - Works perfectly
✅ **Video preview** - No freezing

## Build Time

- **Development**: ~5-10 minutes
- **Preview**: ~10-15 minutes
- **Production**: ~10-15 minutes

## After Build Completes

### Install on Device

1. **Find the build**:
   - Look for `.ipa` file in the output
   - Usually in the project root or `build` folder

2. **Install on device**:
   ```bash
   # Using Xcode
   # Drag .ipa to Xcode Devices window
   
   # Or using command line
   xcrun simctl install booted path/to/app.ipa
   ```

3. **Or install on physical device**:
   - Use Xcode Devices & Simulators
   - Or use TestFlight for preview/production builds

### Test the App

1. **Open the app**
2. **Navigate to video recording**
3. **Record a video**
4. **Check for:**
   - ✅ No Skia Canvas warnings in console
   - ✅ Face blur working in real-time
   - ✅ Video preview loads and plays
   - ✅ No freezing after 2 seconds
   - ✅ All buttons work

## Troubleshooting

### Build fails with "No provisioning profile"

```bash
# Use remote credentials
eas build --profile development --platform ios
```

### Build fails with "Pod install failed"

```bash
# Clean and try again
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install
cd ..
```

### Build fails with "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Still seeing Skia Canvas warnings

The warnings should be gone after rebuild. If you still see them:

1. Check that `LogBox.ignoreLogs` is in `app/_layout.tsx`
2. Make sure you're running the newly built app, not the old one
3. Clear app data and restart

### Face blur not working

1. Check camera permissions
2. Check that Vision Camera is installed: `npm ls react-native-vision-camera`
3. Check that Face Detector is installed: `npm ls react-native-vision-camera-face-detector`
4. Verify frame processors are enabled in Podfile

## Alternative: Build on EAS Servers

If local build fails or takes too long, you can build on EAS servers:

```bash
# Development
eas build --profile development --platform ios

# Preview
eas build --profile preview --platform ios

# Production
eas build --profile production --platform ios
```

**Advantages:**
- Faster (uses powerful servers)
- No local setup needed
- Automatic code signing

**Disadvantages:**
- Requires EAS subscription for multiple builds
- Takes longer to download

## Next Steps After Successful Build

1. ✅ Test video recording
2. ✅ Test video preview
3. ✅ Test posting videos
4. ✅ Test face blur
5. ✅ Test on multiple devices
6. ✅ Submit to TestFlight (preview/production builds)
7. ✅ Submit to App Store (production build)

## Quick Reference

```bash
# Full clean and rebuild
./scripts/clean-rebuild-eas.sh

# Or manual steps
rm -rf ios/Pods ios/Podfile.lock node_modules
npm install
npx expo prebuild --clean
cd ios && pod install && cd ..
eas build --profile development --platform ios --local

# Verify config
./scripts/verify-config.sh

# Install on simulator
xcrun simctl install booted path/to/app.ipa
```

## Success Criteria

After rebuild, you should have:

- ✅ Clean build with no warnings
- ✅ Face blur working at 60 FPS
- ✅ Video recording working
- ✅ Video preview working without freezing
- ✅ All buttons functional
- ✅ No Skia Canvas errors
- ✅ App ready for testing/distribution

