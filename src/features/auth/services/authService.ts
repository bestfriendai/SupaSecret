import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { User, AuthCredentials, SignUpData, PasswordValidation, PasswordStrength } from "../types/auth.types";

/**
 * Custom AuthServiceError class for better error handling
 * Note: Renamed from AuthError to avoid conflict with AuthError interface in auth.types
 */
export class AuthServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

/**
 * Input sanitization to prevent XSS vulnerabilities
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password validation with specific rules
 */
export const validatePassword = (password: string): PasswordValidation => {
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
    errors,
  };
};

/**
 * Get password strength indicator
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
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

/**
 * Validates if a Supabase session is still active
 */
export const isSessionValid = (session: Session | null): boolean => {
  if (!session || !session.expires_at) return false;

  // Add a 5-minute buffer to account for potential time discrepancies
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  return now < new Date(expiresAt.getTime() - bufferTime);
};

/**
 * Sign up a new user
 */
export const signUpUser = async (data: SignUpData): Promise<User> => {
  const { email, password, confirmPassword, username } = data;

  // Validate input
  if (!validateEmail(email)) {
    throw new AuthServiceError("INVALID_EMAIL", "Please enter a valid email address");
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new AuthServiceError("WEAK_PASSWORD", passwordValidation.errors.join(". "));
  }

  if (password !== confirmPassword) {
    throw new AuthServiceError("PASSWORD_MISMATCH", "Passwords do not match");
  }

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
      throw new AuthServiceError("USER_EXISTS", "An account with this email already exists. Please sign in instead.");
    }
    if (authError.message.includes("Password should be at least")) {
      throw new AuthServiceError("WEAK_PASSWORD", "Password must be at least 6 characters long.");
    }
    if (authError.message.includes("Unable to validate email address")) {
      throw new AuthServiceError("INVALID_EMAIL", "Please enter a valid email address.");
    }
    if (authError.message.includes("Network")) {
      throw new AuthServiceError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
    }
    throw new AuthServiceError("SIGNUP_ERROR", "Failed to create account. Please try again.");
  }

  if (!authData.user) {
    throw new AuthServiceError("SIGNUP_ERROR", "Failed to create user account");
  }

  // Update user profile with username and mark as onboarded
  const profileUpdates: any = {
    is_onboarded: true, // Mark user as onboarded after signup
  };

  if (username?.trim()) {
    profileUpdates.username = sanitizeInput(username);
  }

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update(profileUpdates)
    .eq("id", authData.user.id);

  if (profileError && __DEV__) {
    console.warn("Failed to update user profile:", profileError);
  }

  // Return user in our format - mark as onboarded after successful signup
  const user: User = {
    id: authData.user.id,
    email: authData.user.email!,
    username: username?.trim() ? sanitizeInput(username) : undefined,
    createdAt: Date.now(),
    isOnboarded: true, // Mark as onboarded after successful signup
    lastLoginAt: Date.now(),
  };

  return user;
};

/**
 * Sign in existing user
 */
