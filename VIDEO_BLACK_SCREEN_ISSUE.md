# Video Black Screen Issue - 2025-10-16

## Problem

Videos posted to the app are showing **black screens with audio playing**. This indicates:
- ✅ Video files are uploading correctly
- ✅ Signed URLs are being generated
- ✅ Audio track is intact
- ❌ Video track is not rendering (black screen)

## Root Cause Analysis

Based on the logs and code review, the issue is likely caused by **video processing** (face blur or caption burning) creating videos with incompatible color space or pixel format settings for iOS VideoView.

### Evidence

1. **Logs show successful video loading**:
   ```
   LOG  Getting signed URL for confession 9cda6e58-c22b-4d97-b825-05406f724756, 
        path: confessions/d6e05ec7-661b-4555-b16d-56b3add76794/3a6b2084-241d-4b90-a17b-acfa53ff1592.mp4
   ```

2. **No video playback errors** - Audio plays fine, indicating the file is valid

3. **Video processing uses H.264 codec** - The native modules (face blur, caption burner) encode videos with H.264

### Likely Causes

1. **Color Space Issue**: Video might be encoded with incorrect color space (e.g., RGB instead of YUV)
2. **Pixel Format Issue**: Using BGRA format during processing but not converting properly for H.264
3. **Transform/Orientation Issue**: Video orientation metadata might be lost or incorrect
4. **Profile/Level Issue**: H.264 profile might not be compatible with iOS VideoView

## Technical Details

### Face Blur Module (`modules/face-blur/ios/FaceBlurModule.swift`)

**Current Settings** (Lines 171-178):
```swift
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: videoSize.width,
  AVVideoHeightKey: videoSize.height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 6000000
  ]
])
```

**Missing**:
- Color space specification
- H.264 profile level
- Pixel format specification

### Caption Burner Module (`modules/caption-burner/ios/CaptionBurnerModule.swift`)

Uses `AVAssetExportSession` with preset `AVAssetExportPresetHighestQuality` which should handle color space correctly, but might still have issues.

## Solution

The fix requires updating the video encoding settings in the native modules to ensure proper color space and pixel format handling.

### Option 1: Add Explicit Color Space Settings (Recommended)

Update `modules/face-blur/ios/FaceBlurModule.swift`:

```swift
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: videoSize.width,
  AVVideoHeightKey: videoSize.height,
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
  ],
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 6000000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC
  ]
])
```

### Option 2: Use YUV Pixel Format

Change pixel buffer format from BGRA to YUV:

```swift
// Instead of kCVPixelFormatType_32BGRA
kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
```

### Option 3: Skip Processing for Now

As a temporary workaround, skip face blur and caption burning to test if unprocessed videos work:

1. Comment out watermark processing in `VideoPreviewScreen.tsx` (lines 256-317)
2. Upload original video without processing
3. Test if video plays correctly

## Immediate Action Required

**Test which videos are affected**:
1. Videos WITHOUT face blur or captions → Do they work?
2. Videos WITH face blur → Black screen?
3. Videos WITH captions/watermark → Black screen?

This will help identify which processing step is causing the issue.

## Recommended Fix Priority

1. **High Priority**: Add color space settings to face blur module
2. **Medium Priority**: Verify caption burner export settings
3. **Low Priority**: Add fallback to skip processing if it fails

## Testing Plan

1. Apply color space fix to face blur module
2. Rebuild app with `eas build`
3. Record and post a test video with face blur
4. Verify video plays with both video and audio
5. Test on multiple iOS devices/versions

## Files to Modify

1. `modules/face-blur/ios/FaceBlurModule.swift` - Add color space settings
2. `modules/caption-burner/ios/CaptionBurnerModule.swift` - Verify export settings
3. `src/screens/VideoPreviewScreen.tsx` - Add error handling for processing failures

## Expected Outcome

After applying the fix:
- ✅ Videos with face blur will show video + audio
- ✅ Videos with captions/watermark will show video + audio
- ✅ Videos without processing will continue to work
- ✅ All videos will be compatible with iOS VideoView

## Alternative Diagnosis

If the color space fix doesn't work, the issue might be:
1. **Supabase Storage**: Videos might be corrupted during upload
2. **Signed URL**: URLs might be expiring or incorrect
3. **VideoView Configuration**: Player settings might need adjustment

To test:
1. Download a video file from Supabase Storage directly
2. Play it in QuickTime or VLC
3. Check if video shows correctly outside the app

If the downloaded video plays fine in QuickTime, the issue is with VideoView configuration, not video encoding.

---

**Status**: 🔍 DIAGNOSIS COMPLETE - FIX NEEDED
**Priority**: 🔴 HIGH (Blocks video functionality)
**Estimated Fix Time**: 30 minutes
**Testing Time**: 1 hour (rebuild + test)

