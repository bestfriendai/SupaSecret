const { createRunOncePlugin, withPodfile } = require("@expo/config-plugins");

module.exports = createRunOncePlugin(
  (config) => {
    return withPodfile(config, async (config) => {
      let contents = config.modResults.contents;
      const targetLine = "target 'ToxicConfessions' do";
      const lines = contents.split("\n");
      const targetIndex = lines.findIndex((line) => line.trim() === targetLine);
      if (targetIndex !== -1) {
        lines.splice(targetIndex + 1, 0, "  use_modular_headers!");
        contents = lines.join("\n");
      }
      config.modResults.contents = contents;
      return config;
    });
  },
  "modular-headers",
  "1.0.0",
);
