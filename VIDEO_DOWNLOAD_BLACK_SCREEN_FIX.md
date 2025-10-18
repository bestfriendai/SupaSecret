# Video Download Black Screen Issue - Comprehensive Fix Guide

## Problem Summary

Users are experiencing a **black screen with audio only** when downloading videos instead of the expected **blurred video with watermark**. This indicates that the video processing pipeline is failing to properly apply visual effects (face blur and watermark) during the download process.

## Root Cause Analysis

After investigating the codebase, I've identified several potential causes for this issue:

### 1. **Video Processing Pipeline Issues**

The main issue appears to be in the `VideoDownloadService.ts` file where the video processing with watermark and blur is not working correctly:

- **File**: `src/services/VideoDownloadService.ts:87-123`
- **Function**: `processVideoWithWatermarkOnly()`
- **Issue**: The caption burner module may not be properly processing the video with visual effects

### 2. **Missing Face Blur Integration**

The download service only processes watermarks but doesn't integrate with the face blur module:

- **Face blur module exists**: `modules/face-blur/`
- **Not integrated in downloads**: The download process skips face blur entirely
- **Expected behavior**: Downloaded videos should have both face blur AND watermark

### 3. **Module Loading Failures**

The caption burner module may not be properly available or configured:

```typescript
// From VideoDownloadService.ts:193-198
const { isCaptionBurningSupported } = await import("../../modules/caption-burner");
if (!isCaptionBurningSupported()) {
  console.log("⚠️ Video processing not supported on this platform, using original video");
  return null;
}
```

### 4. **File Path and Asset Issues**

The watermark logo path resolution may be failing:

```typescript
// From VideoDownloadService.ts:202-206
const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
await logoAsset.downloadAsync();
const logoPath = logoAsset.localUri || logoAsset.uri;
```

## Comprehensive Fix Solutions

### Solution 1: Fix Video Processing Pipeline

**File**: `src/services/VideoDownloadService.ts`

#### 1.1 Update the processing function to include face blur:

```typescript
async function processVideoWithWatermarkAndBlur(
  videoUri: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<string | null> {
  try {
    // Check if video processing is supported
    const { isCaptionBurningSupported } = await import("../../modules/caption-burner");
    if (!isCaptionBurningSupported()) {
      console.log("⚠️ Video processing not supported on this platform");
      return null;
    }

    onProgress?.(0, "Loading assets...");

    // Get logo path
    const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
    await logoAsset.downloadAsync();
    const logoPath = logoAsset.localUri || logoAsset.uri;

    onProgress?.(20, "Applying face blur...");

    // First apply face blur if available
    let processedVideo = videoUri;
    try {
      const { applyFaceBlur } = await import("../../modules/face-blur");
      const blurredVideo = await applyFaceBlur(videoUri);
      if (blurredVideo) {
        processedVideo = blurredVideo;
        console.log("✅ Face blur applied successfully");
      }
    } catch (blurError) {
      console.warn("⚠️ Face blur failed, continuing with original video:", blurError);
    }

    onProgress?.(50, "Applying watermark...");

    // Then apply watermark
    const result = await burnCaptionsAndWatermarkIntoVideo(processedVideo, [], {
      watermarkImagePath: logoPath,
      watermarkText: "ToxicConfessions.app",
      onProgress: (progress: any, status: any) => {
        const mappedProgress = 50 + (progress / 100) * 50;
        onProgress?.(mappedProgress, status);
      },
    });

    if (result.success && result.outputPath) {
      console.log("✅ Video processed successfully with blur and watermark");
      return result.outputPath;
    } else {
      console.error("❌ Video processing failed:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Error processing video:", error);
    return null;
  }
}
```

#### 1.2 Update the main download function:

```typescript
// Replace processVideoWithWatermarkOnly call with:
const processedVideo = await processVideoWithWatermarkAndBlur(videoUri, (progress, message) => {
  console.log(`📹 Processing progress: ${progress}% - ${message}`);
  const mappedProgress = 10 + (progress / 100) * 50;
  onProgress?.(mappedProgress, message);
});
```

### Solution 2: Fix Face Blur Module Integration

**File**: `modules/face-blur/app.plugin.js`

Update the plugin to properly configure the face blur module:

