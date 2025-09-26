require("dotenv").config({ override: true });

module.exports = {
  expo: {
    name: "Toxic Confessions",
    slug: "toxic-confessions",
    scheme: "toxicconfessions",
    version: "1.0.0",
    runtimeVersion: {
      policy: "sdkVersion"
    },
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/logo.png",
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
            deploymentTarget: "15.1",
            newArchEnabled: true,
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            newArchEnabled: true,
            kotlinVersion: "2.1.0",
          },
        },
      ],
      [
        "react-native-vision-camera",
        {
          enableFrameProcessors: true,
          cameraPermissionText: "$(PRODUCT_NAME) needs access to your Camera for recording anonymous videos.",
          enableMicrophonePermission: true,
          microphonePermissionText: "$(PRODUCT_NAME) needs access to your Microphone for recording audio.",
        },
      ],

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
      "./plugins/withModularHeaders",
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
        NSCameraUsageDescription:
          "Camera access is required to record anonymous videos. Faces are blurred and voices modulated for privacy—no data is stored without processing.",
        NSMicrophoneUsageDescription:
          "Microphone access enables voice recording with automatic pitch shifting for anonymity. Audio is processed on-device and never sent unmodulated.",
        NSSpeechRecognitionUsageDescription:
          "Speech recognition generates live captions for anonymous video confessions. All processing happens on-device to protect your privacy.",
        NSPhotoLibraryUsageDescription:
          "Photo library access is used to save processed anonymous videos with metadata stripped for complete privacy protection.",
        NSUserNotificationsUsageDescription:
          "Notifications are used to inform you about app updates and important privacy-related information.",
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
};
