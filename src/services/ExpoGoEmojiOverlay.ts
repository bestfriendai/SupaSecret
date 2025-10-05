/**
 * Expo Go Emoji Overlay Service
 *
 * This service provides a fallback emoji overlay implementation for Expo Go
 * using basic React Native components and post-processing techniques.
 *
 * Since Expo Go doesn't support native modules like Vision Camera,
 * this implementation uses a simplified approach with React Native overlays.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

export type EmojiType = "mask" | "sunglasses" | "blur" | "robot" | "incognito";

export interface ExpoGoEmojiOptions {
  emojiType: EmojiType;
  scale?: number; // 0.5-2.0, default 1.5
  opacity?: number; // 0.3-1.0, default 0.9
  onProgress?: (progress: number, status: string) => void;
  onPerformanceMetric?: (fps: number) => void;
  onFaceDetectionStatus?: (status: { detected: boolean; faceCount: number }) => void;
}

export interface ExpoGoEmojiStatus {
  isProcessing: boolean;
  facesDetected: number;
  lastDetectionTime: number;
  averageFps: number;
  currentEmoji: EmojiType;
  performanceMode: "simulated" | "post-processing";
}

const EMOJI_MAP: Record<EmojiType, string> = {
  mask: "😷",
  sunglasses: "🕶️",
  blur: "🌫️",
  robot: "🤖",
  incognito: "🥸",
};

export interface Face {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  id?: string; // Optional ID for tracking
}

/**
 * Hook for Expo Go emoji overlay functionality
 * Provides a simulated face detection and emoji overlay system
 */
