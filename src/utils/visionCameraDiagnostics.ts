/**
 * Vision Camera Diagnostics
 * Use this to test if Vision Camera modules are loading correctly
 */

import { Platform } from "react-native";

export interface DiagnosticResult {
  module: string;
  loaded: boolean;
  error?: string;
  exports?: string[];
}

export async function runVisionCameraDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  console.log("🔍 Running Vision Camera Diagnostics...");
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Version: ${Platform.Version}`);

  // Test 1: react-native-vision-camera
  try {
    const visionCamera = await import("react-native-vision-camera");
    const exports = Object.keys(visionCamera);

    results.push({
      module: "react-native-vision-camera",
      loaded: true,
      exports: exports,
    });

    console.log("✅ react-native-vision-camera loaded");
    console.log("   Exports:", exports.join(", "));

    // Check for specific exports
    const requiredExports = ["Camera", "useCameraDevice", "useCameraFormat", "useSkiaFrameProcessor"];
    const missingExports = requiredExports.filter((exp) => !exports.includes(exp));

    if (missingExports.length > 0) {
      console.warn("⚠️  Missing exports:", missingExports.join(", "));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      module: "react-native-vision-camera",
      loaded: false,
      error: errorMessage,
    });
    console.error("❌ react-native-vision-camera failed to load:", errorMessage);
  }

  // Test 2: @shopify/react-native-skia
  try {
    const skia = await import("@shopify/react-native-skia");
    const exports = Object.keys(skia);

    results.push({
      module: "@shopify/react-native-skia",
      loaded: true,
      exports: exports.slice(0, 20), // Limit to first 20 exports
    });

    console.log("✅ @shopify/react-native-skia loaded");
    console.log("   Key exports:", ["Skia", "ClipOp", "TileMode"].filter((exp) => exports.includes(exp)).join(", "));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      module: "@shopify/react-native-skia",
      loaded: false,
      error: errorMessage,
    });
    console.error("❌ @shopify/react-native-skia failed to load:", errorMessage);
  }

  // Test 3: react-native-vision-camera-face-detector
  try {
    const faceDetector = await import("react-native-vision-camera-face-detector");
    const exports = Object.keys(faceDetector);

    results.push({
      module: "react-native-vision-camera-face-detector",
      loaded: true,
      exports: exports,
    });

    console.log("✅ react-native-vision-camera-face-detector loaded");
    console.log("   Exports:", exports.join(", "));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      module: "react-native-vision-camera-face-detector",
      loaded: false,
      error: errorMessage,
    });
    console.error("❌ react-native-vision-camera-face-detector failed to load:", errorMessage);
  }

  // Test 4: react-native-worklets-core (disabled - requires New Architecture)
  results.push({
    module: "react-native-worklets-core",
    loaded: false,
    error: "Disabled (requires New Architecture)",
  });
  console.log("⚠️ react-native-worklets-core disabled (requires New Architecture)");

  // Test 5: react-native-reanimated
  try {
    const reanimated = await import("react-native-reanimated");
    const exports = Object.keys(reanimated);

    results.push({
      module: "react-native-reanimated",
      loaded: true,
      exports: exports.slice(0, 20), // Limit to first 20 exports
    });

    console.log("✅ react-native-reanimated loaded");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      module: "react-native-reanimated",
      loaded: false,
      error: errorMessage,
    });
    console.error("❌ react-native-reanimated failed to load:", errorMessage);
  }

  console.log("\n📊 Diagnostics Summary:");
  const loadedCount = results.filter((r) => r.loaded).length;
  const totalCount = results.length;
  console.log(`   ${loadedCount}/${totalCount} modules loaded successfully`);

  if (loadedCount === totalCount) {
    console.log("✅ All Vision Camera modules are working correctly!");
  } else {
    console.log("⚠️  Some modules failed to load. Check the errors above.");
  }

  return results;
}

/**
 * Quick test function to call from your app
 */
export async function testVisionCameraModules() {
  try {
    const results = await runVisionCameraDiagnostics();
    return {
      success: results.every((r) => r.loaded),
      results,
    };
  } catch (error) {
    console.error("❌ Diagnostics failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
