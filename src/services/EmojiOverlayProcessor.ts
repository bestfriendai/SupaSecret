/**
 * Emoji Overlay Processor for Vision Camera
 * Extends the existing Vision Camera implementation to support emoji overlays
 * Uses Skia for real-time emoji rendering during video recording
 *
 * Features:
 * - Platform-specific optimizations
 * - Detailed error reporting
 * - Performance monitoring
 * - Graceful fallbacks
 */

import { useState, useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Error codes for better debugging
const ERROR_CODES = {
  INIT_FAILED: "INIT_FAILED",
  PLATFORM_UNSUPPORTED: "PLATFORM_UNSUPPORTED",
  CAMERA_PERMISSION_DENIED: "CAMERA_PERMISSION_DENIED",
  FACE_DETECTION_FAILED: "FACE_DETECTION_FAILED",
  PERFORMANCE_LOW: "PERFORMANCE_LOW",
  SKIA_UNAVAILABLE: "SKIA_UNAVAILABLE",
  WORKLET_FAILED: "WORKLET_FAILED",
  INVALID_OPTIONS: "INVALID_OPTIONS",
} as const;

// Error types
export interface EmojiOverlayError {
  code: string;
  message: string;
  details?: any;
  platform: string;
  timestamp: number;
  recoverable: boolean;
  suggestions: string[];
}

/**
 * Create a standardized error object
 */
const createError = (
  code: string,
  message: string,
  details?: any,
  recoverable: boolean = true,
  suggestions: string[] = [],
): EmojiOverlayError => {
  return {
    code,
    message,
    details,
    platform: IS_EXPO_GO ? "expo-go" : "development-build",
    timestamp: Date.now(),
    recoverable,
    suggestions,
  };
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: EmojiOverlayError): string => {
  switch (error.code) {
    case ERROR_CODES.PLATFORM_UNSUPPORTED:
      return "This feature is not available in Expo Go. Please use a development build for full functionality.";
    case ERROR_CODES.CAMERA_PERMISSION_DENIED:
      return "Camera permission is required for emoji overlay. Please grant permission in settings.";
    case ERROR_CODES.PERFORMANCE_LOW:
      return "Performance is low. Try reducing the video resolution or disabling other effects.";
    case ERROR_CODES.SKIA_UNAVAILABLE:
      return "Skia is not available on this device. Emoji overlay may not work properly.";
    case ERROR_CODES.INIT_FAILED:
      return "Failed to initialize emoji overlay. Please restart the app.";
    case ERROR_CODES.INVALID_OPTIONS:
      return "Invalid options provided. Please check your settings.";
    default:
      return error.message || "An unknown error occurred.";
  }
};

// Lazy load native modules to prevent Expo Go crashes
let Camera: any;
let useSkiaFrameProcessor: any;
let detectFaces: any;
let Skia: any;
let Font: any;
let TextAlign: any;

const loadNativeModules = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Emoji overlay not available in Expo Go - use development build");
  }

  try {
    if (!Camera) {
      const visionCamera = await import("react-native-vision-camera");
      Camera = visionCamera.Camera;

      // Load useSkiaFrameProcessor from Vision Camera
      if ("useSkiaFrameProcessor" in visionCamera) {
        useSkiaFrameProcessor = visionCamera.useSkiaFrameProcessor;
      } else {
        console.warn("⚠️ useSkiaFrameProcessor not found in Vision Camera module");
      }
    }

    if (!Skia) {
      const skia = await import("@shopify/react-native-skia");
      Skia = skia.Skia;
      Font = null; // skia.Font may not be available
      TextAlign = null; // skia.TextAlign may not be available
    }

    if (!detectFaces) {
      try {
        const faceDetector = await import("react-native-vision-camera-face-detector");
        detectFaces = faceDetector.useFaceDetector;
        console.log("✅ react-native-vision-camera-face-detector loaded");
      } catch (error) {
        console.warn("react-native-vision-camera-face-detector not available:", error);
      }
    }
  } catch (error) {
    console.error("Failed to load native modules:", error);
    throw new Error("Native modules not available. Ensure you're using a development build.");
  }
};

