/**
 * Service Initializer
 * Coordinates initialization of all production services
 */

import Constants from "expo-constants";
import { getConfig, validateProductionConfig, isFeatureEnabled } from "../config/production";
import { AdMobService } from "./AdMobService";
import { RevenueCatService } from "./RevenueCatService";
import { getAnonymiser } from "./Anonymiser";
import { initializeConsent } from "../state/consentStore";

const IS_EXPO_GO = Constants.appOwnership === "expo";
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

    // Initialize AdMob
    if (isFeatureEnabled("ENABLE_ANALYTICS")) {
      try {
        await AdMobService.initialize();
        result.initializedServices.push("AdMob");
        console.log("✅ AdMob initialized");
      } catch (error) {
        const errorMsg = `AdMob initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        if (IS_EXPO_GO) {
          result.warnings.push(errorMsg);
        } else {
          result.errors.push(errorMsg);
        }
        console.error("❌", errorMsg);
      }
    }

    // Initialize RevenueCat
    try {
      await RevenueCatService.initialize();
      result.initializedServices.push("RevenueCat");
      console.log("✅ RevenueCat initialized");
    } catch (error) {
      const errorMsg = `RevenueCat initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      if (IS_EXPO_GO) {
        result.warnings.push(errorMsg);
      } else {
        result.errors.push(errorMsg);
      }
      console.error("❌", errorMsg);
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
        console.log("✅ Push notifications initialized");
      } catch (error) {
        const errorMsg = `Push notifications initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        result.warnings.push(errorMsg);
        console.warn("⚠️", errorMsg);
      }
    }

    this.isInitialized = true;
    this.initializationResult = result;

    // Log summary
    console.log("🎯 Service initialization complete:");
    console.log(`✅ Initialized: ${result.initializedServices.join(", ")}`);
    if (result.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${result.warnings.length}`);
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
      // Initialize Firebase Analytics if configured and available
      if (config.ANALYTICS.FIREBASE_CONFIG) {
        try {
          // Dynamic import with error handling for missing package
          const analyticsModule = await import("@react-native-firebase/analytics");
          const analytics = analyticsModule.default;
          await analytics().setAnalyticsCollectionEnabled(true);
          console.log("🚀 Firebase Analytics initialized");
        } catch (firebaseError) {
          console.log("📊 Firebase Analytics not available, skipping");
        }
      }

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

    try {
      // Initialize Sentry if configured and available
      if (config.SENTRY.DSN && config.SENTRY.ENVIRONMENT) {
        try {
          const Sentry = await import("@sentry/react-native");
          Sentry.init({
            dsn: config.SENTRY.DSN,
            environment: config.SENTRY.ENVIRONMENT,
            debug: config.SENTRY.DEBUG,
          });
          console.log("🚀 Sentry crash reporting initialized");
        } catch (sentryError) {
          console.log("📊 Sentry not available, skipping crash reporting");
        }
      } else {
        console.log("📊 Sentry configuration incomplete, skipping crash reporting");
      }

      // Initialize Firebase Crashlytics if available
      try {
        const crashlyticsModule = await import("@react-native-firebase/crashlytics");
        const crashlytics = crashlyticsModule.default;
        await crashlytics().setCrashlyticsCollectionEnabled(true);
        console.log("🚀 Firebase Crashlytics initialized");
      } catch (firebaseError) {
        console.log("📊 Firebase Crashlytics not available, skipping");
      }
    } catch (error) {
      console.warn("Crash reporting initialization failed:", error);
      // Don't throw error - continue without crash reporting
    }
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
