/**
 * Production Configuration
 * Replace these values with your actual production keys and IDs
 */

import { Platform } from "react-native";

// Helper function to get environment variables with validation
const getEnvVar = (name: string, options: { required?: boolean; default?: string | null } = {}): string | null => {
  const { required = false, default: defaultValue = null } = options;
  const value = process.env[name];

  if (!value || value.trim() === "") {
    if (required) {
      console.error(`❌ Required environment variable ${name} is not set`);
      if (!__DEV__) {
        throw new Error(`Missing required environment variable: ${name}`);
      }
    }
    return defaultValue;
  }

  // Check for placeholder values
  const placeholderPatterns = ["YOUR_", "PLACEHOLDER", "EXAMPLE_", "TEST_", "DEMO_"];
  const hasPlaceholder = placeholderPatterns.some((pattern) => value.includes(pattern));

  if (hasPlaceholder) {
    if (required) {
      console.error(`❌ Environment variable ${name} contains placeholder value: ${value}`);
      if (!__DEV__) {
        throw new Error(`Environment variable ${name} has placeholder value in production`);
      }
    } else {
      console.warn(`⚠️ Environment variable ${name} contains placeholder value: ${value}`);
    }
    return defaultValue;
  }

  return value;
};

export const PRODUCTION_CONFIG = {
  // AdMob Configuration
  ADMOB: {
    APP_ID: Platform.select({
      ios: getEnvVar("EXPO_PUBLIC_ADMOB_IOS_APP_ID", { required: true }),
      android: getEnvVar("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", { required: true }),
    }),
    AD_UNITS: {
      banner: Platform.select({
        ios: getEnvVar("EXPO_PUBLIC_ADMOB_BANNER_IOS", { default: "ca-app-pub-9512493666273460/3323132177" }),
        android: getEnvVar("EXPO_PUBLIC_ADMOB_BANNER_ANDROID", { default: "ca-app-pub-3940256099942544/6300978111" }),
      }),
      interstitial: Platform.select({
        ios: getEnvVar("EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS", { default: "ca-app-pub-9512493666273460/4444642155" }),
        android: getEnvVar("EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID", {
          default: "ca-app-pub-3940256099942544/1033173712",
        }),
      }),
      rewarded: Platform.select({
        ios: getEnvVar("EXPO_PUBLIC_ADMOB_REWARDED_IOS", { default: "ca-app-pub-9512493666273460/5566152133" }),
        android: getEnvVar("EXPO_PUBLIC_ADMOB_REWARDED_ANDROID", { default: "ca-app-pub-3940256099942544/5224354917" }),
      }),
    },
  },

  // RevenueCat Configuration
  REVENUECAT: {
    API_KEY: Platform.select({
      ios: getEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_KEY", { required: true }),
      android: getEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", { required: true }),
    }),
    ENTITLEMENTS: {
      PREMIUM: "premium",
    },
    PRODUCTS: {
      MONTHLY: "toxicconfessions_premium_monthly",
      YEARLY: "toxicconfessions_premium_yearly",
    },
  },

  // Analytics Configuration
  ANALYTICS: {
    // Google Analytics
    GOOGLE_ANALYTICS_ID: getEnvVar("EXPO_PUBLIC_GOOGLE_ANALYTICS_ID", { required: false }),
  },

  // Push Notifications
  PUSH_NOTIFICATIONS: {
    // OneSignal
    ONESIGNAL_APP_ID: getEnvVar("EXPO_PUBLIC_ONESIGNAL_APP_ID", { required: false }),
  },

  // External APIs
  EXTERNAL_APIS: {
    // Content moderation
    CONTENT_MODERATION_API_KEY: getEnvVar("EXPO_PUBLIC_CONTENT_MODERATION_API_KEY", { required: false }),

    // Speech-to-Text (if using cloud service)
    SPEECH_TO_TEXT_API_KEY: getEnvVar("EXPO_PUBLIC_SPEECH_TO_TEXT_API_KEY", { required: false }),

    // Translation service (if needed)
    TRANSLATION_API_KEY: getEnvVar("EXPO_PUBLIC_TRANSLATION_API_KEY", { required: false }),
  },

  // App Store Configuration
  APP_STORE: {
    IOS_APP_ID: getEnvVar("EXPO_PUBLIC_IOS_APP_ID", { required: false }),
    ANDROID_PACKAGE_NAME: getEnvVar("EXPO_PUBLIC_ANDROID_PACKAGE_NAME", {
      required: false,
      default: "com.toxic.confessions",
    }),

    // App Store Connect API (for analytics)
    APP_STORE_CONNECT_KEY_ID: getEnvVar("EXPO_PUBLIC_APP_STORE_CONNECT_KEY_ID", { required: false }),
    APP_STORE_CONNECT_ISSUER_ID: getEnvVar("EXPO_PUBLIC_APP_STORE_CONNECT_ISSUER_ID", { required: false }),
  },

  // Social Media Integration
  SOCIAL: {
    // Twitter API (if sharing features)
    TWITTER_API_KEY: getEnvVar("EXPO_PUBLIC_TWITTER_API_KEY", { required: false }),
    TWITTER_API_SECRET: getEnvVar("EXPO_PUBLIC_TWITTER_API_SECRET", { required: false }),

    // Instagram Basic Display (if needed)
    INSTAGRAM_APP_ID: getEnvVar("EXPO_PUBLIC_INSTAGRAM_APP_ID", { required: false }),
    INSTAGRAM_APP_SECRET: getEnvVar("EXPO_PUBLIC_INSTAGRAM_APP_SECRET", { required: false }),
  },

  // Legal URLs
  LEGAL: {
    PRIVACY_POLICY_URL: "https://toxicconfessions.app/privacy",
    TERMS_OF_SERVICE_URL: "https://toxicconfessions.app/terms",
    HELP_SUPPORT_URL: "https://toxicconfessions.app/help",
    CONTACT_URL: "https://toxicconfessions.app/contact",
  },

  // Feature Flags
  FEATURES: {
    ENABLE_ANALYTICS: false,
    ENABLE_ADS: true,
    ENABLE_CRASH_REPORTING: false,
    ENABLE_PUSH_NOTIFICATIONS: false,
    ENABLE_SOCIAL_SHARING: false,
    ENABLE_CONTENT_MODERATION: false,
    ENABLE_REAL_TIME_TRANSCRIPTION: false,
    ENABLE_ADVANCED_VIDEO_PROCESSING: false,
  },

  // Performance Configuration
  PERFORMANCE: {
    // Video processing
    MAX_VIDEO_DURATION_SECONDS: 60,
    MAX_VIDEO_FILE_SIZE_MB: 100,
    VIDEO_COMPRESSION_QUALITY: 0.8,

    // Image processing
    MAX_IMAGE_SIZE_MB: 10,
    IMAGE_COMPRESSION_QUALITY: 0.9,

    // Network
    API_TIMEOUT_MS: 30000,
    UPLOAD_TIMEOUT_MS: 120000,

    // Caching
    MAX_CACHE_SIZE_MB: 500,
    CACHE_EXPIRY_HOURS: 24,
  },

  // Security Configuration
  SECURITY: {
    // API rate limiting
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_UPLOADS_PER_HOUR: 10,

    // Content validation
    MAX_TEXT_LENGTH: 1000,
    BLOCKED_WORDS_CHECK: true,

    // Encryption
    ENABLE_END_TO_END_ENCRYPTION: false, // For future implementation
  },
};

