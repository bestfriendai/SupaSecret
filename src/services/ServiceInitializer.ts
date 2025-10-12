/**
 * Service Initializer
 * Coordinates initialization of all production services
 */

import Constants from "expo-constants";
import { getConfig, validateProductionConfig, isFeatureEnabled } from "../config/production";
import { validateAdMobConfig, validateRevenueCatConfig } from "../utils/environmentValidation";
import { AdMobService } from "./AdMobService";
import { RevenueCatService } from "./RevenueCatService";
import { getAnonymiser } from "./Anonymiser";
import { initializeConsent } from "../state/consentStore";

const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
const config = getConfig();

export interface ServiceInitializationOptions {
  strictConfigValidation?: boolean;
}

export interface ServiceInitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  initializedServices: string[];
}

export class ServiceInitializer {
  private static isInitialized = false;
  private static initializationResult: ServiceInitializationResult | null = null;

  static async initializeAllServices(options: ServiceInitializationOptions = {}): Promise<ServiceInitializationResult> {
    if (this.isInitialized && this.initializationResult) {
      return this.initializationResult;
    }

    const result: ServiceInitializationResult = {
      success: true,
      errors: [],
      warnings: [],
      initializedServices: [],
    };

    console.log("🚀 Starting service initialization...");

    // Validate production configuration
    const { strictConfigValidation = false } = options;
    const configValidation = validateProductionConfig();

    if (!configValidation.isValid && (!__DEV__ || strictConfigValidation)) {
      result.errors.push(`Missing production configuration: ${configValidation.missingKeys.join(", ")}`);
      result.success = false;
    } else if (!configValidation.isValid) {
      result.warnings.push(`Development mode: Missing production keys: ${configValidation.missingKeys.join(", ")}`);
    }

    // Additional runtime validations for AdMob and RevenueCat
    let adMobRes: ReturnType<typeof validateAdMobConfig> | null = null;
    let revCatRes: ReturnType<typeof validateRevenueCatConfig> | null = null;
    try {
      adMobRes = validateAdMobConfig();
      revCatRes = validateRevenueCatConfig();
      const pushIssues = (prefix: string, res: ReturnType<typeof validateAdMobConfig>) => {
        for (const issue of res.issues) {
          const msg = `${prefix}: [${issue.severity}] ${issue.key} - ${issue.message}`;
          if (!__DEV__ || strictConfigValidation) {
            // Treat high/critical as errors in production/strict mode
            if (issue.severity === "critical" || issue.severity === "high") result.errors.push(msg);
            else result.warnings.push(msg);
          } else {
            result.warnings.push(msg);
          }
        }
      };
      pushIssues("AdMob config", adMobRes);
      pushIssues("RevenueCat config", revCatRes);
    } catch (e) {
      if (__DEV__) console.warn("Validation checks failed:", e);
    }

    // Initialize consent system first
    try {
      await initializeConsent();
      result.initializedServices.push("Consent Management");
      console.log("✅ Consent system initialized");
    } catch (error) {
      const errorMsg = `Consent initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      console.error("❌", errorMsg);
    }

    // Initialize App Tracking Transparency (ATT) - REQUIRED for iOS 14.5+
    try {
      const { TrackingService } = await import("./TrackingService");
      const trackingService = TrackingService.getInstance();

      // Check if we should request permission
      const shouldRequest = await trackingService.shouldRequestPermission();
      if (shouldRequest) {
        console.log("📱 Requesting App Tracking Transparency permission...");
        const result = await trackingService.requestTrackingPermission();
        console.log("✅ ATT Permission Status:", result.status);
      } else {
        const status = await trackingService.getTrackingStatus();
        console.log("✅ ATT Status (already determined):", status.status);
      }
      result.initializedServices.push("App Tracking Transparency");
    } catch (error) {
      const errorMsg = `ATT initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      console.error("❌", errorMsg);
    }

    // Initialize AdMob (gated behind ENABLE_ADS) and skip on critical validation errors
    if (isFeatureEnabled("ENABLE_ADS")) {
      const adMobHasCritical = adMobRes?.issues?.some((i) => i.severity === "critical");
      if (adMobHasCritical) {
        const msg = "AdMob initialization skipped due to critical configuration errors";
        result.warnings.push(msg);
        console.warn(`⚠️ ${msg}`);
      } else {
        try {
          await AdMobService.initialize();
          result.initializedServices.push("AdMob");
          if (__DEV__) {
            console.log("✅ AdMob initialized");
          }
        } catch (error) {
          const errorMsg = `AdMob initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          if (IS_EXPO_GO) {
            result.warnings.push(errorMsg);
          } else {
            result.errors.push(errorMsg);
          }
          if (__DEV__) {
            console.error("❌", errorMsg);
          }
        }
      }
    }

    // Initialize RevenueCat (skip on critical validation errors)
    const revHasCritical = revCatRes?.issues?.some((i) => i.severity === "critical");
    if (revHasCritical) {
      const msg = "RevenueCat initialization skipped due to critical configuration errors";
      result.warnings.push(msg);
      console.warn(`⚠️ ${msg}`);
    } else {
      try {
        await RevenueCatService.initialize();
        result.initializedServices.push("RevenueCat");
        console.log("✅ RevenueCat initialized");
        // Restore purchases on launch (no-op in Expo Go per service implementation)
        try {
          await RevenueCatService.restorePurchases();
          console.log("✅ RevenueCat purchases restored on launch");
        } catch (e) {
          console.warn("RevenueCat restore on launch failed:", e);
        }
      } catch (error) {
        const errorMsg = `RevenueCat initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (IS_EXPO_GO) {
          result.warnings.push(errorMsg);
        } else {
          result.errors.push(errorMsg);
        }
        console.error("❌", errorMsg);
      }
    }

    // Initialize Video Processing
    if (isFeatureEnabled("ENABLE_ADVANCED_VIDEO_PROCESSING")) {
      try {
        const anonymiser = await getAnonymiser();
        await anonymiser.initialize();
        result.initializedServices.push("Video Processing");
        console.log("✅ Video processing initialized");
      } catch (error) {
        const errorMsg = `Video processing initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (IS_EXPO_GO) {
          result.warnings.push(errorMsg);
        } else {
          result.errors.push(errorMsg);
        }
        console.error("❌", errorMsg);
      }
    }

    // Initialize Analytics (if enabled)
    if (isFeatureEnabled("ENABLE_ANALYTICS")) {
      try {
        await this.initializeAnalytics();
        result.initializedServices.push("Analytics");
        console.log("✅ Analytics initialized");
      } catch (error) {
        const errorMsg = `Analytics initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.warnings.push(errorMsg);
        console.warn("⚠️", errorMsg);
      }
    }

    // Initialize Crash Reporting (if enabled)
    if (isFeatureEnabled("ENABLE_CRASH_REPORTING")) {
      try {
        await this.initializeCrashReporting();
        result.initializedServices.push("Crash Reporting");
        console.log("✅ Crash reporting initialized");
      } catch (error) {
        const errorMsg = `Crash reporting initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.warnings.push(errorMsg);
        console.warn("⚠️", errorMsg);
      }
    }

    // Initialize Push Notifications (if enabled)
    if (isFeatureEnabled("ENABLE_PUSH_NOTIFICATIONS")) {
      try {
        await this.initializePushNotifications();
        result.initializedServices.push("Push Notifications");
        if (__DEV__) {
          console.log("✅ Push notifications initialized");
        }
      } catch (error) {
        const errorMsg = `Push notifications initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.warnings.push(errorMsg);
        if (__DEV__) {
          console.warn("⚠️", errorMsg);
        }
      }
    }

    this.isInitialized = true;
    this.initializationResult = result;

    // Log summary
    if (__DEV__) {
      console.log("🎯 Service initialization complete:");
      console.log(`✅ Initialized: ${result.initializedServices.join(", ")}`);
      if (result.warnings.length > 0) {
        console.log(`⚠️ Warnings: ${result.warnings.length}`);
      }
    }
    if (result.errors.length > 0) {
      console.log(`❌ Errors: ${result.errors.length}`);
      result.success = false;
    }

    return result;
  }

  private static async initializeAnalytics(): Promise<void> {
    if (IS_EXPO_GO) {
      console.log("🎯 Analytics demo mode (Expo Go)");
      return;
    }

    try {
      // Analytics initialization removed - Firebase not needed

      // Initialize other analytics services as needed
      console.log("🚀 Analytics services initialized");
    } catch (error) {
      console.warn("Analytics initialization failed, continuing without analytics:", error);
    }
  }

  private static async initializeCrashReporting(): Promise<void> {
    if (IS_EXPO_GO) {
      console.log("🎯 Crash reporting demo mode (Expo Go)");
      return;
    }

    // Crash reporting removed - Sentry not needed
    console.log("📊 Crash reporting disabled");
  }

  private static async initializePushNotifications(): Promise<void> {
    if (IS_EXPO_GO) {
      console.log("🎯 Push notifications demo mode (Expo Go)");
      return;
    }

    try {
      // Initialize push notification service if available
      const pushModule = await import("../utils/pushNotifications");
      const pushNotificationManager = pushModule.pushNotificationManager;
      await (pushNotificationManager as any)?.initialize?.();
      console.log("🚀 Push notifications initialized");
    } catch (error) {
      console.warn("Push notifications initialization failed:", error);
      // Don't throw error - continue without push notifications
    }
  }

  // Get initialization status
  static getInitializationResult(): ServiceInitializationResult | null {
    return this.initializationResult;
  }

  // Check if a specific service was initialized successfully
  static isServiceInitialized(serviceName: string): boolean {
    return this.initializationResult?.initializedServices.includes(serviceName) || false;
  }

  // Reinitialize services (useful for testing or after configuration changes)
  static async reinitialize(): Promise<ServiceInitializationResult> {
    this.isInitialized = false;
    this.initializationResult = null;
    return this.initializeAllServices();
  }
}

// Export convenience function
export const initializeServices = () => ServiceInitializer.initializeAllServices();
export const getServiceStatus = () => ServiceInitializer.getInitializationResult();
export const isServiceReady = (serviceName: string) => ServiceInitializer.isServiceInitialized(serviceName);
