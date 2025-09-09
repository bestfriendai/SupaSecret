import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthState, User, AuthCredentials, SignUpData, AuthError } from "../types/auth";
import { signUpUser, signInUser, signOutUser, getCurrentUser, updateUserData } from "../utils/auth";
import { supabase } from "../lib/supabase";
import { handleStoreError, clearStoreError, withErrorHandling, type StandardError } from "../utils/errorHandling";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signUp: async (data: SignUpData) => {
        await withErrorHandling(
          set,
          async () => {
            const user = await signUpUser(data);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          },
          {
            shouldThrow: true,
            context: "signUp",
            customMessage: "Failed to create account. Please try again.",
          },
        );
      },

      signIn: async (credentials: AuthCredentials, persistSession: boolean = true) => {
        await withErrorHandling(
          set,
          async () => {
            const user = await signInUser(credentials, persistSession);
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          },
          {
            shouldThrow: true,
            context: "signIn",
            customMessage: "Failed to sign in. Please check your credentials.",
          },
        );
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await signOutUser();
          // Cleanup auth listener on sign out
          cleanupAuthListener();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateUser: async (updates: Partial<User>) => {
        const { user } = get();
        if (!user) {
          throw new Error("No user to update");
        }

        set({ isLoading: true, error: null });
        try {
          const updatedUser = await updateUserData(user.id, updates);
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const authError: AuthError = {
            code: error instanceof Error && "code" in error ? (error as any).code : "UNKNOWN_ERROR",
            message: error instanceof Error ? error.message : "An unknown error occurred",
          };
          set({
            isLoading: false,
            error: authError,
          });
          throw error;
        }
      },

      setOnboarded: async () => {
        const { user, updateUser } = get();
        if (!user) {
          throw new Error("No user to update");
        }
        await updateUser({ isOnboarded: true });
      },

      clearError: () => {
        clearStoreError(set);
      },

      checkAuthState: async () => {
        if (__DEV__) {
          console.log("🔍 Starting auth state check...");
        }
        set({ isLoading: true });
        try {
          const user = await getCurrentUser();

          if (__DEV__) {
            console.log("🔍 Auth state check result:", {
              hasUser: !!user,
              isOnboarded: user?.isOnboarded || false,
              isAuthenticated: !!user,
            });
          }

          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error("❌ Auth state check failed:", error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add version for migration support
      version: 1,
      // Add migrate function to handle version changes
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1 - no changes needed
          return persistedState;
        }
        return persistedState;
      },
      // Rehydrate the state properly
      onRehydrateStorage: () => (state) => {
        if (__DEV__ && state) {
          console.log("🔍 Auth state rehydrated:", {
            hasUser: !!state.user,
            isOnboarded: state.user?.isOnboarded || false,
            isAuthenticated: state.isAuthenticated,
          });
        }
      },
    },
  ),
);

// Auth listener management
let authListener: { data: { subscription: any } } | null = null;

// Cleanup function for auth listener
const cleanupAuthListener = () => {
  if (authListener) {
    authListener.data.subscription.unsubscribe();
    authListener = null;
  }
};

// Function to set up auth state listener
const setupAuthListener = () => {
  if (authListener) return; // Already set up

  try {
    // Listen to auth state changes
    authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) {
        console.log("🔍 Supabase auth event:", event, session ? "with session" : "no session");
      }

      const { checkAuthState } = useAuthStore.getState();

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // User signed in or token refreshed - update our auth state
        await checkAuthState();
      } else if (event === "SIGNED_OUT") {
        // User signed out - clear our auth state
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      } else if (event === "INITIAL_SESSION") {
        // Initial session check - this happens on app startup
        if (session) {
          await checkAuthState();
        } else {
          // No session found, user is not authenticated
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to set up auth listener:", error);
    // Don't assign authListener if setup failed
  }
};

// Export functions for app-level management
export { cleanupAuthListener, setupAuthListener };
