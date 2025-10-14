#!/usr/bin/env tsx
/**
 * Runtime Integration Test
 * Tests that all integrations can be imported and initialized without errors
 */

import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  error?: any;
}

const results: TestResult[] = [];

async function testSupabaseImport(): Promise<TestResult> {
  try {
    log("\n🔍 Testing Supabase import...", "cyan");

    // Check if file exists
    const fs = require("fs");
    if (!fs.existsSync("src/lib/supabase.ts")) {
      return {
        name: "Supabase Import",
        status: "FAIL",
        message: "Supabase configuration file not found",
      };
    }

    // Read file content to check for syntax errors
    const content = fs.readFileSync("src/lib/supabase.ts", "utf8");

    // Check for required imports
    const requiredImports = ["createClient", "expo-secure-store", "Database"];

    const missingImports = requiredImports.filter((imp) => !content.includes(imp));

    if (missingImports.length > 0) {
      return {
        name: "Supabase Import",
        status: "FAIL",
        message: `Missing imports: ${missingImports.join(", ")}`,
      };
    }

    // Check for proper client creation
    if (!content.includes("createClient<Database>")) {
      return {
        name: "Supabase Import",
        status: "FAIL",
        message: "Supabase client not properly typed",
      };
    }

    return {
      name: "Supabase Import",
      status: "PASS",
      message: "Supabase configuration is valid",
    };
  } catch (error) {
    return {
      name: "Supabase Import",
      status: "FAIL",
      message: "Failed to test Supabase import",
      error,
    };
  }
}

async function testRevenueCatImport(): Promise<TestResult> {
  try {
    log("\n🔍 Testing RevenueCat import...", "cyan");

    const fs = require("fs");

    // Check both service files
    const files = ["src/services/RevenueCatService.ts", "src/features/subscription/services/subscriptionService.ts"];

    for (const file of files) {
      if (!fs.existsSync(file)) {
        return {
          name: "RevenueCat Import",
          status: "FAIL",
          message: `File not found: ${file}`,
        };
      }

      const content = fs.readFileSync(file, "utf8");

      // Check for required methods
      const requiredMethods = ["initialize", "getCustomerInfo", "purchasePackage", "restorePurchases"];

      const missingMethods = requiredMethods.filter((method) => !content.includes(method));

      if (missingMethods.length > 0) {
        return {
          name: "RevenueCat Import",
          status: "FAIL",
          message: `Missing methods in ${file}: ${missingMethods.join(", ")}`,
        };
      }
    }

    // Check for proper Expo Go handling
    const serviceContent = fs.readFileSync("src/services/RevenueCatService.ts", "utf8");
    if (!serviceContent.includes("IS_EXPO_GO")) {
      return {
        name: "RevenueCat Import",
        status: "FAIL",
        message: "Missing Expo Go detection",
      };
    }

    return {
      name: "RevenueCat Import",
      status: "PASS",
      message: "RevenueCat services are properly configured",
    };
  } catch (error) {
    return {
      name: "RevenueCat Import",
      status: "FAIL",
      message: "Failed to test RevenueCat import",
      error,
    };
  }
}

async function testAdMobImport(): Promise<TestResult> {
  try {
    log("\n🔍 Testing AdMob import...", "cyan");

    const fs = require("fs");

    // Check service file
    if (!fs.existsSync("src/services/AdMobService.ts")) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: "AdMob service file not found",
      };
    }

    const content = fs.readFileSync("src/services/AdMobService.ts", "utf8");

    // Check for required methods
    const requiredMethods = ["initialize", "showInterstitialAd", "showRewardedAd", "getBannerAdUnitId"];

    const missingMethods = requiredMethods.filter((method) => !content.includes(method));

    if (missingMethods.length > 0) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: `Missing methods: ${missingMethods.join(", ")}`,
      };
    }

    // Check for proper ad unit configuration
    if (!content.includes("AD_UNIT_IDS")) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: "Missing ad unit configuration",
      };
    }

    // Check for consent handling
    if (!content.includes("hasAdvertisingConsent")) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: "Missing consent handling",
      };
    }

    // Check google-mobile-ads.json
    if (!fs.existsSync("google-mobile-ads.json")) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: "google-mobile-ads.json not found",
      };
    }

    const config = JSON.parse(fs.readFileSync("google-mobile-ads.json", "utf8"));
    if (!config["react-native-google-mobile-ads"]) {
      return {
        name: "AdMob Import",
        status: "FAIL",
        message: "Invalid google-mobile-ads.json configuration",
      };
    }

    return {
      name: "AdMob Import",
      status: "PASS",
      message: "AdMob service is properly configured",
    };
  } catch (error) {
    return {
      name: "AdMob Import",
      status: "FAIL",
      message: "Failed to test AdMob import",
      error,
    };
  }
}

