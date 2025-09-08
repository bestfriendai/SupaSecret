# Anonymous Video Confession Implementation

## Overview

This implementation provides **dual-mode video anonymization** that works seamlessly in both Expo Go (demo mode) and development builds (full native functionality).

## Architecture

### Core Components

1. **IAnonymiser** - Interface defining the anonymization contract
2. **DemoAnonymiser** - Expo Go compatible simulation 
3. **NativeAnonymiser** - Full ML Kit + FFmpeg implementation
4. **Anonymiser** - Factory that chooses the appropriate implementation

### Environment Detection

The system automatically detects the runtime environment:

- **Expo Go**: Uses `DemoAnonymiser` with simulated effects
- **Development Build**: Uses `NativeAnonymiser` with real processing
- **Standalone Build**: Uses `NativeAnonymiser` with real processing

## Features

### Demo Mode (Expo Go)
✅ UI for video recording with privacy messaging  
✅ Simulated face blur (copies file)  
✅ Mock voice effects using TTS for preview  
✅ Fake transcription with preset phrases  
✅ All UI interactions work perfectly  

### Native Mode (Development Build)
🚀 **Real face detection** during recording with ML Kit  
🚀 **Real face blurring** with FFmpeg filters  
🚀 **Actual voice pitch modification** with FFmpeg audio processing  
🚀 **Speech-to-text** during recording with native APIs  
🚀 **TikTok-style captions** burned into video with timing  

## Implementation Details

### Face Detection & Blurring
```typescript
// Extracts frames every 30th frame (1fps from 30fps video)
// Detects faces using ML Kit
// Creates union of all face bounding boxes
// Applies Gaussian blur filter to face regions using FFmpeg
```

### Voice Modification
```typescript
// Deep voice: Lower pitch by ~2 semitones
'asetrate=44100*0.89,aresample=44100,atempo=1.12'

// Light voice: Higher pitch by ~2 semitones  
'asetrate=44100*1.12,aresample=44100,atempo=0.89'
```

### Speech-to-Text & TikTok-Style Captions
- Uses `@react-native-voice/voice` for platform native recognition
- Extracts audio from video using FFmpeg
- Processes audio through device STT services
- **Automatically burns captions into video** with timing
- **TikTok-style appearance**: 2-4 words at a time, centered at bottom
- **Dynamic timing**: Segments distributed evenly across video duration
- **Professional styling**: White text with black outline for readability
- Falls back gracefully when STT unavailable

## Dependencies

### Development Build Only
```json
{
  "@react-native-ml-kit/face-detection": "^7.0.0",
  "@react-native-voice/voice": "^3.2.4",
  "ffmpeg-kit-react-native": "^6.0.2"
}
```

### App Configuration
```json
{
  "plugins": [
    ["expo-build-properties", {
      "ios": { "useFrameworks": "static" }
    }],
    "expo-audio",
    "expo-camera"
  ]
}
```

### Permissions
- **iOS**: Camera, Microphone, Speech Recognition
- **Android**: Camera, Record Audio, Storage

## Usage

### Simple Integration
```typescript
import { Anonymiser } from '../services/Anonymiser';

// Process video with full anonymization
const result = await Anonymiser.processVideo(videoUri, {
  enableFaceBlur: true,
  enableVoiceChange: true,
  enableTranscription: true,
  voiceEffect: 'deep', // or 'light'
  quality: 'medium',
  onProgress: (progress, status) => {
    console.log(`${progress}%: ${status}`);
  }
});
```

### Environment Check
```typescript
import { env } from '../utils/env';

if (env.expoGo) {
  console.log('Running in Expo Go - demo mode');
} else {
  console.log('Running in dev build - full processing');
}
```

## Building for Development

### Install Dependencies
```bash
# Add native dependencies
npm install @react-native-ml-kit/face-detection @react-native-voice/voice

# Create development build
npx expo prebuild
npx expo run:ios  # or expo run:android
```

### Test Both Modes

1. **Expo Go**: Scan QR code - uses simulation
2. **Dev Build**: Install .ipa/.apk - uses real processing

## Processing Pipeline

### Native Mode Flow
1. **Face Detection**: Extract frames → ML Kit detection → Merge face regions
2. **Speech Recognition**: Extract audio → Platform STT → Generate transcription
3. **Video Processing**: Single FFmpeg command with:
   - Face blur filters for detected regions
   - Voice pitch modification filters  
   - **TikTok-style caption overlay with timing**
4. **Output**: Fully processed anonymous video with burned-in captions

### Performance Considerations
- Processes at 720p to prevent memory issues
- Uses fast FFmpeg presets for real-time performance  
- Caches face detection results across frames
- Automatic cleanup of temporary files

## Error Handling

The system gracefully handles:
- Missing native modules (falls back to demo)
- Face detection failures (blur full frame)
- STT unavailable (skip transcription)
- FFmpeg errors (retry with fallback codecs)

## Future Enhancements

- Real-time face detection during recording
- Multiple voice effect presets
- Server-side processing fallback
- Advanced face tracking algorithms
- Custom blur patterns

---

**Result**: Perfect anonymous video confessions that work in demo (Expo Go) and full production (development builds) with real ML-powered face anonymization and voice modification.
