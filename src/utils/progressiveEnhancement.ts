/**
 * Progressive Enhancement System
 *
 * This utility provides capability detection and graceful degradation
 * for features that require native modules or advanced hardware.
 */

import React, { useState, useEffect, useCallback } from "react";
import Constants from "expo-constants";
import { IS_EXPO_GO } from "./environmentCheck";
import { Platform } from "react-native";
import Device from "expo-device";

// Define capability interfaces
export interface DeviceCapabilities {
  hasVisionAPI: boolean;
  hasAudioProcessing: boolean;
  hasSpeechRecognition: boolean;
  hasGPUAcceleration: boolean;
  hasHighPerformanceCPU: boolean;
  hasAdvancedCamera: boolean;
  hasVideoProcessing: boolean;
  hasFaceDetection: boolean;
  hasVoiceModulation: boolean;
  platform: string;
  deviceType: string;
}

export interface FeatureFallbacks {
  faceBlur: () => React.ComponentType<any>;
  voiceChange: () => React.ComponentType<any>;
  liveCaptions: () => React.ComponentType<any>;
  advancedCamera: () => React.ComponentType<any>;
  videoEditor: () => React.ComponentType<any>;
}

/**
 * Detect device capabilities for progressive enhancement
 */
export const detectCapabilities = async (): Promise<DeviceCapabilities> => {
  const deviceType = await Device.getDeviceTypeAsync();
  const platform = Platform.OS;

  const capabilities: DeviceCapabilities = {
    hasVisionAPI: !IS_EXPO_GO,
    hasAudioProcessing: !IS_EXPO_GO,
    hasSpeechRecognition: !IS_EXPO_GO,
    hasGPUAcceleration: !IS_EXPO_GO,
    hasHighPerformanceCPU: deviceType === Device.DeviceType.TABLET || deviceType === Device.DeviceType.DESKTOP,
    hasAdvancedCamera: !IS_EXPO_GO,
    hasVideoProcessing: !IS_EXPO_GO,
    hasFaceDetection: !IS_EXPO_GO,
    hasVoiceModulation: !IS_EXPO_GO,
    platform,
    deviceType: Device.DeviceType[deviceType] || "UNKNOWN",
  };

  if (__DEV__) {
    console.log("🔍 Device Capabilities Detected:", capabilities);
  }

  return capabilities;
};

/**
 * Get fallback UI components for unsupported features
 */
export const getFallbackUI = (feature: keyof FeatureFallbacks): React.ComponentType<any> => {
  const fallbacks: FeatureFallbacks = {
    faceBlur: () => require("../components/fallbacks/ServerProcessingNotice").default,
    voiceChange: () => require("../components/fallbacks/BasicAudioControls").default,
    liveCaptions: () => require("../components/fallbacks/TextInputFallback").default,
    advancedCamera: () => require("../components/fallbacks/BasicCameraControls").default,
    videoEditor: () => require("../components/fallbacks/SimpleVideoEditor").default,
  };

  try {
    return fallbacks[feature]();
  } catch (error) {
    console.warn(`Fallback component for ${feature} not found, using default`);
    return require("../components/fallbacks/FeatureUnavailableNotice").default;
  }
};

/**
 * Hook for using progressive enhancement in components
 */
export const useProgressiveEnhancement = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCapabilities().then((caps) => {
      setCapabilities(caps);
      setLoading(false);
    });
  }, []);

  const getComponent = useCallback(
    <T extends React.ComponentType<any>>(
      advancedComponent: T,
      feature: keyof FeatureFallbacks,
    ): T | React.ComponentType<any> => {
      if (loading || !capabilities) {
        return getFallbackUI(feature);
      }

      // Map features to capabilities
      const featureCapabilityMap: Record<
        keyof FeatureFallbacks,
        keyof Pick<
          DeviceCapabilities,
          | "hasFaceDetection"
          | "hasVoiceModulation"
          | "hasSpeechRecognition"
          | "hasAdvancedCamera"
          | "hasVideoProcessing"
        >
      > = {
        faceBlur: "hasFaceDetection",
        voiceChange: "hasVoiceModulation",
        liveCaptions: "hasSpeechRecognition",
        advancedCamera: "hasAdvancedCamera",
        videoEditor: "hasVideoProcessing",
      };

      const requiredCapability = featureCapabilityMap[feature];
      const booleanCapabilities = capabilities as Pick<
        DeviceCapabilities,
        "hasFaceDetection" | "hasVoiceModulation" | "hasSpeechRecognition" | "hasAdvancedCamera" | "hasVideoProcessing"
      >;
      return booleanCapabilities[requiredCapability] ? advancedComponent : getFallbackUI(feature);
    },
    [capabilities, loading],
  );

  return {
    capabilities,
    loading,
    getComponent,
    isFeatureAvailable: (feature: keyof DeviceCapabilities) => capabilities?.[feature] ?? false,
  };
};

// Singleton instance for global access
let globalCapabilities: DeviceCapabilities | null = null;

export const getGlobalCapabilities = async (): Promise<DeviceCapabilities> => {
  if (!globalCapabilities) {
    globalCapabilities = await detectCapabilities();
  }
  return globalCapabilities;
};

export const isFeatureGloballyAvailable = (feature: keyof DeviceCapabilities): boolean => {
  const value = globalCapabilities?.[feature];
  return typeof value === "boolean" ? value : false;
};