export const useExpoGoEmojiOverlay = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExpoGoEmojiStatus>({
    isProcessing: false,
    facesDetected: 0,
    lastDetectionTime: 0,
    averageFps: 0,
    currentEmoji: "mask",
    performanceMode: "simulated",
  });

  // Performance tracking
  const frameTimestamps = useRef<number[]>([]);
  const simulationInterval = useRef<number | null>(null);
  const performanceInterval = useRef<number | null>(null);

  /**
   * Initialize the Expo Go emoji overlay system
   */
  const initializeExpoGoEmojiOverlay = useCallback(async () => {
    try {
      if (!IS_EXPO_GO) {
        throw new Error(
          "This service is specifically designed for Expo Go. Use the standard emoji overlay service for development builds.",
        );
      }

      console.log("🎯 Initializing Expo Go Emoji Overlay (Simulated Mode)");

      // Simulate initialization delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsReady(true);
      console.log("✅ Expo Go Emoji Overlay initialized successfully");
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Expo Go Emoji Overlay initialization failed:", error);
      setError(errorMessage);

      Alert.alert(
        "Expo Go Mode",
        "Emoji overlay is running in simulated mode. For full functionality, please use a development build.",
        [{ text: "OK", style: "default" }],
      );

      return false;
    }
  }, []);

  /**
   * Start simulated face detection
   * In Expo Go, we simulate face detection with random intervals
   */
  const startSimulatedFaceDetection = useCallback((options: ExpoGoEmojiOptions) => {
    const { emojiType, onFaceDetectionStatus, onPerformanceMetric } = options;

    // Clear any existing intervals
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    // Simulate face detection with random intervals
    simulationInterval.current = setInterval(
      () => {
        const faceCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
        const detected = faceCount > 0;

        setStatus((prev) => ({
          ...prev,
          facesDetected: faceCount,
          lastDetectionTime: Date.now(),
          currentEmoji: emojiType,
          isProcessing: false,
        }));

        onFaceDetectionStatus?.({ detected, faceCount });

        if (__DEV__ && detected) {
          console.log(`🎯 Expo Go: Simulated ${faceCount} face(s) detected`);
        }
      },
      1500 + Math.random() * 1000,
    ); // Random interval between 1.5-2.5 seconds
  }, []);

  /**
   * Calculate simulated FPS
   */
  const calculateSimulatedFPS = useCallback(() => {
    const now = Date.now();
    frameTimestamps.current.push(now);

    // Keep only last 30 timestamps
    if (frameTimestamps.current.length > 30) {
      frameTimestamps.current.shift();
    }

    if (frameTimestamps.current.length < 2) return 0;

    const timeSpan = now - frameTimestamps.current[0];
    const fps = Math.round((frameTimestamps.current.length / timeSpan) * 1000);

    return Math.min(fps, 30); // Cap at 30fps for Expo Go
  }, []);

  /**
   * Start performance monitoring
   */
  const startPerformanceMonitoring = useCallback(
    (onPerformanceMetric?: (fps: number) => void) => {
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }

      performanceInterval.current = setInterval(() => {
        const fps = calculateSimulatedFPS();

        setStatus((prev) => ({
          ...prev,
          averageFps: fps,
        }));

        onPerformanceMetric?.(fps);
      }, 1000);
    },
    [calculateSimulatedFPS],
  );

  /**
   * Start emoji overlay in Expo Go mode
   */
  const startExpoGoEmojiOverlay = useCallback(
    (options: ExpoGoEmojiOptions) => {
      if (!isReady) {
        console.warn("⚠️ Expo Go Emoji Overlay not initialized");
        return false;
      }

      const { emojiType, onProgress, onPerformanceMetric, onFaceDetectionStatus } = options;

      console.log(`🎯 Starting Expo Go Emoji Overlay: ${emojiType}`);

      setStatus((prev) => ({
        ...prev,
        isProcessing: true,
        currentEmoji: emojiType,
        performanceMode: "simulated",
      }));

      onProgress?.(0, "Initializing simulated face detection...");

      // Start simulated face detection
      setTimeout(() => {
        startSimulatedFaceDetection(options);
        startPerformanceMonitoring(onPerformanceMetric);
        onProgress?.(100, "Emoji overlay active (simulated mode)");
      }, 1000);

      return true;
    },
    [isReady, startSimulatedFaceDetection, startPerformanceMonitoring],
  );

  /**
   * Stop emoji overlay
   */
  const stopExpoGoEmojiOverlay = useCallback(() => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }

    if (performanceInterval.current) {
      clearInterval(performanceInterval.current);
      performanceInterval.current = null;
    }

    setStatus((prev) => ({
      ...prev,
      isProcessing: false,
      facesDetected: 0,
    }));
  }, []);

  /**
   * Get simulated face positions for overlay rendering
   * In Expo Go, we return predefined positions based on screen dimensions
   */
  const getSimulatedFacePositions = useCallback(
    (screenWidth: number, screenHeight: number) => {
      const faces: Face[] = [];
      const faceCount = status.facesDetected;

      if (faceCount === 0) return faces;

      // Generate simulated face positions
      for (let i = 0; i < faceCount; i++) {
        const faceSize = Math.min(screenWidth, screenHeight) * 0.15; // 15% of screen size

        // Distribute faces across the upper portion of the screen
        const x = screenWidth * 0.2 + ((i * screenWidth * 0.3) % (screenWidth * 0.6));
        const y = screenHeight * 0.2 + ((i * 50) % (screenHeight * 0.3));

        faces.push({
          id: `simulated-face-${i}`,
          bounds: {
            x,
            y,
            width: faceSize,
            height: faceSize,
          },
        });
      }

      return faces;
    },
    [status.facesDetected],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopExpoGoEmojiOverlay();
    };
  }, [stopExpoGoEmojiOverlay]);

  return {
    initializeExpoGoEmojiOverlay,
    startExpoGoEmojiOverlay,
    stopExpoGoEmojiOverlay,
    getSimulatedFacePositions,
    isReady,
    error,
    status,
    EMOJI_MAP,
  };
};

/**
 * Check if Expo Go emoji overlay is available
 */
export const isExpoGoEmojiOverlayAvailable = (): boolean => {
  return IS_EXPO_GO;
};

/**
 * Get platform-specific emoji overlay capabilities
 */
export const getEmojiOverlayCapabilities = () => {
  if (IS_EXPO_GO) {
    return {
      platform: "expo-go",
      realTimeProcessing: false,
      faceDetection: "simulated",
      videoRecording: "post-processing",
      performance: "limited",
      features: [
        "Simulated face detection",
        "Basic emoji overlay",
        "Post-processing effects",
        "Performance monitoring",
      ],
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
  useExpoGoEmojiOverlay,
  isExpoGoEmojiOverlayAvailable,
  getEmojiOverlayCapabilities,
  EMOJI_MAP,
};
