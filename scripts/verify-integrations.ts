#!/usr/bin/env tsx
/**
 * Comprehensive Integration Verification Script
 * Tests Supabase, RevenueCat, and AdMob integrations
 */

import * as dotenv from "dotenv";
import { Platform } from "react-native";

// Load environment variables
dotenv.config();

interface ValidationResult {
  service: string;
  status: "PASS" | "FAIL" | "WARNING";
  checks: {
    name: string;
    status: "PASS" | "FAIL" | "WARNING";
    message: string;
  }[];
}

const results: ValidationResult[] = [];

// Color codes for terminal output
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

function checkEnvVar(name: string, required: boolean = true): { exists: boolean; value?: string } {
  const value = process.env[name];
  const exists = !!value && value.trim() !== "";
  return { exists, value: exists ? value : undefined };
}

function validateSupabase(): ValidationResult {
  log("\n🔍 Validating Supabase Integration...", "cyan");

  const result: ValidationResult = {
    service: "Supabase",
    status: "PASS",
    checks: [],
  };

  // Check URL
  const urlCheck = checkEnvVar("EXPO_PUBLIC_SUPABASE_URL");
  if (!urlCheck.exists) {
    result.checks.push({
      name: "Supabase URL",
      status: "FAIL",
      message: "EXPO_PUBLIC_SUPABASE_URL is not set",
    });
    result.status = "FAIL";
  } else {
    const url = urlCheck.value!;
    if (!url.startsWith("https://")) {
      result.checks.push({
        name: "Supabase URL",
        status: "FAIL",
        message: "URL must use HTTPS",
      });
      result.status = "FAIL";
    } else if (!url.includes("supabase.co") && !url.includes("supabase.in")) {
      result.checks.push({
        name: "Supabase URL",
        status: "WARNING",
        message: "URL does not look like a standard Supabase URL",
      });
      if (result.status === "PASS") result.status = "WARNING";
    } else {
      result.checks.push({
        name: "Supabase URL",
        status: "PASS",
        message: `Valid Supabase URL configured`,
      });
    }
  }

  // Check Anon Key
  const keyCheck = checkEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!keyCheck.exists) {
    result.checks.push({
      name: "Supabase Anon Key",
      status: "FAIL",
      message: "EXPO_PUBLIC_SUPABASE_ANON_KEY is not set",
    });
    result.status = "FAIL";
  } else {
    const key = keyCheck.value!;
    const parts = key.split(".");
    if (parts.length < 3) {
      result.checks.push({
        name: "Supabase Anon Key",
        status: "FAIL",
        message: "Anon key does not look like a valid JWT",
      });
      result.status = "FAIL";
    } else {
      result.checks.push({
        name: "Supabase Anon Key",
        status: "PASS",
        message: "Valid JWT format detected",
      });
    }
  }

  // Check configuration files
  const configFiles = [
    "src/lib/supabase.ts",
    "src/features/auth/services/authService.ts",
    "src/utils/environmentValidation.ts",
  ];

  for (const file of configFiles) {
    try {
      const fs = require("fs");
      if (fs.existsSync(file)) {
        result.checks.push({
          name: `Config File: ${file}`,
          status: "PASS",
          message: "File exists",
        });
      } else {
        result.checks.push({
          name: `Config File: ${file}`,
          status: "FAIL",
          message: "File not found",
        });
        result.status = "FAIL";
      }
    } catch (error) {
      result.checks.push({
        name: `Config File: ${file}`,
        status: "WARNING",
        message: `Could not verify: ${error}`,
      });
      if (result.status === "PASS") result.status = "WARNING";
    }
  }

  return result;
}

