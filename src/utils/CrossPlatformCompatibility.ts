/**
 * Cross-Platform Compatibility Utilities
 * Ensures emoji video recording works across different platforms and devices
 */

import { Platform, Dimensions } from "react-native";
import { IS_EXPO_GO } from "./environmentCheck";

// Platform-specific configurations
export interface PlatformConfig {
  supportsSkia: boolean;
  supportsVisionCamera: boolean;
  supportsFaceDetection: boolean;
  supportsEmojiRendering: boolean;
  recommendedMaxFPS: number;
  recommendedMaxResolution: {
    width: number;
    height: number;
  };
  memoryLimit: number; // MB
  performanceProfile: "low" | "medium" | "high";
  recommendedEffects: string[];
}

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig(): PlatformConfig {
  const { width, height } = Dimensions.get("window");
  const isLowEnd = isLowEndDevice();
  const isTablet = isTabletDevice();

  // Base configuration
  const config: PlatformConfig = {
    supportsSkia: false,
    supportsVisionCamera: false,
    supportsFaceDetection: false,
    supportsEmojiRendering: false,
    recommendedMaxFPS: 30,
    recommendedMaxResolution: { width: 1280, height: 720 },
    memoryLimit: 512, // MB
    performanceProfile: isLowEnd ? "low" : "medium",
    recommendedEffects: ["blur"],
  };

  // Platform-specific configurations
  if (Platform.OS === "ios") {
    config.supportsSkia = true;
    config.supportsVisionCamera = !IS_EXPO_GO;
    config.supportsFaceDetection = !IS_EXPO_GO;
    config.supportsEmojiRendering = true;
    config.recommendedMaxFPS = isLowEnd ? 30 : 60;
    config.recommendedMaxResolution = isLowEnd
      ? { width: 1280, height: 720 }
      : isTablet
        ? { width: 1920, height: 1080 }
        : { width: 1920, height: 1080 };
    config.memoryLimit = isLowEnd ? 512 : 1024;
    config.performanceProfile = isLowEnd ? "low" : "high";
    config.recommendedEffects = isLowEnd ? ["blur", "emoji"] : ["blur", "emoji", "combined"];
  } else if (Platform.OS === "android") {
    config.supportsSkia = true;
    config.supportsVisionCamera = !IS_EXPO_GO;
    config.supportsFaceDetection = !IS_EXPO_GO;
    config.supportsEmojiRendering = true;
    config.recommendedMaxFPS = isLowEnd ? 24 : 30;
    config.recommendedMaxResolution = isLowEnd
      ? { width: 1280, height: 720 }
      : isTablet
        ? { width: 1920, height: 1080 }
        : { width: 1920, height: 1080 };
    config.memoryLimit = isLowEnd ? 256 : 512;
    config.performanceProfile = isLowEnd ? "low" : "medium";
    config.recommendedEffects = isLowEnd ? ["blur"] : ["blur", "emoji"];
  } else if (Platform.OS === "web") {
    config.supportsSkia = false; // Skia not fully supported on web
    config.supportsVisionCamera = false; // Vision Camera not supported on web
    config.supportsFaceDetection = false; // Face detection not supported on web
    config.supportsEmojiRendering = true; // Basic emoji rendering supported
    config.recommendedMaxFPS = 30;
    config.recommendedMaxResolution = { width: 1280, height: 720 };
    config.memoryLimit = 256;
    config.performanceProfile = "low";
    config.recommendedEffects = ["emoji"]; // Only emoji overlay on web
  }

  return config;
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  // Check memory (if available)
  if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
    const memoryGB = (navigator as any).deviceMemory;
    if (memoryGB < 4) return true;
  }

  // Check hardware concurrency (CPU cores)
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    const cores = navigator.hardwareConcurrency;
    if (cores < 4) return true;
  }

  // Check screen resolution
  const { width, height } = Dimensions.get("window");
  const totalPixels = width * height;
  if (totalPixels < 1280 * 720) return true;

  // Platform-specific checks
  if (Platform.OS === "android") {
    // Android-specific low-end checks
    return false; // TODO: Implement Android-specific checks
  } else if (Platform.OS === "ios") {
    // iOS-specific low-end checks
    return false; // TODO: Implement iOS-specific checks
  }

  return false;
}

/**
 * Check if device is a tablet
 */
export function isTabletDevice(): boolean {
  const { width, height } = Dimensions.get("window");
  const aspectRatio = Math.max(width, height) / Math.min(width, height);

  // Tablet typically has aspect ratio closer to 4:3 or 16:10
  // and larger screen size
  const minDimension = Math.min(width, height);
  return minDimension >= 768 && aspectRatio < 1.8;
}

/**
 * Get recommended settings for current platform
 */
