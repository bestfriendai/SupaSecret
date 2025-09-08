import { create } from 'zustand';

interface NavigationState {
  currentAuthScreen: 'onboarding' | 'signin' | 'signup' | null;
  isAuthenticating: boolean;
  lastAuthAttempt: number | null;
  
  // Actions
  setCurrentAuthScreen: (screen: 'onboarding' | 'signin' | 'signup' | null) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setLastAuthAttempt: (timestamp: number) => void;
  shouldPreventRedirect: () => boolean;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentAuthScreen: null,
  isAuthenticating: false,
  lastAuthAttempt: null,

  setCurrentAuthScreen: (screen) => {
    set({ currentAuthScreen: screen });
  },

  setAuthenticating: (isAuthenticating) => {
    set({ isAuthenticating });
  },

  setLastAuthAttempt: (timestamp) => {
    set({ lastAuthAttempt: timestamp });
  },

  shouldPreventRedirect: () => {
    const state = get();
    const now = Date.now();

    // Prevent redirect if:
    // 1. Currently authenticating
    // 2. Recent auth attempt (within 5 seconds) and on signin/signup screen
    const recentAuthAttempt = state.lastAuthAttempt && (now - state.lastAuthAttempt) < 5000;
    const onAuthScreen = state.currentAuthScreen === 'signin' || state.currentAuthScreen === 'signup';

    return Boolean(state.isAuthenticating || (recentAuthAttempt && onAuthScreen));
  },
}));
