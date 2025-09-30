import { useAuthStore } from "../stores/authStore";
import { User, AuthCredentials, SignUpData } from "../types/auth.types";

/**
 * Main authentication hook
 * Provides access to auth state and actions
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setOnboarded = useAuthStore((state) => state.setOnboarded);
  const clearError = useAuthStore((state) => state.clearError);
  const checkAuthState = useAuthStore((state) => state.checkAuthState);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    signUp,
    signIn,
    signOut,
    updateUser,
    setOnboarded,
    clearError,
    checkAuthState,
  };
};

/**
 * Hook to get just the current user
 */
export const useUser = (): User | null => {
  return useAuthStore((state) => state.user);
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  return useAuthStore((state) => state.isAuthenticated);
};

/**
 * Hook to check if user is onboarded
 */
export const useIsOnboarded = (): boolean => {
  const user = useAuthStore((state) => state.user);
  return user?.isOnboarded ?? false;
};

/**
 * Hook to get auth loading state
 */
export const useAuthLoading = (): boolean => {
  return useAuthStore((state) => state.isLoading);
};

/**
 * Hook to get auth error
 */
export const useAuthError = () => {
  return useAuthStore((state) => state.error);
};

/**
 * Hook for sign-up functionality
 */
export const useSignUp = () => {
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    signUp,
    isLoading,
    error,
    clearError,
  };
};

/**
 * Hook for sign-in functionality
 */
export const useSignIn = () => {
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    signIn,
    isLoading,
    error,
    clearError,
  };
};

/**
 * Hook for sign-out functionality
 */
export const useSignOut = () => {
  const signOut = useAuthStore((state) => state.signOut);
  const isLoading = useAuthStore((state) => state.isLoading);

  return {
    signOut,
    isLoading,
  };
};

/**
 * Hook to update user profile
 */
export const useUpdateUser = () => {
  const updateUser = useAuthStore((state) => state.updateUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  return {
    updateUser,
    isLoading,
    error,
  };
};