// Environment-specific overrides
export const getConfig = () => {
  const config = { ...PRODUCTION_CONFIG };

  if (__DEV__) {
    // Development overrides
    config.PERFORMANCE.API_TIMEOUT_MS = 10000;
    config.SECURITY.MAX_REQUESTS_PER_MINUTE = 120;
  }

  return config;
};

// Validation function to ensure all required keys are set
export const validateProductionConfig = (): {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
} => {
  const missingKeys: string[] = [];
  const warnings: string[] = [];

  // Helper function to check if a value is valid
  const isValidValue = (value: any): boolean => {
    if (!value) return false;
    if (typeof value === "string") {
      return !value.includes("YOUR_") && !value.includes("PLACEHOLDER") && value.trim() !== "";
    }
    return true;
  };

  // Helper function to recursively check configuration values
  const checkConfigValue = (obj: any, path: string = ""): void => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Skip Platform.select objects and similar
        const objValue = value as any;
        if (objValue.ios !== undefined || objValue.android !== undefined) {
          // Check platform-specific values
          if (objValue.ios && !isValidValue(objValue.ios)) {
            warnings.push(`${currentPath}.ios has invalid or placeholder value`);
          }
          if (objValue.android && !isValidValue(objValue.android)) {
            warnings.push(`${currentPath}.android has invalid or placeholder value`);
          }
        } else {
          checkConfigValue(value, currentPath);
        }
      } else if (!isValidValue(value)) {
        // Check if this is a critical key
        const criticalKeys = [
          "ADMOB.APP_ID",
          "ADMOB.AD_UNITS.banner",
          "ADMOB.AD_UNITS.interstitial",
          "ADMOB.AD_UNITS.rewarded",
          "REVENUECAT.API_KEY",
        ];

        if (criticalKeys.includes(currentPath)) {
          missingKeys.push(currentPath);
        } else {
          warnings.push(`${currentPath} has invalid or placeholder value`);
        }
      }
    }
  };

  // Check all configuration values
  checkConfigValue(PRODUCTION_CONFIG);

  // Additional validation for environment variables
  const requiredEnvVars = [
    "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
    "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  ];

  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    if (!value || value.includes("YOUR_") || value.includes("PLACEHOLDER")) {
      if (!missingKeys.some((key) => key.includes(envVar.replace("EXPO_PUBLIC_", "").toLowerCase()))) {
        missingKeys.push(`Environment variable: ${envVar}`);
      }
    }
  });

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    warnings,
  };
};

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof PRODUCTION_CONFIG.FEATURES): boolean => {
  return getConfig().FEATURES[feature];
};