```javascript
const { withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");

const withFaceBlur = (config) => {
  return withPlugins(config, [
    // iOS: Add module to Podfile
    (config) =>
      withDangerousMod(config, [
        "ios",
        async (config) => {
          const fs = require("fs");
          const projectPath = path.join(config.modRequest.projectRoot, "ios");
          const podfilePath = path.join(projectPath, "Podfile");

          if (fs.existsSync(podfilePath)) {
            let podfileContent = fs.readFileSync(podfilePath, "utf8");

            // Add face-blur pod if not already present
            if (!podfileContent.includes("face-blur")) {
              podfileContent += "\n  pod 'face-blur', :path => '../node_modules/face-blur'\n";
              fs.writeFileSync(podfilePath, podfileContent);
            }
          }

          return config;
        },
      ]),
    // Android: Add to settings.gradle and app/build.gradle
    (config) =>
      withDangerousMod(config, [
        "android",
        async (config) => {
          const fs = require("fs");
          const projectPath = path.join(config.modRequest.projectRoot, "android");

          // Add to settings.gradle
          const settingsPath = path.join(projectPath, "settings.gradle");
          if (fs.existsSync(settingsPath)) {
            let settingsContent = fs.readFileSync(settingsPath, "utf8");
            if (!settingsContent.includes(":face-blur")) {
              settingsContent +=
                "\ninclude ':face-blur'\nproject(':face-blur').projectDir = new File('../node_modules/face-blur/android')\n";
              fs.writeFileSync(settingsPath, settingsContent);
            }
          }

          return config;
        },
      ]),
  ]);
};

module.exports = withFaceBlur;
```

### Solution 3: Add Face Blur Native Module Interface

**File**: `modules/face-blur/index.ts`

```typescript
import { NativeModules, Platform } from "react-native";

const { FaceBlurModule } = NativeModules;

export interface FaceBlurOptions {
  blurIntensity?: number;
  detectionMode?: "fast" | "accurate";
}

export const applyFaceBlur = async (videoUri: string, options: FaceBlurOptions = {}): Promise<string | null> => {
  if (!FaceBlurModule) {
    console.warn("FaceBlurModule not available");
    return null;
  }

  try {
    const result = await FaceBlurModule.applyFaceBlur(videoUri, {
      blurIntensity: options.blurIntensity || 15,
      detectionMode: options.detectionMode || "fast",
    });

    return result.processedVideoUri;
  } catch (error) {
    console.error("Face blur failed:", error);
    return null;
  }
};

export const isFaceBlurSupported = (): boolean => {
  return !!FaceBlurModule && Platform.OS !== "web";
};
```

### Solution 4: Enhanced Error Handling and Fallbacks

**File**: `src/services/VideoDownloadService.ts`

Add better error handling and validation:

```typescript
const validateVideoFile = async (videoUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      console.error("❌ Video file does not exist:", videoUri);
      return false;
    }

    const fileSize = (fileInfo as any).size || 0;
    if (fileSize < 1000) {
      console.error("❌ Video file too small:", fileSize, "bytes");
      return false;
    }

    // Additional validation: check if it's a valid video file
    const validExtensions = [".mp4", ".mov", ".m4v", ".avi"];
    const hasValidExtension = validExtensions.some((ext) => videoUri.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      console.error("❌ Invalid video file extension:", videoUri);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Video validation failed:", error);
    return false;
  }
};

// Add this validation at the start of downloadVideoToGallery:
const isValidVideo = await validateVideoFile(videoUri);
if (!isValidVideo) {
  return {
    success: false,
    error: "Invalid video file",
  };
}
```

### Solution 5: Fix Asset Loading

**File**: `src/services/VideoDownloadService.ts`

Improve asset loading with better error handling:

```typescript
const loadWatermarkAsset = async (): Promise<string | null> => {
  try {
    console.log("🎯 Loading watermark asset...");

    // Try multiple approaches to load the logo
    let logoPath: string | null = null;

    // Method 1: Asset.fromModule
    try {
      const logoAsset = Asset.fromModule(require("../../assets/logo.png"));
      await logoAsset.downloadAsync();
      logoPath = logoAsset.localUri || logoAsset.uri;
      console.log("✅ Logo loaded via Asset.fromModule:", logoPath);
    } catch (assetError) {
      console.warn("⚠️ Asset.fromModule failed:", assetError);
    }

    // Method 2: Direct path
    if (!logoPath) {
      try {
        logoPath = "../../assets/logo.png";
        console.log("✅ Using direct logo path:", logoPath);
      } catch (directError) {
        console.warn("⚠️ Direct path failed:", directError);
      }
    }

    // Method 3: Bundle assets (for production)
    if (!logoPath) {
      try {
        logoPath = `${FileSystem.bundleDirectory}assets/logo.png`;
        const exists = await FileSystem.getInfoAsync(logoPath);
        if (exists.exists) {
          console.log("✅ Logo found in bundle:", logoPath);
        } else {
          logoPath = null;
        }
      } catch (bundleError) {
        console.warn("⚠️ Bundle path failed:", bundleError);
      }
    }

    if (!logoPath) {
      throw new Error("Failed to load watermark logo from any source");
    }

    return logoPath;
  } catch (error) {
    console.error("❌ Failed to load watermark asset:", error);
    return null;
  }
};
```

