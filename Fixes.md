Expo SDK 54 & React Native 0.81 Upgrade Technical Audit
Overview

This technical audit examines the upgrade of the Toxic Confessions React Native app to Expo SDK 54 (with React Native 0.81 and Reanimated v4). The goal is to identify breaking changes and required adaptations, ensuring the app (which uses Zustand state, NativeWind styling, Supabase backend, expo-audio/video, etc.) remains fully functional in both Expo Go and custom development builds. Key focus areas include new Expo 54 compatibility requirements, React Native 0.81 updates, Reanimated v4 setup, and best-practice configuration adjustments for a maintainable, high-quality codebase.

1. Expo SDK 54 – Changes & Compatibility Issues

Expo SDK 54 introduces several notable changes that can impact app functionality and stability. Below are the key changes and how to address them:

Deprecated expo-av Package: Expo 54 is the last SDK to include expo-av (it will be removed in SDK 55). The app must use the replacement modules expo-audio and expo-video for media playback
expo.dev
. In practice, this means replacing any expo-av imports with the new libraries. For example:

- import { Video } from "expo-av";
+ import { VideoView } from "expo-video";
+ import * as Audio from "expo-audio";


Ensure the app’s plugin config is updated to include "expo-audio" and "expo-video" (Expo CLI may have done this during the upgrade). The provided codebase already shows these replacements (e.g. using expo-video’s <VideoView> component).

File System API Changes: The expo-file-system API was overhauled. Legacy methods are now accessed via the expo-file-system/legacy import, and the default import uses a new API
expo.dev
. The quickest fix is to update imports to use the legacy path (to maintain current functionality) and plan a future refactor to the new API. The codebase already reflects this change (importing from "expo-file-system/legacy" in storage-related utilities). For example:

- import * as FileSystem from "expo-file-system";
+ import * as FileSystem from "expo-file-system/legacy";


Note: Expo plans to remove the legacy import in SDK 55
expo.dev
, so migration to the new API (which uses FileSystem.createFileAsync, etc.) should be scheduled.

Expo Notifications Config: The notification configuration field in app.json is deprecated. Expo now requires using the expo-notifications config plugin for any notification-related settings
expo.dev
. This means if app.json previously had a "notification" object (for example, to set the iOS notification icon or sounds), those should be removed and the plugin added. In our app’s config, the "expo-notifications" plugin is indeed listed under "plugins", and iOS infoPlist entries for notification permissions are present. Action: Ensure expo-notifications is included in the plugins array of app.json (as done) and remove any old "notification" key from app.json to avoid warnings. All push notification API calls should be updated to the latest expo-notifications version (v0.32+), as some deprecated functions were removed
expo.dev
.

Android Edge-to-Edge & Status Bar: React Native 0.81 and Expo 54 now enforce edge-to-edge layouts on Android 14+ (API 36) with no opt-out
reactnative.dev
expo.dev
. Our app already uses a dark theme and SafeAreaContexts, so it should continue to look correct. The built-in SafeAreaView component is deprecated (more on that in RN section)
expo.dev
. In Expo 54, androidStatusBar/androidNavigationBar behaviors have changed:

Expo’s android.edgeToEdgeEnabled is always true now
reactnative.dev
, which matches our app.json ("edgeToEdgeEnabled": true). No action needed, but be aware that content will render behind system bars. The app uses react-native-safe-area-context, so UI elements should remain properly inset.

A new property androidNavigationBar.enforceContrast is available (expo 54) to ensure nav bar buttons remain visible
expo.dev
. This could be added in app.json if low-contrast issues are noticed on Android navigation bar.

Predictive Back Gesture: By default, Expo 54 keeps Android’s predictive back gesture disabled (opt-in)
expo.dev
. In app.json we see "predictiveBackGestureEnabled": false. If we want to test Android’s new back animations, we can set this to true; otherwise leaving it false is fine (no behavior change from previous SDK). In either case, test back navigation thoroughly (especially if any custom BackHandler logic exists) to ensure it works with Android 14.

Expo Go vs Development Builds: Expo Go has been updated to SDK 54, so you must update the Expo Go app on your devices to launch the project. However, some new architecture modules and new APIs will not work in plain Expo Go. Notably, Reanimated v4 requires the New Architecture, which Expo Go may not fully support (Expo’s documentation recommends using Development Builds for such cases
expo.dev
). In practice:

The codebase already includes fallbacks for Expo Go. For example, the voice recognition module is commented out “for Expo Go” to avoid crashes. Continue this practice: conditionally require or disable features that depend on custom native modules when running in Expo Go.

Consider using Expo’s Constants or manifest to detect if the app is running in Expo Go (Constants.appOwnership === "expo") and gating certain features via a FeatureGate or flags. This allows the app to run in Expo Go (for basic testing) without crashing, while encouraging the use of a Development Build for full functionality (e.g. Reanimated animations, voice module, ffmpeg, etc.).

Best Practice: Ultimately, plan to migrate your workflow to use Expo Development Builds (custom dev clients) for testing features that require new architecture or unsupported modules. Expo Go is convenient, but Expo explicitly notes it is “not recommended as a development environment for production apps”
expo.dev
 when advanced modules are in use.

Other Expo 54 Updates: Expo SDK 54 brings some new optional features and library updates:

Precompiled iOS Frameworks: Builds on iOS (when using EAS or expo run) are much faster thanks to precompiled RN libraries
callstack.com
reactnative.dev
. No config needed; just ensure you use Xcode 16.1+ (Xcode 26 recommended) to build
expo.dev
. Our EAS config (if any) should be updated to use the latest Mac image (which by default will pick Xcode 26 for SDK 54).

Expo Modules: New modules like expo-glass-effect, expo-app-integrity, expo-ui are available (see Expo 54 release notes). No direct impact unless we choose to adopt them. If we do, add them via expo install and include their config plugins as needed.

Expo CLI/Doctor: After upgrading, run npx expo doctor to check for any lingering issues. The changelog suggests removing any custom Metro overrides (e.g. we should drop custom metro resolutions or patches unless still necessary)
expo.dev
. Our code had patches for expo-asset and react-native in SDK 51; these should be removed and re-evaluated on SDK 54 (likely no longer needed, as upstream fixes in RN 0.81 and Expo 54 address prior bugs).

