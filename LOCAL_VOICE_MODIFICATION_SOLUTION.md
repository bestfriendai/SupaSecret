# Local Voice Modification Solution - Expo SDK 54

## Current Status

- ✅ `react-native-audio-api` v0.8.2 installed
- ✅ Voice processing hook scaffolded
- ❌ **Audio extraction NOT implemented** (line 180-194)
- ❌ **Audio-video merging NOT implemented**
- ❌ **Critical gaps preventing local processing**

---

## The Hard Truth About Local Processing

### What's Missing (Can't Do in Pure Expo):

1. **Audio Extraction from Video**
   - Requires native video decoding
   - Expo AV/Audio: NO extraction API
   - Need: AVAssetExportSession (iOS) or MediaMuxer (Android)

2. **Audio-Video Merging**
   - Requires native video muxing
   - Expo: NO muxing API
   - Need: AVMutableComposition (iOS) or MediaMuxer (Android)

3. **These Require Custom Native Modules**

---

## Solution Options for LOCAL Processing

### Option 1: Custom Native Modules (COMPLEX)

**Create Expo modules for audio extraction and merging**

#### iOS Native Module (`modules/audio-video-processor/ios/AudioVideoProcessor.swift`):

```swift
import AVFoundation
import ExpoModulesCore

public class AudioVideoProcessorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioVideoProcessor")

    // Extract audio from video
    AsyncFunction("extractAudio") { (videoPath: String) -> String in
      let videoURL = URL(fileURLWithPath: videoPath)
      let asset = AVAsset(url: videoURL)

      guard let audioTrack = asset.tracks(withMediaType: .audio).first else {
        throw NSError(domain: "AudioVideoProcessor", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "No audio track found"])
      }

      let outputURL = videoURL.deletingPathExtension().appendingPathExtension("m4a")

      guard let exportSession = AVAssetExportSession(asset: asset,
                                                     presetName: AVAssetExportPresetAppleM4A) else {
        throw NSError(domain: "AudioVideoProcessor", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
      }

      exportSession.outputURL = outputURL
      exportSession.outputFileType = .m4a

      return try await withCheckedThrowingContinuation { continuation in
        exportSession.exportAsynchronously {
          if exportSession.status == .completed {
            continuation.resume(returning: outputURL.path)
          } else {
            continuation.resume(throwing: exportSession.error ??
              NSError(domain: "AudioVideoProcessor", code: 3,
                     userInfo: [NSLocalizedDescriptionKey: "Export failed"]))
          }
        }
      }
    }

    // Merge audio with video
    AsyncFunction("mergeAudioWithVideo") { (videoPath: String, audioPath: String, outputPath: String) -> String in
      let videoURL = URL(fileURLWithPath: videoPath)
      let audioURL = URL(fileURLWithPath: audioPath)
      let outputURL = URL(fileURLWithPath: outputPath)

      let videoAsset = AVAsset(url: videoURL)
      let audioAsset = AVAsset(url: audioURL)

      let composition = AVMutableComposition()

      // Add video track
      guard let videoTrack = videoAsset.tracks(withMediaType: .video).first,
            let compositionVideoTrack = composition.addMutableTrack(
              withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw NSError(domain: "AudioVideoProcessor", code: 4,
                     userInfo: [NSLocalizedDescriptionKey: "Failed to add video track"])
      }

      try compositionVideoTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: videoAsset.duration),
        of: videoTrack,
        at: .zero
      )

      // Add audio track
      guard let audioTrack = audioAsset.tracks(withMediaType: .audio).first,
            let compositionAudioTrack = composition.addMutableTrack(
              withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw NSError(domain: "AudioVideoProcessor", code: 5,
                     userInfo: [NSLocalizedDescriptionKey: "Failed to add audio track"])
      }

      try compositionAudioTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: audioAsset.duration),
        of: audioTrack,
        at: .zero
      )

      // Export
      guard let exportSession = AVAssetExportSession(asset: composition,
                                                     presetName: AVAssetExportPresetHighestQuality) else {
        throw NSError(domain: "AudioVideoProcessor", code: 6,
                     userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
      }

      exportSession.outputURL = outputURL
      exportSession.outputFileType = .mp4

      return try await withCheckedThrowingContinuation { continuation in
        exportSession.exportAsynchronously {
          if exportSession.status == .completed {
            continuation.resume(returning: outputURL.path)
          } else {
            continuation.resume(throwing: exportSession.error ??
              NSError(domain: "AudioVideoProcessor", code: 7,
                     userInfo: [NSLocalizedDescriptionKey: "Merge failed"]))
          }
        }
      }
    }
  }
}
```

