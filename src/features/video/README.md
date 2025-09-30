# Video Feature Module

Comprehensive video feature implementation with recording, playback, processing, and upload capabilities.

## Overview

This module provides a complete video solution for the app, including:

- High-quality video recording with react-native-vision-camera
- Modern video playback with expo-video
- Face blur processing with ML Kit
- Voice effects processing with react-native-audio-api
- TikTok-style video feed
- Upload and processing pipeline

## Architecture

```
video/
├── components/          # UI components
│   ├── VideoPlayer.tsx           # Video playback component
│   ├── VideoRecordingModal.tsx   # Recording modal with camera
│   └── VideoFeed.tsx              # TikTok-style vertical feed
├── hooks/              # Custom React hooks
│   ├── useVideoRecording.ts      # Recording state management
│   └── useVideoPlayer.ts          # Playback state management
├── services/           # Business logic
│   ├── videoService.ts            # Core video operations
│   ├── faceBlurService.ts         # Face blur processing
│   └── voiceProcessingService.ts  # Voice effects
├── types/              # TypeScript definitions
│   └── index.ts                   # All type definitions
├── utils/              # Utility functions
│   └── videoUpload.ts             # Upload and processing
└── index.ts            # Main exports
```

## Features

### 1. Video Recording

Record high-quality videos using react-native-vision-camera 4.7:

```typescript
import { useVideoRecording } from '@/features/video';

const {
  state,
  startRecording,
  stopRecording,
  toggleCamera,
  Camera,
  cameraRef,
  cameraDevice,
} = useVideoRecording({
  maxDuration: 60,
  enableFaceBlur: true,
  facing: 'front',
  onRecordingStop: (videoPath) => {
    console.log('Video saved:', videoPath);
  },
});
```

### 2. Video Playback

Modern video playback with expo-video useVideoPlayer hook:

```typescript
import { VideoPlayer } from '@/features/video';

<VideoPlayer
  videoUri="file:///path/to/video.mp4"
  autoPlay={true}
  loop={true}
  showControls={true}
  onPlaybackStateChange={(state) => {
    console.log('Playing:', state.isPlaying);
  }}
/>
```

### 3. Video Feed

TikTok-style vertical scrolling feed:

```typescript
import { VideoFeed } from '@/features/video';

<VideoFeed
  videos={videoItems}
  initialIndex={0}
  onClose={() => navigation.goBack()}
  onVideoChange={(index) => console.log('Now viewing:', index)}
  onRefresh={() => loadMoreVideos()}
/>
```

### 4. Recording Modal

Full-featured recording modal:

```typescript
import { VideoRecordingModal } from '@/features/video';

<VideoRecordingModal
  visible={showRecording}
  onClose={() => setShowRecording(false)}
  onRecordingComplete={(video) => {
    console.log('Recording complete:', video);
  }}
  options={{
    maxDuration: 60,
    enableFaceBlur: true,
    blurIntensity: 15,
    facing: 'front',
  }}
/>
```

### 5. Face Blur Processing

On-device face detection and blur:

```typescript
import { getFaceBlurService } from '@/features/video';

const faceBlurService = getFaceBlurService();
await faceBlurService.initialize();

const result = await faceBlurService.processVideo(videoUri, {
  blurIntensity: 25,
  detectionMode: 'accurate',
  onProgress: (progress, status) => {
    console.log(`${status}: ${progress}%`);
  },
});

console.log('Faces blurred:', result.facesDetected);
```

### 6. Voice Processing

Pitch-shift voice effects:

```typescript
import { getVoiceProcessingService } from '@/features/video';

const voiceService = getVoiceProcessingService();
await voiceService.initialize();

const result = await voiceService.processAudio(audioUri, {
  effect: 'deep', // 'deep' | 'light' | 'none'
  onProgress: (progress, status) => {
    console.log(`${status}: ${progress}%`);
  },
});

console.log('Processed audio:', result.uri);
```

### 7. Video Upload

Upload and process videos:

```typescript
import { uploadAndProcessVideo } from '@/features/video';

const result = await uploadAndProcessVideo(
  videoUri,
  supabaseClient,
  {
    enableFaceBlur: true,
    enableVoiceChange: true,
    enableTranscription: true,
    quality: 'medium',
    voiceEffect: 'deep',
    onProgress: (progress, message) => {
      console.log(`${message}: ${progress}%`);
    },
  }
);

console.log('Processed video:', result.localUri);
console.log('Transcription:', result.transcription);
```