export type EmojiType = "mask" | "sunglasses" | "blur" | "robot" | "incognito";

export interface EmojiOverlayOptions {
  emojiType: EmojiType;
  scale?: number; // 0.5-2.0, default 1.5
  opacity?: number; // 0.3-1.0, default 0.9
  enableFaceDetection?: boolean; // default true
  onProgress?: (progress: number, status: string) => void;
  onFaceDetected?: (faceCount: number) => void;
  onPerformanceMetric?: (fps: number) => void;
  onFaceDetectionStatus?: (status: { detected: boolean; faceCount: number }) => void;
  onPerformanceMetrics?: (metrics: { fps: number; processingTime: number }) => void;
  onError?: (error: EmojiOverlayError) => void;
}

export interface EmojiDetectionStatus {
  facesDetected: number;
  lastDetectionTime: number;
  isProcessing: boolean;
  averageFps: number;
  currentEmoji: EmojiType;
  platform: "expo-go" | "development-build" | "unknown";
  performanceMode: "real-time" | "post-processing" | "simulated";
}

const EMOJI_MAP: Record<EmojiType, string> = {
  mask: "😷",
  sunglasses: "🕶️",
  blur: "🌫️",
  robot: "🤖",
  incognito: "🥸",
};

/**
 * Hook for real-time emoji overlay during video recording
 * Uses Vision Camera frame processors for on-the-fly emoji rendering
 */
