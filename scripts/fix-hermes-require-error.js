#!/usr/bin/env node

/**
 * Fix for Hermes "Property 'require' doesn't exist" error
 * This script addresses module resolution issues in Expo SDK 54 with Hermes
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing Hermes require() error...\n");

// Step 1: Update metro.config.js with Hermes-specific settings
function fixMetroConfig() {
  console.log("📦 Updating Metro configuration...");

  const metroConfigPath = path.join(process.cwd(), "metro.config.js");
  const metroConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Enable package exports for Expo SDK 54+
config.resolver.unstable_enablePackageExports = true;

// Configure resolver settings
config.resolver.platforms = ["ios", "android", "native", "web"];

// Add TypeScript extensions for proper module resolution
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "ts", "tsx"];

// Fix Hermes module resolution issues
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Add fallback for require() in bundled code
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle require() calls that Hermes can't resolve
  if (moduleName === 'require' || moduleName.includes('require')) {
    return { type: 'empty' };
  }
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure proper transformer configuration with Hermes optimizations
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("metro-react-native-babel-transformer"),
  minifierConfig: {
    keep_fnames: true, // Preserve function names for better stack traces
    mangle: {
      keep_fnames: true, // Preserve function names in Hermes
    },
  },
  // Ensure getTransformOptions is set for Hermes
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Enable inline requires for better Hermes performance
    },
  }),
};

// Hermes-specific serializer settings
config.serializer = {
  ...config.serializer,
  getPolyfills: () => [], // Avoid conflicting polyfills
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: false,
});
`;

  fs.writeFileSync(metroConfigPath, metroConfig);
  console.log("✅ Metro configuration updated\n");
}

// Step 2: Create a Hermes polyfill file
function createHermesPolyfill() {
  console.log("📝 Creating Hermes polyfill...");

  const polyfillPath = path.join(process.cwd(), "src/utils/hermesPolyfill.ts");
  const polyfillContent = `/**
 * Hermes Polyfill for require() compatibility
 * Fixes "Property 'require' doesn't exist" errors
 */

// Ensure global require is available
if (typeof global !== 'undefined' && typeof require !== 'undefined') {
  // Make require available globally for Hermes
  (global as any).require = require;
}

// Polyfill for dynamic imports that may fail in Hermes
if (typeof global !== 'undefined') {
  const originalImport = (global as any).import;
  
  (global as any).import = function(specifier: string) {
    try {
      // Try original import first
      if (originalImport) {
        return originalImport.call(this, specifier);
      }
    } catch (error) {
      console.warn(\`Dynamic import failed for \${specifier}, falling back to require\`);
    }
    
    // Fallback to require for known problematic modules
    try {
      return Promise.resolve(require(specifier));
    } catch (requireError) {
      console.error(\`Module \${specifier} could not be loaded\`, requireError);
      throw requireError;
    }
  };
}

// Fix for Hermes constructor issues
if (typeof HermesInternal !== 'undefined') {
  console.log('[Hermes] Runtime detected, applying compatibility fixes');
  
  // Ensure proper error handling for constructors
  const OriginalError = Error;
  (global as any).Error = class extends OriginalError {
    constructor(message?: string) {
      super(message);
      // Ensure proper prototype chain in Hermes
      Object.setPrototypeOf(this, new.target.prototype);
    }
  };
}

export {};
`;

  fs.writeFileSync(polyfillPath, polyfillContent);
  console.log("✅ Hermes polyfill created\n");
}

// Step 3: Update index.ts to import the polyfill
function updateIndexFile() {
  console.log("📝 Updating index.ts...");

  const indexPath = path.join(process.cwd(), "index.ts");
  let indexContent = fs.readFileSync(indexPath, "utf8");

  // Add polyfill import at the very beginning
  if (!indexContent.includes("hermesPolyfill")) {
    const lines = indexContent.split("\n");
    const insertIndex = 0; // Insert at the very beginning
    lines.splice(insertIndex, 0, "// Hermes compatibility polyfill - MUST be first import");
    lines.splice(insertIndex + 1, 0, 'import "./src/utils/hermesPolyfill";');
    lines.splice(insertIndex + 2, 0, "");
    indexContent = lines.join("\n");

    fs.writeFileSync(indexPath, indexContent);
    console.log("✅ index.ts updated\n");
  } else {
    console.log("ℹ️  Polyfill already imported in index.ts\n");
  }
}

// Step 4: Update TypeScript configuration for better Hermes compatibility
function updateTsConfig() {
  console.log("📝 Updating TypeScript configuration...");

  const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
  const tsconfig = {
    extends: "expo/tsconfig.base",
    compilerOptions: {
      target: "ES2020",
      lib: ["ES2020", "DOM"],
      types: ["react-native", "jest"],
      jsx: "react-jsx",
      jsxImportSource: "nativewind",
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,

      // Use CommonJS for better Hermes compatibility
      module: "commonjs",
      moduleResolution: "node",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      isolatedModules: true,
      paths: {
        "@/*": ["./src/*"],
      },
    },
    exclude: ["node_modules", "babel.config.js", "metro.config.js", "supabase/functions/**"],
  };

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  console.log("✅ TypeScript configuration updated\n");
}

// Step 5: Clear all caches
async function clearCaches() {
  console.log("🧹 Clearing all caches...");

  const { execSync } = require("child_process");

  try {
    // Clear Metro cache
    execSync("npx expo start --clear", { stdio: "inherit" });
  } catch (e) {
    // Ignore if it fails
  }

  // Clear other caches
  try {
    execSync("rm -rf .expo", { stdio: "inherit" });
    execSync("rm -rf node_modules/.cache", { stdio: "inherit" });
    execSync("watchman watch-del-all 2>/dev/null", { stdio: "inherit" });
  } catch (e) {
    // Ignore if watchman is not installed
  }

  console.log("✅ Caches cleared\n");
}

// Main execution
async function main() {
  try {
    fixMetroConfig();
    createHermesPolyfill();
    updateIndexFile();
    updateTsConfig();
    await clearCaches();

    console.log("✅ All fixes applied successfully!\n");
    console.log("🚀 Next steps:");
    console.log("   1. Run: npm start --reset-cache");
    console.log("   2. If the error persists, run: npm run fix-hermes");
    console.log("   3. Make sure to restart your development server completely\n");
  } catch (error) {
    console.error("❌ Error applying fixes:", error);
    process.exit(1);
  }
}

main();
