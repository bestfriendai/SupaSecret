# Testing Guide - Black Video Fix

## What Was Fixed

The **black video screen issue** when recording with blur + captions has been fixed by correcting the render size calculation for rotated videos (portrait orientation).

## Critical Fix Applied

**File:** `modules/caption-burner/ios/CaptionBurnerModule.swift`

**The Problem:**
- Portrait videos have a 90° rotation transform
- Old code didn't properly swap width/height for rotated videos
- Video frames rendered off-screen (appearing black)

**The Solution:**
- Detect rotation angle from transform matrix
- Swap width/height for 90°/270° rotations
- Keep original dimensions for 0°/180° rotations
- Ensures video frames render within visible area

## Testing Steps

### 1. Build and Install
```bash
npx expo run:ios --device
```
Select your physical iPhone from the device list.

### 2. Open Xcode Console for Logs
1. Open Xcode
2. Go to **Window > Devices and Simulators**
3. Select your connected iPhone
4. Click **Open Console** button (bottom left)
5. Filter logs by typing "🎬" or "Caption" in the search box

### 3. Test Case 1: Blur + Captions (Previously Broken) ⚠️

**This is the critical test case that was broken before!**

1. Open the app on your iPhone
2. Navigate to video recording screen
3. **Enable Face Blur** toggle (should turn blue/active)
4. **Enable Captions** toggle (should turn blue/active)
5. Record a 5-10 second video
6. **Speak clearly** during recording (e.g., "This is a test video with blur and captions")
7. Stop recording

**In Preview Screen:**
- ✅ Verify blur is visible on faces
- ✅ Verify captions appear at bottom
- ✅ Verify video is NOT black
- ✅ Verify audio plays

8. Tap **"Post"** button
9. Wait for processing (watch progress bar)

**Check Xcode Console for Success Logs:**
```
🎬 Starting caption burning process...
📂 Input path: /path/to/blurred_[UUID].mov
🔍 Validating input video file...
   - Exists: true
   - Size: 2.5 MB (or similar)
📹 Video properties:
   - Size: (720.0, 1280.0)
   - Duration: 5.2s
   - Frame rate: 30.0 FPS
🎨 Creating video composition...
   - Input video size: (720.0, 1280.0)
   - Video is rotated 90/270°, swapping dimensions ✅
   - Calculated render size: (1280.0, 720.0) ✅
✅ Video composition configuration set
✅ Export COMPLETED successfully in 3.2s
✅ Output file size: 3.1 MB
✅ Caption burning complete!
```

**Key Success Indicators:**
- ✅ "Video is rotated 90/270°, swapping dimensions"
- ✅ "Calculated render size: (1280.0, 720.0)" (width/height swapped)
- ✅ "Export COMPLETED successfully"
- ✅ Output file size > 1MB

10. Navigate to home feed
11. Find your posted video
12. **CRITICAL CHECK: Video should NOT be black!** ✅
13. Verify blur is visible on faces
14. Verify captions are visible and synchronized
15. Verify audio plays correctly

### 4. Test Case 2: Blur Only

1. Record video with **only blur enabled** (captions OFF)
2. Verify blur in preview
3. Post video
4. Verify uploaded video shows blur
5. Verify video is NOT black
6. Verify audio plays

### 5. Test Case 3: Captions Only

1. Record video with **only captions enabled** (blur OFF)
2. Speak clearly during recording
3. Verify captions in preview
4. Post video
5. Verify uploaded video shows captions
6. Verify video is NOT black
7. Verify audio plays

### 6. Test Case 4: Post-Process Blur

1. Record video with **both toggles OFF**
2. In preview screen, **enable blur toggle**
3. Wait for blur processing (progress indicator)
4. Verify blur is applied in preview
5. Post video
6. Verify uploaded video shows blur
7. Verify video is NOT black

### 7. Test Case 5: Video Download

