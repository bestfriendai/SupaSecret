import { User, AuthCredentials, SignUpData } from "../types/auth";
import { supabase } from "../lib/supabase";
import Constants from "expo-constants";
import { sanitizeText } from "./sanitize";

// SDK 53: Input sanitization to prevent XSS vulnerabilities
export const sanitizeInput = (input: string): string => {
  return sanitizeText(input);
};

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
    errors,
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
    if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
      throw new AuthError("USER_EXISTS", "An account with this email already exists. Please sign in instead.");
    }
    if (authError.message.includes("Password should be at least")) {
      throw new AuthError("WEAK_PASSWORD", "Password must be at least 6 characters long.");
    }
    if (authError.message.includes("Unable to validate email address")) {
      throw new AuthError("INVALID_EMAIL", "Please enter a valid email address.");
    }
    if (authError.message.includes("Network")) {
      throw new AuthError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
    }
    throw new AuthError("SIGNUP_ERROR", "Failed to create account. Please try again.");
  }

  if (!authData.user) {
    throw new AuthError("SIGNUP_ERROR", "Failed to create user account");
  }

  // Update user profile with username and mark as onboarded
  const profileUpdates: any = {
    is_onboarded: true, // Mark user as onboarded after signup
  };

  if (username?.trim()) {
    // SDK 53: Sanitize username to prevent XSS
    profileUpdates.username = sanitizeInput(username);
  }

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update(profileUpdates)
    .eq("id", authData.user.id);

  if (profileError) {
    if (__DEV__) {
      console.warn("Failed to update user profile:", profileError);
    }
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

  if (__DEV__) {
    console.log("🔍 Sign in result:", {
      hasUser: !!authData.user,
      hasSession: !!authData.session,
      error: authError?.message,
    });
  }

  if (authError) {
    if (authError.message.includes("Invalid login credentials")) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password. Please check your credentials and try again.",
      );
    }
    if (authError.message.includes("Email not confirmed")) {
      throw new AuthError(
        "EMAIL_NOT_CONFIRMED",
        "Please check your email and click the confirmation link before signing in.",
      );
    }
    if (authError.message.includes("Too many requests")) {
      throw new AuthError("TOO_MANY_REQUESTS", "Too many sign-in attempts. Please wait a moment and try again.");
    }
    if (authError.message.includes("Network")) {
      throw new AuthError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
    }
    throw new AuthError("SIGNIN_ERROR", "Sign in failed. Please try again.");
  }

  if (!authData.user) {
    throw new AuthError("SIGNIN_ERROR", "Failed to sign in");
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

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First check if we have a valid session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      if (__DEV__) {
        console.log("🔍 No active session found");
      }
      return null;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      if (__DEV__) {
        console.log("🔍 No authenticated user found");
      }
      return null;
    }

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("username, is_onboarded, created_at, last_login_at")
      .eq("id", authUser.id)
      .single();

    if (__DEV__) {
      console.log("🔍 Profile query result:", {
        userId: authUser.id,
        profileData,
        profileError: profileError?.message,
        errorCode: profileError?.code,
      });
    }

    if (profileError && profileError.code !== "PGRST116") {
      if (__DEV__) {
        console.error("Error fetching user profile:", profileError);
      }
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
      console.log("🔍 Current user retrieved:", {
        email: user.email,
        isOnboarded: user.isOnboarded,
        hasProfile: !!profileData,
      });
    }

    return user;
  } catch (error) {
    if (__DEV__) {
      console.error("Error getting current user:", error);
    }
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
  if (updates.username !== undefined) {
    // SDK 53: Sanitize username to prevent XSS
    profileUpdates.username = updates.username ? sanitizeInput(updates.username) : updates.username;
  }
  if (updates.isOnboarded !== undefined) profileUpdates.is_onboarded = updates.isOnboarded;

  // Update user profile in Supabase
  const { error } = await supabase.from("user_profiles").update(profileUpdates).eq("id", userId);

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

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!validateEmail(email)) {
    throw new AuthError("INVALID_EMAIL", "Please enter a valid email address");
  }

  // Properly construct redirect URL using Expo Constants
  const appUrl =
    (Constants.expoConfig as any)?.extra?.appUrl || "toxicconfessions://";
  const baseUrl = appUrl.replace(/\/+$/, "");
  const redirectTo = `${baseUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    if (error.message.includes("Email not found")) {
      throw new AuthError("EMAIL_NOT_FOUND", "No account found with this email address");
    }
    if (error.message.includes("Email rate limit exceeded")) {
      throw new AuthError("RATE_LIMIT_EXCEEDED", "Too many emails sent. Please wait before requesting another");
    }
    if (error.message.includes("Network")) {
      throw new AuthError("NETWORK_ERROR", "Network error. Please check your connection and try again");
    }
    throw new AuthError("PASSWORD_RESET_ERROR", "Unable to send password reset email. Please try again");
  }
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    if (__DEV__) {
      console.error("Error signing out:", error);
    }
    throw new Error("Failed to sign out");
  }
};

// Debug function to check auth state manually
export const debugAuthState = async () => {
  try {
    console.log("🔍 === DEBUG AUTH STATE ===");

    // Check session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log(
      "🔍 Session:",
      session ? `exists (expires: ${session.expires_at})` : "null",
      sessionError?.message || "",
    );

    // Check user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log("🔍 Auth User:", user ? `${user.email} (${user.id})` : "null", userError?.message || "");

    if (user) {
      // Check profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      console.log("🔍 Profile Data:", profileData, profileError?.message || "");
    }

    // Check AsyncStorage directly
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const supabaseSession = await AsyncStorage.getItem("supabase-auth-token");
    console.log("🔍 AsyncStorage Supabase Token:", supabaseSession ? "exists" : "null");

    const authStorage = await AsyncStorage.getItem("auth-storage");
    console.log("🔍 AsyncStorage Auth Store:", authStorage ? "exists" : "null");

    console.log("🔍 === END DEBUG ===");
  } catch (error) {
    console.error("🔍 Debug auth state error:", error);
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
