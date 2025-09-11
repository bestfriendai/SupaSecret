/**
 * Production Configuration
 * Replace these values with your actual production keys and IDs
 */

import { Platform } from "react-native";

export const PRODUCTION_CONFIG = {
  // AdMob Configuration
  ADMOB: {
    APP_ID: Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || null,
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || null,
    }),
    AD_UNITS: {
      banner: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || null,
        android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || null,
      }),
      interstitial: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID || null,
        android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID || null,
      }),
      rewarded: Platform.select({
        ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID || null,
        android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID || null,
      }),
    },
  },

  // RevenueCat Configuration
  REVENUECAT: {
    API_KEY: Platform.select({
      ios: "appl_YOUR_IOS_API_KEY",
      android: "goog_YOUR_ANDROID_API_KEY",
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
    GOOGLE_ANALYTICS_ID: "G-YOUR_MEASUREMENT_ID",

    // Firebase Analytics (optional - only if environment variables are provided)
    FIREBASE_CONFIG: process.env.EXPO_PUBLIC_FIREBASE_API_KEY
      ? {
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: Platform.select({
            ios: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS,
            android: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID,
          }),
        }
      : null,
  },

  // Sentry Configuration
  SENTRY: {
    DSN: "https://your-dsn@sentry.io/project-id",
    ENVIRONMENT: __DEV__ ? "development" : "production",
    DEBUG: __DEV__,
  },

  // Push Notifications
  PUSH_NOTIFICATIONS: {
    // OneSignal
    ONESIGNAL_APP_ID: "your-onesignal-app-id",

    // Firebase Cloud Messaging
    FCM_SENDER_ID: "123456789",
  },

  // External APIs
  EXTERNAL_APIS: {
    // Content moderation
    CONTENT_MODERATION_API_KEY: "your-content-moderation-api-key",

    // Speech-to-Text (if using cloud service)
    SPEECH_TO_TEXT_API_KEY: "your-speech-api-key",

    // Translation service (if needed)
    TRANSLATION_API_KEY: "your-translation-api-key",
  },

  // App Store Configuration
  APP_STORE: {
    IOS_APP_ID: "123456789",
    ANDROID_PACKAGE_NAME: "com.toxic.confessions",

    // App Store Connect API (for analytics)
    APP_STORE_CONNECT_KEY_ID: "your-key-id",
    APP_STORE_CONNECT_ISSUER_ID: "your-issuer-id",
  },

  // Social Media Integration
  SOCIAL: {
    // Twitter API (if sharing features)
    TWITTER_API_KEY: "your-twitter-api-key",
    TWITTER_API_SECRET: "your-twitter-api-secret",

    // Instagram Basic Display (if needed)
    INSTAGRAM_APP_ID: "your-instagram-app-id",
    INSTAGRAM_APP_SECRET: "your-instagram-app-secret",
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
    ENABLE_ANALYTICS: true,
    ENABLE_CRASH_REPORTING: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_SOCIAL_SHARING: false,
    ENABLE_CONTENT_MODERATION: true,
    ENABLE_REAL_TIME_TRANSCRIPTION: true,
    ENABLE_ADVANCED_VIDEO_PROCESSING: true,
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
    config.SENTRY.DEBUG = true;
    config.PERFORMANCE.API_TIMEOUT_MS = 10000;
    config.SECURITY.MAX_REQUESTS_PER_MINUTE = 120;
  }

  return config;
};

// Validation function to ensure all required keys are set
export const validateProductionConfig = (): { isValid: boolean; missingKeys: string[] } => {
  const missingKeys: string[] = [];

  // Check critical keys that must be set for production
  const criticalKeys = ["ADMOB.AD_UNITS.interstitial", "REVENUECAT.API_KEY", "SENTRY.DSN"];

  criticalKeys.forEach((keyPath) => {
    const keys = keyPath.split(".");
    let current: any = PRODUCTION_CONFIG;

    for (const key of keys) {
      if (!current[key] || current[key].toString().includes("YOUR_")) {
        missingKeys.push(keyPath);
        break;
      }
      current = current[key];
    }
  });

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
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
