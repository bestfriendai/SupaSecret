module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
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
      // React Native Worklets plugin MUST be last for v4 compatibility
      "react-native-worklets/plugin",
    ],
  };
};
