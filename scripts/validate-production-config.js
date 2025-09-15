#!/usr/bin/env node
/*
 * Production configuration validator
 * Usage:
 *  - node scripts/validate-production-config.js
 *  - node scripts/validate-production-config.js --env-only
 *  - node scripts/validate-production-config.js --format=json
 *  - node scripts/validate-production-config.js --verbose
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((f) => [f.replace(/^--/, ""), true])
);
const kvArgs = Object.fromEntries(
  args
    .filter((a) => a.includes("="))
    .map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.replace(/^--/, ""), rest.join("=")];
    })
);

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const issues = [];
const addIssue = (section, key, message, severity = "medium") => {
  issues.push({ section, key, message, severity });
};

const isPlaceholder = (v) => /YOUR_|CHANGEME|REPLACE_ME/i.test(v || "");
const isUrl = (v) => {
  try {
    new URL(v);
    return true;
  } catch (_) {
    return false;
  }
};
const looksLikeJwt = (v) => typeof v === "string" && v.split(".").length >= 3;

function validateEnvVariables() {
  const required = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];
  const optional = [
    "EXPO_PUBLIC_PROJECT_ID",
    "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
    "EXPO_PUBLIC_ADMOB_IOS_BANNER_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID",
    "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID",
    "EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID",
    "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID_IOS",
    "EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID",
    "EXPO_PUBLIC_OPENAI_API_KEY",
    "EXPO_PUBLIC_ANTHROPIC_API_KEY",
    "EXPO_PUBLIC_GROK_API_KEY",
  ];

  for (const k of required) {
    const v = process.env[k];
    if (!v) addIssue("env", k, "Missing required environment variable", "critical");
    else if (k.includes("URL") && !isUrl(v)) addIssue("env", k, "Invalid URL format", "high");
    else if (k.includes("ANON_KEY") && !looksLikeJwt(v)) addIssue("env", k, "Anon key does not look like a JWT", "high");
    if (isPlaceholder(v)) addIssue("env", k, "Placeholder value detected", "critical");
  }

  for (const k of optional) {
    const v = process.env[k];
    if (v) {
      if (k.includes("URL") && !isUrl(v)) addIssue("env", k, "Invalid URL format", "medium");
      if (isPlaceholder(v)) addIssue("env", k, "Placeholder value detected", "high");
    }
  }
}

function validateAppJson() {
  const appJsonPath = path.join(process.cwd(), "app.json");
  const app = readJSON(appJsonPath);
  const expo = app.expo || {};

  if (!expo.runtimeVersion) addIssue("app.json", "runtimeVersion", "Missing runtimeVersion", "critical");
  if (!expo.updates || !expo.updates.enabled) addIssue("app.json", "updates.enabled", "Updates not enabled", "high");
  if (!expo.updates || !expo.updates.url) addIssue("app.json", "updates.url", "Updates URL missing", "high");

  if (!expo.ios || !expo.ios.buildNumber) addIssue("app.json", "ios.buildNumber", "Missing iOS buildNumber", "critical");
  if (!expo.android || typeof expo.android.versionCode !== "number")
    addIssue("app.json", "android.versionCode", "Missing Android versionCode", "critical");

  // expo-build-properties checks
  const buildProps = (expo.plugins || []).find((p) => Array.isArray(p) && p[0] === "expo-build-properties");
  if (!buildProps) addIssue("app.json", "plugins.expo-build-properties", "Missing expo-build-properties plugin", "high");
  if (buildProps) {
    const cfg = buildProps[1] || {};
    if (cfg?.ios?.useFrameworks === "static")
      addIssue("app.json", "ios.useFrameworks", "Static frameworks conflict with precompiled frameworks", "high");
    if (cfg?.android?.compileSdkVersion && cfg.android.compileSdkVersion !== 34)
      addIssue("app.json", "android.compileSdkVersion", "Should target stable SDK 34", "high");
    if (cfg?.android?.targetSdkVersion && cfg.android.targetSdkVersion !== 34)
      addIssue("app.json", "android.targetSdkVersion", "Should target stable SDK 34", "high");
  }
}

function validateEasJson() {
  const easJsonPath = path.join(process.cwd(), "eas.json");
  const eas = readJSON(easJsonPath);
  const profiles = eas.build || {};

  for (const [name, profile] of Object.entries(profiles)) {
    if (!profile.env) addIssue("eas.json", `${name}.env`, "Environment variables not configured for profile", "critical");
    else {
      const env = profile.env;
      ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"].forEach((k) => {
        if (!env[k]) addIssue("eas.json", `${name}.env.${k}`, "Missing required env var in profile", "high");
      });
    }

    if (name === "development" && !(profile.ios && profile.ios.simulator === true))
      addIssue("eas.json", `${name}.ios.simulator`, "iOS simulator not enabled for development", "low");
    if (name === "production") {
      if (!(profile.android && profile.android.buildType === "app-bundle"))
        addIssue("eas.json", `${name}.android.buildType`, "Production should use app-bundle", "high");
    }
  }
}

function validateSecurity() {
  // Simple grep-like checks for accidental secrets (non-exhaustive)
  // Warning-level only; proper secret scanning should be done in CI
  const suspicious = [];
  const filesToScan = ["src/api", "src/services", "src/lib"];
  for (const rel of filesToScan) {
    const dir = path.join(process.cwd(), rel);
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.isFile() && /\.(ts|tsx|js)$/.test(e.name)) {
          const content = fs.readFileSync(p, "utf8");
          if (/sk_live_|AIzaSy|-----BEGIN|SECRET_KEY/i.test(content)) suspicious.push(p);
        }
      }
    }
  }
  if (suspicious.length) addIssue("security", "codebase", `Potential secrets found in: ${suspicious.join(", ")}`, "medium");
}

function main() {
  if (!flags["env-only"]) validateAppJson();
  validateEnvVariables();
  if (!flags["env-only"]) validateEasJson();
  if (!flags["env-only"]) validateSecurity();

  const critical = issues.filter((i) => i.severity === "critical");
  const high = issues.filter((i) => i.severity === "high");

  if (kvArgs.format === "json") {
    console.log(JSON.stringify({ issues, summary: { critical: critical.length, high: high.length, total: issues.length } }, null, 2));
  } else {
    if (issues.length === 0) {
      console.log("All production configuration checks passed.");
    } else {
      console.log("Production configuration validation report:\n");
      for (const i of issues) {
        console.log(`- [${i.severity}] ${i.section} :: ${i.key} -> ${i.message}`);
      }
      console.log(`\nSummary: critical=${critical.length}, high=${high.length}, total=${issues.length}`);
    }
  }

  // Exit with non-zero on critical failures
  process.exit(critical.length ? 1 : 0);
}

main();

