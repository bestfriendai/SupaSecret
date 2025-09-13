import Constants from "expo-constants";

/**
 * Environment configuration object
 * Provides information about the current runtime environment
 */
export const env = {
  /** Whether the app is running in Expo Go */
  expoGo: Constants.appOwnership === "expo",
  /** Whether the app is running in a development build */
  devClient: Constants.appOwnership === null,
  /** Whether the app is running as a standalone build */
  standalone: Constants.appOwnership === "standalone",
  /** Whether FFmpeg is available in the environment */
  get ffmpegReady(): boolean {
    return !!(global as any).__ffmpegAvailable;
  },
  /** Whether the app can use native features (not in Expo Go) */
  get isNativeCapable(): boolean {
    return !this.expoGo;
  },
};

/**
 * Check if the app is running in Expo Go
 * @returns True if running in Expo Go
 */
export const isExpoGo = (): boolean => env.expoGo;

/**
 * Check if the app can use native features
 * @returns True if native features are available
 */
export const canUseNativeFeatures = (): boolean => env.isNativeCapable;
