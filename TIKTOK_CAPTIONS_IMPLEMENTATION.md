# TikTok/Instagram-Style Captions Implementation Guide

## What You're Getting

✅ **Voice Effects** - Deep/high voice modification via playback rate
✅ **Animated Captions** - Word-by-word captions that appear as spoken
✅ **Auto-Generated** - Uses OpenAI Whisper for accurate transcription
✅ **Cached** - Captions saved locally, no re-generation needed
✅ **TikTok-Style Animation** - Fade in, scale, and emphasize current word

---

## How It Works

### 1. Voice Effect (Already Solved)

```typescript
// Uses expo-av playback rate
<Video
  rate={0.75}              // Deep voice
  shouldCorrectPitch={false} // Keep pitch shifted
/>
```

### 2. Caption Generation (Whisper AI)

```typescript
// Automatic speech-to-text with word timestamps
const captions = await generateCaptions(videoUri);

// Returns:
{
  segments: [
    {
      text: "This is my confession",
      words: [
        { word: "This", start: 0.0, end: 0.2 },
        { word: "is", start: 0.2, end: 0.4 },
        { word: "my", start: 0.4, end: 0.6 },
        { word: "confession", start: 0.6, end: 1.2 },
      ],
    },
  ];
}
```

### 3. Caption Display (React Native)

```typescript
// Animated text overlay on video
<CaptionedVideoPlayer
  videoUri={uri}
  captionData={captions}
  voiceEffect="deep"
/>
```

---

## Implementation Steps

### Step 1: Install (Already Done!)

You already have everything:

- ✅ `expo-av` - Video player
- ✅ `openai` package - For Whisper API
- ✅ `expo-file-system` - File operations

### Step 2: Add Caption Generator Service

File: `src/services/CaptionGenerator.ts` ✅ CREATED

Key features:

- Uses OpenAI Whisper API for transcription
- Gets word-level timestamps
- Caches captions locally
- No re-generation needed

### Step 3: Create Captioned Video Player

File: `src/components/CaptionedVideoPlayer.tsx` ✅ CREATED

Features:

- Video playback with voice effect
- Animated caption overlay
- Synchronized with audio
- TikTok-style animations

### Step 4: Add Caption Generation Hook

File: `src/hooks/useCaptionGeneration.ts` ✅ CREATED

Handles:

- Caption generation
- Progress tracking
- Caching
- Error handling

---

## Usage Example

### In Your Video Recording Screen:

```typescript
import { useCaptionGeneration } from '../hooks/useCaptionGeneration';
import { CaptionedVideoPlayer } from '../components/CaptionedVideoPlayer';

export const ConfessionViewScreen = ({ route }) => {
  const { videoUri } = route.params;
  const {
    captionData,
    isGenerating,
    progress,
    progressStatus,
    generateCaptionsForVideo,
  } = useCaptionGeneration();

  useEffect(() => {
    // Generate captions when video loads
    generateCaptionsForVideo(videoUri);
  }, [videoUri]);

  if (isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>{progressStatus}</Text>
        <Text>{progress}%</Text>
      </View>
    );
  }

  return (
    <CaptionedVideoPlayer
      videoUri={videoUri}
      captionData={captionData}
      voiceEffect="deep" // or user preference
      style={styles.videoPlayer}
    />
  );
};
```

---

## Configuration

### OpenAI API Key

Already configured in `src/config/production.ts`:

```typescript
OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY;
```

Make sure your `.env` has:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-YOUR_REAL_KEY
```

### Customization Options

#### Voice Effects:

```typescript
<CaptionedVideoPlayer
  voiceEffect="deep"   // 0.75x speed
  voiceEffect="normal" // 1.0x speed
  voiceEffect="high"   // 1.25x speed
