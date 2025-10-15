const { withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");

const withCaptionBurner = (config) => {
  return withPlugins(config, [
    // iOS: Add module to Podfile
    (config) =>
      withDangerousMod(config, [
        "ios",
        async (config) => {
          // The module will be automatically linked via autolinking
          return config;
        },
      ]),
  ]);
};

module.exports = withCaptionBurner;

