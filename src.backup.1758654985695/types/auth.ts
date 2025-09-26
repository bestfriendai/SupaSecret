import { StandardError } from "../utils/errorHandling";

export interface User {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  createdAt: number;
  isOnboarded: boolean;
  lastLoginAt?: number | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends AuthCredentials {
  confirmPassword: string;
  username?: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: string;
  timestamp?: number;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
  };
}

export interface AuthErrorResponse {
  error: AuthError;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: StandardError | null;

  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (credentials: AuthCredentials, persistSession?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setOnboarded: () => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}
