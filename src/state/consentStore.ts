/**
 * Consent Store for GDPR compliance
 * Manages user consent for ads, analytics, and data processing
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

export interface ConsentPreferences {
  analytics: boolean;
  advertising: boolean;
  personalization: boolean;
  essential: boolean; // Always true, cannot be disabled
  lastUpdated: string;
  version: string; // Privacy policy version
}

// Type for boolean-only keys in ConsentPreferences
type BooleanConsentKey = {
  [K in keyof ConsentPreferences]: ConsentPreferences[K] extends boolean ? K : never;
}[keyof ConsentPreferences];

interface ConsentState {
  preferences: ConsentPreferences | null;
  isLoading: boolean;
  error: string | null;
  hasShownConsentDialog: boolean;

  // Actions
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  loadConsent: () => Promise<void>;
  saveConsent: (preferences: ConsentPreferences) => Promise<void>;
  resetConsent: () => Promise<void>;
  setConsentDialogShown: (shown: boolean) => void;
  hasConsent: (type: BooleanConsentKey) => boolean;
  clearError: () => void;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  advertising: false,
  personalization: false,
  essential: true,
  lastUpdated: new Date().toISOString(),
  version: "1.0",
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      preferences: null,
      isLoading: false,
      error: null,
      hasShownConsentDialog: false,

      updateConsent: async (newPreferences: Partial<ConsentPreferences>) => {
        set({ isLoading: true, error: null });

        try {
          const state = get();
          const currentPreferences = state.preferences || DEFAULT_PREFERENCES;

          const updatedPreferences: ConsentPreferences = {
            ...currentPreferences,
            ...newPreferences,
            essential: true, // Always true
            lastUpdated: new Date().toISOString(),
          };

          // Save to local state first
          set({ preferences: updatedPreferences });

          // Save to backend if user is authenticated
          await get().saveConsent(updatedPreferences);

          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update consent",
            isLoading: false,
          });
        }
      },

      loadConsent: async () => {
        set({ isLoading: true, error: null });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // Try to load from backend
            const { data, error } = await supabase
              .from("user_consent" as any)
              .select("*")
              .eq("user_id", user.id)
              .single();

            if (error && error.code !== "PGRST116") {
              // PGRST116 = no rows returned
              throw error;
            }

            if (data) {
              const row: any = data as any;
              const preferences: ConsentPreferences = {
                analytics: !!row.analytics,
                advertising: !!row.advertising,
                personalization: !!row.personalization,
                essential: true,
                lastUpdated: row.updated_at || new Date().toISOString(),
                version: row.version || "1.0",
              };

              set({ preferences, isLoading: false });
              return;
            }
          }

          // If no backend data or not authenticated, use local storage or defaults
          const state = get();
          if (!state.preferences) {
            set({ preferences: DEFAULT_PREFERENCES });
          }

          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load consent",
            isLoading: false,
            preferences: get().preferences || DEFAULT_PREFERENCES,
          });
        }
      },

      saveConsent: async (preferences: ConsentPreferences) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { error } = await supabase.from("user_consent" as any).upsert({
              user_id: user.id,
              analytics: preferences.analytics,
              advertising: preferences.advertising,
              personalization: preferences.personalization,
              version: preferences.version,
              updated_at: preferences.lastUpdated,
            });

            if (error) throw error;
          }
        } catch (error) {
          // Don't throw error for consent saving - local storage is sufficient
          if (__DEV__) {
            console.warn("Failed to save consent to backend:", error);
          }
        }
      },

      resetConsent: async () => {
        set({ isLoading: true, error: null });

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // Delete from backend
            await supabase
              .from("user_consent" as any)
              .delete()
              .eq("user_id", user.id);
          }

          // Reset local state
          set({
            preferences: DEFAULT_PREFERENCES,
            hasShownConsentDialog: false,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to reset consent",
            isLoading: false,
          });
        }
      },

      setConsentDialogShown: (shown: boolean) => {
        set({ hasShownConsentDialog: shown });
      },

      hasConsent: (type: BooleanConsentKey) => {
        const state = get();
        if (!state.preferences) return false;
        return state.preferences[type] === true;
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "consent-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        hasShownConsentDialog: state.hasShownConsentDialog,
      }),
    },
  ),
);

const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = Object.freeze({
  analytics: false,
  advertising: false,
  personalization: false,
  essential: true,
  lastUpdated: new Date(0).toISOString(),
  version: "default",
});

export const consentStore = {
  get preferences(): ConsentPreferences {
    return useConsentStore.getState().preferences ?? (DEFAULT_CONSENT_PREFERENCES as ConsentPreferences);
  },
};

// Helper functions for external use
export const hasAnalyticsConsent = () => {
  return useConsentStore.getState().hasConsent("analytics");
};

export const hasAdvertisingConsent = () => {
  return useConsentStore.getState().hasConsent("advertising");
};

export const hasPersonalizationConsent = () => {
  return useConsentStore.getState().hasConsent("personalization");
};

// Initialize consent on app start
export const initializeConsent = async () => {
  const { loadConsent } = useConsentStore.getState();
  await loadConsent();
};