function validateRevenueCat(): ValidationResult {
  log("\n🔍 Validating RevenueCat Integration...", "cyan");

  const result: ValidationResult = {
    service: "RevenueCat",
    status: "PASS",
    checks: [],
  };

  // Check iOS Key
  const iosKeyCheck = checkEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_KEY");
  if (!iosKeyCheck.exists) {
    result.checks.push({
      name: "RevenueCat iOS Key",
      status: "FAIL",
      message: "EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set",
    });
    result.status = "FAIL";
  } else {
    const key = iosKeyCheck.value!;
    if (!key.startsWith("appl_")) {
      result.checks.push({
        name: "RevenueCat iOS Key",
        status: "FAIL",
        message: 'iOS key must start with "appl_"',
      });
      result.status = "FAIL";
    } else {
      result.checks.push({
        name: "RevenueCat iOS Key",
        status: "PASS",
        message: "Valid iOS key format",
      });
    }
  }

  // Check Android Key
  const androidKeyCheck = checkEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY");
  if (!androidKeyCheck.exists) {
    result.checks.push({
      name: "RevenueCat Android Key",
      status: "FAIL",
      message: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is not set",
    });
    result.status = "FAIL";
  } else {
    const key = androidKeyCheck.value!;
    if (!key.startsWith("goog_")) {
      result.checks.push({
        name: "RevenueCat Android Key",
        status: "FAIL",
        message: 'Android key must start with "goog_"',
      });
      result.status = "FAIL";
    } else {
      result.checks.push({
        name: "RevenueCat Android Key",
        status: "PASS",
        message: "Valid Android key format",
      });
    }
  }

  // Check package.json for dependency
  try {
    const fs = require("fs");
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (packageJson.dependencies["react-native-purchases"]) {
      result.checks.push({
        name: "RevenueCat Package",
        status: "PASS",
        message: `Installed: ${packageJson.dependencies["react-native-purchases"]}`,
      });
    } else {
      result.checks.push({
        name: "RevenueCat Package",
        status: "FAIL",
        message: "react-native-purchases not found in dependencies",
      });
      result.status = "FAIL";
    }
  } catch (error) {
    result.checks.push({
      name: "RevenueCat Package",
      status: "WARNING",
      message: `Could not verify: ${error}`,
    });
    if (result.status === "PASS") result.status = "WARNING";
  }

  // Check configuration files
  const configFiles = [
    "src/services/RevenueCatService.ts",
    "src/features/subscription/services/subscriptionService.ts",
    "src/config/production.ts",
  ];

  for (const file of configFiles) {
    try {
      const fs = require("fs");
      if (fs.existsSync(file)) {
        result.checks.push({
          name: `Config File: ${file}`,
          status: "PASS",
          message: "File exists",
        });
      } else {
        result.checks.push({
          name: `Config File: ${file}`,
          status: "FAIL",
          message: "File not found",
        });
        result.status = "FAIL";
      }
    } catch (error) {
      result.checks.push({
        name: `Config File: ${file}`,
        status: "WARNING",
        message: `Could not verify: ${error}`,
      });
      if (result.status === "PASS") result.status = "WARNING";
    }
  }

  return result;
}

function validateAdMob(): ValidationResult {
  log("\n🔍 Validating AdMob Integration...", "cyan");

  const result: ValidationResult = {
    service: "AdMob",
    status: "PASS",
    checks: [],
  };

  const adUnitKeys = [
    { key: "EXPO_PUBLIC_ADMOB_IOS_APP_ID", name: "iOS App ID", platform: "iOS" },
    { key: "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", name: "Android App ID", platform: "Android" },
    { key: "EXPO_PUBLIC_ADMOB_IOS_BANNER_ID", name: "iOS Banner ID", platform: "iOS" },
    { key: "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID", name: "Android Banner ID", platform: "Android" },
    { key: "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID", name: "iOS Interstitial ID", platform: "iOS" },
    { key: "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID", name: "Android Interstitial ID", platform: "Android" },
    { key: "EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID", name: "iOS Rewarded ID", platform: "iOS" },
    { key: "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID", name: "Android Rewarded ID", platform: "Android" },
  ];

  for (const { key, name, platform } of adUnitKeys) {
    const check = checkEnvVar(key, false);
    if (!check.exists) {
      result.checks.push({
        name,
        status: "WARNING",
        message: `${key} is not set`,
      });
      if (result.status === "PASS") result.status = "WARNING";
    } else {
      const value = check.value!;
      if (!value.startsWith("ca-app-pub-")) {
        result.checks.push({
          name,
          status: "FAIL",
          message: 'Ad unit must start with "ca-app-pub-"',
        });
        result.status = "FAIL";
      } else if (value.includes("3940256099942544")) {
        result.checks.push({
          name,
          status: "WARNING",
          message: "Using Google test ad unit (OK for development)",
        });
        if (result.status === "PASS") result.status = "WARNING";
      } else {
        result.checks.push({
          name,
          status: "PASS",
          message: "Valid production ad unit",
        });
      }
    }
  }

  // Check package.json for dependency
  try {
    const fs = require("fs");
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (packageJson.dependencies["react-native-google-mobile-ads"]) {
      result.checks.push({
        name: "AdMob Package",
        status: "PASS",
        message: `Installed: ${packageJson.dependencies["react-native-google-mobile-ads"]}`,
      });
    } else {
      result.checks.push({
        name: "AdMob Package",
        status: "FAIL",
        message: "react-native-google-mobile-ads not found in dependencies",
      });
      result.status = "FAIL";
    }
  } catch (error) {
    result.checks.push({
      name: "AdMob Package",
      status: "WARNING",
      message: `Could not verify: ${error}`,
    });
    if (result.status === "PASS") result.status = "WARNING";
  }

  // Check google-mobile-ads.json
  try {
    const fs = require("fs");
    if (fs.existsSync("google-mobile-ads.json")) {
      const config = JSON.parse(fs.readFileSync("google-mobile-ads.json", "utf8"));
      if (config["react-native-google-mobile-ads"]) {
        result.checks.push({
          name: "google-mobile-ads.json",
          status: "PASS",
          message: "Configuration file exists and is valid",
        });
      } else {
        result.checks.push({
          name: "google-mobile-ads.json",
          status: "WARNING",
          message: "Configuration file exists but may be invalid",
        });
        if (result.status === "PASS") result.status = "WARNING";
      }
    } else {
      result.checks.push({
        name: "google-mobile-ads.json",
        status: "FAIL",
        message: "Configuration file not found",
      });
      result.status = "FAIL";
    }
  } catch (error) {
    result.checks.push({
      name: "google-mobile-ads.json",
      status: "WARNING",
      message: `Could not verify: ${error}`,
    });
    if (result.status === "PASS") result.status = "WARNING";
  }

  return result;
}

