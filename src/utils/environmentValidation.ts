import Constants from "expo-constants";

export type RequiredEnvVars = {
  EXPO_PUBLIC_SUPABASE_URL: string | undefined;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
};

export type OptionalEnvVars = {
  EXPO_PUBLIC_PROJECT_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_IOS_APP_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_IOS_BANNER_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID?: string | undefined;
  EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID?: string | undefined;
  EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string | undefined;
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string | undefined;
  EXPO_PUBLIC_FIREBASE_API_KEY?: string | undefined;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string | undefined;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string | undefined;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?: string | undefined;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string | undefined;
  EXPO_PUBLIC_FIREBASE_APP_ID_IOS?: string | undefined;
  EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID?: string | undefined;
  EXPO_PUBLIC_OPENAI_API_KEY?: string | undefined;
  EXPO_PUBLIC_ANTHROPIC_API_KEY?: string | undefined;
  EXPO_PUBLIC_GROK_API_KEY?: string | undefined;
};

export type EnvValidationIssue = {
  key: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low";
};

export type EnvValidationResult = {
  ok: boolean;
  issues: EnvValidationIssue[];
};

const getExtra = () => {
  // Support both dev and production
  // In production, Constants.expoConfig may be undefined, but extra can be bundled at build time
  return (Constants?.expoConfig as any)?.extra || {};
};

export const isProductionBuild = (): boolean => !__DEV__;

export const detectEnvironment = (): "development" | "staging" | "production" => {
  const extra = getExtra();
  const env = process.env.EXPO_PUBLIC_ENV || extra?.env;
  if (env === "production") return "production";
  if (env === "staging") return "staging";
  return "development";
};

export const getEnvVarWithFallback = (key: string, legacyKey?: string): string | undefined => {
  // Priority: process.env -> extra.nonSensitive (camelCase) -> extra -> legacy key
  const extra = getExtra();

  const fromProcess = (process.env as Record<string, string | undefined>)[key];
  if (fromProcess) return fromProcess;

  // Normalize EXPO_PUBLIC_FOO_BAR -> fooBar for extra.nonSensitive
  const stripPrefix = key.replace(/^EXPO_PUBLIC_/, "");
  const toCamel = (s: string) =>
    s
      .toLowerCase()
      .split("_")
      .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join("");
  const camelKey = toCamel(stripPrefix);
  const fromExtraNonSensitive = (extra?.nonSensitive?.[camelKey] as string | undefined) || undefined;
  if (fromExtraNonSensitive) return fromExtraNonSensitive;

  const fromExtra = extra?.[key] as string | undefined;
  if (fromExtra) return fromExtra;

  if (legacyKey) {
    const legacy = (process.env as Record<string, string | undefined>)[legacyKey];
    if (legacy) return legacy;
  }
  return undefined;
};

export const validateEnvVarFormat = (key: string, value: string | undefined): EnvValidationIssue[] => {
  const issues: EnvValidationIssue[] = [];
  if (!value) return issues;

  // URL validation
  if (key.includes("URL")) {
    try {
      const u = new URL(value);
      if (isProductionBuild() && u.protocol !== "https:") {
        issues.push({ key, message: "URL must use HTTPS in production", severity: "critical" });
      }
    } catch {
      issues.push({ key, message: "Invalid URL format", severity: "high" });
    }
  }

  // JWT-like anon key (Supabase anon key format is JWT-style)
  if (key.includes("ANON_KEY") && value.split(".").length < 3) {
    issues.push({ key, message: "Anon key does not look like a JWT", severity: "high" });
  }

  // Placeholder detection
  if (/YOUR_|CHANGEME|REPLACE_ME/i.test(value)) {
    issues.push({ key, message: "Placeholder value detected; must be replaced", severity: "critical" });
  }

  return issues;
};

export const validateRequiredEnvVars = (): EnvValidationResult => {
  const issues: EnvValidationIssue[] = [];
  const required: RequiredEnvVars = {
    EXPO_PUBLIC_SUPABASE_URL: getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_VIBECODE_SUPABASE_URL"),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: getEnvVarWithFallback(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY",
    ),
  };

  (Object.keys(required) as (keyof RequiredEnvVars)[]).forEach((key) => {
    const v = required[key];
    if (!v) {
      issues.push({
        key,
        message: "Missing required environment variable",
        severity: isProductionBuild() ? "critical" : "high",
      });
    } else {
      issues.push(...validateEnvVarFormat(key, v));
    }
  });

  return { ok: issues.filter((i) => i.severity === "critical").length === 0, issues };
};

