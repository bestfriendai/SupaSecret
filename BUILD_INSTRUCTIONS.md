# Build Instructions for Anonymous Video Confession App

## ✅ Build Status
- **Expo Go Build**: ✅ Working (demo mode with simulated features)  
- **Development Build**: ✅ Ready (full native anonymization features)
- **SafeAreaProvider**: ✅ Fixed (properly configured at app root)
- **iOS Deployment**: ✅ Updated to 15.1+ (supports all native modules)
- **TikTok Captions**: ✅ Implemented (burned into video with timing)

## Quick Build Commands

### 1. Expo Go (Demo Mode)
```bash
# Current setup - works immediately
npx expo start
# Scan QR code with Expo Go app
```

### 2. Development Build (Full Features)
```bash
# Install dependencies first
bun install

# Create development build
npx expo run:ios --configuration Debug
# OR
npx expo run:android --configuration Debug

# OR use EAS Build for cloud building
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 3. Test Build (Export Bundle)
```bash
npx expo export --dev
# Creates dist/ folder with bundled app
```

## Native Dependencies Status

### ✅ Installed and Configured
- `ffmpeg-kit-react-native` - Video processing and voice modification
- `@react-native-ml-kit/face-detection` - Real face detection
- `@react-native-voice/voice` - Speech-to-text recognition  
- `expo-video-thumbnails` - Video thumbnail generation
- `expo-camera` - Video recording
- `expo-audio` - Audio processing

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

### Permissions Configured
#### iOS (Info.plist)
- ✅ `NSCameraUsageDescription` - Video recording
- ✅ `NSMicrophoneUsageDescription` - Audio recording  
- ✅ `NSSpeechRecognitionUsageDescription` - Speech-to-text

#### Android (permissions)
- ✅ `android.permission.CAMERA` - Video recording
- ✅ `android.permission.RECORD_AUDIO` - Audio recording
- ✅ `android.permission.WRITE_EXTERNAL_STORAGE` - File processing
- ✅ `android.permission.READ_EXTERNAL_STORAGE` - File access

## Feature Comparison

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Video Recording | ✅ Full UI | ✅ Full UI |
| Face Detection | 🎯 Simulated | 🚀 **Real ML Kit** |
| Face Blurring | 🎯 Copy file only | 🚀 **Real FFmpeg blur** |
| Voice Change | 🎯 TTS preview | 🚀 **Real pitch modification** |
| Speech-to-Text | 🎯 Mock phrases | 🚀 **Real platform STT** |
| TikTok Captions | 🎯 Overlay only | 🚀 **Burned into video** |
| Video Processing | 🎯 Demo mode | 🚀 **Full anonymization** |

## Build Verification

### Test Expo Go Build
```bash
npx expo start
# Should show: "🎯 Using DemoAnonymiser (Expo Go mode)"
```

### Test Development Build  
```bash
npx expo run:ios
# Should show: "🚀 Using NativeAnonymiser (Development/Standalone build)"
```

## Troubleshooting

### Common Issues

1. **"expo-video-thumbnails not found"**
   ```bash
   bun install
   # Package is now included in dependencies
   ```

2. **Native modules not working in Expo Go**
   - Expected behavior - use development build instead
   - Demo mode provides UI preview

3. **Face detection fails**
   - Falls back to full-frame blur automatically
   - Check device ML Kit support

4. **FFmpeg errors**  
   - Automatic fallback to alternative codecs
   - Check device processing capabilities

### Performance Tips
- Development builds process at 720p to prevent memory issues
- Face detection uses sparse frame sampling (every 30th frame)
- Automatic cleanup of temporary processing files
- Fast FFmpeg presets for real-time performance

## Final Result

### Expo Go Users See:
- Full video recording UI with privacy messaging
- Simulated processing with progress indicators  
- Mock voice effects using TTS
- Preset transcription phrases
- Complete user experience preview

### Development Build Users Get:
- **Real face detection and blurring** with ML Kit
- **Actual voice pitch modification** with FFmpeg
- **Professional TikTok-style captions** burned into video
- **Complete anonymization pipeline** 
- **Production-ready anonymous confessions**

Both modes maintain the same UI and user experience, with the development build providing the real processing power behind the scenes.
