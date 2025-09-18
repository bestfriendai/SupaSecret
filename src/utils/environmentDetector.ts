/**
 * Advanced Environment Detection for September 2025
 * Detects Expo Go, Development Builds, Production, and feature availability
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

export interface EnvironmentInfo {
  // Build types
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  isProductionBuild: boolean;
  isStandaloneBuild: boolean;

  // Platform info
  platform: "ios" | "android" | "web";
  platformVersion: string;
  deviceType: "phone" | "tablet" | "desktop" | "tv" | "unknown";

  // Feature availability
  features: {
    // Core features
    camera: boolean;
    microphone: boolean;
    notifications: boolean;
    backgroundTasks: boolean;

    // Native modules
    ffmpeg: boolean;
    revenueCat: boolean;
    admob: boolean;
    mlKit: boolean;
    visionCamera: boolean;

    // Processing capabilities
    videoProcessing: boolean;
    audioProcessing: boolean;
    imageManipulation: boolean;

    // Storage
    secureStore: boolean;
    mmkv: boolean;
    sqlite: boolean;
  };

  // SDK info
  expoVersion: string;
  sdkVersion: string;
  reactNativeVersion: string;

  // App info
  appVersion: string;
  buildNumber: string;
  bundleIdentifier: string;

  // Debug info
  isDebug: boolean;
  isDevice: boolean;
  isEmulator: boolean;
}

class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private cachedInfo: EnvironmentInfo | null = null;

  static getInstance(): EnvironmentDetector {
    if (!this.instance) {
      this.instance = new EnvironmentDetector();
    }
    return this.instance;
  }

  /**
   * Get comprehensive environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const appOwnership = Constants.appOwnership;
    const isExpoGo = appOwnership === "expo";
    const isDevelopmentBuild = appOwnership === null;
    const isStandaloneBuild = appOwnership === ("standalone" as any);
    const isProductionBuild = !__DEV__ && isStandaloneBuild;

    // Detect device type
    let deviceType: "phone" | "tablet" | "desktop" | "tv" | "unknown" = "unknown";
    if (Device.deviceType === Device.DeviceType.PHONE) {
      deviceType = "phone";
    } else if (Device.deviceType === Device.DeviceType.TABLET) {
      deviceType = "tablet";
    } else if (Device.deviceType === Device.DeviceType.DESKTOP) {
      deviceType = "desktop";
    } else if (Device.deviceType === Device.DeviceType.TV) {
      deviceType = "tv";
    }

    const info: EnvironmentInfo = {
      // Build types
      isExpoGo,
      isDevelopmentBuild,
      isProductionBuild,
      isStandaloneBuild,

      // Platform info
      platform: Platform.OS as "ios" | "android" | "web",
      platformVersion: Platform.Version?.toString() || "unknown",
      deviceType,

      // Feature availability
      features: {
        // Core features - available in all environments
        camera: true,
        microphone: true,
        notifications: !isExpoGo || Platform.OS !== "web",
        backgroundTasks: !isExpoGo,

        // Native modules - only in dev/production builds
        ffmpeg: !isExpoGo,
        revenueCat: !isExpoGo,
        admob: !isExpoGo,
        mlKit: !isExpoGo && Platform.OS !== "web",
        visionCamera: !isExpoGo && Platform.OS !== "web",

        // Processing capabilities
        videoProcessing: !isExpoGo, // Full processing only in dev builds
        audioProcessing: !isExpoGo,
        imageManipulation: true, // Available via Expo ImageManipulator

        // Storage
        secureStore: Platform.OS !== "web",
        mmkv: !isExpoGo,
        sqlite: true, // Available via expo-sqlite
      },

      // SDK info
      expoVersion: Constants.expoConfig?.version || "unknown",
      sdkVersion: Constants.expoConfig?.sdkVersion || "unknown",
      reactNativeVersion: (Constants.expoConfig?.runtimeVersion as string) || "unknown",

      // App info
      appVersion: Constants.expoConfig?.version || "1.0.0",
      buildNumber:
        Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || "1",
      bundleIdentifier:
        Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || "unknown",

      // Debug info
      isDebug: __DEV__,
      isDevice: Device.isDevice ?? true,
      isEmulator: !Device.isDevice,
    };

    this.cachedInfo = info;
    return info;
  }

  /**
   * Check if a specific feature is available
   */
  isFeatureAvailable(feature: keyof EnvironmentInfo["features"]): boolean {
    const info = this.getEnvironmentInfo();
    return info.features[feature] ?? false;
  }

  /**
   * Get a feature with fallback behavior
   */
  async getFeature<T>(
    feature: keyof EnvironmentInfo["features"],
    loadNativeModule: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    if (this.isFeatureAvailable(feature)) {
      try {
        return await loadNativeModule();
      } catch (error) {
        if (__DEV__) {
          console.warn(`Failed to load native module for ${feature}:`, error);
        }
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Log environment info for debugging
   */
  logEnvironmentInfo(): void {
    const info = this.getEnvironmentInfo();

    console.log("📱 Environment Information:");
    console.log("================================");
    console.log(
      `Build Type: ${info.isExpoGo ? "Expo Go" : info.isDevelopmentBuild ? "Development Build" : "Production"}`,
    );
    console.log(`Platform: ${info.platform} ${info.platformVersion}`);
    console.log(`Device: ${info.deviceType} (${info.isEmulator ? "Emulator" : "Physical Device"})`);
    console.log(`SDK Version: ${info.sdkVersion}`);
    console.log(`App Version: ${info.appVersion} (${info.buildNumber})`);
    console.log("");
    console.log("Available Features:");
    Object.entries(info.features).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? "✅" : "❌"}`);
    });
    console.log("================================");
  }

  /**
   * Reset cached information
   */
  resetCache(): void {
    this.cachedInfo = null;
  }
}

// Export singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();

// Export convenience functions
export const isExpoGo = () => environmentDetector.getEnvironmentInfo().isExpoGo;
export const isDevelopmentBuild = () => environmentDetector.getEnvironmentInfo().isDevelopmentBuild;
export const isProductionBuild = () => environmentDetector.getEnvironmentInfo().isProductionBuild;
export const isFeatureAvailable = (feature: keyof EnvironmentInfo["features"]) =>
  environmentDetector.isFeatureAvailable(feature);

// Feature-specific checks
export const hasFFmpeg = () => environmentDetector.isFeatureAvailable("ffmpeg");
export const hasRevenueCat = () => environmentDetector.isFeatureAvailable("revenueCat");
export const hasAdMob = () => environmentDetector.isFeatureAvailable("admob");
export const hasVideoProcessing = () => environmentDetector.isFeatureAvailable("videoProcessing");

// Platform-specific checks
export const isIOS = () => Platform.OS === "ios";
export const isAndroid = () => Platform.OS === "android";
export const isWeb = () => Platform.OS === "web";

// Helper to load modules with automatic fallback
export async function loadNativeModule<T>(moduleName: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  if (isExpoGo()) {
    if (__DEV__) {
      console.log(`📱 ${moduleName} not available in Expo Go, using fallback`);
    }
    return fallback;
  }

  try {
    const module = await loader();
    if (__DEV__) {
      console.log(`✅ ${moduleName} loaded successfully`);
    }
    return module;
  } catch (error) {
    if (__DEV__) {
      console.warn(`⚠️ Failed to load ${moduleName}, using fallback:`, error);
    }
    return fallback;
  }
}

// Type is already exported at the interface declaration