In summary, Expo SDK 54’s breaking changes revolve around migrating away from deprecated modules (expo-av, old FileSystem API, old notification config) and embracing the new architecture for modules like Reanimated. With the adjustments above, the app will align with Expo 54 requirements
expo.dev
expo.dev
 and remain compatible with Expo Go (to a reasonable extent) and development clients.

2. React Native 0.81 – Key Updates & Required Code Adjustments

React Native 0.81 is a significant upgrade from 0.74, bringing Android 16 support, improved iOS build performance, and some deprecations. Important changes to account for include:

SafeAreaView Deprecation: The core <SafeAreaView> (from react-native) is deprecated in 0.81 and will be removed in a future RN release
reactnative.dev
expo.dev
. RN is pushing developers to use react-native-safe-area-context instead, which is cross-platform and more flexible. Our codebase is already ahead on this – it uses SafeAreaView and useSafeAreaInsets from react-native-safe-area-context throughout (as seen in many imports). No breaking issue here, but ensure any lingering usage of import { SafeAreaView } from "react-native" is removed. All <SafeAreaView> JSX tags now refer to the context version (since we import SafeAreaView from react-native-safe-area-context, the JSX will bind to that) – this is correct and will silence RN’s deprecation warnings.

Note: Because Android edge-to-edge is now the default, pay attention to screens where we might have assumed a padded status bar. Using the safe-area-context ensures proper insets on both platforms. Continue to wrap top-level views in <SafeAreaProvider> (which we do in App.tsx) and use SafeAreaView or useSafeAreaInsets for padding where appropriate. RN 0.81 warns about the deprecated SafeAreaView but as long as we stick with the safe-area-context library, we’re future-proofed.

Hermes as Default JS Engine: React 0.81 removed bundled support for JSC (JavaScriptCore) – Hermes is the default JS engine
expo.dev
. In Expo’s managed workflow, Hermes has been default for some time, so this change should not affect us (we didn’t opt out of Hermes). If for some reason we needed JSC (unlikely), we’d have to install the community JSC package
expo.dev
; but we can stick with Hermes which is fully supported and generally faster.

Android 16 (API Level 36) Support: React Native 0.81 now targets Android 14 (UpsideDownCake) by default
reactnative.dev
. Key implications:

Edge-to-edge UI is enforced (as discussed above). Our UI design (full-bleed content with dark backgrounds) already handles edge-to-edge well. Just ensure no screens were relying on a colored status bar background, since Android will draw behind status/nav bars now (the edgeToEdgeEnabled: true in app.json means we explicitly opted in already).

Predictive Back is enabled by default in RN 0.81 core
reactnative.dev
, but Expo opted to disable it unless enabled in app.json. We left it false (the app uses standard back behavior). Should we enable it later, verify that no custom back handler (like custom hardwareBackPress listeners) conflict with the predictive animation. For now, no code changes needed.

Adaptive Splashscreens/Layout: Large-screen support is encouraged (Android 14 requires apps to handle large screens). The app is phone-focused, but it should still render on tablets. No breaking change, just a note that testing on a tablet or foldable would be wise to ensure UI doesn’t misbehave (especially with SafeArea and flex layouts).

Compile SDK – must be 33 or higher for Android 14. Expo 54 config plugin already bumps this to 36 via expo-build-properties. We should double-check our Gradle config (if any) or rely on expo-build-properties (as we do) to set compileSdkVersion: 36 and targetSdkVersion: 36. This is done in app.json plugins.

Performance and Build Improvements: RN 0.81 introduced precompiled core libraries on iOS (an Expo+Meta collaboration) which can speed up iOS build times ~10x
reactnative.dev
. In Expo, this is automatically used when building via EAS (no config needed unless we run into the known issue with use_frameworks, which we have addressed by using static frameworks in expo-build-properties). In our app.json, "ios": { "useFrameworks": "static", "deploymentTarget": "16.1" } is set to ensure compatibility (since we include some native modules, static frameworks are safer with Swift packages). This is aligned with Expo’s recommendations for certain libraries (e.g., expo-dev-menu). Action: Keep these iOS build settings; they ensure that the new precompiled RN core can be used without conflict (Expo’s known issues note that precompiled core is not compatible with dynamic frameworks)
expo.dev
.

Minimum Requirements: React Native 0.81 raises the baseline for development tools:

Node.js ≥ 20.19.4 is required
medium.com
expo.dev
. Ensure the development environment is updated (Node 20 LTS). The team should update any CI configuration to use Node 20.19+.

Xcode ≥ 16.1 for iOS builds
medium.com
expo.dev
. Our Mac build machines or local Macs should use Xcode 16.1 or above; Xcode 26 (iOS 17 SDK) is suggested by Expo for SDK 54
expo.dev
. We should confirm our EAS build image (if using EAS) is not locked to an older Xcode.

Gradle and Android Studio – React 0.81 likely bumped some Gradle deps, but using Expo managed abstracts this. If we eject or run expo prebuild, the template will have updated Gradle versions. (Just be aware if any manual Android config exists – e.g., for Google services – that the Android project might have updated Gradle, AGP, etc. The expo-build-properties plugin can set Gradle options if needed).

Other RN 0.81 API changes:

Improved Error Handling: RN 0.81 adds richer error messages and stack info for crashes
medium.com
. This doesn’t require changes but will help debugging. We might see slightly different RedBox outputs (with cause and component stack).

Metro configuration behavior: Metro now correctly respects custom resolveRequest and other options in metro.config.js
medium.com
. If we had any custom Metro resolver logic (we do not, aside from NativeWind and packageExports), there’s nothing to do except remove any previous hacks. (Expo’s upgrade notes mention that if we had Metro overrides for expo-router monorepos, those should be revisited
expo.dev
. We have none, so we’re fine).

Removed APIs: A few minor RN APIs were pruned (internal things like TVNavigationEventEmitter if used, or the previously deprecated BackAndroid alias, etc.). Our code doesn’t use these. One notable removal: first-party useWindowDimensions was slightly modified to exclude status bar height in some calculations for full screen devices – this should not break anything but might slightly change any layout math if we did something custom (likely not).

