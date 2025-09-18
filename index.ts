//DO NOT REMOVE THIS CODE
if (__DEV__) {
  console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
}
import "react-native-reanimated";
import "react-native-get-random-values";
import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "Disconnected from Metro",
  // Remove deprecation warnings for migrated packages
  "SafeAreaView has been deprecated",
  // FlashList + Reanimated v4 + Expo Go compatibility issue
  "View config not found for component `AutoLayoutView`",
]);

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
