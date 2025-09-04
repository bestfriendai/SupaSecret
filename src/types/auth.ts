export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: number;
  isOnboarded: boolean;
  lastLoginAt: number;
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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  
  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
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