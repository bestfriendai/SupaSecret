# Testing Face Blur - Quick Guide

## Prerequisites

✅ **Already Done**:
- `react-native-vision-camera-face-detector` installed
- `FaceBlurRecordScreen` created with FaceBlurApp pattern
- `useFaceBlurRecorder` hook implemented
- Navigation updated to use new screen

## Build Commands

### iOS

```bash
# Clean build (recommended)
cd ios
pod install
cd ..
npx expo run:ios --clean

# Or regular build
npx expo run:ios
```

### Android

```bash
# Clean build (recommended)
npx expo run:android --clean

# Or regular build
npx expo run:android
```

## What to Test

### 1. Basic Functionality ✅

**Test**: Open video recording screen

**Expected**:
- Camera preview appears
- "Face Blur Active" indicator shows
- No errors in console

**Console Output**:
```
✅ Vision Camera, Face Detector, and Skia loaded successfully
```

---

### 2. Face Detection ✅

**Test**: Point camera at face(s)

**Expected**:
- Face is automatically blurred in real-time
- Blur follows face movement smoothly
- Works with multiple faces
- Works at different angles

**Performance**:
- Frame rate: 60+ FPS
- No lag or stuttering
- Smooth blur transitions

---

### 3. Recording ✅

**Test**: Record a video

**Steps**:
1. Tap "Record" button
2. Move face around
3. Tap "Stop" after a few seconds
4. Tap "Next"

**Expected**:
- Recording starts immediately
- Timer counts up
- Face blur is visible during recording
- Recording stops cleanly
- Video preview shows blurred faces

**Console Output**:
```
🎬 Starting Vision Camera recording with face blur...
✅ Recording finished: /path/to/video.mp4
```

---

### 4. Camera Toggle ✅

**Test**: Switch between front and back camera

**Steps**:
1. Tap camera flip button (top right)
2. Wait for camera to switch
3. Point at face

**Expected**:
- Camera switches smoothly
- Face detection works on both cameras
- No crashes or errors

---

### 5. Permissions ✅

**Test**: First launch (no permissions granted)

**Expected**:
- Permission prompt appears
- After granting, camera activates
- If denied, shows permission screen with "Grant Permission" button

---

### 6. Error Handling ✅

**Test**: Various error scenarios

**Scenarios**:
- No camera available
- Camera in use by another app
- Recording fails

**Expected**:
- Error overlay appears
- Clear error message
- "Dismiss" button works
- Can retry after dismissing

---

## Performance Benchmarks

### Target Performance

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Frame Rate | 60 FPS | 30-60 FPS | <30 FPS |
| Detection Latency | <16ms | <33ms | >33ms |
| Blur Quality | Precise contours | Oval blur | Blocky |
| Memory Usage | <100MB | <150MB | >150MB |

### How to Check

**Frame Rate**:
- Should feel smooth and responsive
- No visible stuttering
- Blur updates in real-time

**Detection Latency**:
- Blur appears immediately when face enters frame
- Blur follows face movement without delay

**Blur Quality**:
- Foreground faces: Precise contour-based blur
- Background faces: Oval blur (expected)
- No flickering or artifacts

**Memory Usage**:
- Check Xcode Instruments (iOS)
- Check Android Profiler (Android)

---

## Common Issues

### Issue: "No device was set"

**Status**: ✅ Fixed in previous update

**If still occurs**:
```bash
# Clean rebuild
npx expo prebuild --clean
npx expo run:ios --clean
```

---

### Issue: "Face detector not available"

**Cause**: Package not linked properly

**Solution**:
```bash
# Reinstall and rebuild
npm install react-native-vision-camera-face-detector
npx expo prebuild --clean
npx expo run:ios --clean
```

---

### Issue: Low frame rate (<30 FPS)

**Possible Causes**:
1. Device too old (iPhone X or older, Android <2019)
2. Too many apps running in background
3. Debug mode overhead

