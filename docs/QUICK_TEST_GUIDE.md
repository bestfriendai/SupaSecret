# Quick Test Guide - Video Recording & Preview

## What Was Fixed

✅ **Video preview freezing after 2 seconds** - Fixed with proper loading state and player monitoring
✅ **Skia Canvas warnings** - Suppressed (harmless warnings, already disabled in config)
✅ **Record button functionality** - Verified working
✅ **Post button functionality** - Verified working

## Test Now

### Step 1: Record a Video

1. **Navigate to video recording screen**
   - Tap the compose/camera button in your app

2. **Start recording**
   - Press the **Record** button (red circle)
   - You should see:
     - Timer counting up (0:00, 0:01, 0:02...)
     - Face blur effect (if in native build)
     - Recording indicator

3. **Stop recording**
   - Press the **Stop** button (red square)
   - Recording should stop
   - Timer should stop

4. **Press Next**
   - A **Next** button should appear
   - Press it to go to preview

### Step 2: Preview the Video

**What you should see:**

1. **Loading state** (briefly)
   - Spinner with "Loading video..." text

2. **Video playing**
   - Video should start playing automatically
   - Video should loop continuously
   - **NO FREEZING after 2 seconds** ✅

3. **Controls working**
   - Tap video to pause/play
   - Play/pause button appears when paused

4. **Buttons available**
   - **Retake** - Go back to record again
   - **Discard** - Delete video and go back
   - **Share** - Upload and post video

### Step 3: Post the Video

1. **Press Share button**
   - Upload progress should show
   - Progress bar should fill up

2. **Success alert**
   - "Video Shared!" alert should appear
   - Press "Great" button

3. **Navigate to feed**
   - Should go back to home/feed
   - Your video should appear in the feed

## Expected Console Logs

### During Recording:
```
🎬 Starting Vision Camera recording...
✅ Recording finished: /path/to/video.mp4
```

### During Navigation:
```
🎬 Navigating to VideoPreview with video: /path/to/video.mp4
📹 Video URI for preview: file:///path/to/video.mp4
```

### During Preview Load:
```
📹 VideoPreviewScreen - Video URI: file:///path/to/video.mp4
🎬 Video player initialized
📊 Player status: loading
📁 Video file info: { exists: true, size: 12345, ... }
📊 Player status: readyToPlay
✅ Video ready to play
```

### During Focus:
```
🎯 VideoPreview focused
```

## Troubleshooting

### ❌ Video freezes after 2 seconds

**Check console for:**
- `❌ Video player error` - Video file corrupted
- `❌ Video file does not exist` - Recording failed
- Status stuck on `loading` - Format issue

**Solution:**
- Try recording again
- Check available storage
- Check camera permissions

### ❌ Next button doesn't appear

**Check console for:**
- `✅ Recording finished: /path/to/video.mp4`

**If missing:**
- Recording may have failed
- Try recording again
- Check microphone permissions

### ❌ Video doesn't load

**Check console for:**
- `📁 Video file info: { exists: false }`

**Solution:**
- Recording didn't save properly
- Try recording again
- Check storage permissions

### ❌ Share button doesn't work

**Check console for:**
- Upload errors
- Authentication errors

**Solution:**
- Make sure you're logged in
- Check internet connection
- Try again

## Success Checklist

- [ ] Record button starts recording
- [ ] Timer counts up during recording
- [ ] Stop button stops recording
- [ ] Next button appears after stopping
- [ ] Preview screen loads
- [ ] Video plays automatically
- [ ] Video loops continuously
- [ ] **Video does NOT freeze after 2 seconds** ✅
- [ ] Play/pause button works
- [ ] Share button uploads video
- [ ] Video appears in feed

## Known Issues (Non-blocking)

1. **Skia Canvas warnings** - Now suppressed, harmless
2. **Expo Go limitations** - Face blur simulated, build native for real effects

## If Everything Works

🎉 **Success!** The video recording and preview are working correctly.

Next steps:
1. Test posting multiple videos
2. Test different video lengths
3. Test on different devices
4. Build production version

## If Issues Persist

Please provide:
1. Console logs from recording to preview
2. Specific error messages
3. Device/simulator info
4. Steps to reproduce

The logs will help identify the exact issue.