Community Modules: Since RN 0.81 changed some internal classes (Fabric component registry, etc.), ensure all native dependencies are updated to versions compatible with 0.81. We’ve done that via expo install. For example, react-native-screens and react-native-safe-area-context have been updated (to ~4.16 and ~5.6 respectively in SDK 54) to ensure compatibility with Fabric. The package versions we use match the Expo SDK 54 requirements, so we should be good.

In summary, React Native 0.81’s biggest impact on our app was the SafeAreaView migration (which we preemptively handled) and the need to run on New Architecture to leverage Reanimated 4 (discussed next). Provided we meet the new Node/Xcode requirements and have updated all libraries, the app should run smoothly on RN 0.81
expo.dev
. We should allocate time to rigorous testing on Android 14 devices and iOS 17 simulators to catch any UI or behavior changes (e.g., back gesture, layout stretching to edges) early.

3. Reanimated v4 – Configuration, Plugins, and Behavior Changes

Upgrading to React Native Reanimated v4 is a crucial part of this migration. Reanimated 4 introduces a new animation paradigm and requires the New Architecture (Fabric) to run
expo.dev
docs.swmansion.com
. Key points and steps for Reanimated v4:

New Architecture Only: Reanimated 4.x works only with the React Native New Architecture (Fabric + TurboModules)
docs.swmansion.com
. This means we must run the app with new architecture enabled. In Expo, we achieve this by setting "newArchEnabled": true in app.json for both iOS and Android (which we have done). Using development builds (via EAS or expo run) will produce Fabric-enabled binaries where Reanimated 4 can function. If the app is launched in an environment without Fabric (e.g., older Expo Go), Reanimated 4’s JSI bindings will not initialize – thus the emphasis on using a dev build for testing Reanimated features. The app.json in our project confirms newArch is enabled.

Install the Worklets Package: Reanimated 4 offloads its “worklet” runtime to a new dependency, react-native-worklets
docs.swmansion.com
. We need to add this to our project. The upgrade process likely did this (our package.json lists "react-native-worklets": "^0.5.1" already). Verify that react-native-worklets is installed and included in the build (it should auto-link in Expo). This package provides the underlying infrastructure for running JavaScript on the UI thread.

Babel Plugin Update: The Reanimated Babel plugin has moved in v4. Formerly we added "react-native-reanimated/plugin"; now it’s renamed to "react-native-worklets/plugin"
docs.swmansion.com
. In babel.config.js, we must replace the old plugin import with the new one. Our config has been updated accordingly:

 plugins: [
   ["module-resolver", { /* ... */ }],
-  "react-native-reanimated/plugin"    // old plugin path
+  "react-native-worklets/plugin"      // new Reanimated v4 plugin
 ]


It’s critical that this plugin remain last in the plugins array, so it can transform any worklets in our code. (Expo’s preset does include the plugin automatically for SDK 54+, but because we have a custom Babel config, we manually specify it to be safe
expo.dev
.) With this change, the Babel compiler will correctly convert functions marked with the 'worklet' directive into thread-isolated code.

Verify Worklet Directives & Dependencies: In Reanimated v4, the way we write animations (using hooks like useAnimatedStyle, useSharedValue, etc.) remains largely the same, but we must ensure all custom worklet functions include the 'worklet'; directive. The upgrade analysis noted that all gesture callbacks and animation callbacks should have the directive and proper dependency arrays. Action: Do a pass through animation-related code to confirm this:

e.g. any onGestureEvent or useAnimatedGestureHandler callbacks should begin with 'worklet';.

The codebase already was updated for some of these (there’s mention of ensuring 'worklet' directives and removing any Reanimated shared values from React useEffect deps).

Also ensure we import SharedValue types from reanimated if needed for TypeScript (Reanimated v4 exports types for shared values).

Removed/Changed API in v4:

useWorkletCallback – this was a helper in v3 that is removed in v4
docs.swmansion.com
. We should search the code for any usage (most likely none, and indeed our find found none). If it existed, migration is to use a normal useCallback with a 'worklet'; inside.

Spring Animation Parameters: The withSpring function changed its config – restSpeedThreshold and restDisplacementThreshold are replaced by a single energyThreshold in v4
docs.swmansion.com
. If our code used custom spring configs (for example in a withSpring call), those fields will be ignored. Typically, the defaults suffice, but if needed we can import Reanimated3DefaultSpringConfig to replicate old behavior
docs.swmansion.com
. A quick grep shows no custom spring config in our code, so we are fine. Just be aware that springs might feel slightly bouncier by default in v4 (due to new tuning). We can adjust if needed after user testing.

Deprecated functions removed: addWhitelistedNativeProps/UIProps were no-ops in v3 and are gone in v4
docs.swmansion.com
. We didn’t use these (they were low-level).

Layout Animations and Transitions: Reanimated 4 emphasizes a new declarative CSS-like animations API (via animateStyle and LayoutAnimation transitions). This is optional, but something to consider for cleaner code. Our current animations (e.g. in AnimatedActionButton, VideoRecordScreen, etc.) use the classic shared value + worklet approach, which continues to work in v4. Over time, we might refactor simple animations to the CSS API for readability, but it’s not required. The new API can live alongside old APIs without issue
docs.swmansion.com
.

Library Compatibility: Ensure that all libraries that integrate with Reanimated have been updated:

Gesture-Handler and Screens: We bumped to the versions Expo 54 expects (GH ~2.22, Screens ~4.16) which support Fabric. Good.

@gorhom/bottom-sheet: This library internally uses Reanimated. We must use v5.1.8 or later for Reanimated 4 compatibility (as the maintainer fixed useWorkletCallback usage in that version)
docs.swmansion.com
. Our package.json shows @gorhom/bottom-sheet": "^5.2.6", which meets this requirement. No further action – just test that bottom sheets still work (they should).

FlashList (Shopify): We use FlashList for lists. FlashList v2 was recently released with improvements for auto-layout (removing the need for estimatedItemSize). We have updated to FlashList v2 (as indicated by code comments and removal of estimatedItemSize). One issue noted was a conflict between FlashList’s internal scroll handling and Reanimated’s scroll events – the codebase removed a useAnimatedScrollHandler that caused a runtime error with FlashList. This is a known quirk; the fix is to avoid attaching Reanimated scroll listeners to FlashList if not needed. We’ve done that (commented it out). In general, after upgrading, test any custom scrolling or animated list behavior. If issues arise (like a _c.call is not a function error), it often points to an incompatible Reanimated worklet on a Fabric component – removing or refactoring that code is the solution (as done).