export const useRealtimeEmojiOverlay = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<EmojiOverlayError | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<EmojiDetectionStatus>({
    facesDetected: 0,
    lastDetectionTime: 0,
    isProcessing: false,
    averageFps: 0,
    currentEmoji: "mask",
    platform: IS_EXPO_GO ? "expo-go" : "development-build",
    performanceMode: IS_EXPO_GO ? "simulated" : "real-time",
  });

  // Performance tracking
  const frameTimestamps = useRef<number[]>([]);
  const lastFaceCount = useRef<number>(0);
  const emojiFont = useRef<any>(null);

  const initializeEmojiOverlay = useCallback(async (options?: EmojiOverlayOptions) => {
    try {
      // Reset error state
      setError(null);

      // Check platform compatibility
      if (IS_EXPO_GO) {
        const error = createError(
          ERROR_CODES.PLATFORM_UNSUPPORTED,
          "Emoji overlay requires native modules not available in Expo Go",
          { platform: "expo-go" },
          true,
          [
            "Use a development build for full functionality",
            "Try the simulated mode for basic features",
            "Run: npx expo run:ios or npx expo run:android",
          ],
        );
        setError(error);
        options?.onError?.(error);

        // Show user-friendly alert
        Alert.alert(
          "Expo Go Limitation",
          "Emoji overlay is limited in Expo Go. For full functionality, please use a development build.",
          [{ text: "OK", style: "default" }],
        );

        return false;
      }

      console.log("🎯 Initializing Emoji Overlay");
      options?.onProgress?.(0, "Initializing emoji overlay system...");

      // Validate options
      if (options) {
        const { scale, opacity } = options;
        if (scale !== undefined && (scale < 0.5 || scale > 2.0)) {
          const error = createError(
            ERROR_CODES.INVALID_OPTIONS,
            `Invalid scale value: ${scale}. Must be between 0.5 and 2.0`,
            { scale },
            true,
            ["Use a scale value between 0.5 and 2.0", "Default scale is 1.5"],
          );
          setError(error);
          options?.onError?.(error);
          return false;
        }
        if (opacity !== undefined && (opacity < 0.3 || opacity > 1.0)) {
          const error = createError(
            ERROR_CODES.INVALID_OPTIONS,
            `Invalid opacity value: ${opacity}. Must be between 0.3 and 1.0`,
            { opacity },
            true,
            ["Use an opacity value between 0.3 and 1.0", "Default opacity is 0.9"],
          );
          setError(error);
          options?.onError?.(error);
          return false;
        }
      }

      options?.onProgress?.(25, "Loading native modules...");

      await loadNativeModules();

      options?.onProgress?.(50, "Loading emoji font...");

      // Load emoji font
      if (Skia && Font) {
        try {
          // Try to load system emoji font or fallback to default
          emojiFont.current = Font(null, 60); // Default font with size 60
          console.log("✅ Emoji font loaded");
        } catch (fontError) {
          console.warn("⚠️ Failed to load emoji font, using fallback:", fontError);
          emojiFont.current = null;

          const error = createError(ERROR_CODES.SKIA_UNAVAILABLE, "Failed to load emoji font", { fontError }, true, [
            "Emoji overlay will use a fallback rendering method",
            "Some emoji may not display correctly",
          ]);
          options?.onError?.(error);
        }
      }

      options?.onProgress?.(75, "Initializing face detection...");

      // Check for Skia availability
      if (Platform.OS !== "web" && !(global as any).HermesInternal) {
        console.warn("⚠️ Skia may not be available on this platform");

        const error = createError(
          ERROR_CODES.SKIA_UNAVAILABLE,
          "Skia may not be available on this platform",
          { platform: Platform.OS },
          true,
          ["Emoji overlay may not work properly", "Consider using a development build"],
        );
        options?.onError?.(error);
      }

      options?.onProgress?.(100, "Emoji overlay ready");

      setIsReady(true);
      console.log("✅ Emoji Overlay initialized successfully");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Emoji Overlay initialization failed:", error);

      const errorObj = createError(
        ERROR_CODES.INIT_FAILED,
        `Failed to initialize emoji overlay: ${errorMessage}`,
        { originalError: error },
        false,
        ["Check if all dependencies are installed", "Try restarting the app", "Ensure camera permissions are granted"],
      );

      setError(errorObj);
      options?.onError?.(errorObj);

      // Show user-friendly alert
      Alert.alert("Initialization Error", getErrorMessage(errorObj), [{ text: "OK", style: "default" }]);

      return false;
    }
  }, []);

  /**
   * Calculate FPS based on frame timestamps
   */
  const calculateFPS = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);

    // Keep only last 30 timestamps (for 1 second at 30fps)
    if (frameTimestamps.current.length > 30) {
      frameTimestamps.current.shift();
    }

    if (frameTimestamps.current.length < 2) return 0;

    const timeSpan = now - frameTimestamps.current[0];
    const fps = Math.round((frameTimestamps.current.length / timeSpan) * 1000);

    return fps;
  }, []);

  /**
   * Creates a Skia frame processor that renders emoji overlays on detected faces
   */
  const createEmojiOverlayFrameProcessor = useCallback(
    (options: EmojiOverlayOptions) => {
      if (!isReady) {
        const error = createError(ERROR_CODES.INIT_FAILED, "Emoji overlay not initialized", { isReady }, false, [
          "Call initializeEmojiOverlay() first",
          "Wait for initialization to complete",
        ]);

        setError(error);
        options?.onError?.(error);
        console.warn("⚠️ Emoji overlay not initialized");
        return null;
      }

      const {
        emojiType,
        scale = 1.5,
        opacity = 0.9,
        enableFaceDetection = true,
        onFaceDetected,
        onPerformanceMetric,
        onError,
      } = options;

      // Validate parameters
      const validatedScale = Math.max(0.5, Math.min(2.0, scale));
      const validatedOpacity = Math.max(0.3, Math.min(1.0, opacity));

      // Return a factory function that can be used in a component
      return (frame: any) => {
        "worklet";

        try {
          setDetectionStatus((prev) => ({
            ...prev,
            isProcessing: true,
            currentEmoji: emojiType,
            platform: IS_EXPO_GO ? "expo-go" : "development-build",
            performanceMode: IS_EXPO_GO ? "simulated" : "real-time",
          }));

          // Detect faces if enabled
          let faces = [];
          if (enableFaceDetection && detectFaces) {
            faces = detectFaces(frame);
          } else {
            // If face detection is disabled, apply emoji to center of frame
            faces = [
              {
                bounds: {
                  x: frame.width / 4,
                  y: frame.height / 4,
                  width: frame.width / 2,
                  height: frame.height / 2,
                },
              },
            ];
          }

          const faceCount = faces?.length || 0;

          // Update face detection status
          if (faceCount !== lastFaceCount.current) {
            lastFaceCount.current = faceCount;
            onFaceDetected?.(faceCount);
          }

          if (faces && faces.length > 0) {
            const emojiText = EMOJI_MAP[emojiType];

            // Create paint for emoji rendering
            const paint = Skia.Paint();
            paint.setAlpha(Math.floor(validatedOpacity * 255));

            // Apply emoji to each detected face
            faces.forEach((face: any) => {
              const { bounds } = face;

              // Calculate emoji size based on face dimensions and scale
              const baseSize = Math.max(bounds.width, bounds.height);
              const emojiSize = baseSize * validatedScale;

              // Center the emoji over the face
              const centerX = bounds.x + bounds.width / 2;
              const centerY = bounds.y + bounds.height / 2;
              const emojiX = centerX - emojiSize / 2;
              const emojiY = centerY - emojiSize / 2;

              // Draw emoji using Skia text rendering
              if (emojiFont.current) {
                // Use font-based rendering for better quality
                const font = emojiFont.current;
                font.setSize(emojiSize);

                // Measure text for proper centering
                const textWidth = font.getGlyphWidths(emojiText);
                const textHeight = emojiSize;

                // Adjust position for text centering
                const textX = centerX - textWidth / 2;
                const textY = centerY + textHeight / 4; // Adjust for baseline

                frame.drawText(emojiText, textX, textY, paint, font);
              } else {
                // Fallback: Draw emoji as a colored rectangle with text
                // This is a simplified fallback when font rendering fails
                const emojiPaint = Skia.Paint();
                emojiPaint.setColor(Skia.Color(255, 255, 255, Math.floor(validatedOpacity * 255)));

                // Draw background circle for emoji
                const radius = emojiSize / 2;
                frame.drawCircle(centerX, centerY, radius, emojiPaint);

                // Draw emoji text (simplified)
                const textPaint = Skia.Paint();
                textPaint.setColor(Skia.Color(0, 0, 0, Math.floor(validatedOpacity * 255)));
                textPaint.setTextSize(emojiSize * 0.6);

                frame.drawText(emojiText, centerX - emojiSize * 0.3, centerY + emojiSize * 0.2, textPaint);
              }
            });
          }

          // Calculate and report FPS
          const fps = calculateFPS();
          if (fps > 0) {
            onPerformanceMetric?.(fps);

            // Check for performance issues
            if (fps < 15 && fps > 0) {
              const error = createError(
                ERROR_CODES.PERFORMANCE_LOW,
                `Low performance detected: ${fps} FPS`,
                { fps, platform: IS_EXPO_GO ? "expo-go" : "development-build" },
                true,
                ["Reduce the number of effects", "Lower the video resolution", "Close other apps"],
              );

              onError?.(error);
            }

            setDetectionStatus((prev) => ({
              ...prev,
              averageFps: fps,
              facesDetected: faceCount,
              lastDetectionTime: Date.now(),
              isProcessing: false,
            }));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("❌ Frame processing error:", error);

          const errorObj = createError(
            ERROR_CODES.WORKLET_FAILED,
            `Frame processing failed: ${errorMessage}`,
            { originalError: error },
            true,
            ["Try reducing the video resolution", "Disable other effects", "Restart the app"],
          );

          onError?.(errorObj);
          setDetectionStatus((prev) => ({ ...prev, isProcessing: false }));
        }
      };
    },
    [isReady, calculateFPS],
  );

  /**
   * Creates a combined frame processor that supports both emoji and blur effects
   */
  const createCombinedFrameProcessor = useCallback(
    (emojiOptions: EmojiOverlayOptions, blurIntensity?: number) => {
      if (!isReady) {
        const error = createError(ERROR_CODES.INIT_FAILED, "Emoji overlay not initialized", { isReady }, false, [
          "Call initializeEmojiOverlay() first",
          "Wait for initialization to complete",
        ]);

        setError(error);
        emojiOptions?.onError?.(error);
        console.warn("⚠️ Emoji overlay not initialized");
        return null;
      }

      const { emojiType, scale = 1.5, opacity = 0.9, enableFaceDetection = true, onError } = emojiOptions;
      const validatedScale = Math.max(0.5, Math.min(2.0, scale));
      const validatedOpacity = Math.max(0.3, Math.min(1.0, opacity));
      const validatedBlurIntensity = blurIntensity ? Math.max(5, Math.min(50, blurIntensity)) : 0;

      return (frame: any) => {
        "worklet";

        try {
          setDetectionStatus((prev) => ({
            ...prev,
            isProcessing: true,
            currentEmoji: emojiType,
            platform: IS_EXPO_GO ? "expo-go" : "development-build",
            performanceMode: IS_EXPO_GO ? "simulated" : "real-time",
          }));

          // Detect faces
          let faces = [];
          if (enableFaceDetection && detectFaces) {
            faces = detectFaces(frame);
          } else {
            // If face detection is disabled, apply effects to center of frame
            faces = [
              {
                bounds: {
                  x: frame.width / 4,
                  y: frame.height / 4,
                  width: frame.width / 2,
                  height: frame.height / 2,
                },
              },
            ];
          }

          const faceCount = faces?.length || 0;

          // Apply blur first (if enabled)
          if (validatedBlurIntensity > 0 && faces && faces.length > 0) {
            const sigma = validatedBlurIntensity / 2;
            const blurPaint = Skia.Paint();
            blurPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(Skia.BlurStyle.Normal, sigma, true));

            faces.forEach((face: any) => {
              const { bounds } = face;
              const padding = Math.max(bounds.width, bounds.height) * 0.1;

              frame.drawRect(
                {
                  x: bounds.x - padding,
                  y: bounds.y - padding,
                  width: bounds.width + padding * 2,
                  height: bounds.height + padding * 2,
                },
                blurPaint,
              );
            });
          }

          // Apply emoji overlay
          if (faces && faces.length > 0) {
            const emojiText = EMOJI_MAP[emojiType];
            const paint = Skia.Paint();
            paint.setAlpha(Math.floor(validatedOpacity * 255));

            faces.forEach((face: any) => {
              const { bounds } = face;
              const baseSize = Math.max(bounds.width, bounds.height);
              const emojiSize = baseSize * validatedScale;
              const centerX = bounds.x + bounds.width / 2;
              const centerY = bounds.y + bounds.height / 2;
              const emojiX = centerX - emojiSize / 2;
              const emojiY = centerY - emojiSize / 2;

              if (emojiFont.current) {
                const font = emojiFont.current;
                font.setSize(emojiSize);

                const textWidth = font.getGlyphWidths(emojiText);
                const textHeight = emojiSize;

                const textX = centerX - textWidth / 2;
                const textY = centerY + textHeight / 4;

                frame.drawText(emojiText, textX, textY, paint, font);
              } else {
                // Fallback rendering
                const emojiPaint = Skia.Paint();
                emojiPaint.setColor(Skia.Color(255, 255, 255, Math.floor(validatedOpacity * 255)));

                const radius = emojiSize / 2;
                frame.drawCircle(centerX, centerY, radius, emojiPaint);

                const textPaint = Skia.Paint();
                textPaint.setColor(Skia.Color(0, 0, 0, Math.floor(validatedOpacity * 255)));
                textPaint.setTextSize(emojiSize * 0.6);

                frame.drawText(emojiText, centerX - emojiSize * 0.3, centerY + emojiSize * 0.2, textPaint);
              }
            });
          }

          // Calculate and report FPS
          const fps = calculateFPS();
          if (fps > 0) {
            // Check for performance issues
            if (fps < 15 && fps > 0) {
              const error = createError(
                ERROR_CODES.PERFORMANCE_LOW,
                `Low performance detected: ${fps} FPS`,
                { fps, platform: IS_EXPO_GO ? "expo-go" : "development-build" },
                true,
                ["Reduce the number of effects", "Lower the video resolution", "Close other apps"],
              );

              onError?.(error);
            }

            setDetectionStatus((prev) => ({
              ...prev,
              averageFps: fps,
              facesDetected: faceCount,
              lastDetectionTime: Date.now(),
              isProcessing: false,
            }));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          console.error("❌ Combined frame processing error:", error);

          const errorObj = createError(
            ERROR_CODES.WORKLET_FAILED,
            `Combined frame processing failed: ${errorMessage}`,
            { originalError: error },
            true,
            ["Try reducing the video resolution", "Disable other effects", "Restart the app"],
          );

          onError?.(errorObj);
          setDetectionStatus((prev) => ({ ...prev, isProcessing: false }));
        }
      };
    },
    [isReady, calculateFPS],
  );

  return {
    initializeEmojiOverlay,
    createEmojiOverlayFrameProcessor,
    createCombinedFrameProcessor,
    isReady,
    error,
    detectionStatus,
    EMOJI_MAP,
    ERROR_CODES,
    getErrorMessage,
  };
};

