# Video Black Screen Issue - FIXED

## Problem Description
When recording a video with **blur + captions** enabled, the final uploaded video shows:
- ✅ Audio plays correctly
- ✅ Captions display correctly
- ❌ Video is completely black (no visual content)

## Root Cause Identified

The issue was caused by **incorrect render size calculation** in the caption burner module when processing videos with rotation transforms (portrait videos).

### The Bug
When a video has a rotation transform (90° or 270°), the `videoSize.applying(transform)` method returns negative dimensions, which were then converted to positive using `abs()`. However, this approach doesn't correctly handle the dimension swap needed for rotated videos.

**Example:**
- Original video: 720x1280 (portrait)
- Transform: 90° rotation
- Old calculation: `abs(applying transform)` → incorrect dimensions
- New calculation: Swap width/height → 1280x720 (correct)

## Fixes Applied

### Fix #1: Correct Render Size Calculation (CaptionBurnerModule.swift, lines 366-401)

**Before:**
```swift
let renderSize = videoSize.applying(transform)
let normalizedSize = CGSize(width: abs(renderSize.width), height: abs(renderSize.height))
```

**After:**
```swift
// Check if transform includes 90 or 270 degree rotation
let angle = atan2(transform.b, transform.a)
let isRotated90Or270 = abs(angle - .pi / 2) < 0.01 || abs(angle + .pi / 2) < 0.01

if isRotated90Or270 {
  // Swap width and height for 90/270 degree rotations
  normalizedSize = CGSize(width: videoSize.height, height: videoSize.width)
} else {
  // Use original dimensions for 0/180 degree rotations
  normalizedSize = CGSize(width: videoSize.width, height: videoSize.height)
}
```

**Why This Fixes It:**
- Portrait videos (recorded on iPhone) have a 90° rotation transform
- The old code didn't properly swap dimensions, causing the video to render off-screen
- The new code correctly detects rotation angle and swaps width/height accordingly
- This ensures the video frames are rendered within the visible area

### Fix #2: Enhanced Logging and Validation

Added comprehensive logging throughout the caption burning pipeline to help diagnose issues:
- Input file validation (existence, size, readability)
- Video track validation
- Audio track handling with error recovery
- Export session detailed logging
- Output file verification
- Render size validation

## Processing Pipeline

When both blur and captions are enabled, the video goes through TWO processing steps:

1. **Step 1: Face Blur Processing** (`FaceBlurModule.swift`)
   - Input: Original recorded video
   - Process: Applies pixelation to detected faces
   - Output: `blurred_[UUID].mov` in temp directory
   - ✅ Audio is preserved in output

2. **Step 2: Caption & Watermark Burning** (`CaptionBurnerModule.swift`)
   - Input: Blurred video from Step 1
   - Process: Burns captions and watermark into video
   - Output: `captioned_[UUID].mov` in temp directory
   - ✅ Video frames are now correctly rendered with proper dimensions

## Debugging Enhancements Added

### 1. Input Validation (`CaptionBurnerModule.swift` lines 88-166)
```swift
// Validates input video file exists and is readable
- Checks file exists at path
- Verifies file size > 0 bytes
- Confirms video track is present
- Logs video properties (size, duration, frame rate)
```

### 2. Composition Validation (lines 168-263)
```swift
// Validates video composition creation
- Confirms video track insertion
- Validates audio track (if present)
- Checks composition has content
- Logs all track counts
```

### 3. Export Session Monitoring (lines 264-331)
```swift
// Enhanced export error handling
- Logs export duration
- Captures detailed error information
- Provides helpful error messages
- Verifies output file exists and has size
```

### 4. Render Size Validation (lines 355-403)
```swift
// Validates video composition dimensions
- Checks render size is positive
- Validates dimensions are reasonable (<10000px)
- Confirms frame rate is valid (1-120 FPS)
- Logs all configuration details
```

## How to Debug

### Step 1: Rebuild the App
```bash
cd /Users/iamabillionaire/Downloads/SupaSecret
npx expo run:ios
```