NativeWind: NativeWind v4 itself doesn’t require Reanimated, but it can leverage Reanimated for animations on class changes. The comment in code “Temporarily disabled Reanimated due to NativeWind v4 + Expo SDK 54 issues” suggests there was a runtime problem (perhaps the Babel plugin was misconfigured initially, causing Reanimated errors when NativeWind tried to animate). Now that we have the correct plugin setup, these compatibility issues should resolve. Ensure the Babel preset is configured with jsxImportSource: "nativewind" (see next section) so that className changes compile correctly. If any lingering issue with NativeWind’s dynamic styling and Reanimated persists, we’ll consult NativeWind docs, but v4.1.23 is designed to work on RN 0.76+ and should be stable.

Testing Reanimated: After making the above changes, it’s important to test the app’s interactive features:

Confirm that animations (e.g. the recording button scale animation, pull-to-refresh spinner, etc.) run without errors. A known symptom of misconfiguration is an error like “Reanimated 2 failed to create a worklet, maybe you forgot to add Reanimated’s babel plugin?” – if you see this, it means the Babel plugin isn’t properly applied. Our setup addresses this (plugin added), so do a fresh Metro cache clear (expo start -c) after changing the Babel config to ensure the plugin is applied.

Test on a dev build (Fabric enabled) – in Expo Go (if it’s still running on legacy architecture), those animations might no-op or throw warnings. This is expected. Use a dev client on device for full testing.

Pay attention to gesture-driven animations (e.g. swiping something, or any use of react-native-gesture-handler with reanimated). If something isn’t working, it could be a missing 'worklet' or an issue with new arch. The solution is usually to add the worklet directive or adjust the code per v4’s guidance.

In summary, migrating to Reanimated v4 requires installing a new package and updating the Babel config. Once configured, our existing animation code should work with minimal changes, thanks to backward compatibility in the API
docs.swmansion.com
. We get the benefit of new architecture performance and can gradually adopt v4’s new features. With everything set up, our app “is now fully compatible with Reanimated v4 and Expo SDK 54” – we just need to test and iterate on any minor behavior differences.

4. Configuration & Dependency Changes

To ensure all pieces work together, we need to adjust several configuration files and dependency versions. Below is a breakdown of required changes to babel.config.js, metro.config.js, tsconfig.json, app.json, and package.json:

Babel Configuration (babel.config.js)

Our Babel config must accommodate Reanimated and NativeWind:

Expo Preset & JSX Runtime: Use the latest Expo Babel preset and configure JSX for NativeWind. Expo SDK 54 uses React 19 which supports the new JSX transform. We pass jsxImportSource: "nativewind" to the preset so that JSX elements with className are transformed for NativeWind’s runtime styling. In code, this looks like:

presets: [
  ["babel-preset-expo", { jsxImportSource: "nativewind" }],
  "nativewind/babel"  // ensures twin.macro style classes work
],


Ensure the preset array is exactly as above (the second entry "nativewind/babel" is a plugin/preset from NativeWind). This config is present in our file. Also, confirm nativewind is installed (we have v4.1.23).

Reanimated Worklets Plugin: As discussed, update the plugin from the old reanimated path to the new one. The plugin must be last:

plugins: [
  ["module-resolver", { /* alias config (e.g. "@" -> "./src") */ }],
  "react-native-worklets/plugin"  // Reanimated v4 plugin, last in list
]


Our babel.config.js reflects this change. This resolves the “unable to find Reanimated plugin” errors and compiles worklets correctly
expo.dev
.

Module-Resolver: We use a custom module resolver (alias "@" to ./src). This is fine to keep. One thing to verify – with the Metro package exports changes, sometimes module resolver needs tweaks, but since we’re resolving our own src, it should not conflict. No changes needed here except to ensure it’s compatible with Babel 7.21+ (it is).

After these changes, run expo start -c to reset Metro’s cache so that Babel picks up the new config. The expected outcome is no more Reanimated plugin warnings at app startup and correct transformation of className props for NativeWind.

Metro Configuration (metro.config.js)

Our Metro config is minimal, but two important settings are:

Package Exports Resolution: Expo SDK 54 uses the new Metro bundler (Metro 0.83+) that supports the Node "exports" field. To enable it, we must set unstable_enablePackageExports = true in the resolver settings. Our config already does this. This is critical for resolving packages that use the modern export map (many Expo 54 packages do). Without this, you’d see errors finding certain modules. We’ve enabled it as recommended.

NativeWind Integration: We wrap the default config with withNativeWind(...) to enable Tailwind class extraction from our global CSS. This is correctly in place. It processes global.css (which contains our Tailwind base and component classes) and sets inlineRem: false (meaning NativeWind will not convert rem units to px at build time – we can leave that as configured).

Metro Defaults: We rely on getDefaultConfig(__dirname) from expo/metro-config. Expo 54’s metro-config automatically handles most settings, so we don’t override much. We should remove any previously added experimentalImportSupport or custom transformer if they were there for older SDKs (not in our current config, so that’s fine).

Asset Exts / Source Exts: Check if our app needs any custom extensions (e.g. if we had .cjs files or something unusual). The default config covers .css (because isCSSEnabled is true for web), and typical asset extensions. No manual changes needed unless we hit an import issue.

In summary, the metro.config.js is properly set up for SDK 54 with the above settings. The key line to keep is:

config.resolver.unstable_enablePackageExports = true;


(We cite this as it’s a common oversight during upgrade
expo.dev
.)

TypeScript Configuration (tsconfig.json)

We extend expo/tsconfig.base which provides sane defaults for Expo apps. A few tweaks for our context:

Strictness: We have "strict": true and other strict flags enabled – good for catching issues. TS 5.9 (which we’ll upgrade to) may introduce new stricter checks, so expect a few type errors after upgrading TypeScript. Fix them as needed (they tend to be minor, e.g. property ?. chaining requirements or etc.).

JSX Factory: With React 19 and the new JSX transform, we should ensure TS is aligned:

