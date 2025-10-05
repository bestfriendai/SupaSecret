const fs = require("fs");
const path = require("path");

module.exports = function (api) {
  api.cache(true);

  const projectRoot = __dirname;
  const hasFFmpegKit = fs.existsSync(path.join(projectRoot, "node_modules", "ffmpeg-kit-react-native"));
  const iosExists = fs.existsSync(path.join(projectRoot, "ios"));

  const expoPresetOptions = { worklets: true };

  const nativewindPresets = iosExists
    ? [["babel-preset-expo", expoPresetOptions], "nativewind/babel"]
    : [["babel-preset-expo", expoPresetOptions]];

  return {
    presets: nativewindPresets,
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
            ...(hasFFmpegKit
              ? {}
              : {
                  "ffmpeg-kit-react-native": "./src/shims/ffmpeg-kit-react-native",
                }),
          },
        },
      ],
      "@babel/plugin-transform-class-static-block",
      "react-native-reanimated/plugin",
    ],
  };
};
