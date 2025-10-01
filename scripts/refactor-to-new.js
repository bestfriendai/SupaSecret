#!/usr/bin/env node

/**
 * Automated Refactoring Script for Toxic Confessions
 *
 * This script automates the complete refactoring of the Toxic Confessions app
 * from the current structure to a modern, clean architecture using:
 * - Expo Router 4.0 (file-based routing)
 * - React Query for server state
 * - Feature-first folder structure
 * - Dual-mode support (Expo Go + Dev Build)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.join(__dirname, "..");
const NEW_DIR = path.join(ROOT_DIR, "new");
const SRC_DIR = path.join(ROOT_DIR, "src");

console.log("🚀 Starting Toxic Confessions Refactoring");
console.log("==========================================\n");

// Helper functions
function log(message, type = "info") {
  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
    progress: "⏳",
  };
  console.log(`${icons[type]} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(source, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(source, dest);
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

// Phase 1: Install Dependencies
function phase1_installDependencies() {
  log("Phase 1: Installing Dependencies", "progress");

  const dependencies = [
    // State management
    "zustand@^5.0.8",
    "@tanstack/react-query@^5.62.0",

    // Forms & validation
    "react-hook-form@^7.54.0",
    "zod@^3.24.0",
    "@hookform/resolvers@^3.9.0",

    // UI/Styling
    "nativewind@^4.1.23",
    "clsx@^2.1.1",
    "tailwind-merge@^3.3.1",
    "class-variance-authority@^0.7.0",

    // Backend
    "@supabase/supabase-js@^2.42.7",

    // Flash List
    "@shopify/flash-list@2.0.2",

    // Bottom sheet
    "@gorhom/bottom-sheet@^4.6.1",

    // Video & Camera
    "react-native-vision-camera@^4.7.2",

    // Ads & Subscriptions
    "react-native-google-mobile-ads@^13.2.0",
    "react-native-purchases@^9.4.2",

    // Other utilities
    "date-fns@^2.30.0",
    "uuid@^13.0.0",
  ];

  const devDependencies = [
    "tailwindcss@^3.4.17",
    "@typescript-eslint/eslint-plugin@^7.7.1",
    "@typescript-eslint/parser@^7.7.1",
    "prettier@^3.2.5",
    "@types/uuid@^10.0.0",
  ];

  try {
    log("Installing production dependencies...", "progress");
    execSync(`cd ${NEW_DIR} && npm install ${dependencies.join(" ")}`, { stdio: "inherit" });

    log("Installing dev dependencies...", "progress");
    execSync(`cd ${NEW_DIR} && npm install -D ${devDependencies.join(" ")}`, { stdio: "inherit" });

    // Install Expo packages
    log("Installing Expo packages...", "progress");
    execSync(
      `cd ${NEW_DIR} && npx expo install expo-secure-store expo-file-system expo-image expo-av expo-video expo-camera expo-haptics expo-sharing expo-application expo-device expo-blur expo-linear-gradient`,
      { stdio: "inherit" },
    );

    log("Dependencies installed successfully", "success");
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, "error");
    throw error;
  }
}

// Phase 2: Setup Configuration Files
function phase2_setupConfiguration() {
  log("Phase 2: Setting up Configuration Files", "progress");

  // Create package.json scripts
  const packageJsonPath = path.join(NEW_DIR, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  packageJson.scripts = {
    ...packageJson.scripts,
    lint: "eslint . --ext .ts,.tsx",
    typecheck: "tsc --noEmit",
    format: 'prettier --write "**/*.{ts,tsx,js,jsx,json,md}"',
  };

  packageJson.name = "toxic-confessions";

  writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Create tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F3FF',
          100: '#CCE7FF',
          200: '#99CFFF',
          300: '#66B7FF',
          400: '#339FFF',
          500: '#1D9BF0',
          600: '#1A8CD8',
          700: '#177DC0',
          800: '#146DA8',
          900: '#115E90',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#2F3336',
          900: '#000000',
        },
      },
    },
  },
  plugins: [],
};`;

  writeFile(path.join(NEW_DIR, "tailwind.config.js"), tailwindConfig);

  // Create global.css
  const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

  writeFile(path.join(NEW_DIR, "global.css"), globalCss);

  // Update tsconfig.json
  const tsConfig = {
    extends: "expo/tsconfig.base",
    compilerOptions: {
      jsx: "react-jsx",
      jsxImportSource: "nativewind",
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      module: "esnext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      paths: {
        "@/*": ["./src/*"],
        "@features/*": ["./src/features/*"],
        "@shared/*": ["./src/shared/*"],
        "@lib/*": ["./src/lib/*"],
        "@config/*": ["./config/*"],
      },
    },
    include: ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
    exclude: ["node_modules"],
  };

  writeFile(path.join(NEW_DIR, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));

  // Create nativewind-env.d.ts
  const nativewindEnv = `/// <reference types="nativewind/types" />`;
  writeFile(path.join(NEW_DIR, "nativewind-env.d.ts"), nativewindEnv);

  // Create app.config.ts
  const appConfig = `export default {
  expo: {
    name: "Toxic Confessions",
    slug: "toxic-confessions",
    scheme: "toxicconfessions",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    newArchEnabled: true,
    experiments: {
      typedRoutes: true,
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
            newArchEnabled: true,
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            newArchEnabled: true,
          },
        },
      ],
    ],
    ios: {
      bundleIdentifier: "com.toxic.confessions",
      supportsTablet: true,
    },
    android: {
      package: "com.toxic.confessions",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-foreground.png",
        backgroundColor: "#000000",
      },
    },
  },
};`;

  writeFile(path.join(NEW_DIR, "app.config.ts"), appConfig);

  // Create .eslintrc.js
  const eslintConfig = `module.exports = {
  extends: ['expo', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};`;

  writeFile(path.join(NEW_DIR, ".eslintrc.js"), eslintConfig);

  // Create .prettierrc
  const prettierConfig = `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}`;

  writeFile(path.join(NEW_DIR, ".prettierrc"), prettierConfig);

  log("Configuration files created successfully", "success");
}

