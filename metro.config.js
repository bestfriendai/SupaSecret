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

// Configure CSS support for all platforms
config.transformer.babelTransformerPath = require.resolve("metro-react-native-babel-transformer");
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: false,
});
