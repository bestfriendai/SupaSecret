import { User, AuthCredentials, SignUpData } from "../types/auth";
import { supabase } from "../lib/supabase";

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get password strength
export const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;
  
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  if (strength <= 2) {
    return { strength: 1, label: "Weak", color: "#EF4444" };
  } else if (strength <= 4) {
    return { strength: 2, label: "Medium", color: "#F59E0B" };
  } else {
    return { strength: 3, label: "Strong", color: "#10B981" };
  }
};

// Sign up a new user
export const signUpUser = async (data: SignUpData): Promise<User> => {
  const { email, password, confirmPassword, username } = data;

  // Validate input
  if (!validateEmail(email)) {
    throw new AuthError("INVALID_EMAIL", "Please enter a valid email address");
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new AuthError("WEAK_PASSWORD", passwordValidation.errors.join(". "));
  }

  if (password !== confirmPassword) {
    throw new AuthError("PASSWORD_MISMATCH", "Passwords do not match");
  }

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new AuthError(authError.message.includes('already registered') ? 'USER_EXISTS' : 'SIGNUP_ERROR', authError.message);
  }

  if (!authData.user) {
    throw new AuthError("SIGNUP_ERROR", "Failed to create user account");
  }

  // Update user profile with username - don't mark as onboarded yet
  const profileUpdates: any = {};

  if (username?.trim()) {
    profileUpdates.username = username.trim();
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdates)
      .eq('id', authData.user.id);

    if (profileError) {
      console.warn("Failed to update user profile:", profileError);
    }
  }

  // Return user in our format - let them go through onboarding
  const user: User = {
    id: authData.user.id,
    email: authData.user.email!,
    username: username?.trim() || undefined,
    createdAt: Date.now(),
    isOnboarded: false, // Let user go through onboarding flow
    lastLoginAt: Date.now(),
  };

  return user;
};

// Sign in existing user
export const signInUser = async (credentials: AuthCredentials): Promise<User> => {
  const { email, password } = credentials;

  if (!validateEmail(email)) {
    throw new AuthError("INVALID_EMAIL", "Please enter a valid email address");
  }

  if (!password) {
    throw new AuthError("MISSING_PASSWORD", "Please enter your password");
  }

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }
    throw new AuthError("SIGNIN_ERROR", authError.message);
  }

  if (!authData.user) {
    throw new AuthError("SIGNIN_ERROR", "Failed to sign in");
  }

  // Get user profile data
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('username, is_onboarded, created_at')
    .eq('id', authData.user.id)
    .single();

  // Update last login
  await supabase
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', authData.user.id);

  // Return user in our format
  const user: User = {
    id: authData.user.id,
    email: authData.user.email!,
    username: profileData?.username || undefined,
    createdAt: profileData?.created_at ? new Date(profileData.created_at).getTime() : Date.now(),
    isOnboarded: profileData?.is_onboarded || false,
    lastLoginAt: Date.now(),
  };

  return user;
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First check if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      if (__DEV__) {
        console.log('🔍 No active session found');
      }
      return null;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      if (__DEV__) {
        console.log('🔍 No authenticated user found');
      }
      return null;
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, is_onboarded, created_at, last_login_at')
      .eq('id', authUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }

    // Return user in our format
    const user: User = {
      id: authUser.id,
      email: authUser.email!,
      username: profileData?.username || undefined,
      createdAt: profileData?.created_at ? new Date(profileData.created_at).getTime() : Date.now(),
      isOnboarded: profileData?.is_onboarded || false,
      lastLoginAt: profileData?.last_login_at ? new Date(profileData.last_login_at).getTime() : Date.now(),
    };

    if (__DEV__) {
      console.log('🔍 Current user retrieved:', {
        email: user.email,
        isOnboarded: user.isOnboarded,
        hasProfile: !!profileData
      });
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Update user data
export const updateUserData = async (userId: string, updates: Partial<User>): Promise<User> => {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.id !== userId) {
    throw new AuthError("UNAUTHORIZED", "Not authorized to update this user");
  }

  // Prepare updates for the database
  const profileUpdates: any = {};
  if (updates.username !== undefined) profileUpdates.username = updates.username;
  if (updates.isOnboarded !== undefined) profileUpdates.is_onboarded = updates.isOnboarded;

  // Update user profile in Supabase
  const { error } = await supabase
    .from('user_profiles')
    .update(profileUpdates)
    .eq('id', userId);

  if (error) {
    throw new AuthError("UPDATE_ERROR", error.message);
  }

  // Return updated user
  const updatedUser: User = {
    ...currentUser,
    ...updates,
  };

  return updatedUser;
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw new Error("Failed to sign out");
  }
};

// Custom AuthError class
class AuthError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}