import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { User, AuthCredentials, SignUpData, AuthState } from "../types/auth.types";
import {
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUser,
  updateUserData,
  isSessionValid,
} from "../services/authService";

interface AuthStore extends AuthState {
  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (credentials: AuthCredentials, persistSession?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setOnboarded: () => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
}

// Track in-flight auth checks to prevent duplicates
let authCheckInFlight: Promise<void> | null = null;
let sessionRefreshTimer: any = null;
let authListener: { data: { subscription: any } } | null = null;

/**
 * Schedule a token/session refresh before expiry
 */
const scheduleSessionRefresh = (session: Session | null) => {
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

/**
 * Cleanup function for auth listener and timers
 */
export const cleanupAuthListener = () => {
  if (authListener) {
    authListener.data.subscription.unsubscribe();
    authListener = null;
  }
  if (sessionRefreshTimer) {
    clearTimeout(sessionRefreshTimer);
    sessionRefreshTimer = null;
  }
};

/**
 * Set up auth state listener with proper state management
 */
export const setupAuthListener = () => {
  if (authListener) return; // Already set up

  try {
    authListener = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (__DEV__) {
        console.log("🔍 Supabase auth event:", event, session ? "with session" : "no session");
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        try {
          if (!isSessionValid(session as Session | null)) {
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
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      } else if (event === "INITIAL_SESSION") {
        if (session) {
          if (!isSessionValid(session as Session | null)) {
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
  }
};

/**
 * Main auth store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signUp: async (data: SignUpData) => {
        set({ isLoading: true, error: null });
        try {
          const user = await signUpUser(data);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
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
          set({ isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await signOutUser();
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
        set({ error: null });
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
          const errorMessage = error instanceof Error ? error.message : "Failed to update user";
          set({
            isLoading: false,
            error: {
              code: "UPDATE_ERROR",
              message: errorMessage,
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

        // Prevent duplicate in-flight checks
        if (authCheckInFlight) return authCheckInFlight;

        set({ isLoading: true });

        const withTimeout = <T>(promise: Promise<T>, ms = 15000): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Auth check timeout")), ms);
            promise
              .then((value) => {
                clearTimeout(timer);
                resolve(value);
              })
              .catch((error) => {
                clearTimeout(timer);
                reject(error);
              });
          });
        };

        authCheckInFlight = withTimeout(
          (async () => {
            try {
              // Check rehydrated state first
              const { user: rehydratedUser, isAuthenticated: rehydratedAuth } = get();

              // Get session from Supabase
              const { data, error: sessionError } = await supabase.auth.getSession();
              const session = data.session;

              if (sessionError) {
                if (__DEV__) {
                  console.error("Session retrieval failed:", sessionError);
                }
                // Preserve rehydrated state on network errors
                if (rehydratedUser && rehydratedAuth) {
                  set({ isLoading: false });
                  return;
                }
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
                return;
              }

              // Validate session
              if (!isSessionValid(session as Session | null)) {
                if (__DEV__) {
                  console.log("Session invalid or expired, signing out");
                }
                await signOutUser();
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
                return;
              }

              // Schedule session refresh
              scheduleSessionRefresh(session as Session | null);

              // Get current user
              const user = await getCurrentUser();

              set({
                user,
                isAuthenticated: !!user,
                isLoading: false,
                error: null,
              });

              if (__DEV__) {
                console.log("Auth state check completed:", {
                  hasUser: !!user,
                  userId: user?.id,
                  duration: Date.now() - start,
                });
              }
            } catch (error) {
              if (__DEV__) {
                console.error("Auth state check failed:", error);
              }

              const { user: rehydratedUser, isAuthenticated: rehydratedAuth } = get();

              // Preserve state on network errors
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
                set({ user: null, isAuthenticated: false, isLoading: false, error: null });
              }
            } finally {
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
        // Only persist non-sensitive user data and authentication status
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
      version: 1,
      migrate: (persistedState: unknown, version: number): unknown => {
        const state = persistedState as Partial<AuthState>;
        if (version === 0) {
          return state;
        }
        return state;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          if (__DEV__) {
            console.error("Failed to rehydrate auth state:", error);
          }
          return;
        }

        if (state) {
          // Validate rehydrated state consistency
          const hasUser = !!state.user;
          const claimsAuth = state.isAuthenticated;

          if (hasUser !== claimsAuth) {
            if (__DEV__) {
              console.warn("Inconsistent auth state detected during rehydration, correcting...");
            }
            state.isAuthenticated = hasUser;
          }

          // Validate user data integrity
          if (state.user && !state.user.id) {
            if (__DEV__) {
              console.warn("Invalid user data in rehydrated state (missing ID), clearing...");
            }
            state.user = null;
            state.isAuthenticated = false;
          }

          if (__DEV__) {
            console.log("🔍 Auth state rehydrated:", {
              hasUser: !!state.user,
              userId: state.user?.id,
              isOnboarded: state.user?.isOnboarded || false,
              isAuthenticated: state.isAuthenticated,
            });
          }

          // Schedule auth state validation if authenticated
          if (state.isAuthenticated && state.user) {
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
