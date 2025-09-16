module.exports = function (api) {
  api.cache(true);
  return {
    // Use Expo preset and enable NativeWind's JSX runtime
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Use modern JSX runtime instead of deprecated option
          jsxRuntime: "automatic",
        }
      ],
      "nativewind/babel"
    ],
    plugins: [
      // Module resolver for path aliases
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
          },
        },
      ],
      // Worklets plugin for Reanimated v4 - must be last
      // This is the new plugin required for Expo SDK 54 and Reanimated v4
      // Note: NativeWind v4 may have limited compatibility with Reanimated v4
      "react-native-worklets/plugin", // Must be absolutely last
    ],
  };
};
