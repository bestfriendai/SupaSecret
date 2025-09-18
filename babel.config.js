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
      // Reanimated plugin for v3 - must be last
      "react-native-reanimated/plugin",
    ],
  };
};
