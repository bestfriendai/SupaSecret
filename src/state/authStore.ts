import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthState, User, AuthCredentials, SignUpData, AuthError } from "../types/auth";
import { signUpUser, signInUser, signOutUser, getCurrentUser, updateUserData } from "../utils/auth";
import { supabase } from "../lib/supabase";
import { clearStoreError, withErrorHandling } from "../utils/errorHandling";
import { registerStoreCleanup, setupAutomaticCleanup } from "../utils/storeCleanup";
import { trackStoreOperation } from "../utils/storePerformanceMonitor";
import { AppState } from "react-native";

/**
 * Interface for Supabase session object
 */
interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    phone?: string;
    phone_confirmed_at?: string;
    last_sign_in_at?: string;
    created_at?: string;
    updated_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    identities?: {
      identity_id: string;
      provider: string;
      identity_data?: Record<string, unknown>;
      last_sign_in_at?: string;
      created_at?: string;
      updated_at?: string;
    }[];
  };
}

/**
 * Validates if a Supabase session is still active
 * @param session The Supabase session object
 * @returns True if session is valid, false otherwise
 */
const isSessionValid = (session: SupabaseSession | null): boolean => {
  if (!session || !session.expires_at) return false;

  // Add a 5-minute buffer to account for potential time discrepancies
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  return now < new Date(expiresAt.getTime() - bufferTime);
};

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

      signIn: async (credentials: AuthCredentials, _persistSession: boolean = true) => {
        set({ isLoading: true, error: null });
        try {
          const user = await signInUser(credentials);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Just set loading to false, don't change auth state
          // This prevents navigation away from sign-in screen
          set({ isLoading: false });
          // Re-throw the error so SignInScreen can handle it
          throw error;
        }
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

      clearError: () => {
        clearStoreError(set);
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
            error: {
              code: authError.code,
              message: authError.message,
              timestamp: Date.now(),
            },
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

      checkAuthState: async () => {
        const start = Date.now();
        // Debounce/dedup in-flight checks
        if (authCheckInFlight) return authCheckInFlight;

        set({ isLoading: true });

        const withTimeout = <T>(p: Promise<T>, ms = 15000): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error("Auth check timeout")), ms);
            p.then((v) => {
              clearTimeout(t);
              resolve(v);
            }).catch((e) => {
              clearTimeout(t);
              reject(e);
            });
          });
        };

        authCheckInFlight = withTimeout(
          (async () => {
            try {
              // Check rehydrated state first to avoid unnecessary network calls
              const { user: rehydratedUser, isAuthenticated: rehydratedAuth } = get();

              // Get session from Supabase with retry logic
              let session = null;
              let sessionError = null;

              try {
                const { data, error } = await supabase.auth.getSession();
                session = data.session;
                sessionError = error;
              } catch (error) {
                sessionError = error;
                if (__DEV__) {
                  console.warn("Failed to get session, retrying...", error);
                }

                // Retry once after a brief delay
                await new Promise((resolve) => setTimeout(resolve, 1000));
                try {
                  const { data, error } = await supabase.auth.getSession();
                  session = data.session;
                  sessionError = error;
                } catch (retryError) {
                  sessionError = retryError;
                }
              }

              // Handle session errors
              if (sessionError) {
                if (__DEV__) {
                  console.error("Session retrieval failed:", sessionError);
                }
                // If we have rehydrated user data and this is just a network issue, keep existing state
                if (rehydratedUser && rehydratedAuth) {
                  set({ isLoading: false });
                  return;
                }
                // Otherwise clear auth state
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
                return;
              }

              // Validate session
              if (!isSessionValid(session as SupabaseSession | null)) {
                if (__DEV__) {
                  console.log("Session invalid or expired, signing out");
                }
                await signOutUser();
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
                return;
              }

              // Schedule session refresh
              scheduleSessionRefresh(session as SupabaseSession | null);

              // Get current user with fallback to rehydrated data
              let user = null;
              try {
                user = await getCurrentUser();
              } catch (userError) {
                if (__DEV__) {
                  console.warn("Failed to get current user, using rehydrated data if available:", userError);
                }
                // If we can't get fresh user data but have valid session and rehydrated user, keep existing user
                if (rehydratedUser && rehydratedAuth) {
                  user = rehydratedUser;
                } else {
                  throw userError;
                }
              }

              set({
                user,
                isAuthenticated: !!user,
                isLoading: false,
                error: null,
              });

              if (__DEV__) {
                console.log("Auth state check completed:", { hasUser: !!user, userId: user?.id });
              }
            } catch (error) {
              if (__DEV__) {
                console.error("Auth state check failed:", error);
              }

              // Enhanced error handling with graceful fallbacks
              const { user: rehydratedUser, isAuthenticated: rehydratedAuth } = get();

              // If error is network-related and we have valid rehydrated data, preserve it
              const isNetworkError =
                error instanceof Error &&
                (error.message.includes("network") ||
                  error.message.includes("timeout") ||
                  error.message.includes("connection") ||
                  error.message.includes("fetch"));

              if (isNetworkError && rehydratedUser && rehydratedAuth) {
                if (__DEV__) {
                  console.log("Network error detected, preserving rehydrated auth state");
                }
                set({ isLoading: false, error: null });
              } else {
                // Clear auth state for non-network errors or when no valid rehydrated data
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
              }
            } finally {
              trackStoreOperation("authStore", "checkAuthState", Date.now() - start);
              authCheckInFlight = null;
            }
          })(),
        );

        return authCheckInFlight;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Exclude PII (email) from persistence for security
        // Only store non-sensitive user data and authentication status
        user: state.user
          ? {
              id: state.user.id,
              username: state.user.username,
              avatar_url: state.user.avatar_url,
              createdAt: state.user.createdAt,
              isOnboarded: state.user.isOnboarded,
              lastLoginAt: state.user.lastLoginAt,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add version for migration support
      version: 1,
      // Add migrate function to handle version changes
      migrate: (persistedState: unknown, version: number): unknown => {
        const state = persistedState as Partial<AuthState>;
        if (version === 0) {
          // Migration from version 0 to 1 - no changes needed
          return state;
        }
        return state;
      },
      // Rehydrate the state properly with validation
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          if (__DEV__) {
            console.error("Failed to rehydrate auth state:", error);
          }
          // Error handled, state will be reset automatically
          return;
        }

        if (state) {
          // Validate rehydrated state consistency
          const hasUser = !!state.user;
          const claimsAuth = state.isAuthenticated;

          if (hasUser !== claimsAuth) {
            if (__DEV__) {
              console.warn("Inconsistent auth state detected during rehydration, correcting...", {
                hasUser,
                claimsAuth,
              });
            }
            // Correct inconsistent state - if we have a user, we should be authenticated
            state.isAuthenticated = hasUser;
          }

          // Validate user data integrity
          if (state.user) {
            if (!state.user.id) {
              if (__DEV__) {
                console.warn("Invalid user data in rehydrated state (missing ID), clearing...");
              }
              state.user = null;
              state.isAuthenticated = false;
            }
          }

          if (__DEV__) {
            console.log("🔍 Auth state rehydrated:", {
              hasUser: !!state.user,
              userId: state.user?.id,
              isOnboarded: state.user?.isOnboarded || false,
              isAuthenticated: state.isAuthenticated,
            });
          }

          // Schedule auth state validation if we think we're authenticated
          if (state.isAuthenticated && state.user) {
            // Check auth state after a brief delay to allow other stores to rehydrate
            setTimeout(() => {
              const { checkAuthState } = useAuthStore.getState();
              checkAuthState().catch((error) => {
                if (__DEV__) {
                  console.error("Post-rehydration auth check failed:", error);
                }
              });
            }, 500);
          }
        }
      },
    },
  ),
);