Add "jsx": "react-jsx" in compilerOptions so TypeScript knows we’re using the new transform (if not already inherited from expo/tsconfig.base).

Add "jsxImportSource": "react" or "nativewind" if needed. Actually, since Babel handles the jsx import source, TS might not require an explicit jsxImportSource. But to avoid TS complaining about the jsxImportSource option, we can add:

"jsx": "react-jsx",
"jsxImportSource": "nativewind"


This way, TS will use the correct types for the JSX factory (NativeWind’s types augment React’s JSX). This is especially helpful for IntelliSense on className prop – the nativewind/types we reference in nativewind-env.d.ts already augments React Native’s types to include className on View, Text, etc.. Setting jsxImportSource to nativewind will make TS pick up those augmented types automatically.

These options are not in our current tsconfig, but adding them is recommended for consistency with the Babel config. It prevents TypeScript from possibly stripping out the importSource comment or mis-typing the JSX elements. Given our environment, this is a minor enhancement (not strictly required, but aligns with React 19 best practices).

Module Resolution: expo/tsconfig.base likely sets "moduleResolution": "node" or similar. We explicitly have "moduleResolution": "bundler" which is fine (it’s a newer TS setting for Metro). Keep that.

Path Aliases: We have:

"paths": { "@/*": ["./src/*"] }


which pairs with our Babel module-resolver. This helps TS resolve imports like import X from "@/someModule". Ensure that stays in sync if any new aliases are added.

Exclude: We exclude node_modules and some config files (and Supabase functions folder). That’s fine.

After upgrading dependencies, also upgrade @types/react and @types/react-native to match React 19 / RN 0.81. Expo’s expo install should have done this (React types ~18.2 still apply for React 19 as of now, since React 19 didn’t drastically change type API, but check if new minor versions of @types/react are out to cover 19). The provided upgrade notes suggested updating @types/react from 18.3.12 to 18.3.24, which presumably was done. Verify TS is using the new JSX types (you can test by hovering over a JSX element to see if it’s using React.JSX.Element from the new factory).

Expo App Config (app.json)

We have a comprehensive app.json already; just ensure it meets SDK 54 requirements:

SDK Version: After running expo upgrade, the sdkVersion in app.json (if present) should be "54.0.0". Expo CLI usually manages this, and it might not explicitly appear in app.json if managed by package.json expo version. Our package.json lists expo 54.0.2 which implicitly sets SDK 54.

expo.name and expo.slug: Remain unchanged ("Toxic Confessions"). No issues.

newArchEnabled: Must be true (and it is) to allow Fabric. This is one of the most important flags for our upgrade (enabling New Architecture for both iOS and Android in one go).

Plugins:

We added expo-build-properties to handle native build config. This plugin is correctly configured to set iOS deployment target to 16.1, use static frameworks, and Android compileSdk/targetSdk to 36. This aligns with RN 0.81’s requirements and Expo recommendations. We should keep this plugin entry, as it will future-proof some native config without ejecting.

Confirm all needed Expo modules appear in the plugins list for config plugins that require it. Our app.json includes:

"expo-audio", "expo-video" – needed since these were separated from expo-av (we have them).

"expo-notifications" – needed for push notif (we have it).

"expo-splash-screen" – appears as well, which is good if we customized splash (ensures splash screen is configured).

Others like "expo-camera", "expo-secure-store", etc. are listed, presumably to ensure permissions are added to Info.plist/AndroidManifest. This is good. One to check: we use SecureStore for Supabase auth, and indeed expo-secure-store is listed.

We might add "expo-tracking-transparency" if we need iOS tracking (not mentioned, so likely not used).

The presence of "expo-mail-composer" plugin indicates we use MailComposer (the plugin ensures iOS has the MFMailCompose usage description).

Everything in plugins seems appropriate for the libraries we use. No deprecated plugins are present.

iOS Section:

The infoPlist entries for usage descriptions are thorough (Camera, Microphone, Speech Recognition, Photo Library, Notifications). These cover all the native features we use. With Expo 54, the notifications usage keys here are fine to leave – Expo has deprecated the old config field but still uses these Info.plist entries. We should remove the now-unused NSUserNotifications structure in the future (that was part of the old config field), but since we have the plugin, it’s harmless. Expo-notifications plugin documentation says to include NSUserNotificationUsageDescription (which we have) and doesn’t mention NSUserNotifications.types – that might have been from older Expo. It might be ignored; in any case, it won’t break anything but could be removed for cleanliness.

The bundleIdentifier changed to a reverse-DNS ("com.toxic.confessions") – ensure this matches any App Store provisioning (if applicable).

We set supportsTablet: true – this is fine.

The minimum iOS version is set via expo-build-properties (16.1). Expo 54’s default min iOS is 15.0, but 16.1 is okay (just means the app won’t install on iOS 15 devices – likely acceptable given current iOS adoption).

We should double-check associated domains or permissions if any – none are present aside from those usage descriptions, which is fine.

Android Section:

We explicitly list permissions in app.json. Expo usually auto-adds required permissions, but since we manually list them, we override the default set. Our list includes Camera, Record Audio, Read/Write Media (for images, video, audio), and MODIFY_AUDIO_SETTINGS. This covers camera and mic for recording, and file system for saving videos. Good.

We might consider adding "POST_NOTIFICATIONS" for Android 13+ notifications if push is used, but Expo’s notif module should handle that via the plugin (and prompt the user at runtime).

The package name is set ("com.toxic.confessions") – ensure it’s consistent with any Google services config (if we had Google JSON, it should use that package).

We enabled edgeToEdgeEnabled: true (which is now default anyway) and left predictiveBackGestureEnabled: false – these are fine as discussed.

Overall, the app.json is properly configured for the new SDK. The main recommendations are:

Keep newArchEnabled: true.

Use config plugins (done).

Remove any deprecated config fields (we have none aside from the possibly redundant NSUserNotifications.types).

Optionally, add the androidNavigationBar.enforceContrast or similar if design issues arise with the nav bar icons, and consider enabling predictive back once comfortable.

Dependencies (package.json) and Version Alignments

Upgrading to Expo 54/React Native 0.81 requires bumping many package versions. Here are the critical ones and their required versions:

