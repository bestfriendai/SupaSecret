// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Enable package exports for Expo SDK 54+
config.resolver.unstable_enablePackageExports = true;

// Basic Hermes optimizations (minimal to avoid conflicts)
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: false,
});
