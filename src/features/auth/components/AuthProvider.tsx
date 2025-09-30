import React, { useEffect, ReactNode } from "react";
import { useAuthStore, setupAuthListener, cleanupAuthListener } from "../stores/authStore";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 * Sets up auth listeners and manages auth state lifecycle
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const checkAuthState = useAuthStore((state) => state.checkAuthState);

  useEffect(() => {
    // Set up auth listener
    setupAuthListener();

    // Check initial auth state
    checkAuthState().catch((error) => {
      if (__DEV__) {
        console.error("Failed to check auth state:", error);
      }
    });

    // Cleanup on unmount
    return () => {
      cleanupAuthListener();
    };
  }, [checkAuthState]);

  return <>{children}</>;
}
