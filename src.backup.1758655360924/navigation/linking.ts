import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { RootStackParamList } from "./AppNavigator";

const prefix = Linking.createURL("/");

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, "toxicconfessions://", "https://toxicconfessions.app", "https://www.toxicconfessions.app"],
  config: {
    screens: {
      MainTabs: {
        path: "/",
        screens: {
          Home: {
            path: "",
            initialRouteName: "HomeScreen",
          },
          Videos: {
            path: "videos",
            initialRouteName: "VideoFeedScreen",
          },
          Create: {
            path: "create",
            initialRouteName: "CreateConfessionScreen",
          },
          Trending: {
            path: "trending",
            initialRouteName: "TrendingScreen",
          },
          Profile: {
            path: "profile",
            initialRouteName: "ProfileScreen",
          },
        },
      },
      SecretDetail: {
        path: "/secret/:confessionId",
        parse: {
          confessionId: (confessionId: string) => confessionId,
        },
      },
      VideoPlayer: {
        path: "/video/:confessionId",
        parse: {
          confessionId: (confessionId: string) => confessionId,
        },
      },
      VideoRecord: {
        path: "/record",
      },
      Saved: {
        path: "/saved",
      },
      Paywall: {
        path: "/paywall",
        parse: {
          feature: (feature: string) => feature,
          source: (source: string) => source,
        },
      },
      AuthStack: {
        path: "/auth",
        screens: {
          Onboarding: "/onboarding",
          SignUp: "/signup",
          SignIn: "/signin",
        },
      },
    },
  },
  async getInitialURL() {
    try {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();
      if (url != null) {
        console.log("🔗 Deep link opened:", url);
        return url;
      }

      // Check if there's a pending notification
      // This would integrate with your notification system
      return null;
    } catch (error) {
      console.error("Failed to get initial URL:", error);
      return null;
    }
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log("🔗 Deep link received:", url);
      listener(url);
    };

    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener("url", onReceiveURL);

    return () => {
      subscription?.remove();
    };
  },
};

// Deep link handlers for specific actions
export const DeepLinkHandlers = {
  // Handle secret sharing links
  handleSecretLink: (confessionId: string) => {
    return `toxicconfessions://secret/${encodeURIComponent(confessionId)}`;
  },

  // Handle video sharing links
  handleVideoLink: (confessionId: string) => {
    return `toxicconfessions://video/${encodeURIComponent(confessionId)}`;
  },

  // Handle profile sharing links
  handleProfileLink: (userId?: string) => {
    return userId ? `toxicconfessions://profile/${encodeURIComponent(userId)}` : "toxicconfessions://profile";
  },

  // Handle trending hashtag links
  handleTrendingLink: (hashtag?: string) => {
    return hashtag
      ? `toxicconfessions://trending?hashtag=${encodeURIComponent(hashtag)}`
      : "toxicconfessions://trending";
  },

  // Handle password reset links
  handlePasswordResetLink: (token: string) => {
    return `toxicconfessions://reset-password?token=${encodeURIComponent(token)}`;
  },

  // Handle email verification links
  handleEmailVerificationLink: (token: string) => {
    return `toxicconfessions://verify-email?token=${encodeURIComponent(token)}`;
  },

  // Handle paywall links
  handlePaywallLink: (feature?: string, source?: string) => {
    const params = new URLSearchParams();
    if (feature) params.append("feature", feature);
    if (source) params.append("source", source);

    const queryString = params.toString();
    return `toxicconfessions://paywall${queryString ? `?${queryString}` : ""}`;
  },
};

// URL parsing utilities
export const URLUtils = {
  // Parse confession ID from URL
  parseConfessionId: (url: string): string | null => {
    const match = url.match(/\/(?:secret|video)\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
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
    return `https://toxicconfessions.app${path}`;
  },

  // Generate app deep link
  generateAppURL: (path: string): string => {
    // Normalize the path by trimming extra slashes and ensuring it starts with a single '/'
    let normalizedPath = path.trim();

    // Remove leading slashes and add a single one
    normalizedPath = normalizedPath.replace(/^\/+/, "");
    if (normalizedPath && !normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }

    // Remove trailing slashes except for root
    if (normalizedPath.length > 1) {
      normalizedPath = normalizedPath.replace(/\/+$/, "");
    }

    // Encode the path while preserving slashes
    const encodedPath = encodeURI(normalizedPath);

    return `toxicconfessions://${encodedPath}`;
  },
};

// Analytics tracking for deep links
export const DeepLinkAnalytics = {
  trackDeepLinkOpen: (url: string, source: "app_open" | "notification" | "share") => {
    // Integrate with your analytics service
    if (__DEV__) {
      console.log("Deep link opened:", { url, source });
    }

    // Example: Analytics.track('deep_link_opened', { url, source });
  },

  trackDeepLinkShare: (type: "secret" | "video" | "profile" | "trending", id?: string) => {
    // Integrate with your analytics service
    if (__DEV__) {
      console.log("Deep link shared:", { type, id });
    }

    // Example: Analytics.track('deep_link_shared', { type, id });
  },
};

// Error handling for deep links
export const DeepLinkErrorHandler = {
  handleInvalidLink: (url: string) => {
    if (__DEV__) {
      console.warn("Invalid deep link:", url);
    }

    // Could show a toast or redirect to home
    // Example: showToast('Invalid link', 'error');
  },

  handleMissingContent: (type: "secret" | "video" | "profile", id: string) => {
    if (__DEV__) {
      console.warn("Content not found for deep link:", { type, id });
    }

    // Could show an error screen or redirect
    // Example: showToast('Content not found', 'error');
  },

  handleAuthRequired: (targetUrl: string) => {
    if (__DEV__) {
      console.log("Authentication required for deep link:", targetUrl);
    }

    // Store the target URL and redirect to auth
    // Example: AuthStore.setPendingDeepLink(targetUrl);
  },
};