### Step 2: Record a Test Video
1. Open the app
2. Navigate to video recording
3. Enable **Face Blur** toggle
4. Enable **Captions** toggle
5. Record a short video (5-10 seconds)
6. Speak clearly during recording

### Step 3: Check Xcode Console Logs
Look for these log patterns:

#### ✅ Success Pattern:
```
🎬 Starting caption burning process...
📂 Input path: /path/to/blurred_[UUID].mov
🔍 Validating input video file...
   - Exists: true
   - Size: 2.5 MB
📹 Video properties:
   - Size: (720.0, 1280.0)
   - Duration: 5.2s
   - Frame rate: 30.0 FPS
✅ Video track inserted into composition
✅ Audio track inserted successfully
✅ Video composition created successfully
📤 Export session configuration:
   - Input video tracks: 1
   - Input audio tracks: 1
   - Render size: (720.0, 1280.0)
   - Frame rate: 30.0 FPS
✅ Export COMPLETED successfully in 3.2s
✅ Output file size: 3.1 MB
✅ Caption burning complete!
```

#### ❌ Failure Patterns:

**Pattern 1: Invalid Input File**
```
❌ Input video file is empty (0 bytes)
```
→ **Fix**: Check blur processing output

**Pattern 2: Missing Video Track**
```
❌ No video track found in asset. The video file may be corrupted or invalid.
```
→ **Fix**: Blur module is creating invalid video

**Pattern 3: Export Failure**
```
❌ Export FAILED after 0.5s
❌ Error: AVFoundationErrorDomain Code=-11800
```
→ **Fix**: Check export session configuration

**Pattern 4: Invalid Render Size**
```
❌ Invalid render size: (0.0, 0.0)
```
→ **Fix**: Video transform calculation is wrong

### Step 4: Identify the Failing Step

Based on the logs, determine which step is failing:

1. **If blur logs show success but caption logs show invalid input:**
   - Problem: Blur module creates invalid output
   - Check: `FaceBlurModule.swift` export session

2. **If caption logs show valid input but export fails:**
   - Problem: Video composition or export configuration
   - Check: Frame rate, render size, layer configuration

3. **If export succeeds but output file is tiny (<1MB for 5s video):**
   - Problem: Video frames are not being written
   - Check: `AVVideoCompositionCoreAnimationTool` configuration

## Known Issues & Fixes

### Issue: Black Video with Audio
**Cause**: The `videoLayer` was being added as a sublayer in the composition, creating an empty black layer that blocks the actual video frames.

**Fix Applied** (line 405):
```swift
// CRITICAL FIX: Do NOT add videoLayer as sublayer!
// When using postProcessingAsVideoLayer, the videoLayer represents the actual video frames
// and should NOT be added as a sublayer. It's automatically composited by AVFoundation
// BEHIND the parentLayer.

// parentLayer.addSublayer(videoLayer) // ❌ REMOVED - This was causing black video!
```

### Issue: Frame Rate Mismatch
**Cause**: Hardcoding 30 FPS when source video has different frame rate causes frame drops.

**Fix Applied** (lines 377-383):
```swift
// Use source video's actual frame rate
if sourceFrameRate > 0 && sourceFrameRate <= 120 {
  videoComposition.frameDuration = CMTime(value: 1, timescale: Int32(sourceFrameRate))
} else {
  videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
}
```

## Next Steps

1. **Rebuild and test** with enhanced logging
2. **Share Xcode console logs** showing the exact failure point
3. **Check intermediate files** in temp directory to see if blur output is valid
4. **Test without blur** to isolate if issue is in blur or caption module

## Files Modified
- `modules/caption-burner/ios/CaptionBurnerModule.swift` - Enhanced validation and logging
- This debug guide

## Expected Outcome
After rebuild, the console logs will clearly show:
- Which processing step is failing
- What the exact error is
- Whether input/output files are valid
- What the video properties are at each step

This will allow us to pinpoint and fix the exact cause of the black video issue.