export const signInUser = async (credentials: AuthCredentials): Promise<User> => {
  const { email, password } = credentials;

  // Input validation
  if (!email) {
    throw new AuthServiceError("MISSING_EMAIL", "Please enter your email address");
  }
  if (!password) {
    throw new AuthServiceError("MISSING_PASSWORD", "Please enter your password");
  }
  if (!validateEmail(email)) {
    throw new AuthServiceError("INVALID_EMAIL", "Please enter a valid email address");
  }

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (__DEV__) {
    console.log("🔍 Sign in result:", {
      hasUser: !!authData.user,
      hasSession: !!authData.session,
      error: authError?.message,
    });
  }

  if (authError) {
    // Map Supabase-specific errors for better user feedback
    if (authError.message.includes("Invalid login credentials")) {
      throw new AuthServiceError(
        "INVALID_CREDENTIALS",
        "Invalid email or password. Please check your credentials and try again.",
      );
    }
    if (authError.message.includes("Email not confirmed")) {
      throw new AuthServiceError(
        "EMAIL_NOT_CONFIRMED",
        "Please check your email and click the confirmation link before signing in.",
      );
    }
    if (authError.message.includes("Too many requests")) {
      throw new AuthServiceError("TOO_MANY_REQUESTS", "Too many sign-in attempts. Please wait a moment and try again.");
    }
    if (authError.message.includes("Network")) {
      throw new AuthServiceError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
    }
    throw new AuthServiceError("SIGNIN_ERROR", "Sign in failed. Please try again.");
  }

  if (!authData.user) {
    throw new AuthServiceError("SIGNIN_ERROR", "Failed to sign in");
  }

  // Get user profile data
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("username, is_onboarded, created_at")
    .eq("id", authData.user.id)
    .single();

  // Update last login and ensure user is marked as onboarded
  await supabase
    .from("user_profiles")
    .update({
      last_login_at: new Date().toISOString(),
      is_onboarded: true, // Mark existing users as onboarded on sign in
    })
    .eq("id", authData.user.id);

  // Return user in our format
  const user: User = {
    id: authData.user.id,
    email: authData.user.email!,
    username: profileData?.username || undefined,
    createdAt: profileData?.created_at ? new Date(profileData.created_at).getTime() : Date.now(),
    isOnboarded: true, // Always mark as onboarded for sign in
    lastLoginAt: Date.now(),
  };

  return user;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Get session with retry logic
    let session = null;
    let sessionError = null;

    try {
      const { data, error } = await supabase.auth.getSession();
      session = data.session;
      sessionError = error;
    } catch (error) {
      sessionError = error;
      if (__DEV__) {
        console.warn("Failed to get session, retrying once...", error);
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

    if (sessionError) {
      if (__DEV__) {
        console.error("Session retrieval failed:", sessionError);
      }
      return null;
    }

    if (!session) {
      if (__DEV__) {
        console.log("🔍 No active session found");
      }
      return null;
    }

    // Validate session expiry
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      if (now >= new Date(expiresAt.getTime() - bufferTime)) {
        if (__DEV__) {
          console.log("🔍 Session expired or expiring soon, attempting refresh...");
        }

        // Try to refresh the session
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            if (__DEV__) {
              console.error("Session refresh failed:", refreshError);
            }
            return null;
          }
          session = refreshData.session;
        } catch (refreshError) {
          if (__DEV__) {
            console.error("Session refresh error:", refreshError);
          }
          return null;
        }
      }
    }

    // Get user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      if (__DEV__) {
        console.log("🔍 No authenticated user found", userError?.message);
      }
      return null;
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("username, is_onboarded, created_at, last_login_at")
      .eq("id", userData.user.id)
      .single();

    if (profileError && __DEV__) {
      console.warn("Error fetching user profile:", profileError);
    }

    // Return user in our format
    const user: User = {
      id: userData.user.id,
      email: userData.user.email!,
      username: profileData?.username || undefined,
      createdAt: profileData?.created_at ? new Date(profileData.created_at).getTime() : Date.now(),
      isOnboarded: profileData?.is_onboarded || false,
      lastLoginAt: profileData?.last_login_at ? new Date(profileData.last_login_at).getTime() : Date.now(),
    };

    return user;
  } catch (error) {
    if (__DEV__) {
      console.error("Error getting current user:", error);
    }
    return null;
  }
};

/**
 * Update user data
 */
export const updateUserData = async (userId: string, updates: Partial<User>): Promise<User> => {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.id !== userId) {
    throw new AuthServiceError("UNAUTHORIZED", "Not authorized to update this user");
  }

  // Prepare updates for the database
  const profileUpdates: any = {};
  if (updates.username !== undefined) {
    profileUpdates.username = updates.username ? sanitizeInput(updates.username) : updates.username;
  }
  if (updates.isOnboarded !== undefined) {
    profileUpdates.is_onboarded = updates.isOnboarded;
  }

  // Update user profile in Supabase
  const { error } = await supabase.from("user_profiles").update(profileUpdates).eq("id", userId);

  if (error) {
    throw new AuthServiceError("UPDATE_ERROR", error.message);
  }

  // Return updated user
  const updatedUser: User = {
    ...currentUser,
    ...updates,
  };

  return updatedUser;
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!validateEmail(email)) {
    throw new AuthServiceError("INVALID_EMAIL", "Please enter a valid email address");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "toxicconfessions://reset-password",
  });

  if (error) {
    if (error.message.includes("Email not found")) {
      throw new AuthServiceError("EMAIL_NOT_FOUND", "No account found with this email address");
    }
    if (error.message.includes("Email rate limit exceeded")) {
      throw new AuthServiceError("RATE_LIMIT_EXCEEDED", "Too many emails sent. Please wait before requesting another");
    }
    if (error.message.includes("Network")) {
      throw new AuthServiceError("NETWORK_ERROR", "Network error. Please check your connection and try again");
    }
    throw new AuthServiceError("PASSWORD_RESET_ERROR", "Unable to send password reset email. Please try again");
  }
};

/**
 * Sign out user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      if (__DEV__) {
        console.error("Error signing out:", error);
      }

      // For network errors, we still want to clear local state
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("network") || errorMessage.includes("connection") || errorMessage.includes("timeout")) {
        if (__DEV__) {
          console.warn("Network error during sign out, but clearing local auth state anyway");
        }
        return;
      }

      throw new AuthServiceError("SIGNOUT_ERROR", "Failed to sign out. Please try again.");
    }

    if (__DEV__) {
      console.log("✅ User signed out successfully");
    }
  } catch (error) {
    if (__DEV__) {
      console.error("Sign out error:", error);
    }

    // If it's already an AuthServiceError, re-throw it
    if (error instanceof AuthServiceError) {
      throw error;
    }

    // For other errors, wrap in AuthServiceError
    throw new AuthServiceError("SIGNOUT_ERROR", "Failed to sign out. Please try again.");
  }
};