#### Android Native Module (`modules/audio-video-processor/android/AudioVideoProcessor.kt`):

```kotlin
package expo.modules.audiovideoprocessor

import android.media.*
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer

class AudioVideoProcessorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioVideoProcessor")

    // Extract audio from video
    AsyncFunction("extractAudio") { videoPath: String ->
      val videoFile = File(videoPath)
      val outputFile = File(videoFile.parentFile, "${videoFile.nameWithoutExtension}.m4a")

      val extractor = MediaExtractor()
      extractor.setDataSource(videoPath)

      // Find audio track
      var audioTrackIndex = -1
      for (i in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrackIndex = i
          break
        }
      }

      if (audioTrackIndex < 0) {
        throw Exception("No audio track found")
      }

      extractor.selectTrack(audioTrackIndex)
      val audioFormat = extractor.getTrackFormat(audioTrackIndex)

      // Setup muxer
      val muxer = MediaMuxer(outputFile.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      val muxerAudioTrack = muxer.addTrack(audioFormat)
      muxer.start()

      // Copy audio data
      val buffer = ByteBuffer.allocate(1024 * 1024)
      val bufferInfo = MediaCodec.BufferInfo()

      while (true) {
        val sampleSize = extractor.readSampleData(buffer, 0)
        if (sampleSize < 0) break

        bufferInfo.offset = 0
        bufferInfo.size = sampleSize
        bufferInfo.presentationTimeUs = extractor.sampleTime
        bufferInfo.flags = extractor.sampleFlags

        muxer.writeSampleData(muxerAudioTrack, buffer, bufferInfo)
        extractor.advance()
      }

      muxer.stop()
      muxer.release()
      extractor.release()

      outputFile.path
    }

    // Merge audio with video
    AsyncFunction("mergeAudioWithVideo") { videoPath: String, audioPath: String, outputPath: String ->
      val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)

      // Add video track
      val videoExtractor = MediaExtractor()
      videoExtractor.setDataSource(videoPath)
      var videoTrackIndex = -1
      var muxerVideoTrack = -1

      for (i in 0 until videoExtractor.trackCount) {
        val format = videoExtractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/")) {
          videoTrackIndex = i
          videoExtractor.selectTrack(i)
          muxerVideoTrack = muxer.addTrack(format)
          break
        }
      }

      // Add audio track
      val audioExtractor = MediaExtractor()
      audioExtractor.setDataSource(audioPath)
      var audioTrackIndex = -1
      var muxerAudioTrack = -1

      for (i in 0 until audioExtractor.trackCount) {
        val format = audioExtractor.getTrackFormat(i)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrackIndex = i
          audioExtractor.selectTrack(i)
          muxerAudioTrack = muxer.addTrack(format)
          break
        }
      }

      muxer.start()

      // Copy video data
      val buffer = ByteBuffer.allocate(1024 * 1024)
      val bufferInfo = MediaCodec.BufferInfo()

      while (true) {
        val sampleSize = videoExtractor.readSampleData(buffer, 0)
        if (sampleSize < 0) break

        bufferInfo.offset = 0
        bufferInfo.size = sampleSize
        bufferInfo.presentationTimeUs = videoExtractor.sampleTime
        bufferInfo.flags = videoExtractor.sampleFlags

        muxer.writeSampleData(muxerVideoTrack, buffer, bufferInfo)
        videoExtractor.advance()
      }

      // Copy audio data
      while (true) {
        val sampleSize = audioExtractor.readSampleData(buffer, 0)
        if (sampleSize < 0) break

        bufferInfo.offset = 0
        bufferInfo.size = sampleSize
        bufferInfo.presentationTimeUs = audioExtractor.sampleTime
        bufferInfo.flags = audioExtractor.sampleFlags

        muxer.writeSampleData(muxerAudioTrack, buffer, bufferInfo)
        audioExtractor.advance()
      }

      muxer.stop()
      muxer.release()
      videoExtractor.release()
      audioExtractor.release()

      outputPath
    }
  }
}
```

#### Module Configuration (`modules/audio-video-processor/expo-module.config.json`):

```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["AudioVideoProcessorModule"]
  },
  "android": {
    "modules": ["expo.modules.audiovideoprocessor.AudioVideoProcessorModule"]
  }
}
```