// Helper to get API timeout based on operation type
export const getTimeoutForOperation = (operation: "api" | "upload"): number => {
  const config = getConfig();
  return operation === "upload" ? config.PERFORMANCE.UPLOAD_TIMEOUT_MS : config.PERFORMANCE.API_TIMEOUT_MS;
};

// Helper to check if all critical configuration is properly set
export const isCriticalConfigValid = (): boolean => {
  const validation = validateProductionConfig();
  const config = getConfig();

  // Check if essential services are properly configured when enabled
  const essentialChecks = [
    // AdMob check
    !config.FEATURES.ENABLE_ADS || config.ADMOB.APP_ID !== null,
    // Analytics check
    !config.FEATURES.ENABLE_ANALYTICS || config.ANALYTICS.GOOGLE_ANALYTICS_ID !== null,
  ];

  return validation.isValid && essentialChecks.every((check) => check);
};

// Initialize and validate configuration
export const initializeProductionConfig = (): void => {
  const validation = validateProductionConfig();

  if (!validation.isValid) {
    console.error("❌ Production configuration validation failed!");
    console.error("Missing required configuration keys:");
    validation.missingKeys.forEach((key) => {
      console.error(`  - ${key}`);
    });

    if (!__DEV__) {
      throw new Error(
        "Invalid production configuration. Please check your environment variables and ensure all required keys are set.",
      );
    }
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️  Production configuration warnings:");
    validation.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }

  if (validation.isValid && validation.warnings.length === 0) {
    console.log("✅ Production configuration validated successfully");
  }

  // Additional runtime checks for critical services
  const config = getConfig();

  // Check AdMob configuration
  if (config.FEATURES.ENABLE_ADS) {
    const admobAppId = config.ADMOB.APP_ID;
    if (!admobAppId) {
      console.error("❌ AdMob is enabled but APP_ID is not configured");
      if (!__DEV__) {
        throw new Error("AdMob APP_ID is required when ads are enabled");
      }
    }
  }

  // Check analytics configuration
  if (config.FEATURES.ENABLE_ANALYTICS) {
    if (!config.ANALYTICS.GOOGLE_ANALYTICS_ID) {
      console.error("❌ Analytics is enabled but Google Analytics ID is not configured");
      if (!__DEV__) {
        throw new Error("Google Analytics ID is required when analytics are enabled");
      }
    }
  }

  // Crash reporting removed - Sentry not needed
};
