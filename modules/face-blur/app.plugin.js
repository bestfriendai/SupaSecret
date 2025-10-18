const { withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");

const withFaceBlur = (config) => {
  return withPlugins(config, [
    // iOS: Add module to Podfile
    (config) =>
      withDangerousMod(config, [
        "ios",
        async (config) => {
          const fs = require("fs");
          const projectPath = path.join(config.modRequest.projectRoot, "ios");
          const podfilePath = path.join(projectPath, "Podfile");

          if (fs.existsSync(podfilePath)) {
            let podfileContent = fs.readFileSync(podfilePath, "utf8");

            // Add face-blur pod if not already present
            if (!podfileContent.includes("face-blur")) {
              podfileContent += "\n  pod 'face-blur', :path => '../node_modules/face-blur'\n";
              fs.writeFileSync(podfilePath, podfileContent);
            }
          }

          return config;
        },
      ]),
    // Android: Add to settings.gradle and app/build.gradle
    (config) =>
      withDangerousMod(config, [
        "android",
        async (config) => {
          const fs = require("fs");
          const projectPath = path.join(config.modRequest.projectRoot, "android");

          // Add to settings.gradle
          const settingsPath = path.join(projectPath, "settings.gradle");
          if (fs.existsSync(settingsPath)) {
            let settingsContent = fs.readFileSync(settingsPath, "utf8");
            if (!settingsContent.includes(":face-blur")) {
              settingsContent +=
                "\ninclude ':face-blur'\nproject(':face-blur').projectDir = new File('../node_modules/face-blur/android')\n";
              fs.writeFileSync(settingsPath, settingsContent);
            }
          }

          return config;
        },
      ]),
  ]);
};

module.exports = withFaceBlur;
