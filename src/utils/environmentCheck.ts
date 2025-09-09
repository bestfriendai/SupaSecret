/**
 * Environment Check Utility
 *
 * This utility helps verify that the app will work correctly in both
 * Expo Go and development builds by checking for required dependencies
 * and providing fallbacks when they're not available.
 */

import Constants from "expo-constants";

// Check if we're running in Expo Go
export const IS_EXPO_GO = Constants.appOwnership === "expo";

// Check if we're in development mode
export const IS_DEV = __DEV__;

/**
 * Check if we're in a production-ready environment
 * This is a simplified check that doesn't use dynamic requires
 */
export const isProductionEnvironment = (): boolean => {
  // In Expo Go, we're never production ready
  if (IS_EXPO_GO) {
    return false;
  }

  // In development builds, we assume production readiness
  // Individual services will handle their own availability checks
  return true;
};

/**
 * Check environment and log basic information
 */
export const checkEnvironment = () => {
  console.log("🔍 Environment Check:");
  console.log(`📱 Platform: ${Constants.platform?.ios ? "iOS" : "Android"}`);
  console.log(`🏗️ App Ownership: ${Constants.appOwnership}`);
  console.log(`🔧 Development Mode: ${IS_DEV}`);
  console.log(`🎯 Expo Go: ${IS_EXPO_GO}`);

  if (IS_EXPO_GO) {
    console.log("\n🎯 Running in Expo Go - all services will use demo mode");
    console.log("📦 Native dependencies: Not available in Expo Go");
  } else {
    console.log("\n🏗️ Running in development/production build");
    console.log("📦 Native dependencies: Will be checked individually by services");
  }

  console.log("\n🚀 App initialization will continue with appropriate fallbacks");
};

/**
 * Get production readiness status
 */
export const getProductionReadiness = () => {
  const isProductionReady = isProductionEnvironment();

  console.log("\n🎯 Production Readiness:");

  if (IS_EXPO_GO) {
    console.log("🎯 Running in Expo Go - all services will use demo mode");
  } else if (isProductionReady) {
    console.log("🚀 Development/Production build - services will initialize with real implementations");
  } else {
    console.log("⚠️ Some services may not be available - they will use demo mode");
  }

  return {
    isProductionReady,
    isExpoGo: IS_EXPO_GO,
    environment: IS_EXPO_GO ? "expo-go" : "development-build",
  };
};
