const { withXcodeProject } = require("@expo/config-plugins");

/**
 * Add FaceBlurProcessor native module to Xcode project
 */
const withFaceBlurModule = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Add Swift and Objective-C files to project
    const swiftFile = "ToxicConfessions/FaceBlurProcessor.swift";
    const objcFile = "ToxicConfessions/FaceBlurProcessor.m";

    // Check if files are already added
    if (!xcodeProject.hasFile(swiftFile)) {
      xcodeProject.addSourceFile(swiftFile);
      console.log("✅ Added FaceBlurProcessor.swift to Xcode project");
    } else {
      console.log("ℹ️  FaceBlurProcessor.swift already in project");
    }

    if (!xcodeProject.hasFile(objcFile)) {
      xcodeProject.addSourceFile(objcFile);
      console.log("✅ Added FaceBlurProcessor.m to Xcode project");
    } else {
      console.log("ℹ️  FaceBlurProcessor.m already in project");
    }

    return config;
  });
};

module.exports = withFaceBlurModule;