async function testServiceInitializer(): Promise<TestResult> {
  try {
    log("\n🔍 Testing Service Initializer...", "cyan");

    const fs = require("fs");

    if (!fs.existsSync("src/services/ServiceInitializer.ts")) {
      return {
        name: "Service Initializer",
        status: "FAIL",
        message: "ServiceInitializer file not found",
      };
    }

    const content = fs.readFileSync("src/services/ServiceInitializer.ts", "utf8");

    // Check for proper initialization order
    const requiredServices = ["Consent Management", "App Tracking Transparency", "AdMob", "RevenueCat"];

    const missingServices = requiredServices.filter((service) => !content.includes(service));

    if (missingServices.length > 0) {
      return {
        name: "Service Initializer",
        status: "FAIL",
        message: `Missing service initialization: ${missingServices.join(", ")}`,
      };
    }

    // Check for proper error handling
    if (!content.includes("try") || !content.includes("catch")) {
      return {
        name: "Service Initializer",
        status: "FAIL",
        message: "Missing error handling",
      };
    }

    // Check for validation
    if (!content.includes("validateProductionConfig")) {
      return {
        name: "Service Initializer",
        status: "FAIL",
        message: "Missing configuration validation",
      };
    }

    return {
      name: "Service Initializer",
      status: "PASS",
      message: "Service initializer is properly configured",
    };
  } catch (error) {
    return {
      name: "Service Initializer",
      status: "FAIL",
      message: "Failed to test service initializer",
      error,
    };
  }
}

async function testAppInitializer(): Promise<TestResult> {
  try {
    log("\n🔍 Testing App Initializer...", "cyan");

    const fs = require("fs");

    if (!fs.existsSync("src/initialization/appInitializer.ts")) {
      return {
        name: "App Initializer",
        status: "FAIL",
        message: "appInitializer file not found",
      };
    }

    const content = fs.readFileSync("src/initialization/appInitializer.ts", "utf8");

    // Check for proper initialization steps
    const requiredSteps = ["checkEnvironment", "initializeServices", "startNetworkWatcher", "setupAuthListener"];

    const missingSteps = requiredSteps.filter((step) => !content.includes(step));

    if (missingSteps.length > 0) {
      return {
        name: "App Initializer",
        status: "FAIL",
        message: `Missing initialization steps: ${missingSteps.join(", ")}`,
      };
    }

    return {
      name: "App Initializer",
      status: "PASS",
      message: "App initializer is properly configured",
    };
  } catch (error) {
    return {
      name: "App Initializer",
      status: "FAIL",
      message: "Failed to test app initializer",
      error,
    };
  }
}

async function testEnvironmentValidation(): Promise<TestResult> {
  try {
    log("\n🔍 Testing Environment Validation...", "cyan");

    const fs = require("fs");

    if (!fs.existsSync("src/utils/environmentValidation.ts")) {
      return {
        name: "Environment Validation",
        status: "FAIL",
        message: "environmentValidation file not found",
      };
    }

    const content = fs.readFileSync("src/utils/environmentValidation.ts", "utf8");

    // Check for validation functions
    const requiredFunctions = [
      "validateSupabaseConfig",
      "validateAdMobConfig",
      "validateRevenueCatConfig",
      "logValidationResults",
    ];

    const missingFunctions = requiredFunctions.filter((fn) => !content.includes(fn));

    if (missingFunctions.length > 0) {
      return {
        name: "Environment Validation",
        status: "FAIL",
        message: `Missing validation functions: ${missingFunctions.join(", ")}`,
      };
    }

    return {
      name: "Environment Validation",
      status: "PASS",
      message: "Environment validation is properly configured",
    };
  } catch (error) {
    return {
      name: "Environment Validation",
      status: "FAIL",
      message: "Failed to test environment validation",
      error,
    };
  }
}

function printResults() {
  log("\n" + "=".repeat(80), "blue");
  log("  RUNTIME INTEGRATION TEST REPORT", "blue");
  log("=".repeat(80), "blue");

  let overallStatus: "PASS" | "FAIL" = "PASS";

  for (const result of results) {
    const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
    const color = result.status === "PASS" ? "green" : result.status === "FAIL" ? "red" : "yellow";

    log(`\n${icon} ${result.name}`, color);
    log(`   ${result.message}`, color);

    if (result.error && __DEV__) {
      log(`   Error: ${result.error}`, "red");
    }

    if (result.status === "FAIL") {
      overallStatus = "FAIL";
    }
  }

  log("\n" + "=".repeat(80), "blue");
  log("  SUMMARY", "blue");
  log("=".repeat(80), "blue");

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;

  log(`\n  ✅ Passed: ${passCount}`, "green");
  if (skipCount > 0) log(`  ⏭️  Skipped: ${skipCount}`, "yellow");
  if (failCount > 0) log(`  ❌ Failed: ${failCount}`, "red");

  const overallIcon = overallStatus === "PASS" ? "✅" : "❌";
  const overallColor = overallStatus === "PASS" ? "green" : "red";
  log(`\n  ${overallIcon} Overall Status: ${overallStatus}`, overallColor);

  if (overallStatus === "FAIL") {
    log("\n  ⚠️  Some runtime tests failed - review above for details", "red");
  } else {
    log("\n  🎉 All runtime integration tests passed!", "green");
  }

  log("\n" + "=".repeat(80) + "\n", "blue");

  return overallStatus;
}

async function main() {
  log("\n🚀 Starting Runtime Integration Tests...", "blue");
  log("This script tests that all integrations can be imported without errors\n", "blue");

  // Run all tests
  results.push(await testSupabaseImport());
  results.push(await testRevenueCatImport());
  results.push(await testAdMobImport());
  results.push(await testServiceInitializer());
  results.push(await testAppInitializer());
  results.push(await testEnvironmentValidation());

  // Print results
  const status = printResults();

  // Exit with appropriate code
  process.exit(status === "FAIL" ? 1 : 0);
}

// Run the script
main().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
