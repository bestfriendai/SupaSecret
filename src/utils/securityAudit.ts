import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/**
 * Security audit utilities for React Native app
 * Based on OWASP Mobile Application Security Testing Guide (MASTG)
 */

export interface SecurityAuditResult {
  passed: boolean;
  issues: string[];
  recommendations: string[];
}

// Check for secure storage usage
export const auditSecureStorage = async (): Promise<SecurityAuditResult> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check if SecureStore is available
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) {
      issues.push("SecureStore is not available on this device");
      recommendations.push("Ensure device supports secure storage or implement fallback");
    }

    // Check for sensitive data in AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const sensitivePatterns = /password|token|key|secret|auth/i;

    for (const key of keys) {
      if (sensitivePatterns.test(key)) {
        const value = await AsyncStorage.getItem(key);
        if (value && value.length > 0) {
          issues.push(`Sensitive data found in AsyncStorage: ${key}`);
          recommendations.push(`Move ${key} to SecureStore`);
        }
      }
    }
  } catch (error) {
    issues.push(`Secure storage audit failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues,
    recommendations,
  };
};

// Check API security
export const auditAPISecurity = (): SecurityAuditResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for HTTPS-only configuration
  const config = Constants.expoConfig as any;
  if (config?.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads) {
    issues.push("App allows arbitrary loads (disables ATS)");
    recommendations.push("Remove NSAllowsArbitraryLoads from Info.plist for production");
  }

  // Check for proper certificate pinning setup
  if (!config?.ios?.infoPlist?.NSAppTransportSecurity?.NSPinnedDomains) {
    recommendations.push("Consider implementing certificate pinning for sensitive APIs");
  }

  return {
    passed: issues.length === 0,
    issues,
    recommendations,
  };
};

// Check authentication security
export const auditAuthentication = async (): Promise<SecurityAuditResult> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check for stored auth tokens
    const authToken = await SecureStore.getItemAsync("supabase-auth-token");
    if (!authToken) {
      recommendations.push("Ensure auth tokens are properly stored in SecureStore");
    }

    // Check session expiry handling
    const sessionData = authToken ? JSON.parse(authToken) : null;
    if (sessionData?.expires_at) {
      const expiresAt = new Date(sessionData.expires_at * 1000);
      const now = new Date();
      if (expiresAt < now) {
        issues.push("Stored session has expired");
        recommendations.push("Implement proper session refresh logic");
      }
    }
  } catch (error) {
    issues.push(`Authentication audit failed: ${error}`);
  }

  return {
    passed: issues.length === 0,
    issues,
    recommendations,
  };
};

// Check for common vulnerabilities
export const auditCommonVulnerabilities = (): SecurityAuditResult => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for debug code in production
  if (!__DEV__ && Constants.expoConfig?.version) {
    recommendations.push("Ensure no debug logging in production builds");
  }

  // Check for proper error handling
  recommendations.push("Ensure sensitive information is not logged in error messages");

  // Check for proper input validation
  recommendations.push("Implement comprehensive input validation using libraries like yup");

  return {
    passed: issues.length === 0,
    issues,
    recommendations,
  };
};

// Run comprehensive security audit
export const runSecurityAudit = async (): Promise<{
  overall: boolean;
  results: {
    secureStorage: SecurityAuditResult;
    apiSecurity: SecurityAuditResult;
    authentication: SecurityAuditResult;
    vulnerabilities: SecurityAuditResult;
  };
}> => {
  const results = {
    secureStorage: await auditSecureStorage(),
    apiSecurity: auditAPISecurity(),
    authentication: await auditAuthentication(),
    vulnerabilities: auditCommonVulnerabilities(),
  };

  const overall = Object.values(results).every((result) => result.passed);

  if (__DEV__) {
    console.log("🔒 Security Audit Results:", results);
  }

  return { overall, results };
};
