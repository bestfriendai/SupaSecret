import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, AuthCredentials, SignUpData } from "../types/auth";
import { v4 as uuidv4 } from "uuid";

const USERS_STORAGE_KEY = "users_storage";
const CURRENT_USER_KEY = "current_user";

// Simple password hashing (for demo purposes - use proper hashing in production)
const hashPassword = (password: string): string => {
  // This is a very basic hash - in production, use bcrypt or similar
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
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

// Get all users from storage
const getUsers = async (): Promise<Record<string, any>> => {
  try {
    const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return usersData ? JSON.parse(usersData) : {};
  } catch (error) {
    console.error("Error getting users:", error);
    return {};
  }
};

// Save users to storage
const saveUsers = async (users: Record<string, any>): Promise<void> => {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error saving users:", error);
    throw new Error("Failed to save user data");
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
  
  // Check if user already exists
  const users = await getUsers();
  if (users[email]) {
    throw new AuthError("USER_EXISTS", "An account with this email already exists");
  }
  
  // Create new user
  const user: User = {
    id: uuidv4(),
    email,
    username: username?.trim() || undefined,
    createdAt: Date.now(),
    isOnboarded: false,
    lastLoginAt: Date.now(),
  };
  
  // Save user with hashed password
  users[email] = {
    ...user,
    passwordHash: hashPassword(password),
  };
  
  await saveUsers(users);
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  
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
  
  const users = await getUsers();
  const userData = users[email];
  
  if (!userData) {
    throw new AuthError("USER_NOT_FOUND", "No account found with this email address");
  }
  
  const hashedPassword = hashPassword(password);
  if (userData.passwordHash !== hashedPassword) {
    throw new AuthError("INVALID_PASSWORD", "Incorrect password");
  }
  
  // Update last login
  const user: User = {
    id: userData.id,
    email: userData.email,
    username: userData.username,
    createdAt: userData.createdAt,
    isOnboarded: userData.isOnboarded,
    lastLoginAt: Date.now(),
  };
  
  userData.lastLoginAt = Date.now();
  await saveUsers(users);
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  
  return user;
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Update user data
export const updateUserData = async (userId: string, updates: Partial<User>): Promise<User> => {
  const users = await getUsers();
  const currentUser = await getCurrentUser();
  
  if (!currentUser || currentUser.id !== userId) {
    throw new AuthError("UNAUTHORIZED", "Not authorized to update this user");
  }
  
  // Find user by ID
  let userEmail: string | null = null;
  for (const [email, userData] of Object.entries(users)) {
    if ((userData as any).id === userId) {
      userEmail = email;
      break;
    }
  }
  
  if (!userEmail) {
    throw new AuthError("USER_NOT_FOUND", "User not found");
  }
  
  // Update user data
  const updatedUser: User = {
    ...currentUser,
    ...updates,
  };
  
  users[userEmail] = {
    ...users[userEmail],
    ...updates,
  };
  
  await saveUsers(users);
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
  
  return updatedUser;
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
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