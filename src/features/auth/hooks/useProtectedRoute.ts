import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "./useAuth";

/**
 * Hook to handle protected route navigation
 * Redirects users based on authentication and onboarding status
 */
export function useProtectedRoute() {
  const { user, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (__DEV__) {
      console.log("🔒 Protected route check:", {
        segments: segments.join("/"),
        isAuthenticated,
        hasUser: !!user,
        isOnboarded: user?.isOnboarded,
        inAuthGroup,
        inTabsGroup,
      });
    }

    // Not authenticated and not in auth group -> redirect to onboarding
    if (!isAuthenticated && !inAuthGroup) {
      if (__DEV__) {
        console.log("🔒 Redirecting to onboarding (not authenticated)");
      }
      router.replace("/(auth)/onboarding");
      return;
    }

    // Authenticated but not onboarded and not in auth group -> redirect to onboarding
    if (isAuthenticated && user && !user.isOnboarded && !inAuthGroup) {
      if (__DEV__) {
        console.log("🔒 Redirecting to onboarding (not onboarded)");
      }
      router.replace("/(auth)/onboarding");
      return;
    }

    // Authenticated, onboarded, and in auth group -> redirect to tabs
    if (isAuthenticated && user && user.isOnboarded && inAuthGroup) {
      if (__DEV__) {
        console.log("🔒 Redirecting to tabs (authenticated and onboarded)");
      }
      router.replace("/(tabs)");
      return;
    }
  }, [user, isAuthenticated, segments, router]);
}
