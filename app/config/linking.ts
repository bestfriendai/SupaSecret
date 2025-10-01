/**
 * Deep Linking Configuration for Expo Router 4.0
 *
 * This file provides utilities and configuration for deep linking in the app.
 * Expo Router handles most of the deep linking automatically through file-based routing.
 */

import * as Linking from "expo-linking";

/**
 * URL Prefixes for deep linking
 * These are automatically configured in app.config.js
 */
export const DEEP_LINK_PREFIXES = [
  "toxicconfessions://",
  "https://toxicconfessions.app",
  "https://www.toxicconfessions.app",
];

/**
 * Deep link handlers for specific actions
 * Use with Expo Router's Link component or router.push()
 */
export const DeepLinkHandlers = {
  // Handle secret sharing links
  handleSecretLink: (confessionId: string) => {
    return `/secret-detail?confessionId=${encodeURIComponent(confessionId)}`;
  },

  // Handle video sharing links
  handleVideoLink: (confessionId: string) => {
    return `/video-player?confessionId=${encodeURIComponent(confessionId)}`;
  },

  // Handle profile links
  handleProfileLink: () => {
    return "/(tabs)/profile";
  },

  // Handle trending hashtag links
  handleTrendingLink: (hashtag?: string) => {
    return hashtag
      ? `/(tabs)/trending?hashtag=${encodeURIComponent(hashtag)}`
      : "/(tabs)/trending";
  },

  // Handle paywall links
  handlePaywallLink: (feature?: string, source?: string) => {
    const params = new URLSearchParams();
    if (feature) params.append("feature", feature);
    if (source) params.append("source", source);

    const queryString = params.toString();
    return `/paywall${queryString ? `?${queryString}` : ""}`;
  },

  // Handle saved secrets
  handleSavedLink: () => {
    return "/saved";
  },

  // Handle my secrets
  handleMySecretsLink: () => {
    return "/my-secrets";
  },

  // Handle settings
  handleSettingsLink: () => {
    return "/settings";
  },

  // Handle video recording
  handleVideoRecordLink: () => {
    return "/video-record";
  },

  // Handle auth screens
  handleAuthLink: (screen: "onboarding" | "signup" | "signin") => {
    return `/(auth)/${screen}`;
  },
};

/**
 * URL parsing utilities
 */
export const URLUtils = {
  // Parse confession ID from URL
  parseConfessionId: (url: string): string | null => {
    const match = url.match(/\/(?:secret-detail|video-player)\?confessionId=([a-zA-Z0-9-]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },

  // Parse hashtag from URL
  parseHashtag: (url: string): string | null => {
    if (!url || typeof url !== "string") {
      return null;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("hashtag");
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to parse URL for hashtag:", url, error);
      }
      return null;
    }
  },

  // Parse query parameters
  parseQueryParams: (url: string): Record<string, string> => {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return params;
    } catch {
      return {};
    }
  },

  // Validate deep link format
  isValidDeepLink: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const validSchemes = ["toxicconfessions:", "https:"];
      const validHosts = ["toxicconfessions.app", "www.toxicconfessions.app"];

      // Check if protocol is in allowed schemes
      if (!validSchemes.includes(urlObj.protocol)) {
        return false;
      }

      if (urlObj.protocol === "toxicconfessions:") {
        return true;
      }

      if (urlObj.protocol === "https:" && validHosts.includes(urlObj.hostname)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },

  // Generate shareable URL for web
  generateWebURL: (path: string): string => {
    // Normalize the path
    let normalizedPath = path.trim();
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }
    return `https://toxicconfessions.app${normalizedPath}`;
  },

  // Generate app deep link
  generateAppURL: (path: string): string => {
    // Normalize the path
    let normalizedPath = path.trim();

    // Remove leading slashes
    normalizedPath = normalizedPath.replace(/^\/+/, "");

    // Encode the path while preserving slashes
    const encodedPath = encodeURI(normalizedPath);

    return `toxicconfessions://${encodedPath}`;
  },

  // Create universal link that works for both web and app
  createUniversalLink: (path: string): string => {
    return URLUtils.generateWebURL(path);
  },
};

/**
 * Analytics tracking for deep links
 */
export const DeepLinkAnalytics = {
  trackDeepLinkOpen: (url: string, source: "app_open" | "notification" | "share") => {
    if (__DEV__) {
      console.log("Deep link opened:", { url, source });
    }
    // Integrate with your analytics service
    // Example: Analytics.track('deep_link_opened', { url, source });
  },

  trackDeepLinkShare: (type: "secret" | "video" | "profile" | "trending", id?: string) => {
    if (__DEV__) {
      console.log("Deep link shared:", { type, id });
    }
    // Integrate with your analytics service
    // Example: Analytics.track('deep_link_shared', { type, id });
  },
};

/**
 * Error handling for deep links
 */
export const DeepLinkErrorHandler = {
  handleInvalidLink: (url: string) => {
    if (__DEV__) {
      console.warn("Invalid deep link:", url);
    }
    // Could show a toast or redirect to home
  },

  handleMissingContent: (type: "secret" | "video" | "profile", id: string) => {
    if (__DEV__) {
      console.warn("Content not found for deep link:", { type, id });
    }
    // Could show an error screen or redirect
  },

  handleAuthRequired: (targetUrl: string) => {
    if (__DEV__) {
      console.log("Authentication required for deep link:", targetUrl);
    }
    // Store the target URL and redirect to auth
  },
};

/**
 * Route mapping for legacy links (from React Navigation to Expo Router)
 */
export const ROUTE_MAPPING: Record<string, string> = {
  // Auth routes
  "/auth/onboarding": "/(auth)/onboarding",
  "/auth/signup": "/(auth)/signup",
  "/auth/signin": "/(auth)/signin",

  // Tab routes
  "/": "/(tabs)",
  "/videos": "/(tabs)/videos",
  "/create": "/(tabs)/create",
  "/trending": "/(tabs)/trending",
  "/profile": "/(tabs)/profile",

  // Modal routes
  "/record": "/video-record",
  "/secret/:confessionId": "/secret-detail",
  "/video/:confessionId": "/video-player",
  "/saved": "/saved",
  "/my-secrets": "/my-secrets",
  "/settings": "/settings",
  "/paywall": "/paywall",
};

/**
 * Convert legacy React Navigation route to Expo Router route
 */
export function convertLegacyRoute(legacyRoute: string): string {
  // Direct mapping
  if (ROUTE_MAPPING[legacyRoute]) {
    return ROUTE_MAPPING[legacyRoute];
  }

  // Dynamic route conversion
  for (const [pattern, replacement] of Object.entries(ROUTE_MAPPING)) {
    if (pattern.includes(":")) {
      const regex = new RegExp(pattern.replace(/:([^/]+)/g, "([^/]+)"));
      const match = legacyRoute.match(regex);
      if (match) {
        let route = replacement;
        const paramNames = pattern.match(/:([^/]+)/g)?.map(p => p.slice(1)) || [];
        paramNames.forEach((param, index) => {
          route = route.replace(`:${param}`, match[index + 1]);
        });
        return route;
      }
    }
  }

  // If no mapping found, return as-is
  return legacyRoute;
}