// Phase 3: Create Project Structure
function phase3_createProjectStructure() {
  log("Phase 3: Creating Project Structure", "progress");

  const directories = [
    // App routes
    "app/(auth)",
    "app/(tabs)",
    "app/confession",
    "app/settings",
    "app/video",

    // Source structure
    "src/features/auth/components",
    "src/features/auth/hooks",
    "src/features/auth/services",
    "src/features/auth/store",
    "src/features/auth/types",
    "src/features/auth/schemas",

    "src/features/confessions/components",
    "src/features/confessions/hooks",
    "src/features/confessions/services",
    "src/features/confessions/store",
    "src/features/confessions/types",
    "src/features/confessions/data",

    "src/features/video/components",
    "src/features/video/hooks",
    "src/features/video/services",
    "src/features/video/types",
    "src/features/video/utils",

    "src/features/user/components",
    "src/features/user/hooks",
    "src/features/user/services",
    "src/features/user/types",

    "src/features/ads/components",
    "src/features/ads/hooks",
    "src/features/ads/services",
    "src/features/ads/types",
    "src/features/ads/utils",

    "src/features/subscription/components",
    "src/features/subscription/hooks",
    "src/features/subscription/services",
    "src/features/subscription/types",

    "src/features/comments/components",
    "src/features/comments/hooks",
    "src/features/comments/services",

    "src/features/trending/components",
    "src/features/trending/hooks",
    "src/features/trending/services",

    // Shared structure
    "src/shared/components/ui/Button",
    "src/shared/components/ui/Input",
    "src/shared/components/ui/Card",
    "src/shared/components/ui/Modal",
    "src/shared/components/layout",
    "src/shared/components/feedback/Loading",
    "src/shared/components/feedback/Error",
    "src/shared/components/feedback/Toast",

    "src/shared/hooks",
    "src/shared/utils/format",
    "src/shared/utils/validation",
    "src/shared/types",
    "src/shared/constants/theme",
    "src/shared/schemas",

    // Lib
    "src/lib",

    // Providers
    "src/providers",

    // Config
    "config",
  ];

  directories.forEach((dir) => {
    ensureDir(path.join(NEW_DIR, dir));
  });

  log("Project structure created successfully", "success");
}

// Phase 4: Copy Assets
function phase4_copyAssets() {
  log("Phase 4: Copying Assets", "progress");

  const assetsSrc = path.join(ROOT_DIR, "assets");
  const assetsDest = path.join(NEW_DIR, "assets");

  if (fs.existsSync(assetsSrc)) {
    // Copy all assets
    const copyDirRecursive = (src, dest) => {
      ensureDir(dest);
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          copyDirRecursive(srcPath, destPath);
        } else {
          copyFile(srcPath, destPath);
        }
      }
    };

    copyDirRecursive(assetsSrc, assetsDest);
    log("Assets copied successfully", "success");
  } else {
    log("No assets folder found to copy", "warning");
  }
}

// Main execution
async function main() {
  try {
    log("Starting refactoring process...\\n", "progress");

    // Execute phases
    phase1_installDependencies();
    phase2_setupConfiguration();
    phase3_createProjectStructure();
    phase4_copyAssets();

    log("\\n==========================================", "success");
    log("Refactoring setup complete!", "success");
    log("\\nNext steps:", "info");
    log("1. cd new", "info");
    log("2. npm start", "info");
    log("3. Scan QR code with Expo Go", "info");
    log("\\nNote: Full code migration is in progress. This sets up the foundation.", "warning");
  } catch (error) {
    log(`\\nRefactoring failed: ${error.message}`, "error");
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
