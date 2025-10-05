require("dotenv").config({ override: true, quiet: true });

const googleMobileAdsConfig = (() => {
  try {
    const config = require("./google-mobile-ads.json");
    return config["react-native-google-mobile-ads"] || null;
  } catch (error) {
    console.warn("google-mobile-ads.json not found or invalid, skipping AdMob config setup.");
    return null;
  }
})();

// Check if we're building for Expo Go
const isExpoGo =
  process.env.EXPO_GO === "true" ||
  process.env.npm_lifecycle_event === "start" ||
  process.env.npm_lifecycle_event === "web";

module.exports = {
  expo: {
    name: "Toxic Confessions",
    slug: "toxic-confessions",
    scheme: "toxicconfessions",
    version: "1.0.0",
    runtimeVersion: {
      policy: "sdkVersion",
    },
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    updates: {
      enabled: false,
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
            newArchEnabled: false,
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            newArchEnabled: false,
            kotlinVersion: "2.1.0",
          },
        },
      ],
      // Only include react-native-vision-camera for development builds, not Expo Go
      ...(isExpoGo
        ? []
        : [
            [
              "react-native-vision-camera",
              {
                enableFrameProcessors: true,
                cameraPermissionText: "$(PRODUCT_NAME) needs access to your Camera for recording anonymous videos.",
                enableMicrophonePermission: true,
                microphonePermissionText: "$(PRODUCT_NAME) needs access to your Microphone for recording audio.",
              },
            ],
          ]),

      "expo-audio",
      "expo-camera",
      "expo-asset",
      "expo-mail-composer",
      "expo-notifications",
      "expo-secure-store",
      "expo-video",
      "expo-web-browser",
      "expo-font",
      "expo-localization",
      "expo-splash-screen",
    ],
    androidNavigationBar: {
      visible: "sticky-immersive",
    },
    ios: {
      supportsTablet: true,
      buildNumber: "1",
      icon: "./assets/icon.png",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // App Tracking Transparency (ATT) - REQUIRED for App Store approval
        NSUserTrackingUsageDescription:
          "We use tracking to show you relevant ads and improve your experience. Your privacy is protected—we never share personal information without your consent.",
        // Camera & Microphone - Required for video recording
        NSCameraUsageDescription:
          "Camera access is required to record anonymous videos. Faces are blurred and voices modulated for privacy—no data is stored without processing.",
        NSMicrophoneUsageDescription:
          "Microphone access enables voice recording with automatic pitch shifting for anonymity. Audio is processed on-device and never sent unmodulated.",
        NSSpeechRecognitionUsageDescription:
          "Speech recognition generates live captions for anonymous video confessions. All processing happens on-device to protect your privacy.",
        // Photo Library - For saving processed videos
        NSPhotoLibraryUsageDescription:
          "Photo library access is used to save processed anonymous videos with metadata stripped for complete privacy protection.",
        NSPhotoLibraryAddUsageDescription:
          "Save anonymous videos to your photo library after face blurring and voice modulation for complete privacy.",
        // Notifications
        NSUserNotificationsUsageDescription:
          "Notifications are used to inform you about app updates and important privacy-related information.",
        // Location (if needed in future)
        NSLocationWhenInUseUsageDescription:
          "Location is used to show you content relevant to your area. This is optional and can be disabled in settings.",
        // Contacts (if social features added)
        NSContactsUsageDescription:
          "Access contacts to help you connect with friends on the platform. This is optional.",
      },
      bundleIdentifier: "com.toxic.confessions",
    },
    android: {
      versionCode: 1,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-foreground.png",
        backgroundColor: "#000000",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
      package: "com.toxic.confessions",
      googleMobileAdsJson: "./google-mobile-ads.json",
    },
    extra: {
      eas: {
        projectId: "91978f09-79c1-45ae-8271-3e6b48dc88e1",
      },
      env: process.env.EXPO_PUBLIC_ENV,
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      privacyPolicyUrl: "https://toxicconfessions.app/privacy",
      termsOfServiceUrl: "https://toxicconfessions.app/terms",
      supportUrl: "https://toxicconfessions.app/help",
      nonSensitive: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  },
  ...(googleMobileAdsConfig
    ? {
        "react-native-google-mobile-ads": googleMobileAdsConfig,
      }
    : {}),
};
