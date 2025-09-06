import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SavedState {
  savedConfessionIds: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  saveConfession: (confessionId: string) => void;
  unsaveConfession: (confessionId: string) => void;
  isSaved: (confessionId: string) => boolean;
  clearAllSaved: () => void;
  clearError: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedConfessionIds: [],
      isLoading: false,
      error: null,

      saveConfession: (confessionId: string) => {
        try {
          const state = get();
          if (!state.savedConfessionIds.includes(confessionId)) {
            set({
              savedConfessionIds: [...state.savedConfessionIds, confessionId],
              error: null,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save confession',
          });
        }
      },

      unsaveConfession: (confessionId: string) => {
        try {
          const state = get();
          set({
            savedConfessionIds: state.savedConfessionIds.filter(id => id !== confessionId),
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to unsave confession',
          });
        }
      },

      isSaved: (confessionId: string) => {
        const state = get();
        return state.savedConfessionIds.includes(confessionId);
      },

      clearAllSaved: () => {
        set({
          savedConfessionIds: [],
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "saved-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedConfessionIds: state.savedConfessionIds,
      }),
    }
  )
);
