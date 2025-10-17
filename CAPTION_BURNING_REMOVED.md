# Caption Burning Removed - Captions Now Work as Overlay

## Summary
Removed the caption burning functionality that was causing black video issues. Captions now work as real-time overlays during video playback instead of being burned into the video file.

## What Changed

### VideoPreviewScreen.tsx
**Removed:** Lines 292-396 - Entire caption burning process including:
- Loading logo asset for watermark
- Parsing caption segments from transcription data
- Calling `burnCaptionsAndWatermarkIntoVideo()` function
- Processing video with watermark and captions

**Replaced with:** Simple pass-through that uses the current video (with blur if applied)
```typescript
// CAPTION BURNING DISABLED - Captions will be shown as overlay during playback
// Just use the current video (with blur if applied)
console.log("📹 Using video without burning captions:", currentVideoUri);
setUploadProgress(10);
```

## How Captions Work Now

### During Recording
1. User records video with captions enabled
2. Speech recognition generates transcription data in real-time
3. Transcription is stored in `processedVideo.transcription` as JSON

### During Upload
1. Video file is uploaded (with blur if applied)
2. Transcription data is uploaded separately to database
3. No caption burning or watermark processing occurs

### During Playback
Captions are displayed as overlays using the `TikTokCaptions` component:

**Components that show captions:**
- `VideoPreviewScreen.tsx` - Preview before posting
- `OptimizedVideoItem.tsx` - Video feed items
- `UnifiedVideoItem.tsx` - Unified video player
- `EnhancedVideoFeed.tsx` - Enhanced feed view

**Caption Display Features:**
- TikTok-style animated captions
- Word-by-word highlighting
- Multiple caption styles
- Positioned at bottom of video
- Toggle on/off with caption button
- Synchronized with video playback

## Benefits

### ✅ Advantages
1. **No Black Video Issues** - Eliminates the complex video composition that was causing black screens
2. **Faster Upload** - No need to process video with caption burning
3. **Smaller File Sizes** - Video files don't include burned-in captions
4. **Better User Experience** - Users can toggle captions on/off
5. **Easier Maintenance** - Simpler codebase without complex AVFoundation composition

### ⚠️ Trade-offs
1. **No Watermark** - Watermark is no longer burned into video (can be added back as overlay if needed)
2. **Requires Transcription Data** - Captions only work if transcription data is available in database
3. **Client-Side Rendering** - Captions are rendered on device during playback

## Technical Details

### Transcription Data Format
Stored in database as JSON string:
```json
[
  {
    "id": "seg_0",
    "text": "Hello world",
    "startTime": 0.0,
    "endTime": 1.5,
    "isComplete": true,
    "words": [
      {
        "word": "Hello",
        "startTime": 0.0,
        "endTime": 0.7,
        "confidence": 1.0,
        "isComplete": true
      },
      {
        "word": "world",
        "startTime": 0.8,
        "endTime": 1.5,
        "confidence": 1.0,
        "isComplete": true
      }
    ]
  }
]
```

### Caption Overlay Implementation
Uses `TikTokCaptions` component with:
- Animated entrance/exit
- Word-by-word timing
- Multiple style options
- Safe area insets
- Responsive font sizes

## Files Modified

1. **src/screens/VideoPreviewScreen.tsx**
   - Removed caption burning logic (lines 292-396)
   - Simplified upload flow
   - Adjusted progress mapping

## Files NOT Modified (Still Working)

1. **modules/caption-burner/** - Module still exists but not used
2. **src/components/TikTokCaptions.tsx** - Caption overlay component (still used)
3. **src/services/CaptionGenerator.ts** - Transcription service (still used)
4. **src/hooks/useCaptionGeneration.ts** - Caption generation hook (still used)

## Testing Checklist

- [ ] Record video with captions enabled
- [ ] Verify captions appear during preview
- [ ] Post video successfully
- [ ] Verify video plays correctly (not black)
- [ ] Verify captions appear during playback in feed
- [ ] Toggle captions on/off
- [ ] Test with blur + captions
- [ ] Test without captions
- [ ] Test with blur only

## Future Improvements

If watermark is needed:
1. Add watermark as overlay component (like captions)
2. Display during playback, not burned into video
3. Use `VideoWatermark` component (already exists)

If caption burning is needed again:
1. Fix the AVFoundation composition issues in CaptionBurnerModule
2. Use identity transform approach
3. Test thoroughly with rotated videos

