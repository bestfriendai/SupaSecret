# Face Blur Improvements for Moving Faces

## Overview
Enhanced the face blur system to better handle moving faces with advanced tracking and motion prediction.

## Key Improvements

### 1. Advanced Face Tracking System
- **TrackedFace Structure**: Each detected face is now tracked with:
  - Unique ID for consistent tracking
  - Position history (last 10 frames)
  - Velocity calculations for motion detection
  - Confidence tracking
  - Movement state detection

### 2. Adaptive Detection Frequency
- **Dynamic Intervals**: Detection frequency adapts based on face movement
  - Moving faces: Every 2 frames (30 FPS → 15 FPS detection)
  - Stationary faces: Every 4 frames (30 FPS → 7.5 FPS detection)
  - Forced detection every 0.5 seconds for safety

### 3. Motion Prediction
- **Linear Prediction**: Predicts where moving faces will be in the next frame
- **Velocity Tracking**: Calculates face movement speed and direction
- **Smart Fallback**: Uses predicted positions when detection is skipped

### 4. Enhanced Face Detection
- **VNDetectFaceLandmarksRequest**: Uses advanced face detection with landmarks
- **Higher Confidence Threshold**: Filters faces with confidence > 0.6
- **Better Orientation Handling**: Improved camera intrinsics support

### 5. Improved Blur Quality
- **Adaptive Blur Intensity**: Moving faces get extra blur intensity (+15 points)
- **Larger Coverage Area**: 70% expansion for moving faces vs 60% for stationary
- **Minimum Blur Strength**: Increased from 30 to 35 for better privacy

### 6. Smart Face Matching
- **Distance-Based Matching**: Matches new detections with existing tracked faces
- **Automatic Cleanup**: Removes faces not seen for 10+ frames
- **New Face Detection**: Automatically starts tracking newly appeared faces

## Technical Details

### Performance Optimizations
- Maintains face history for only 10 frames to limit memory usage
- Uses efficient distance calculations for face matching
- Adaptive detection reduces unnecessary processing

### Privacy Enhancements
- Stronger pixelation for moving faces ensures privacy even during motion
- Expanded blur regions provide better coverage
- Predictive blurring prevents gaps in coverage

### Robustness Features
- Automatic tracking reset for each new video
- Fallback to last known positions for brief detection failures
- Comprehensive error handling and logging

## Usage
The improvements are automatically applied when using the existing face blur API:

```typescript
import { blurFacesInVideo } from '@local/face-blur';

const result = await blurFacesInVideo(videoPath, {
  blurIntensity: 50, // Now adapts automatically for moving faces
});
```

## Benefits
1. **Better Privacy**: Moving faces are consistently blurred without gaps
2. **Improved Performance**: Adaptive detection reduces unnecessary processing
3. **Enhanced Tracking**: Faces are tracked even during brief detection failures
4. **Future-Proof**: Motion prediction handles fast movements and camera shake
5. **Robust**: Automatic cleanup and reset prevent memory leaks and tracking errors

## Next Steps
- Test with various movement patterns (walking, turning, gesturing)
- Fine-tune velocity thresholds based on real-world usage
- Consider implementing Kalman filtering for even better prediction
- Add support for multiple face sizes and distances
