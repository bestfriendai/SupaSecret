# Expo Go vs Development Build Compatibility Matrix

## Overview

This document provides a comprehensive compatibility matrix for testing and development workflows, helping determine which features can be tested in Expo Go versus requiring development builds.

## Expo Go Compatible Dependencies

### ✅ JavaScript-Only Packages
These packages work fully in Expo Go without limitations:

| Package | Version | Functionality | Notes |
|---------|---------|---------------|-------|
| `@react-navigation/*` | 7.0.0 | Full navigation | Complete feature set |
| `zustand` | 4.5.2 | State management | Full functionality |
| `date-fns` | 2.30.0 | Date utilities | Complete library |
| `clsx` | 2.1.1 | CSS utilities | Full functionality |
| `tailwind-merge` | 2.3.0 | Tailwind utilities | Complete feature set |
| `react-native-web` | 0.21.0 | Web compatibility | Expo Go web support |

### ✅ Expo SDK Modules (Full Support)
All standard Expo modules work in Expo Go:

| Module | Functionality | Limitations |
|--------|---------------|-------------|
| `expo-camera` | Basic camera | Limited to Expo Go camera features |
| `expo-image-picker` | Image selection | Full functionality |
| `expo-file-system` | File operations | Sandboxed file access |
| `expo-notifications` | Push notifications | Development notifications only |
| `expo-location` | GPS location | Full functionality |
| `expo-audio` | Audio playback | Full functionality |
| `expo-video` | Video playback | Full functionality |

## Development Build Required Dependencies

### ❌ Native Firebase SDK
**Packages**: `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`
**Reason**: Requires native Firebase SDK integration
**Alternative**: Expo Go has limited Firebase support through Expo modules

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Analytics | ❌ No | ✅ Full Firebase Analytics |
| Crashlytics | ❌ No | ✅ Full crash reporting |
| Remote Config | ❌ No | ✅ Full remote config |
| Performance | ❌ No | ✅ Performance monitoring |

### ❌ Advanced Camera Features
**Package**: `react-native-vision-camera`
**Reason**: Requires native camera module with advanced features

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Basic camera | ✅ expo-camera | ✅ Full vision-camera |
| Video recording | ✅ Limited | ✅ Advanced recording |
| Frame processing | ❌ No | ✅ Real-time processing |
| Camera filters | ❌ No | ✅ Custom filters |

### ❌ Native Video Processing
**Package**: `ffmpeg-kit-react-native`, `react-native-video-processing`
**Reason**: Requires native FFmpeg binaries

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Video playback | ✅ expo-video | ✅ Advanced playback |
| Video editing | ❌ No | ✅ Full FFmpeg features |
| Format conversion | ❌ No | ✅ Multiple formats |
| Video compression | ❌ No | ✅ Custom compression |

### ❌ Native Storage Solutions
**Package**: `react-native-mmkv`
**Reason**: Requires native MMKV storage library

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| AsyncStorage | ✅ Standard storage | ✅ Standard storage |
| MMKV | ❌ No | ✅ High-performance storage |
| Secure storage | ✅ expo-secure-store | ✅ Both options |

### ❌ Machine Learning Features
**Package**: `@react-native-ml-kit/face-detection`
**Reason**: Requires native ML Kit integration

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Face detection | ❌ No | ✅ Full ML Kit features |
| Text recognition | ❌ No | ✅ OCR capabilities |
| Barcode scanning | ✅ expo-barcode-scanner | ✅ Enhanced scanning |

### ❌ Voice Recognition
**Package**: `@react-native-voice/voice`
**Reason**: Requires native speech recognition

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Speech-to-text | ❌ No | ✅ Native recognition |
| Voice commands | ❌ No | ✅ Real-time processing |
| Language support | ❌ No | ✅ Multiple languages |

### ❌ Advertising Integration
**Package**: `react-native-google-mobile-ads`
**Reason**: Requires native AdMob SDK

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Banner ads | ❌ No | ✅ Full AdMob integration |
| Interstitial ads | ❌ No | ✅ Full ad formats |
| Rewarded ads | ❌ No | ✅ Reward system |

