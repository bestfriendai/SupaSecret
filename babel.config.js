const fs = require("fs");
const path = require("path");

module.exports = function (api) {
  api.cache(true);

  const projectRoot = __dirname;
  const hasFFmpegKit = fs.existsSync(path.join(projectRoot, "node_modules", "ffmpeg-kit-react-native"));

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
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
      "react-native-worklets/plugin", // Required for bottom-sheet v5
    ],
  };
};