Package	Version for SDK 54	Notes/Migration Guide
expo	~54.0.0 (or 54.0.2)	Core SDK – upgraded via expo install expo@54.
react-native	0.81.x (Expo uses 0.81.4)	Managed by Expo – ensure no residual patches. See [RN 0.81 release notes]
reactnative.dev
.
react / react-dom	19.1.0	React 19 is required. Upgrade all React to 19.x for web/DOM too.
react-native-reanimated	^4.1.0 (for new arch)	Or latest 4.x. Was ~3.10.1 on old arch. Follow [Reanimated 4 migration]
expo.dev
.
react-native-worklets	^0.5.x	New dependency for Reanimated 4
docs.swmansion.com
. Already added.
react-native-safe-area-context	^5.0.0 or Expo’s ~5.6.0	Need v5+ for Fabric support. We updated from 4.10.1 to 4.14/5.x.
react-native-screens	Expo’s ~4.16.0	Update for RN 0.81 (Fabric). We have 3.31 -> now 4.x.
react-native-gesture-handler	Expo’s ~2.12+ (2.22)	Update for Fabric. Ours 2.16 -> 2.22.
@gorhom/bottom-sheet	^5.2.6	Ensure ≥5.1.8 for Reanimated 4. We have 5.2.6 – OK.
@shopify/flash-list	^3.x (v2 or v3)	We updated to FlashList v2 (package might still be 1.x but v2 was a soft release). Ensure latest for performance.
nativewind	^4.1.23	We already use v4 – required for RN ≥0.70. Continue with 4.x (v3 would not support className on View).
@supabase/supabase-js	^2.42.7 (2.x latest)	No RN-specific issues; just stay up-to-date for bug fixes.
expo-modules (expo-camera, expo-file-system, expo-video, etc.)	Use expo install to get exact compatible versions	Expo CLI ensures the correct version for each module. For example, expo-file-system ~19.0.11, expo-video ~3.0.11, expo-audio ~2.0.x, expo-image ~3.0.8 etc. All Expo packages should match the SDK 54 version range.

Run npx expo install for each Expo package to let Expo align versions. The provided Expo SDK 54 Dependency Update Summary confirms all dependencies were updated to compatible versions. Notably:

We updated expo from 51.0.8 → 54.0.x, react 18.2 → 19.1, react-native 0.74 → 0.81.

All expo-* libraries to their SDK 54 counterparts (e.g., expo-font ~14, expo-notifications ~0.32, etc. – these match the SDK docs).

Reanimated and NativeWind to latest needed.

After updating package.json, run npm install (or yarn), then pod install if we had an iOS directory (in managed workflow, EAS build does this). Since we use config plugins, ensure to build a new dev client via EAS to get the native changes.

One more thing: remove any resolutions/overrides in package.json that pin Metro. The Expo 54 changelog specifically says to remove Metro overrides that some had added for expo-router monorepo fixes
expo.dev
. Our package.json shows an overrides section for expo-dev-menu (pinning to 7.0.10) – check why this is present. Possibly it was a workaround for an SDK 51 issue. With SDK 54, the latest expo-dev-menu should be used (which is 0.… Actually expo-dev-menu 1.x now?). Because we are enabling new architecture and static frameworks, it’s better to let expo pick the correct version. Remove the override unless there’s a specific reason. Similarly, any patch files in /patches for react-native or expo-asset should be removed unless we confirm a still-unresolved issue.

Lastly, confirm devDependencies like TypeScript are updated (SDK 54 supports TS 5.9). We should bump TypeScript to ~5.9 (from 5.8). Also update ESLint/Prettier configs if needed for React 19 (likely fine as-is).

Example: package.json core section (after upgrade)
{
  "dependencies": {
    "expo": "54.0.2",
    "react": "19.1.0",
    "react-native": "0.81.4",
    "react-native-reanimated": "4.1.0",
    "react-native-worklets": "^0.5.1",
    "nativewind": "4.1.23",
    "expo-audio": "~2.0.1",
    "expo-video": "~3.0.11",
    "expo-file-system": "~19.0.11",
    "...": "..."
  },
  "devDependencies": {
    "typescript": "~5.9.2",
    "@babel/core": "^7.21.0",
    "jest-expo": "~54.0.0",
    "..."
  }
}


(Versions for illustration; use expo install to get exact version ranges. The above matches the ranges seen in our updated files .)

5. Best Practices & Maintainable Upgrade Strategy

Beyond one-off fixes, we should implement some best practices in dependency management and architecture to ensure future upgrades are smoother and the project remains maintainable:

Use Expo Tools for Upgrades: Continue using expo-cli commands like expo upgrade or expo install --check to handle version alignment. This avoids mismatches. The upgrade process to SDK 54 was guided by npx expo install expo@^54.0.0 --fix, which we should use similarly for future SDK jumps
expo.dev
. Running expo-doctor after upgrades catches any stray issues (like incompatible versions or missing plugins).

Manage Patches and Custom Fixes: As mentioned, remove outdated patches (we had patched react-native and expo-asset previously – those are likely no longer needed on 0.81/SDK54). Each SDK upgrade, reevaluate any patch-package patches or overrides; rely on upstream fixes if available to reduce maintenance burden. If a new patch is needed (e.g., a critical bug in a library), try to contribute it upstream or track it so it can be removed when resolved.

Config Plugins Over Ejecting: We have effectively used config plugins (expo-build-properties, expo-notifications, etc.) to avoid touching native projects. This is the recommended approach. For any new native capability, prefer a config plugin if one exists (or write one) instead of ejecting. This keeps the project in the managed workflow, which Expo is clearly optimizing (as seen with prebuilt libraries and such). Our app.json already has the necessary plugins configured; this modularizes native config and makes it easier to share settings in the team.

Modular Feature Architecture: The codebase is organized by feature (state stores, utils, components, etc.), which is good. To further improve maintainability:

Encapsulate platform-specific or environment-specific logic. For example, if certain code should only run on a development client (Fabric) and not in Expo Go, we can abstract that check. We have a FeatureGate component – use it to conditionally render features based on device capabilities (e.g., voice transcription UI could be behind a <FeatureGate requireNative={['Voice']} /> that checks if the native module is loaded). Alternatively, use runtime checks (like if (NativeModules.Voice == null) to disable voice input gracefully in Expo Go). This prevents the need to comment out imports for Expo Go – instead, the app can decide at runtime.