/**
 * Utility function to check if emoji overlay is available
 */
export const isEmojiOverlayAvailable = async (): Promise<boolean> => {
  if (IS_EXPO_GO) {
    return false;
  }

  try {
    await loadNativeModules();
    return true;
  } catch (error) {
    console.error("Failed to check emoji overlay availability:", error);
    return false;
  }
};

/**
 * Get camera permissions for emoji overlay
 */
export const requestEmojiOverlayPermissions = async (): Promise<boolean> => {
  try {
    await loadNativeModules();

    const cameraPermission = await Camera.requestCameraPermission();
    const microphonePermission = await Camera.requestMicrophonePermission();

    if (cameraPermission !== "granted") {
      const error = createError(
        ERROR_CODES.CAMERA_PERMISSION_DENIED,
        "Camera permission not granted",
        { cameraPermission },
        true,
        ["Grant camera permission in settings", "Restart the app after granting permission"],
      );

      Alert.alert("Permission Required", getErrorMessage(error), [{ text: "OK", style: "default" }]);

      return false;
    }

    if (microphonePermission !== "granted") {
      console.warn("Microphone permission not granted, audio recording will be disabled");
    }

    return true;
  } catch (error) {
    console.error("Failed to request permissions:", error);

    const errorObj = createError(
      ERROR_CODES.CAMERA_PERMISSION_DENIED,
      "Failed to request camera permissions",
      { originalError: error },
      false,
      ["Check if camera is available on this device", "Try restarting the app"],
    );

    Alert.alert("Permission Error", getErrorMessage(errorObj), [{ text: "OK", style: "default" }]);

    return false;
  }
};

/**
 * Get platform-specific capabilities
 */
export const getPlatformCapabilities = () => {
  if (IS_EXPO_GO) {
    return {
      platform: "expo-go",
      realTimeProcessing: false,
      faceDetection: "simulated",
      videoRecording: "post-processing",
      performance: "limited",
      features: ["Simulated face detection", "Basic emoji overlay", "Post-processing effects"],
      limitations: [
        "No real-time face detection",
        "No native video processing",
        "Simulated performance metrics",
        "Limited to basic emoji overlays",
      ],
    };
  }

  return {
    platform: "development-build",
    realTimeProcessing: true,
    faceDetection: "native",
    videoRecording: "real-time",
    performance: "optimized",
    features: [
      "Real-time face detection",
      "Native video processing",
      "Advanced emoji overlays",
      "Hardware acceleration",
      "Performance monitoring",
    ],
    limitations: [],
  };
};

export default {
  useRealtimeEmojiOverlay,
  isEmojiOverlayAvailable,
  requestEmojiOverlayPermissions,
  getPlatformCapabilities,
  getErrorMessage,
  EMOJI_MAP,
  ERROR_CODES,
};