1. Post a video with blur + captions
2. Find the video in your feed
3. Tap the download button
4. Grant photo library permissions if prompted
5. Wait for download to complete
6. Open Photos app on your iPhone
7. Find the video in "Toxic Confessions" album
8. Play the video
9. Verify all effects are present (blur, captions, watermark)
10. Verify video is NOT black

## What to Look For

### ✅ Success Indicators

**In Xcode Console:**
- "Video is rotated 90/270°, swapping dimensions"
- "Calculated render size: (1280.0, 720.0)" (dimensions swapped)
- "Export COMPLETED successfully"
- Output file size > 1MB for 5-10 second video

**In App:**
- Video frames are visible (NOT black)
- Blur is applied to faces
- Captions are visible and synchronized
- Audio plays correctly
- Watermark appears in top-right corner

### ❌ Failure Indicators

**In Xcode Console:**
- "Invalid render size: (0.0, 0.0)"
- "Export FAILED"
- Output file size < 100KB
- Any error messages with ❌ emoji

**In App:**
- Black video screen (only audio plays)
- Missing blur effect
- Missing captions
- No audio
- App crashes during processing

## Common Issues and Solutions

### Issue: "Native blur not available"
**Solution:** Make sure you're running a development build, not Expo Go
```bash
npx expo run:ios --device
```

### Issue: "Permission denied" for camera/microphone
**Solution:** 
1. Go to iPhone Settings
2. Find "Toxic Confessions" app
3. Enable Camera and Microphone permissions

### Issue: "Permission denied" for photo library
**Solution:**
1. Go to iPhone Settings
2. Find "Toxic Confessions" app
3. Enable Photos permission (select "Add Photos Only" or "Full Access")

### Issue: Build fails with code signing error
**Solution:**
1. Open `ios/ToxicConfessions.xcworkspace` in Xcode
2. Select the project in left sidebar
3. Go to "Signing & Capabilities" tab
4. Select your Apple Developer account
5. Xcode will automatically fix provisioning profiles

### Issue: Video still appears black
**Check Xcode Console:**
1. Look for the render size calculation logs
2. If you see "Calculated render size: (0.0, 0.0)" → render size bug
3. If you see "Export FAILED" → export session error
4. Share the console logs for further debugging

## Expected Results

After the fix, you should see:

1. ✅ **Blur + Captions works** (was broken before)
2. ✅ Video frames are visible (not black)
3. ✅ Blur is applied to faces
4. ✅ Captions are synchronized with speech
5. ✅ Audio plays correctly
6. ✅ Watermark appears in top-right
7. ✅ Downloaded videos include all effects
8. ✅ Videos play correctly in feed

## Reporting Issues

If you encounter any issues, please provide:

1. **Which test case failed** (e.g., "Test Case 1: Blur + Captions")
2. **What you observed** (e.g., "Video is still black")
3. **Xcode console logs** (copy the relevant section)
4. **Screenshots or screen recording** of the issue

### How to Copy Xcode Console Logs

1. Open Xcode Console (Window > Devices and Simulators > Open Console)
2. Filter by "🎬" or "Caption"
3. Select the relevant log lines
4. Right-click > Copy
5. Paste into a text file or message

## Success Criteria

The fix is successful if:

- ✅ Test Case 1 (Blur + Captions) passes
- ✅ Video is NOT black
- ✅ All effects are visible
- ✅ Xcode logs show correct render size calculation
- ✅ Export completes successfully

## Next Steps After Testing

Once you confirm the fix works:

1. Test all other video recording scenarios
2. Test video download feature
3. Test video playback in feed
4. Test on different video lengths (5s, 30s, 60s)
5. Test with different lighting conditions
6. Test with multiple faces in frame

## Notes

- The fix specifically addresses **portrait video orientation** (most common on iPhone)
- Landscape videos should also work correctly
- The fix applies to both real-time blur and post-process blur
- All processed videos include watermark automatically