#### Update AudioAPIVoiceProcessor.ts:

```typescript
import * as AudioVideoProcessor from "audio-video-processor";

async function extractAudioFromVideo(videoUri: string): Promise<string> {
  // Use native module
  const audioUri = await AudioVideoProcessor.extractAudio(videoUri);
  return audioUri;
}

async function mergeAudioWithVideo(videoUri: string, audioUri: string, outputUri: string): Promise<string> {
  // Use native module
  const finalUri = await AudioVideoProcessor.mergeAudioWithVideo(videoUri, audioUri, outputUri);
  return finalUri;
}
```

**Complexity:** HIGH
**Time:** 5-7 days
**Maintenance:** Ongoing (native code)

---

### Option 2: Use expo-av for Playback Rate (SIMPLE, LIMITED)

**Works for playback only, NOT for recording/saving**

```typescript
import { Audio } from "expo-av";

// Play with modified voice
const { sound } = await Audio.Sound.createAsync(
  { uri: audioUri },
  {
    rate: 0.8, // Deep voice
    shouldCorrectPitch: false, // Keep pitch shifted
  },
);

await sound.playAsync();
```

**Limitation:** Only works during playback, can't save modified audio

---

### Option 3: Simplified Approach - Record with Filter

**Use Vision Camera audio filters (if available)**

```typescript
// Record with pitch-shifted audio directly
<Camera
  audio={true}
  audioFilters={['pitch_shift_down']} // iOS AudioUnit effects
/>
```

**Limitation:** iOS only, limited effects

---

## RECOMMENDED: Pragmatic Solution

### For YOUR Use Case (Toxic Confessions):

**Option A: Drop Voice Modification for v1.0** ⭐ FASTEST

- Launch with face blur only (already working)
- Add voice modification in v1.1
- Time saved: 5-7 days

**Option B: Native Modules** (if voice is CRITICAL)

- Create custom Expo module (5-7 days)
- Full local processing
- Ongoing maintenance burden

**Option C: Hybrid Approach**

- Face blur: Local (working ✅)
- Voice modification: Server-side (simple endpoint)
- Best of both worlds

---

## Timeline Comparison

| Approach                    | Time     | Complexity | Maintenance |
| --------------------------- | -------- | ---------- | ----------- |
| Drop voice for v1.0         | 1 day    | Low        | None        |
| Native modules              | 5-7 days | High       | Ongoing     |
| Server-side only            | 3-4 days | Medium     | Low         |
| Hybrid (recommended before) | 3-4 days | Medium     | Low         |

---

## Why Local Voice Processing is Hard

1. **Audio Extraction:** Requires native video decoding
2. **Pitch Shifting:** react-native-audio-api works, but...
3. **Audio Encoding:** Need to re-encode
4. **Video Muxing:** Requires native video encoding
5. **Cross-platform:** Need iOS AND Android implementations

**Reality:** This is why apps like TikTok, Instagram process on servers.

---

## My Strong Recommendation

### Path Forward:

1. **Ship v1.0 WITHOUT voice modification** (1-2 days)
   - Face blur works ✅
   - Get to market faster
   - Validate concept
   - Gather feedback

2. **Add voice in v1.1** (choose based on feedback):
   - If users demand it: Create native module (5-7 days)
   - If optional: Server-side processing (3-4 days)
   - If not important: Skip entirely

### Why This Makes Sense:

- ✅ Face blur is YOUR core anonymization feature
- ✅ Voice modification is nice-to-have
- ✅ Get to market 5-7 days faster
- ✅ Validate if users even want voice modification
- ✅ Make data-driven decision for v1.1

---

## If You MUST Have Local Voice Processing

### Create the Native Module (Full Guide):

1. **Create Expo Module:**

```bash
cd modules
npx create-expo-module audio-video-processor
```

2. **Add Native Code** (see iOS/Android code above)

3. **Rebuild:**

```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

4. **Update AudioAPIVoiceProcessor.ts** (see code above)

5. **Test thoroughly** (5-7 days total)

---

## Bottom Line

**You have 3 real choices:**

1. **Ship without voice** → Launch in 1-2 days ⭐ RECOMMENDED
2. **Build native modules** → Launch in 5-7 days (high complexity)
3. **Use server-side** → Launch in 3-4 days (pragmatic)

**What do you want to do?**

---

_Note: The scaffolded `AudioAPIVoiceProcessor.ts` is incomplete and won't work without native modules for extraction/merging._