## Best Practices

### expo-video (v3.0.11)

1. **Use useVideoPlayer Hook**: Always use the `useVideoPlayer` hook for lifecycle management
2. **Proper Cleanup**: The hook automatically releases the player on unmount
3. **Configure on Init**: Set player properties in the initialization callback
4. **Event Handling**: Use `timeUpdateEventInterval` for time-based updates

```typescript
const player = useVideoPlayer(videoUri, (player) => {
  player.loop = true;
  player.muted = false;
  player.timeUpdateEventInterval = 1; // Updates every second
  player.play();
});
```

### react-native-vision-camera (v4.7.2)

1. **Performance**: Frame processors run synchronously - keep processing under 33ms (30 FPS)
2. **Camera Management**: Keep Camera mounted, toggle `isActive` prop for better performance
3. **Format Selection**: Choose appropriate resolution upfront instead of downscaling
4. **Permissions**: Always check and request permissions before camera operations

```typescript
const device = useCameraDevice('front');
const { hasPermission } = useCameraPermission();

<Camera
  device={device}
  isActive={isActive} // Toggle instead of unmounting
  video={true}
  audio={true}
/>
```

## Platform Support

### Native Builds Required

The following features require a development build:

- react-native-vision-camera (recording)
- @react-native-ml-kit/face-detection (face blur)
- react-native-audio-api (voice effects)

These will **NOT** work in Expo Go. Build with:

```bash
npx expo run:ios
npx expo run:android
```

### Expo Go Compatible

The following features work in Expo Go:

- expo-video (playback)
- Basic video metadata
- Video upload utilities

## Type Safety

All types are exported from the types module:

```typescript
import type {
  VideoRecordingOptions,
  VideoPlayerState,
  ProcessedVideo,
  VoiceEffect,
  FaceBlurOptions,
  VideoFeedItem,
} from '@/features/video';
```

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const result = await faceBlurService.processVideo(videoUri, options);
} catch (error) {
  if (error instanceof VideoProcessingError) {
    console.error('Code:', error.code);
    console.error('Message:', error.message);
  }
}
```

## Performance Optimization

1. **Video Feed**: Uses FlatList with optimized rendering
   - `windowSize={5}` - Renders 5 screens worth of content
   - `maxToRenderPerBatch={3}` - Renders 3 items per batch
   - `removeClippedSubviews={true}` - Removes off-screen views

2. **Player Lifecycle**: Single player instance per feed item
   - Automatically releases on unmount
   - Reuses player for same video source

3. **Frame Processors**: Optimize for real-time processing
   - Keep processing under 33ms for 30 FPS
   - Use native plugins for heavy operations
   - Consider post-processing for complex effects

## Constants

```typescript
import { VIDEO_CONSTANTS } from '@/features/video';

VIDEO_CONSTANTS.MAX_DURATION // 60 seconds
VIDEO_CONSTANTS.MAX_FILE_SIZE // 100MB
VIDEO_CONSTANTS.DEFAULT_QUALITY // 'medium'
VIDEO_CONSTANTS.DEFAULT_BLUR_INTENSITY // 15
VIDEO_CONSTANTS.DEFAULT_VOICE_EFFECT // 'deep'
```

## Dependencies

```json
{
  "expo-video": "~3.0.11",
  "expo-file-system": "~19.0.11",
  "react-native-vision-camera": "^4.7.2",
  "@react-native-ml-kit/face-detection": "^2.0.1",
  "@shopify/react-native-skia": "^2.2.12",
  "react-native-audio-api": "^0.8.2"
}
```

## Testing

The module includes type guards and validation:

```typescript
import {
  isVideoQuality,
  isVoiceEffect,
  isProcessedVideo,
} from '@/features/video';

if (isVideoQuality(value)) {
  // TypeScript knows value is VideoQuality
}
```

## Migration Notes

This module is based on the main app's video implementation with improvements:

1. Modern expo-video API (v3.0.11)
2. Latest vision-camera patterns (v4.7.2)
3. Improved error handling
4. Better type safety
5. Modular architecture
6. Comprehensive documentation

## Future Enhancements

Potential improvements:

1. Server-side face blur processing
2. Real-time frame processor plugins for face blur
3. Video compression optimization
4. Thumbnail generation service
5. Advanced video effects
6. Picture-in-Picture support
7. Background playback
