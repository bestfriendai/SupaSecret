// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Basic Hermes optimizations (minimal to avoid conflicts)
config.resolver.platforms = ["ios", "android", "native", "web"];

// CRITICAL FIX: Explicitly resolve @babel/runtime to prevent "file not found" errors
config.resolver.extraNodeModules = {
  "@babel/runtime": path.resolve(__dirname, "node_modules/@babel/runtime"),
};

// Force Metro to use .js extensions for @babel/runtime helpers
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "js", "jsx", "json", "ts", "tsx"];

// Wrap config with NativeWind for CSS processing
module.exports = withNativeWind(config, { input: "./global.css" });