Leverage Zustand and Contexts to centralize side effects. For instance, push notification listeners are set up in a notificationStore or pushNotifications.ts utility. Ensure these have proper error handling (the audit notes we added graceful handling if push setup fails). This way, enabling/disabling features (like turning off push for a debug build) is easier.

Keep an eye on performance: With new architecture, some patterns might change performance characteristics. E.g., doing a lot of state updates can be faster via JSI, but too many rerenders can still hurt. Use React DevTools and Flipper (which Expo supports) to monitor performance. The “React Compiler” (also known as React’s automatic memoization, introduced as an experimental feature) is enabled in Expo SDK 54 projects by default. This could automatically memoize some components. Understand that this is happening and take advantage of it – our functional components might now be auto-memoized by the compiler (RCC), reducing wasted re-renders without us writing React.memo. This is a maintenance win (less manual optimization). Just verify critical components behave correctly (the compiler is usually safe, but in edge cases with side effects in render this could matter).

Code Splitting and Lazy Loading: If the app grows, consider using dynamic import for heavy modules not needed at startup (for example, if some screen uses ffmpeg-kit for video processing, that could be import()ed only when needed). This reduces launch times in development and in production.

Testing: Write a few basic tests or use the app in a variety of scenarios. Expo SDK 54 changes how errors surface (more detail in RedBox)
medium.com
 – leverage that to catch issues early. Also test a production (release) build on device; sometimes new architecture issues only appear in release (due to JSI concurrency). If something odd happens only in release (e.g., an animation freeze), Software Mansion recommends enabling the Reanimated Babel plugin’s debugging mode or splitting worklets, etc. But hopefully we won’t hit that.

Dependency Management: Pin or carefully version critical deps:

Keep using caret (^) for most packages for flexibility, but perhaps pin minor for those known to break (e.g., if a future NativeWind v4.2 came with breaking changes, consider staying on 4.1.x until tested).

Check for duplicated packages after upgrade with npx expo doctor or npm ls. The audit noted “Expo Doctor shows minimal issues (only non-critical duplicate deps)” – try to eliminate duplicates by aligning versions (for instance, ensure only one copy of react-native-safe-area-context is installed).

Regularly update minor/patch versions of libraries as they often contain fixes (e.g., Supabase JS SDK or date-fns).

Security & Compliance: After upgrade, re-run any audits (our BACKEND_SETUP_VERIFICATION.md and security checks) to ensure nothing regressed. For example, if expo-updates were in use, confirm the assetBundlePatterns or update URLs didn’t change (not applicable here since we use EAS Update or not at all). We see in the audit that RLS policies, etc., are all good – those aren’t affected by the front-end upgrade but good to keep in mind.

Prioritizing Future Upgrades: The app is now on current versions, but note upcoming changes:

Expo SDK 55 will remove expo-av entirely and likely expo-file-system legacy. We should aim to refactor file system usage to the new API (which uses FileSystemFileHandles similar to web). We have a head start by isolating file logic in a few utils (supabase upload, etc.). Perhaps plan that refactor soon so SDK 55 is trivial.

React Native is moving fast (0.82, 0.83 will come). By staying on new architecture now, we’ve aligned with the future. Keep an eye on RN release notes and upgrade helper diff for any changes (the SafeAreaView removal will happen eventually – by then we’ll already be using safe-area-context, so we’re fine).

Reanimated v5 in the future might drop worklets completely in favor of the new API – since we know about it, we can gradually adopt the declarative animations where convenient (perhaps use useAnimatedStyle with the new animate API for simple transitions). Software Mansion’s blog posts are a good resource to follow for that.

Finally, maintain an upgrade checklist (the project actually has one in SDK54_UPGRADE_TODO.md). We should tick off the items we’ve completed and keep notes for anything deferred (e.g., “migrate expo-file-system calls to new API” might be a deferred task – not breaking now, but to be done before SDK 55). The audit documents show a few Remaining Minor Issues and todos (React 19 upgrade, etc.) – we should address the React 19 upgrade (done) and any type updates.

6. Prioritized Implementation Fixes

Based on the above analysis, here is a prioritized list of fixes and changes to implement for a successful upgrade:

Upgrade Core Dependencies – Highest priority.
Update the Expo SDK, React Native, React, and all related packages to their Expo 54 compatible versions. Use npx expo install --fix to align versions. Key versions: Expo 54, RN 0.81.4, React 19.1.0, Reanimated 4.x
expo.dev
. This resolves fundamental compatibility issues (e.g. older RN would not run in Expo 54). After updating, clean install node modules and pods.

Enable New Architecture (Fabric) – Highest priority.
Ensure the app runs on the New Architecture required by Reanimated 4. This means setting "newArchEnabled": true in app.json (already done) and building a new Development Client. Without this, Reanimated 4 will crash or not function at all. This fix unlocks improved performance and compatibility with RN 0.81’s features.

Reconfigure Babel for Reanimated v4 – Critical.
In babel.config.js, add the Reanimated v4 Babel plugin "react-native-worklets/plugin" as the last plugin. Remove any old "react-native-reanimated/plugin" entry. This fixes the runtime error where Reanimated worklets fail to initialize (the “Reanimated plugin missing” issue)
expo.dev
. After this change, clear Metro cache and re-run to verify no plugin warnings.

Adjust Metro Config – Critical.
Enable package exports resolution in metro.config.js by setting:

config.resolver.unstable_enablePackageExports = true;


This is already present, but double-check it remains. This prevents module resolution errors for libraries using modern export maps (many Expo/React Native packages do in SDK 54). Also keep the Metro config integrated with NativeWind (withNativeWind). Verify that Metro starts without errors.

Use Expo Config Plugins – Critical.
Migrate any deprecated app config to plugins:

Remove the old notification config in app.json (if it existed) in favor of the expo-notifications plugin
expo.dev
. We have added "expo-notifications" in plugins – ensure it stays. This will automatically configure iOS/Android for push notifications (permissions, icons).

Verify expo-build-properties plugin is configured to set the correct compileSdkVersion (36) and iOS deployment target (16.1). This is crucial for building with the new SDK. Our app.json shows it’s done.

