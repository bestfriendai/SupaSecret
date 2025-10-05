# Face Blur Architecture Issue

## Problem

Video recording with face blur freezes after 2 seconds due to a **fundamental violation of the React Rules of Hooks**.

## Root Cause

In `src/hooks/useVisionCameraRecorder.ts`, we're calling `useFaceDetectorHook` inside a `useEffect`:

```typescript
// ❌ WRONG - Violates Rules of Hooks
useEffect(() => {
  const init = async () => {
    const loaded = await loadVisionCamera();
    if (loaded && enableFaceBlur && useFaceDetectorHook) {
      const { detectFaces } = useFaceDetectorHook({  // ❌ Hook called conditionally!
        performanceMode: "fast",
        contourMode: "all",
      });
      setDetectFaces(() => detectFaces);
    }
  };
  init();
}, [enableFaceBlur]);
```

**React Rules of Hooks** state:
- Hooks must be called at the **top level** of a component/hook
- Hooks **cannot** be called conditionally
- Hooks **cannot** be called inside loops, conditions, or nested functions
- Hooks **cannot** be called after async operations

## Why It Freezes

The hook call inside useEffect causes:
1. Inconsistent hook execution order
2. React's hook tracking gets corrupted
3. Frame processor worklet becomes unstable
4. Camera feed freezes after ~2 seconds

## FaceBlurApp Reference Implementation

The working FaceBlurApp calls hooks at top level:

```typescript
// ✅ CORRECT - Hooks at top level
function CameraScreen() {
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    contourMode: 'all',
  });

  const frameProcessor = useSkiaFrameProcessor(frame => {
    'worklet';
    frame.render();
    const faces = detectFaces(frame);
    // ... blur logic
  }, [detectFaces]);

  return <Camera frameProcessor={frameProcessor} />;
}
```

## Solution Options

### Option 1: Remove Dynamic Loading (Recommended)

Import modules statically and handle Expo Go with conditional rendering:

```typescript
// ✅ Top-level imports
import { Camera, useSkiaFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Skia, ClipOp, TileMode } from '@shopify/react-native-skia';

export const useVisionCameraRecorder = (options) => {
  // ✅ Hook called at top level
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    contourMode: 'all',
  });

  // ✅ All hooks at top level, no dynamic loading
  const frameProcessor = useSkiaFrameProcessor(frame => {
    'worklet';
    frame.render();
    if (options.enableFaceBlur) {
      const faces = detectFaces(frame);
      // ... blur logic
    }
  }, [detectFaces, options.enableFaceBlur]);

  return { frameProcessor };
};
```

Handle Expo Go at component level:

```typescript
function VisionCameraRecordScreen() {
  if (IS_EXPO_GO) {
    return <ExpoGoWarning />;
  }

  // Native build - all hooks work normally
  return <VisionCameraRecordScreenContent />;
}
```

### Option 2: Separate Component

Create a dedicated component that only loads when modules are ready:

```typescript
// VisionCameraProvider.tsx
import { Camera } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';

function VisionCameraContent({ children }) {
  // ✅ Hooks at top level in dedicated component
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    contourMode: 'all',
  });

  return children({ detectFaces });
}

// Usage
function RecordScreen() {
  if (!modulesLoaded) return <Loading />;

  return (
    <VisionCameraContent>
      {({ detectFaces }) => (
        <Camera frameProcessor={createProcessor(detectFaces)} />
      )}
    </VisionCameraContent>
  );
}
```

### Option 3: Disable Face Blur (Current)

Face blur is currently **disabled** to allow basic video recording to work. The toggle is grayed out with message "Architecture issue - needs rewrite".

## Implementation Steps

1. **Remove dynamic module loading** from `useVisionCameraRecorder.ts`
2. **Move all hook calls to top level** of the hook
3. **Handle Expo Go** with conditional component rendering (not conditional hooks)
4. **Test on native build** to ensure no freezing
5. **Re-enable face blur** in `VisionCameraRecordScreen.tsx`

## Files to Modify

- `src/hooks/useVisionCameraRecorder.ts` - Remove dynamic loading, fix hook usage
- `src/screens/VisionCameraRecordScreen.tsx` - Re-enable toggle after fix
- `src/utils/environmentCheck.ts` - Ensure IS_EXPO_GO check works

## Current Status

- ❌ Face blur: **DISABLED** (architecture violation)
- ✅ Basic video recording: **WORKS** (without blur)
- ⏳ Fix: **REQUIRES REWRITE** using Option 1 or 2

## Reference

- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [FaceBlurApp Implementation](https://github.com/mrousavy/FaceBlurApp)
- [Vision Camera Frame Processors](https://react-native-vision-camera.com/docs/guides/frame-processors)