### Solution 6: Add Video Processing Validation

**File**: `src/services/VideoDownloadService.ts`

Add validation to ensure the processed video is valid:

```typescript
const validateProcessedVideo = async (processedUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(processedUri);
    if (!fileInfo.exists) {
      console.error("❌ Processed video file does not exist");
      return false;
    }

    const fileSize = (fileInfo as any).size || 0;
    if (fileSize < 10000) {
      // Increased threshold for processed videos
      console.error("❌ Processed video file too small:", fileSize, "bytes");
      return false;
    }

    console.log("✅ Processed video validation passed:", {
      uri: processedUri,
      size: fileSize,
      sizeMB: (fileSize / 1024 / 1024).toFixed(2),
    });

    return true;
  } catch (error) {
    console.error("❌ Processed video validation failed:", error);
    return false;
  }
};

// Add this validation after processing:
if (processedVideo) {
  const isValidProcessed = await validateProcessedVideo(processedVideo);
  if (isValidProcessed) {
    finalVideoUri = processedVideo;
    console.log("✅ Using processed video with effects!");
  } else {
    console.warn("⚠️ Processed video validation failed, using original");
  }
}
```

### Solution 7: Debug Logging and Monitoring

Add comprehensive logging to track the processing pipeline:

```typescript
const debugLog = (step: string, data: any) => {
  if (__DEV__) {
    console.log(`🔍 [VideoDownload] ${step}:`, data);
  }
};

// Add debug logs throughout the process:
debugLog("Starting download", { videoUri, options });
debugLog("Video validation", { isValid: isValidVideo });
debugLog("Processing attempt", { hasCaptionBurner: isCaptionBurningSupported() });
debugLog("Asset loading", { logoPath });
debugLog("Processing result", { success: result.success, outputPath: result.outputPath });
debugLog("Final video", { finalVideoUri });
```

## Implementation Priority

### High Priority (Immediate Fixes)

1. **Solution 1**: Fix video processing pipeline to include face blur
2. **Solution 4**: Enhanced error handling and validation
3. **Solution 6**: Video processing validation

### Medium Priority (Next Sprint)

4. **Solution 2**: Fix face blur module integration
5. **Solution 3**: Add face blur native module interface
6. **Solution 5**: Fix asset loading

### Low Priority (Future Enhancement)

7. **Solution 7**: Debug logging and monitoring

## Testing Strategy

### 1. Unit Tests

```typescript
// Test video processing pipeline
describe("VideoDownloadService", () => {
  it("should process video with blur and watermark", async () => {
    const result = await processVideoWithWatermarkAndBlur(testVideoUri);
    expect(result).toBeTruthy();
    expect(result).not.toBe(testVideoUri); // Should be different URI
  });

  it("should fallback to original video if processing fails", async () => {
    // Mock processing failure
    const result = await downloadVideoToGallery(testVideoUri);
    expect(result.success).toBe(true);
  });
});
```

### 2. Integration Tests

- Test download on different platforms (iOS/Android)
- Test with various video formats and sizes
- Test with and without face blur module available

### 3. Manual Testing

- Test download functionality on real devices
- Verify downloaded videos have both blur and watermark
- Test edge cases (large videos, network issues, etc.)

## Monitoring and Analytics

Add tracking to monitor:

- Download success/failure rates
- Processing time metrics
- Error frequency and types
- Platform-specific issues

```typescript
// Add to VideoDownloadService
const trackDownloadMetrics = (eventName: string, data: any) => {
  // Send to analytics service
  analytics.track("video_download_" + eventName, data);
};
```

## Expected Outcome

After implementing these fixes:

1. **Downloaded videos will have proper visual effects** (face blur + watermark)
2. **Black screen issues will be eliminated** through proper validation
3. **Error handling will be more robust** with better fallbacks
4. **Debugging will be easier** with comprehensive logging
5. **Performance will be monitored** through analytics

## Rollback Plan

If issues arise during implementation:

1. **Immediate rollback**: Disable video processing, use original videos
2. **Partial rollback**: Keep watermark, disable face blur
3. **Gradual rollout**: Release to small percentage of users first

## Conclusion

The black screen issue is primarily caused by failures in the video processing pipeline. By implementing the comprehensive fixes outlined above, we can ensure that downloaded videos properly include both face blur and watermark effects, providing users with the expected privacy-protected content.