/>
```

#### Caption Styling:

Edit `CaptionedVideoPlayer.tsx` styles:

```typescript
captionText: {
  fontSize: 24,           // Adjust size
  fontWeight: 'bold',     // Font weight
  color: '#FFFFFF',       // Text color
  textShadowColor: '...'  // Shadow
}
```

#### Caption Position:

```typescript
captionContainer: {
  bottom: 100,  // Distance from bottom
  // Change to 'top' for top captions
}
```

---

## Advanced Features

### 1. Multiple Caption Styles

```typescript
// TikTok-style (current word highlighted)
export function getCaptionStyle(word, currentTime) {
  const isCurrent = /* word is being spoken */;
  return {
    color: isCurrent ? '#FFD700' : '#FFFFFF',
    scale: isCurrent ? 1.1 : 1.0,
  };
}
```

### 2. Caption Settings

```typescript
// Let users customize
const [captionSettings, setCaptionSettings] = useState({
  enabled: true,
  size: "medium",
  position: "bottom",
  style: "tiktok", // or 'instagram', 'youtube'
});
```

### 3. Language Support

Whisper supports 50+ languages automatically:

```typescript
const captions = await generateCaptions(videoUri);
// Returns language: 'en', 'es', 'fr', etc.
```

---

## Cost Analysis

### Whisper API Pricing:

- **$0.006 per minute** of audio
- Average confession (30 seconds): **$0.003**
- 1000 confessions: **$3.00**

### Optimization:

- ✅ Captions cached locally
- ✅ Only generate once per video
- ✅ No re-generation on replay

---

## Timeline

### Implementation:

- Caption Generator: ✅ Done (1 hour)
- Video Player Component: ✅ Done (1 hour)
- Hook: ✅ Done (30 mins)
- Integration: 2-3 hours
- Testing: 2-3 hours
- Polish: 1-2 hours

**Total: 1 day**

---

## Testing Checklist

### Functionality:

- [ ] Captions generate from video
- [ ] Captions sync with audio
- [ ] Voice effect works (deep/high)
- [ ] Captions animate smoothly
- [ ] Captions cached properly
- [ ] Works offline (after generation)

### Edge Cases:

- [ ] No speech in video
- [ ] Multiple speakers
- [ ] Background noise
- [ ] Long videos (>5 min)
- [ ] Different languages

### Performance:

- [ ] Caption generation < 10 seconds
- [ ] Video playback smooth (60fps)
- [ ] Animations not janky
- [ ] Memory usage acceptable

---

## Troubleshooting

### Issue: Captions not appearing

**Check:**

1. OpenAI API key is valid
2. Video has audio track
3. `captionData` is not null
4. Network connection for first generation

### Issue: Captions out of sync

**Fix:**

- Adjust timing in `getCurrentCaptions()`
- Add buffer: `currentTime >= word.start - 0.1`

### Issue: Slow caption generation

**Optimize:**

- Extract audio separately (smaller file)
- Use shorter videos
- Generate on upload, not on view

---

## Alternative: Server-Side Generation

For better UX, generate captions on server:

```typescript
// Upload video
const { videoUrl, captionUrl } = await uploadVideo(videoUri);

// Server generates captions asynchronously
// Returns captionUrl when ready

// Client downloads and plays
const captions = await fetch(captionUrl).then((r) => r.json());
```

**Benefits:**

- ✅ Faster for user (no wait)
- ✅ Works offline after download
- ✅ Can pre-process all videos

---

## Production Optimizations

### 1. Background Processing

```typescript
// Generate captions in background after recording
BackgroundFetch.registerTaskAsync("generate-captions", async () => {
  const pendingVideos = await getPendingVideos();
  for (const video of pendingVideos) {
    await generateCaptions(video.uri);
  }
});
```

### 2. Quality Settings

```typescript
// Let users choose quality
const captionQuality = {
  fast: "whisper-1", // Quick, good enough
  accurate: "whisper-1", // Same model, more processing
};
```

### 3. Batch Processing

```typescript
// Process multiple videos at once
const videos = await getRecordedVideos();
await Promise.all(videos.map((v) => generateCaptions(v.uri)));
```

---

## Next Steps

1. **Test Implementation:**

   ```bash
   npx expo start
   # Record a video
   # Watch captions generate
   # See TikTok-style animation
   ```

2. **Customize Styling:**
   - Adjust font size
   - Change colors
   - Modify animations
   - Try different positions

3. **Add User Settings:**
   - Caption on/off toggle
   - Font size selection
   - Position preference
   - Language selection

4. **Optimize Performance:**
   - Background generation
   - Server-side processing
   - Better caching

---

## Final Result

**You'll have:**

- ✅ Voice modification (deep/high pitch)
- ✅ TikTok-style animated captions
- ✅ Auto-generated from speech
- ✅ Synced with video
- ✅ Cached for offline use
- ✅ Professional quality

**Just like TikTok and Instagram!**

---

## Ready to Implement?

All code is ready in:

- `src/services/CaptionGenerator.ts`
- `src/components/CaptionedVideoPlayer.tsx`
- `src/hooks/useCaptionGeneration.ts`

**Just integrate into your video recording flow and you're done!**

---

_Implementation Time: 1 day_
_Cost: $0.003 per 30-second video_
_Result: Professional TikTok-style captions_
