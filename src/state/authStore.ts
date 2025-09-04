import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthState, User, AuthCredentials, SignUpData, AuthError } from "../types/auth";
import {
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUser,
  updateUserData,
} from "../utils/auth";

export const useAuthStore = create<AuthState>()(
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

      signIn: async (credentials: AuthCredentials) => {
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

      signOut: async () => {
        set({ isLoading: true });
        try {
          await signOutUser();
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
        set({ error: null });
      },

      checkAuthState: async () => {
        set({ isLoading: true });
        try {
          const user = await getCurrentUser();
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
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
    }
  )
);