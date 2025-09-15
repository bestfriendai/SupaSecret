# Babel Plugin Configuration Fix - September 2025

## ❌ The Error
```
ERROR  index.ts: Duplicate plugin/preset detected.
Duplicates detected are:
- react-native-worklets/plugin
- react-native-reanimated/plugin
```

## ✅ The Solution

### Problem Analysis
1. Reanimated v4 includes its own worklets functionality
2. Having both `react-native-worklets/plugin` and `react-native-reanimated/plugin` causes duplicates
3. Vision Camera uses `react-native-worklets-core` (different package)

### Fixed Configuration

**babel.config.js:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel"
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
          },
        },
      ],
      // Only use react-native-reanimated/plugin for v4
      "react-native-reanimated/plugin", // Must be absolutely last
    ],
  };
};
```

## 📦 Package Structure

- `react-native-reanimated@4.1.0` - Uses `react-native-worklets@0.5.1` internally
- `react-native-vision-camera@4.7.2` - Uses `react-native-worklets-core@1.6.2`
- Both packages can coexist without babel plugin conflicts

## 🔧 Key Points

1. **DO NOT** add both `react-native-worklets/plugin` and `react-native-reanimated/plugin`
2. **ONLY** use `react-native-reanimated/plugin` for Reanimated v4
3. The plugin **MUST** be last in the plugins array
4. Clear Metro cache after changes: `npx expo start --clear`

## 🚀 Commands to Fix

```bash
# 1. Update babel.config.js (remove duplicate plugins)
# 2. Clear all caches
npx expo start --clear
watchman watch-del '/Users/iamabillionaire/Downloads/SupaSecret'
watchman watch-project '/Users/iamabillionaire/Downloads/SupaSecret'

# 3. Restart Metro
npx expo start
```

## ✅ Verification

The bundler should start without any duplicate plugin errors and show:
```
Starting Metro Bundler
warning: Bundler cache is empty, rebuilding (this may take a minute)
```

No more duplicate plugin errors! 🎉