export const validateSupabaseConfig = (): EnvValidationResult => {
  const issues: EnvValidationIssue[] = [];
  const url = getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_VIBECODE_SUPABASE_URL");
  const key = getEnvVarWithFallback("EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY");

  if (!url) issues.push({ key: "EXPO_PUBLIC_SUPABASE_URL", message: "Missing Supabase URL", severity: "critical" });
  if (!key)
    issues.push({ key: "EXPO_PUBLIC_SUPABASE_ANON_KEY", message: "Missing Supabase anon key", severity: "critical" });

  issues.push(...validateEnvVarFormat("EXPO_PUBLIC_SUPABASE_URL", url));
  issues.push(...validateEnvVarFormat("EXPO_PUBLIC_SUPABASE_ANON_KEY", key));

  // Basic Supabase URL pattern
  if (url && !/supabase\.co|supabase\.in/.test(url)) {
    issues.push({
      key: "EXPO_PUBLIC_SUPABASE_URL",
      message: "URL does not look like a Supabase project URL",
      severity: "medium",
    });
  }

  return { ok: issues.filter((i) => i.severity === "critical").length === 0, issues };
};

export const validateAdMobConfig = (): EnvValidationResult => {
  const issues: EnvValidationIssue[] = [];
  const keys: (keyof OptionalEnvVars)[] = [
    "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
    "EXPO_PUBLIC_ADMOB_IOS_BANNER_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID",
    "EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID",
    "EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID",
    "EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID",
  ];
  keys.forEach((k) => {
    const id = getEnvVarWithFallback(k);
    if (id) {
      issues.push(...validateEnvVarFormat(k, id));
      // AdMob production ad unit format checks
      if (!id.startsWith("ca-app-pub-")) {
        issues.push({ key: k, message: "Ad unit must start with ca-app-pub-", severity: "high" });
      }
      if (/3940256099942544/.test(id)) {
        issues.push({ key: k, message: "Using Google test ad unit in production", severity: "critical" });
      }
    }
  });
  return { ok: issues.filter((i) => i.severity === "critical").length === 0, issues };
};

export const validateRevenueCatConfig = (): EnvValidationResult => {
  const issues: EnvValidationIssue[] = [];
  const ios = getEnvVarWithFallback("EXPO_PUBLIC_REVENUECAT_IOS_KEY");
  const android = getEnvVarWithFallback("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY");
  if (!ios || !android) {
    issues.push({
      key: "REVENUECAT",
      message: "Missing RevenueCat API keys for one or more platforms",
      severity: "medium",
    });
  }
  if (ios && !ios.startsWith("appl_"))
    issues.push({ key: "EXPO_PUBLIC_REVENUECAT_IOS_KEY", message: "Must start with appl_", severity: "high" });
  if (android && !android.startsWith("goog_"))
    issues.push({ key: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", message: "Must start with goog_", severity: "high" });
  return { ok: true, issues };
};

// Firebase validation removed - not needed

export const validateAIServiceConfig = (): EnvValidationResult => {
  const issues: EnvValidationIssue[] = [];
  ["EXPO_PUBLIC_OPENAI_API_KEY", "EXPO_PUBLIC_ANTHROPIC_API_KEY", "EXPO_PUBLIC_GROK_API_KEY"].forEach((k) => {
    const v = getEnvVarWithFallback(k);
    if (v) issues.push(...validateEnvVarFormat(k, v));
  });
  return { ok: true, issues };
};

export const generateValidationReport = () => {
  const sections = [
    ["Required", validateRequiredEnvVars()],
    ["Supabase", validateSupabaseConfig()],
    ["AdMob", validateAdMobConfig()],
    ["RevenueCat", validateRevenueCatConfig()],
    ["AI", validateAIServiceConfig()],
  ] as const;

  const report = sections.map(([name, res]) => ({ section: name, ok: res.ok, issues: res.issues })).flat();
  return report;
};

export const logValidationResults = () => {
  const env = detectEnvironment();
  const report = generateValidationReport();
  const critical = report.flatMap((r) => r.issues).filter((i) => i.severity === "critical");
  const heading = `[env] ${env} | ${critical.length ? "FAIL" : "OK"}`;
  if (critical.length) {
    console.error(heading, report);
  } else if (__DEV__) {
    console.log(heading, report);
  }
  return { ok: critical.length === 0, report };
};

export const createEnvironmentError = (message: string) => {
  const e = new Error(`[env] ${message}`);
  return e;
};

export const handleMissingEnvVar = (key: string) => {
  const msg = `Missing required environment variable: ${key}`;
  if (isProductionBuild()) {
    throw createEnvironmentError(msg);
  } else {
    console.warn(msg);
  }
};
