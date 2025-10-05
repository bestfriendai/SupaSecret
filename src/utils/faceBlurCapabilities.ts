/**
 * Face Blur Capabilities Detection
 * Detects if the device/app can support real-time face blur
 */

import { Platform } from "react-native";
import { IS_EXPO_GO } from "./environmentCheck";

export interface FaceBlurCapabilities {
  canUseFrameProcessor: boolean;
  canUseSkia: boolean;
  canUseFaceDetection: boolean;
  canUseRealTimeBlur: boolean;
  reason: string;
}

let cachedCapabilities: FaceBlurCapabilities | null = null;

/**
 * Detect if real-time face blur is available
 */
export const detectFaceBlurCapabilities = async (): Promise<FaceBlurCapabilities> => {
  // Return cached result if available
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const capabilities: FaceBlurCapabilities = {
    canUseFrameProcessor: false,
    canUseSkia: false,
    canUseFaceDetection: false,
    canUseRealTimeBlur: false,
    reason: "Unknown",
  };

  // Check 1: Not Expo Go
  if (IS_EXPO_GO) {
    capabilities.reason = "Expo Go does not support frame processors";
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Check 2: Platform support
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    capabilities.reason = `Platform ${Platform.OS} not supported`;
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Check 3: VisionCamera available
  try {
    const visionCamera = require("react-native-vision-camera");
    if (!visionCamera.Camera) {
      capabilities.reason = "VisionCamera not available";
      cachedCapabilities = capabilities;
      return capabilities;
    }
    capabilities.canUseFrameProcessor = true;
  } catch (e) {
    capabilities.reason = "VisionCamera not installed";
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Check 4: Skia available
  try {
    const skia = require("@shopify/react-native-skia");
    if (!skia.Skia) {
      capabilities.reason = "Skia not available";
      cachedCapabilities = capabilities;
      return capabilities;
    }
    capabilities.canUseSkia = true;
  } catch (e) {
    capabilities.reason = "Skia not installed";
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Check 5: Face detector available
  try {
    const faceDetector = require("react-native-vision-camera-face-detector");
    if (!faceDetector.useFaceDetector) {
      capabilities.reason = "Face detector not available";
      cachedCapabilities = capabilities;
      return capabilities;
    }
    capabilities.canUseFaceDetection = true;
  } catch (e) {
    capabilities.reason = "Face detector not installed";
    cachedCapabilities = capabilities;
    return capabilities;
  }

  // Check 6: New Architecture (best effort detection)
  // Note: There's no reliable runtime check for New Architecture
  // We'll assume it's available if all other checks pass
  // The actual test is when we try to use useSkiaFrameProcessor

  capabilities.canUseRealTimeBlur = true;
  capabilities.reason = "All capabilities available";
  cachedCapabilities = capabilities;
  return capabilities;
};

/**
 * Clear cached capabilities (for testing)
 */
export const clearCapabilitiesCache = () => {
  cachedCapabilities = null;
};

/**
 * Quick check if real-time blur is available
 */
export const canUseRealTimeBlur = async (): Promise<boolean> => {
  const capabilities = await detectFaceBlurCapabilities();
  return capabilities.canUseRealTimeBlur;
};
