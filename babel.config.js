module.exports = function (api) {
  api.cache(true);
  return {
    // Use Expo preset and enable NativeWind's JSX runtime
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
    ],
  };
};
