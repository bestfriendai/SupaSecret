// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Monkey-patch path.relative to handle undefined values
const originalRelative = path.relative;
path.relative = function(from, to) {
  if (to === undefined || to === null) {
    console.warn('path.relative called with undefined "to" argument, using fallback');
    to = from || process.cwd();
  }
  if (from === undefined || from === null) {
    console.warn('path.relative called with undefined "from" argument, using fallback');
    from = process.cwd();
  }
  return originalRelative.call(this, from, to);
};

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add project root explicitly
config.projectRoot = __dirname;

// Add module resolution options
config.resolver = {
  ...config.resolver,
  useWatchman: false,
  resolverMainFields: ['react-native', 'browser', 'main'],
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs', 'mjs'],
  assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf', 'woff', 'woff2'],
};

// Simple transformer configuration that doesn't require additional packages
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Override serializer with path safety checks
config.serializer = {
  ...config.serializer,
  processModuleFilter: (module) => {
    // Ensure module has a path
    if (!module.path) {
      console.warn('Module missing path, adding placeholder');
      module.path = path.join(__dirname, 'node_modules', 'placeholder.js');
    }
    return true;
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
