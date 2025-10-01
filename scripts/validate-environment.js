#!/usr/bin/env node

/**
 * Comprehensive Environment Variables Validation Script
 * Validates all required environment variables for ToxicConfessions app
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_VARS = [
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

const AI_VARS = ["EXPO_PUBLIC_OPENAI_API_KEY", "EXPO_PUBLIC_ANTHROPIC_API_KEY", "EXPO_PUBLIC_GROK_API_KEY"];

const OPTIONAL_VARS = [
  "EXPO_PUBLIC_GOOGLE_ANALYTICS_ID",
  "EXPO_PUBLIC_ONESIGNAL_APP_ID",
  "EXPO_PUBLIC_ENV",
  "EXPO_PUBLIC_PROJECT_ID",
  "EXPO_PUBLIC_BASE_URL",
  "EXPO_PUBLIC_FALLBACK_URL",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
];

const PLACEHOLDER_PATTERNS = [
  "your_",
  "YOUR_",
  "placeholder",
  "PLACEHOLDER",
  "example",
  "EXAMPLE",
  "test",
  "TEST",
  "demo",
  "DEMO",
];

function getEnvVarWithFallback(varName) {
  return process.env[varName] || process.env[`VIBECODE_${varName.replace("EXPO_PUBLIC_", "")}`];
}

function validateEnvironmentVariables() {
  console.log("🔍 Validating environment variables...");
  const issues = [];

  // Check required variables
  REQUIRED_VARS.forEach((varName) => {
    const value = getEnvVarWithFallback(varName);
    if (!value) {
      issues.push({ type: "missing", variable: varName, severity: "critical" });
    } else if (PLACEHOLDER_PATTERNS.some((pattern) => value.toLowerCase().includes(pattern))) {
      issues.push({ type: "placeholder", variable: varName, severity: "warning" });
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Check AI variables (recommended)
  AI_VARS.forEach((varName) => {
    const value = getEnvVarWithFallback(varName);
    if (!value) {
      issues.push({
        type: "missing",
        variable: varName,
        severity: "info",
        message: "AI features may not work without this key",
      });
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Check optional variables
  OPTIONAL_VARS.forEach((varName) => {
    const value = getEnvVarWithFallback(varName);
    if (value) {
      console.log(`ℹ️ ${varName}: Set`);
    }
  });

  return issues;
}

function validateConfigurationFiles() {
  console.log("🔍 Validating configuration files...");
  const issues = [];

  const configFiles = ["eas.json", "app.config.js", "src/lib/supabase.ts"];

  configFiles.forEach((file) => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      issues.push({ type: "missing_file", file, severity: "warning" });
    } else {
      console.log(`✅ ${file}: Exists`);
    }
  });

  return issues;
}

function validateSupabaseConnection() {
  console.log("🔍 Validating Supabase configuration...");
  const issues = [];

  const url = getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_URL");
  const key = getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (url && !url.startsWith("https://")) {
    issues.push({
      type: "invalid_format",
      variable: "EXPO_PUBLIC_SUPABASE_URL",
      severity: "warning",
      message: "Should start with https://",
    });
  }

  if (key && !key.startsWith("eyJ")) {
    issues.push({
      type: "invalid_format",
      variable: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      severity: "warning",
      message: "Should be a JWT token",
    });
  }

  if (url && key) {
    console.log("✅ Supabase configuration: Valid format");
  }

  return issues;
}

function reportIssues(issues) {
  if (issues.length === 0) {
    console.log("✅ All validations passed!");
    return true;
  }

  const groupedIssues = {
    critical: issues.filter((i) => i.severity === "critical"),
    warning: issues.filter((i) => i.severity === "warning"),
    info: issues.filter((i) => i.severity === "info"),
  };

  Object.entries(groupedIssues).forEach(([severity, issueList]) => {
    if (issueList.length === 0) return;

    const icon = severity === "critical" ? "❌" : severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`\n${icon} ${severity.toUpperCase()} ISSUES:`);

    issueList.forEach((issue) => {
      let message = `${issue.variable || issue.file}: ${issue.type}`;
      if (issue.message) message += ` - ${issue.message}`;
      console.log(`   ${message}`);
    });
  });

  return false;
}

function main() {
  console.log("🚀 Starting comprehensive environment validation...\n");

  const allIssues = [
    ...validateEnvironmentVariables(),
    ...validateConfigurationFiles(),
    ...validateSupabaseConnection(),
  ];

  console.log("\n" + "=".repeat(50));
  const success = reportIssues(allIssues);

  if (success) {
    console.log("\n🎉 Environment validation successful!");
    console.log("Next steps:");
    console.log("1. Run eas env:pull --environment development");
    console.log("2. Test with eas build --profile development");
    console.log("3. Deploy to production when ready");
  } else {
    console.log("\n❌ Validation failed. Please fix the issues above.");
    console.log("For help, see docs/ENVIRONMENT_SETUP.md");
  }

  return success;
}

// Run if executed directly
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main, validateEnvironmentVariables, validateConfigurationFiles, validateSupabaseConnection };