## Config Plugin Requirements

### Required Plugins for Development Builds

| Package | Plugin | Configuration |
|---------|--------|---------------|
| `@react-native-firebase/analytics` | `@react-native-firebase/app` | Firebase config files |
| `react-native-google-mobile-ads` | `react-native-google-mobile-ads` | AdMob app ID |
| `react-native-vision-camera` | `react-native-vision-camera` | Camera permissions |
| `@react-native-ml-kit/face-detection` | `@react-native-ml-kit/face-detection` | ML Kit permissions |
| `@react-native-voice/voice` | `@react-native-voice/voice` | Microphone permissions |

### Sample app.config.js
```javascript
export default {
  expo: {
    plugins: [
      "@react-native-firebase/app",
      "react-native-google-mobile-ads",
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "Allow camera access for video recording",
          enableMicrophonePermission: true
        }
      ],
      "@react-native-ml-kit/face-detection",
      [
        "@react-native-voice/voice",
        {
          microphonePermission: "Allow microphone access for voice recognition"
        }
      ]
    ]
  }
};
```

## Testing Strategy Matrix

### Feature Testing Approach

| Feature Category | Expo Go Testing | Development Build Testing |
|------------------|------------------|---------------------------|
| **Navigation** | ✅ Full testing | ✅ Full testing |
| **UI Components** | ✅ Full testing | ✅ Full testing |
| **State Management** | ✅ Full testing | ✅ Full testing |
| **Basic Camera** | ✅ Limited testing | ✅ Full testing |
| **Video Processing** | ❌ Cannot test | ✅ Required for testing |
| **Firebase Features** | ❌ Cannot test | ✅ Required for testing |
| **Voice Recognition** | ❌ Cannot test | ✅ Required for testing |
| **ML Features** | ❌ Cannot test | ✅ Required for testing |
| **Ads Integration** | ❌ Cannot test | ✅ Required for testing |

### Development Workflow Recommendations

#### Phase 1: Expo Go Development
**Use for**:
- UI/UX development and testing
- Navigation flow implementation
- State management logic
- Basic app functionality
- Rapid prototyping

**Limitations**:
- Cannot test native module features
- Limited camera functionality
- No Firebase integration testing
- No ad integration testing

#### Phase 2: Development Build Testing
**Required for**:
- Native module integration testing
- Camera and video features
- Firebase analytics and crashlytics
- Voice recognition testing
- ML Kit face detection
- AdMob integration
- Production-like testing

#### Hybrid Development Approach
1. **Start with Expo Go** for rapid UI development
2. **Switch to Development Build** when testing native features
3. **Use feature flags** to conditionally enable native features
4. **Maintain both environments** for different testing needs

## Production Deployment Requirements

### EAS Build Configuration
All native dependencies require EAS Build for production:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    },
    "development": {
      "developmentClient": true,
      "env": {
        "EXPO_PUBLIC_ENV": "development"
      }
    }
  }
}
```

### App Store Submission
- ✅ All native modules supported
- ✅ Firebase SDK integration allowed
- ✅ AdMob integration supported
- ✅ Camera and microphone permissions handled
- ✅ ML Kit features supported

## Conditional Code Patterns

### Feature Detection
```typescript
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
const isDevelopmentBuild = Constants.appOwnership === 'standalone';

// Conditional feature usage
if (!isExpoGo) {
  // Use native modules only in development builds
  import('@react-native-firebase/analytics').then(analytics => {
    analytics().logEvent('app_opened');
  });
}
```

### Environment-Based Features
```typescript
const useNativeFeatures = () => {
  const [canUseNative, setCanUseNative] = useState(false);
  
  useEffect(() => {
    // Check if running in development build
    setCanUseNative(!Constants.appOwnership === 'expo');
  }, []);
  
  return canUseNative;
};
```

---

**Compatibility Matrix Last Updated**: September 13, 2025
**Next Review**: After development build testing phase