// Auth listener management
let authListener: { data: { subscription: any } } | null = null;
let sessionRefreshTimer: any = null;
let authCheckInFlight: Promise<void> | null = null;

// Cleanup function for auth listener
const cleanupAuthListener = () => {
  if (authListener) {
    authListener.data.subscription.unsubscribe();
    authListener = null;
  }
  if (sessionRefreshTimer) {
    clearTimeout(sessionRefreshTimer);
    sessionRefreshTimer = null;
  }

  if (__DEV__) {
    console.log('[AuthStore] Cleaned up auth listener and session refresh timer');
  }
};

// Function to set up auth state listener with proper state management
const setupAuthListener = () => {
  if (authListener) return; // Already set up

  try {
    // Listen to auth state changes
    authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) {
        console.log("🔍 Supabase auth event:", event, session ? "with session" : "no session");
      }

      // Enhanced auth event handling with better error recovery
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // User signed in or token refreshed - update our auth state
        try {
          // Check session validity
          if (!isSessionValid(session as SupabaseSession | null)) {
            if (__DEV__) {
              console.log("[AuthStore] Session expired during event:", event);
            }
            await signOutUser();
            useAuthStore.setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            return;
          }

          await useAuthStore.getState().checkAuthState();
        } catch (error) {
          console.error("[AuthStore] Error in auth event handler:", error);
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
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
          // Check session validity
          if (!isSessionValid(session as SupabaseSession | null)) {
            console.log("[AuthStore] Initial session expired, signing out");
            await signOutUser();
            useAuthStore.setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            return;
          }
          await useAuthStore.getState().checkAuthState();
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

// Schedule a token/session refresh shortly before expiry
const scheduleSessionRefresh = (session: SupabaseSession | null) => {
  if (!session?.expires_at) return;
  if (sessionRefreshTimer) clearTimeout(sessionRefreshTimer);
  const nowMs = Date.now();
  const expMs = session.expires_at * 1000;
  const buffer = 60 * 1000; // 60s buffer
  const delay = Math.max(0, expMs - nowMs - buffer);
  sessionRefreshTimer = setTimeout(async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      if (__DEV__) console.warn("[AuthStore] Session refresh failed", e);
    }
  }, delay);
};

// Register cleanup and setup app lifecycle handling
registerStoreCleanup("authStore", cleanupAuthListener);
setupAutomaticCleanup();

try {
  AppState.addEventListener("change", (st) => {
    if (st === "background") {
      // Proactively clear session refresh timer to avoid wake locks
      if (sessionRefreshTimer) {
        clearTimeout(sessionRefreshTimer);
        sessionRefreshTimer = null;
      }
    }
  });
} catch {}
