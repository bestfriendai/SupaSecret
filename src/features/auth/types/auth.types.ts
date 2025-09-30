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
  error: AuthError | null;
}

export interface SupabaseSession {
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

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export interface PasswordStrength {
  strength: number;
  label: string;
  color: string;
}