function printResults() {
  log("\n" + "=".repeat(80), "blue");
  log("  INTEGRATION VERIFICATION REPORT", "blue");
  log("=".repeat(80), "blue");

  let overallStatus: "PASS" | "FAIL" | "WARNING" = "PASS";

  for (const result of results) {
    log(`\n📦 ${result.service}`, "cyan");
    log("─".repeat(80), "cyan");

    for (const check of result.checks) {
      const icon = check.status === "PASS" ? "✅" : check.status === "FAIL" ? "❌" : "⚠️";
      const color = check.status === "PASS" ? "green" : check.status === "FAIL" ? "red" : "yellow";
      log(`  ${icon} ${check.name}: ${check.message}`, color);
    }

    const statusIcon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
    const statusColor = result.status === "PASS" ? "green" : result.status === "FAIL" ? "red" : "yellow";
    log(`\n  Overall Status: ${statusIcon} ${result.status}`, statusColor);

    if (result.status === "FAIL") {
      overallStatus = "FAIL";
    } else if (result.status === "WARNING" && overallStatus === "PASS") {
      overallStatus = "WARNING";
    }
  }

  log("\n" + "=".repeat(80), "blue");
  log("  SUMMARY", "blue");
  log("=".repeat(80), "blue");

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const warnCount = results.filter((r) => r.status === "WARNING").length;

  log(`\n  ✅ Passed: ${passCount}`, "green");
  if (warnCount > 0) log(`  ⚠️  Warnings: ${warnCount}`, "yellow");
  if (failCount > 0) log(`  ❌ Failed: ${failCount}`, "red");

  const overallIcon = overallStatus === "PASS" ? "✅" : overallStatus === "FAIL" ? "❌" : "⚠️";
  const overallColor = overallStatus === "PASS" ? "green" : overallStatus === "FAIL" ? "red" : "yellow";
  log(`\n  ${overallIcon} Overall Status: ${overallStatus}`, overallColor);

  if (overallStatus === "FAIL") {
    log("\n  ⚠️  Action Required: Fix the failed checks above", "red");
    log("  📖 See .env.example for required environment variables", "yellow");
  } else if (overallStatus === "WARNING") {
    log("\n  ℹ️  Some warnings detected - review above for details", "yellow");
  } else {
    log("\n  🎉 All integrations are properly configured!", "green");
  }

  log("\n" + "=".repeat(80) + "\n", "blue");

  return overallStatus;
}

async function main() {
  log("\n🚀 Starting Integration Verification...", "blue");
  log("This script will verify Supabase, RevenueCat, and AdMob configurations\n", "blue");

  // Run all validations
  results.push(validateSupabase());
  results.push(validateRevenueCat());
  results.push(validateAdMob());

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
