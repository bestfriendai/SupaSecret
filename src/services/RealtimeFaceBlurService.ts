/**
 * Realtime Face Blur Service
 *
 * Based on FaceBlurApp reference implementation by Marc Rousavy
 * https://github.com/mrousavy/FaceBlurApp
 *
 * Uses VisionCamera frame processors with react-native-vision-camera-face-detector
 * and Skia for real-time face blur during recording.
 *
 * Features:
 * - Real-time face detection and blur at 60-120 FPS
 * - Uses face contours for precise masking
 * - Performance optimized with fast detection mode
 * - Proper error handling and fallbacks
 */

import { Dimensions } from "react-native";
import { CameraPosition, useCameraDevice, useCameraFormat, useSkiaFrameProcessor } from "react-native-vision-camera";
// Note: react-native-vision-camera-face-detector is not installed
// This service is currently not functional and needs the package to be installed
// import { useFaceDetector, Contours } from "react-native-vision-camera-face-detector";
import { ClipOp, Skia, TileMode } from "@shopify/react-native-skia";

// Placeholder types for missing face detector
type Contours = any;
const useFaceDetector = (_options?: any): any => {
  console.warn('useFaceDetector is not available - react-native-vision-camera-face-detector not installed');
  return null;
};

export interface RealtimeFaceBlurOptions {
  blurRadius?: number; // Default: 25
  performanceMode?: "fast" | "accurate"; // Default: 'fast'
  contourMode?: "all" | "none"; // Default: 'all'
  landmarkMode?: "none" | "all"; // Default: 'none'
  classificationMode?: "none" | "all"; // Default: 'none'
}

export interface FaceBlurFrameProcessorConfig {
  options?: RealtimeFaceBlurOptions;
  onFaceDetected?: (faceCount: number) => void;
  onError?: (error: Error) => void;
}

class RealtimeFaceBlurService {
  private static instance: RealtimeFaceBlurService;
  private isInitialized = false;
  private initializationError: Error | null = null;

  private constructor() {}

  static getInstance(): RealtimeFaceBlurService {
    if (!RealtimeFaceBlurService.instance) {
      RealtimeFaceBlurService.instance = new RealtimeFaceBlurService();
    }
    return RealtimeFaceBlurService.instance;
  }

  /**
   * Initialize the face blur service
   * Must be called before using frame processors
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test if required modules are available
      await this.checkDependencies();

      // Additional initialization if needed
      this.isInitialized = true;
      this.initializationError = null;
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error("Unknown initialization error");
      throw this.initializationError;
    }
  }

  /**
   * Check if all required dependencies are available
   */
  private async checkDependencies(): Promise<void> {
    const errors: string[] = [];

    try {
      // Check VisionCamera
      await import("react-native-vision-camera");
    } catch {
      errors.push("react-native-vision-camera is not installed");
    }

    try {
      // Check face detector plugin
      // Note: Commented out to avoid TypeScript error - package not installed
      // await import("react-native-vision-camera-face-detector");
      throw new Error("Package not installed");
    } catch {
      errors.push(
        "react-native-vision-camera-face-detector is not installed. Install with: npm install react-native-vision-camera-face-detector",
      );
    }

    try {
      // Check Skia
      await import("@shopify/react-native-skia");
    } catch {
      errors.push("@shopify/react-native-skia is not installed");
    }

    if (errors.length > 0) {
      throw new Error(`Missing dependencies: ${errors.join(", ")}`);
    }
  }

  /**
   * Check if the service is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && !this.initializationError;
  }

  /**
   * Get the last initialization error
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Create a face blur frame processor for VisionCamera
   * This should be used in a React component with the useSkiaFrameProcessor hook
   */
  createFaceBlurFrameProcessor(config: FaceBlurFrameProcessorConfig = {}) {
    if (!this.isInitialized) {
      throw new Error(
        "RealtimeFaceBlurService must be initialized before creating frame processors. Call initialize() first.",
      );
    }

    const options = {
      blurRadius: 25,
      performanceMode: "fast" as const,
      contourMode: "all" as const,
      landmarkMode: "none" as const,
      classificationMode: "none" as const,
      ...config.options,
    };

    // Create blur filter
    const blurFilter = Skia.ImageFilter.MakeBlur(options.blurRadius, options.blurRadius, TileMode.Repeat, null);
    const paint = Skia.Paint();
    paint.setImageFilter(blurFilter);

    // Create face detector hook (this would be used in a component)
    const faceDetector = useFaceDetector({
      performanceMode: options.performanceMode,
      contourMode: options.contourMode,
      landmarkMode: options.landmarkMode,
      classificationMode: options.classificationMode,
    });
    const detectFaces = faceDetector?.detectFaces;

    // Return the frame processor function
    const frameProcessor = useSkiaFrameProcessor(
      (frame) => {
        "worklet";
        try {
          frame.render();

          const faces = detectFaces(frame);

          // Notify about detected faces
          if (config.onFaceDetected && faces.length > 0) {
            // Note: This callback might not work in worklet context
            // Consider using shared values or other mechanisms for UI updates
          }

          for (const face of faces) {
            if (face.contours != null) {
              // Foreground face: use precise contour masking
              this.applyContourBlur(frame, face.contours, paint);
            } else {
              // Background face: use simple oval blur
              this.applyBoundsBlur(frame, face.bounds, paint);
            }
          }
        } catch (error) {
          // Error handling in worklet context
          if (config.onError) {
            // Note: Error callbacks might not work directly in worklets
            console.error("Face blur frame processing error:", error);
          }
        }
      },
      [detectFaces, paint, config],
    );

    return frameProcessor;
  }

  /**
   * Apply blur using face contours for precise masking
   */
  private applyContourBlur(frame: any, contours: Contours, paint: any): void {
    "worklet";
    const path = Skia.Path.Make();

    // Use key facial contours for masking
    const necessaryContours: (keyof Contours)[] = ["FACE", "LEFT_CHEEK", "RIGHT_CHEEK"];

    for (const key of necessaryContours) {
      const points = contours[key];
      if (points && points.length > 0) {
        points.forEach((point: any, index: number) => {
          if (index === 0) {
            path.moveTo(point.x, point.y);
          } else {
            path.lineTo(point.x, point.y);
          }
        });
        path.close();
      }
    }

    // Apply blur to the contour area
    frame.save();
    frame.clipPath(path, ClipOp.Intersect, true);
    frame.render(paint);
    frame.restore();
  }

  /**
   * Apply blur using face bounds for simple oval masking
   */
  private applyBoundsBlur(frame: any, bounds: any, paint: any): void {
    "worklet";
    const path = Skia.Path.Make();

    const rect = Skia.XYWHRect(bounds.x, bounds.y, bounds.width, bounds.height);
    path.addOval(rect);

    // Apply blur to the bounds area
    frame.save();
    frame.clipPath(path, ClipOp.Intersect, true);
    frame.render(paint);
    frame.restore();
  }

  /**
   * Get recommended camera format for face blur
   */
  getRecommendedCameraFormat(device: any) {
    return useCameraFormat(device, [
      {
        videoResolution: Dimensions.get("window"),
      },
      {
        fps: 60, // Target 60 FPS for smooth real-time blur
      },
    ]);
  }

  /**
   * Get recommended camera device for face blur
   */
  getRecommendedCameraDevice(position: CameraPosition = "front") {
    return useCameraDevice(position);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.isInitialized = false;
    this.initializationError = null;
  }
}

// Export singleton instance
const realtimeFaceBlurService = RealtimeFaceBlurService.getInstance();
export default realtimeFaceBlurService;