Add any missing plugin for modules we use (none noticed, but e.g., if we use Google Auth via AppAuth, we’d add its plugin).

Update Imports for Removed/Changed APIs – High Priority.
Fix imports that have changed between SDK 51 and 54:

Media: Replace expo-av usage with expo-video/audio. The code already switched to expo-video’s VideoView and expo-audio for audio playback. Make sure no stray import { Video } from 'expo-av' remains. Also update any references in documentation or comments.

FileSystem: Use expo-file-system/legacy for existing code
expo.dev
. This is implemented in our code (all FileSystem imports point to /legacy). Do a quick global find to ensure all are covered.

SafeAreaView: Ensure all instances are from react-native-safe-area-context. Any lingering import { SafeAreaView } from 'react-native' should be removed to avoid warnings
expo.dev
. Use SafeAreaProvider at app root (already in App.tsx) and SafeAreaView from context in screens (done).

Notifications: Use import { Notifications } from 'expo-notifications' (if not already) and remove any deprecated methods. Expo 54 removed some deprecated functions in expo-notifications (like scheduleNotificationAsync parameter changes). Check our notification handling code against expo-notifications 0.32 docs to ensure it’s up-to-date. (E.g., getDevicePushTokenAsync was moved out long ago, etc. If we used any such function, update it.)

Verify & Fix Reanimated Worklets – High Priority.
Go through animation-related code to ensure compatibility with Reanimated v4:

Add 'worklet'; directives to any missing worklet functions (gesture handlers, animation updates). The audit indicated this was done for all necessary places, but double-check key components like VideoRecordScreen.tsx (for the record button animation) and any custom animated components.

Remove or refactor any usage of deprecated Reanimated API (e.g., if useAnimatedScrollHandler was causing issues with FlashList, ensure it remains commented or find an alternate approach).

Test animations after making these changes. If an animation still doesn’t run, add console.logs in the worklet to see if it’s being called. Common fix is adding missing dependencies or using runOnJS correctly.

The result should be smooth animations with no errors. When the record button is tapped, its Reanimated scale animation should work (as a test case).

Update TypeScript and Types – Medium Priority.
Upgrade TypeScript to ~5.9 and update type definitions:

Bump TypeScript devDependency to 5.8 or 5.9 (Expo 54 supports 5.9).

Update @types/react and @types/react-native to the latest (to reflect React 19 and RN 0.81). This helps catch any new typing issues (for example, RN 0.81’s types might mark SafeAreaView as deprecated).

Add TS config settings "jsx": "react-jsx" and "jsxImportSource": "nativewind" to align TS with our Babel config, preventing any TSX inconsistencies.

Run tsc --noEmit to find and fix any new errors. Address them (they might be trivial, like stricter type checks or needing to adjust a few types).

Thorough Testing in Expo Go and Dev Build – Medium Priority.
After implementing the above, test the app in Expo Go and in a development build:

Expo Go: It should launch without red screens. Some advanced functionality (animations, voice) might be inert or produce warnings, but the app should degrade gracefully (no crashes). Test basic flows – ensure no missing module errors. If any occur (e.g., if ffmpeg-kit or voice is referenced at runtime), implement guards. For instance, load those modules dynamically or wrap calls in if (NativeModules.X).

Dev Client (Fabric enabled): This is the real test for Reanimated v4 and new arch. Build a dev client (eas build -p ios --profile development, similarly for Android). Run the app and test:

Animations: verify things like the AnimatedActionButton, bottom sheet interactions, etc.

Navigations: ensure going back on Android shows the predictive animation if enabled.

Camera/Video: recording and playback (these use expo-camera, expo-video, ffmpeg-kit). Especially test video recording -> processing -> playback, since that pipeline involves FileSystem, ffmpeg-kit, and expo-video together.

Push notifications (if configured with actual credentials) – ensure the app can get a push token (on a physical device).

Supabase connectivity: just ensure data fetches still work (they should, as that’s pure JS).

Fix any issues found during testing:

For example, if recording a video fails, see if it’s related to FileSystem changes or permission issues (maybe READ_MEDIA_* permissions on Android 13? We have those in app.json, so likely fine).

If any Crash occurs on dev build that didn’t on Expo Go, it could be related to new architecture (e.g., a race condition). Use Flipper’s CrashReporter or device logs to pinpoint it.

Cleanup and Optimize – Medium/Low Priority.

Remove no-longer-needed code/comments: For instance, the comment about disabling Reanimated due to NativeWind can likely be removed once things work – re-enable that code if it was an animation and test it. Clean up any TODOs or console logs added during debugging the upgrade.

Performance checks: Profile the app start time and memory. Expo 54 might have slight differences. If any regressions, investigate (e.g., maybe disable development logging or heavy debugging in production builds).

UX Regression testing: Ensure that the upgrade didn’t inadvertently alter any UI (font rendering, spacing, etc.). Sometimes upgrading React or RN can change minor things. Do a visual pass through all screens. Pay attention to SafeArea usage (content not cut off) and text (React 19 might handle some text breaking slightly differently).

Update documentation: Our repo has many markdown docs (upgrade summaries, etc.). Update them to reflect completion of the upgrade. For example, mark tasks as done in EXPO_SDK_54_UPGRADE_TODO.md, update version numbers, and note any new known issues in NewBugs.md if discovered.

By following this prioritized list, we address critical breaking changes first (so the app runs), then move on to optimizations and nice-to-haves. The end result will be a codebase fully running on Expo 54 + RN 0.81 + Reanimated 4, using best practices and ready for future updates. All major integration points (Zustand state, NativeWind styles, Supabase API, media features) will continue to work in both development and production environments, with improved performance and up-to-date dependencies across the board.

Sources:

Expo SDK 54 Changelog – highlights of breaking changes (SafeAreaView, expo-av, notifications config, Reanimated 4, etc.)
expo.dev
expo.dev

React Native 0.81 release notes – Android 14 support, SafeArea deprecation, JSC removal
reactnative.dev
reactnative.dev

Reanimated 4 migration guide – new architecture requirement and plugin rename
docs.swmansion.com
docs.swmansion.com

Expo Upgrade Guide and community findings – best practices for config (Metro exports flag, newArch setting)

Project’s upgrade documentation – confirmation of version alignment and fixed issues