/**
 * Navigation Helper Functions for Expo Router
 *
 * These helpers simplify navigation throughout the app using Expo Router's
 * typed navigation system.
 */

import { router } from "expo-router";
import { ProcessedVideo } from "../../src/services/IAnonymiser";

/**
 * Auth Navigation Helpers
 */
export const AuthNavigation = {
  goToOnboarding: () => {
    router.replace("/(auth)/onboarding");
  },

  goToSignUp: () => {
    router.push("/(auth)/signup");
  },

  goToSignIn: () => {
    router.push("/(auth)/signin");
  },

  goToMainApp: () => {
    router.replace("/(tabs)");
  },
};

/**
 * Tab Navigation Helpers
 */
export const TabNavigation = {
  goToHome: () => {
    router.push("/(tabs)");
  },

  goToVideos: () => {
    router.push("/(tabs)/videos");
  },

  goToCreate: () => {
    router.push("/(tabs)/create");
  },

  goToTrending: (hashtag?: string) => {
    if (hashtag) {
      router.push({
        pathname: "/(tabs)/trending",
        params: { hashtag },
      });
    } else {
      router.push("/(tabs)/trending");
    }
  },

  goToProfile: () => {
    router.push("/(tabs)/profile");
  },
};

/**
 * Modal/Screen Navigation Helpers
 */
export const ScreenNavigation = {
  goToVideoRecord: () => {
    router.push("/video-record");
  },

  goToVideoPreview: (processedVideo: ProcessedVideo) => {
    router.push({
      pathname: "/video-preview",
      params: {
        processedVideo: JSON.stringify(processedVideo),
      },
    });
  },

  goToSecretDetail: (confessionId: string) => {
    router.push({
      pathname: "/secret-detail",
      params: { confessionId },
    });
  },

  goToVideoPlayer: (confessionId: string) => {
    router.push({
      pathname: "/video-player",
      params: { confessionId },
    });
  },

  goToSaved: () => {
    router.push("/saved");
  },

  goToMySecrets: () => {
    router.push("/my-secrets");
  },

  goToSettings: () => {
    router.push("/settings");
  },

  goToPaywall: (feature?: string, source?: string) => {
    router.push({
      pathname: "/paywall",
      params: { feature, source },
    });
  },

  goToWebView: (url: string, title: string) => {
    router.push({
      pathname: "/webview",
      params: { url, title },
    });
  },
};

/**
 * Navigation Stack Helpers
 */
export const StackNavigation = {
  goBack: () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  },

  canGoBack: () => {
    return router.canGoBack();
  },

  dismiss: () => {
    router.dismiss();
  },

  dismissAll: () => {
    router.dismissAll();
  },

  replace: (href: string) => {
    router.replace(href);
  },
};

/**
 * Deep Link Helpers
 */
export const DeepLinkNavigation = {
  handleDeepLink: (url: string) => {
    // Parse the URL and navigate accordingly
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const searchParams = Object.fromEntries(urlObj.searchParams);

      // Handle different deep link patterns
      if (pathname.includes("/secret-detail") && searchParams.confessionId) {
        ScreenNavigation.goToSecretDetail(searchParams.confessionId);
      } else if (pathname.includes("/video-player") && searchParams.confessionId) {
        ScreenNavigation.goToVideoPlayer(searchParams.confessionId);
      } else if (pathname.includes("/trending")) {
        TabNavigation.goToTrending(searchParams.hashtag);
      } else if (pathname.includes("/paywall")) {
        ScreenNavigation.goToPaywall(searchParams.feature, searchParams.source);
      } else {
        // Default to home
        TabNavigation.goToHome();
      }
    } catch (error) {
      console.error("Failed to handle deep link:", error);
      TabNavigation.goToHome();
    }
  },
};

/**
 * Get current route information
 */
export const getCurrentRoute = () => {
  // This would need to be implemented with useSegments() hook
  // For now, return a placeholder
  return null;
};

/**
 * Navigation guards
 */
export const NavigationGuards = {
  requireAuth: (callback: () => void, isAuthenticated: boolean) => {
    if (isAuthenticated) {
      callback();
    } else {
      AuthNavigation.goToSignIn();
    }
  },

  requirePremium: (callback: () => void, isPremium: boolean, feature?: string) => {
    if (isPremium) {
      callback();
    } else {
      ScreenNavigation.goToPaywall(feature, "premium_guard");
    }
  },
};