**Solutions**:
1. Test on newer device
2. Close background apps
3. Build in Release mode:
   ```bash
   npx expo run:ios --configuration Release
   ```

---

### Issue: Blur not precise

**Expected Behavior**:
- **Foreground faces** (close to camera): Precise contour-based blur
- **Background faces** (far from camera): Oval blur

This is normal and matches FaceBlurApp behavior.

---

### Issue: Crashes on launch

**Possible Causes**:
1. Running in Expo Go (not supported)
2. Native modules not linked
3. Permissions not granted

**Solutions**:
1. Use development build (not Expo Go)
2. Clean rebuild:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios --clean
   ```
3. Grant camera and microphone permissions

---

## Debug Console Output

### Successful Launch

```
✅ Vision Camera, Face Detector, and Skia loaded successfully
✅ Found camera device: { position: 'front', id: '...' }
```

### Recording

```
🎬 Starting Vision Camera recording with face blur...
✅ Recording finished: /path/to/video.mp4
```

### Errors

```
❌ Failed to start recording: [error message]
⚠️ Face detector not available - react-native-vision-camera-face-detector not installed
```

---

## Test Checklist

Use this checklist when testing:

- [ ] Camera preview loads
- [ ] Face blur indicator shows
- [ ] Face is blurred in real-time
- [ ] Blur follows face movement
- [ ] Multiple faces are blurred
- [ ] Frame rate is 60+ FPS
- [ ] Recording starts/stops correctly
- [ ] Video saves with blur baked in
- [ ] Camera toggle works
- [ ] Front camera works
- [ ] Back camera works
- [ ] Permissions are requested
- [ ] Error handling works
- [ ] No crashes or freezes
- [ ] Memory usage is acceptable

---

## Next Steps After Testing

### If Everything Works ✅

1. Test with different devices
2. Test with different lighting conditions
3. Test with different face angles
4. Test with accessories (glasses, hats, masks)
5. Optimize if needed
6. Add user preferences
7. Deploy to production

### If Issues Found ❌

1. Document the issue
2. Check console logs
3. Try clean rebuild
4. Check device compatibility
5. Report issue with:
   - Device model
   - iOS/Android version
   - Console logs
   - Steps to reproduce

---

## Performance Optimization

If frame rate is low, try these optimizations:

### 1. Reduce Video Resolution

In `FaceBlurRecordScreen.tsx`:

```typescript
const format = useCameraFormat(device, [
  {
    videoResolution: { width: 1280, height: 720 }, // 720p instead of 1080p
  },
  {
    fps: 60,
  },
]);
```

### 2. Reduce Blur Radius

In `useFaceBlurRecorder.ts`:

```typescript
const {
  blurRadius = 15, // Reduce from 25 to 15
  // ...
} = options;
```

### 3. Disable Contours (Use Oval Only)

In `FaceBlurRecordScreen.tsx`:

```typescript
const { detectFaces } = useFaceDetector({
  performanceMode: 'fast',
  contourMode: 'none', // Change from 'all' to 'none'
  landmarkMode: 'none',
  classificationMode: 'none',
});
```

---

## Support

If you encounter issues:

1. Check this guide
2. Check `docs/FACEBLUR_IMPLEMENTATION.md`
3. Check `docs/NATIVE_BUILD_FIXES.md`
4. Check FaceBlurApp reference: https://github.com/mrousavy/FaceBlurApp
5. Check Vision Camera docs: https://react-native-vision-camera.com/

---

## Summary

The FaceBlurApp-style implementation is now ready for testing. Build the app on a real device and verify:

1. ✅ Real-time face blur at 60+ FPS
2. ✅ Precise contour-based masking
3. ✅ Smooth recording with blur baked in
4. ✅ Camera toggle works
5. ✅ Error handling works

**Build Command**:
```bash
npx expo run:ios
# or
npx expo run:android
```

Good luck! 🚀