export function getRecommendedSettings() {
  const config = getPlatformConfig();

  return {
    maxFPS: config.recommendedMaxFPS,
    maxResolution: config.recommendedMaxResolution,
    enableBlur: config.recommendedEffects.includes("blur"),
    enableEmoji: config.recommendedEffects.includes("emoji"),
    enableCombined: config.recommendedEffects.includes("combined"),
    blurIntensity: config.performanceProfile === "low" ? 15 : 25,
    emojiScale: config.performanceProfile === "low" ? 1.2 : 1.5,
    emojiOpacity: config.performanceProfile === "low" ? 0.8 : 0.9,
    maxRecordingDuration: config.performanceProfile === "low" ? 30 : 60, // seconds
  };
}

/**
 * Test platform compatibility
 */
export async function testPlatformCompatibility(): Promise<{
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const config = getPlatformConfig();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check if running in Expo Go
  if (IS_EXPO_GO) {
    issues.push("Running in Expo Go - native features not available");
    recommendations.push("Build with 'npx expo run:ios' or 'npx expo run:android' for full functionality");
    return {
      isCompatible: false,
      issues,
      recommendations,
    };
  }

  // Check Vision Camera support
  if (!config.supportsVisionCamera) {
    issues.push("Vision Camera not supported on this platform");
  }

  // Check face detection support
  if (!config.supportsFaceDetection) {
    issues.push("Face detection not supported on this platform");
    recommendations.push("Consider using manual emoji positioning");
  }

  // Check Skia support
  if (!config.supportsSkia) {
    issues.push("Skia not supported on this platform");
    recommendations.push("Consider using fallback rendering methods");
  }

  // Check memory
  if (isLowEndDevice()) {
    issues.push("Low memory device detected");
    recommendations.push("Use lower resolution and simpler effects");
  }

  // Platform-specific tests
  if (Platform.OS === "android") {
    try {
      // Test Android-specific functionality
      const visionCamera = await import("react-native-vision-camera");
      const devices = await visionCamera.Camera.getAvailableCameraDevices();

      if (devices.length === 0) {
        issues.push("No camera devices found");
      }
    } catch (error) {
      issues.push(`Vision Camera test failed: ${error}`);
    }
  } else if (Platform.OS === "ios") {
    try {
      // Test iOS-specific functionality
      const visionCamera = await import("react-native-vision-camera");
      const devices = await visionCamera.Camera.getAvailableCameraDevices();

      if (devices.length === 0) {
        issues.push("No camera devices found");
      }
    } catch (error) {
      issues.push(`Vision Camera test failed: ${error}`);
    }
  }

  const isCompatible = issues.length === 0;

  return {
    isCompatible,
    issues,
    recommendations,
  };
}

/**
 * Get platform-specific error messages
 */
export function getPlatformErrorMessage(error: any): string {
  if (Platform.OS === "ios") {
    if (error.message?.includes("Vision Camera")) {
      return "Camera access is required. Please check your iOS settings.";
    } else if (error.message?.includes("Skia")) {
      return "Graphics processing failed. Please try restarting the app.";
    }
  } else if (Platform.OS === "android") {
    if (error.message?.includes("Vision Camera")) {
      return "Camera access is required. Please check your Android permissions.";
    } else if (error.message?.includes("Skia")) {
      return "Graphics processing failed. Please try restarting the app.";
    }
  } else if (Platform.OS === "web") {
    if (error.message?.includes("getUserMedia")) {
      return "Camera access is required. Please allow camera access in your browser.";
    } else if (error.message?.includes("Skia")) {
      return "Advanced graphics not supported in your browser.";
    }
  }

  return error.message || "An unknown error occurred.";
}

/**
 * Optimize settings for current platform
 */
export function optimizeSettingsForPlatform(settings: any): any {
  const config = getPlatformConfig();
  const optimized = { ...settings };

  // Adjust FPS based on platform
  if (optimized.maxFPS > config.recommendedMaxFPS) {
    optimized.maxFPS = config.recommendedMaxFPS;
  }

  // Adjust resolution based on platform
  if (
    optimized.maxResolution.width > config.recommendedMaxResolution.width ||
    optimized.maxResolution.height > config.recommendedMaxResolution.height
  ) {
    optimized.maxResolution = config.recommendedMaxResolution;
  }

  // Adjust effects based on platform
  if (!config.supportsFaceDetection) {
    optimized.enableFaceDetection = false;
  }

  if (!config.supportsEmojiRendering) {
    optimized.enableEmoji = false;
  }

  if (!config.supportsSkia) {
    optimized.enableSkia = false;
  }

  // Adjust performance settings for low-end devices
  if (config.performanceProfile === "low") {
    optimized.blurIntensity = Math.min(optimized.blurIntensity || 25, 15);
    optimized.emojiScale = Math.min(optimized.emojiScale || 1.5, 1.2);
    optimized.emojiOpacity = Math.min(optimized.emojiOpacity || 0.9, 0.8);
  }

  return optimized;
}

export default {
  getPlatformConfig,
  isLowEndDevice,
  isTabletDevice,
  getRecommendedSettings,
  testPlatformCompatibility,
  getPlatformErrorMessage,
  optimizeSettingsForPlatform,
};
