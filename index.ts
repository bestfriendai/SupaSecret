// CRITICAL: react-native-gesture-handler MUST be first import for Reanimated
import "react-native-gesture-handler";
// CRITICAL: react-native-reanimated MUST be second import for native module initialization
import "react-native-reanimated";
import "react-native-get-random-values";

console.log("[index] ✅ Gesture handler and Reanimated imported");

//DO NOT REMOVE THIS CODE
if (__DEV__) {
  console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
}

console.log("[index] ✅ All required polyfills and native modules loaded");

console.log("[DIAG] index.ts: About to import LogBox...");
import { LogBox } from "react-native";
console.log("[DIAG] index.ts: LogBox imported successfully");
LogBox.ignoreLogs([
  "Disconnected from Metro",
  // Remove deprecation warnings for migrated packages
  "SafeAreaView has been deprecated",
  'EnhancedVideoItem is deprecated. Use UnifiedVideoItem with variant="enhanced" instead.',
  'TikTokVideoItem is deprecated. Use UnifiedVideoItem with variant="tiktok" instead.',
  // FlashList + Reanimated v4 + Expo Go compatibility issue
  "View config not found for component `AutoLayoutView`",
  // RevenueCat configuration warnings (development only)
  "[RevenueCat] Error fetching offerings",
  "[RevenueCat] There was a problem with the App Store",
  "RevenueCat.OfferingsManager.Error",
  // Supabase operation warnings
  "Supabase operation failed",
  "duplicate key value violates unique constraint",
]);

console.log("[DIAG] index.ts: About to import registerRootComponent...");
import { registerRootComponent } from "expo";
console.log("[DIAG] index.ts: registerRootComponent imported successfully");

console.log("[DIAG] index.ts: About to import App...");
import App from "./App";
console.log("[DIAG] index.ts: App imported successfully");

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log("[DIAG] index.ts: About to call registerRootComponent...");
try {
  registerRootComponent(App);
  console.log("[DIAG] index.ts: ✅✅✅ registerRootComponent COMPLETED SUCCESSFULLY ✅✅✅");
} catch (error) {
  console.error("[DIAG] index.ts: ❌❌❌ registerRootComponent FAILED ❌❌❌", error);
  throw error;
}
