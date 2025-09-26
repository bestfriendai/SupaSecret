/**
 * Screen validation utilities to ensure all screens are properly configured
 */

import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";

// Define required screen validations
export interface ScreenValidation {
  navigation: boolean;
  dataLoading: boolean;
  errorHandling: boolean;
  buttonHandlers: boolean;
  accessibility: boolean;
}

/**
 * Validates that a screen has proper navigation setup
 */
export const validateNavigation = (navigation: NavigationProp<any>): boolean => {
  try {
    if (!navigation) return false;
    if (typeof navigation.navigate !== "function") return false;
    if (typeof navigation.goBack !== "function") return false;
    if (typeof navigation.canGoBack !== "function") return false;
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates that required props are provided
 */
export const validateRequiredProps = (props: Record<string, any>, required: string[]): boolean => {
  return required.every((prop) => props[prop] !== undefined && props[prop] !== null);
};

/**
 * Validates that handlers are properly defined
 */
export const validateHandlers = (handlers: Record<string, any>): boolean => {
  return Object.values(handlers).every((handler) => typeof handler === "function");
};

/**
 * Safe navigation wrapper that prevents crashes
 */
export const safeNavigate = (
  navigation: NavigationProp<RootStackParamList>,
  routeName: keyof RootStackParamList,
  params?: any,
) => {
  try {
    if (!validateNavigation(navigation)) {
      if (__DEV__) {
        console.warn("Navigation object is invalid");
      }
      return false;
    }

    navigation.navigate(routeName as any, params);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error("Navigation failed:", error);
    }
    return false;
  }
};

/**
 * Safe go back wrapper that provides fallback
 */
export const safeGoBack = (navigation: NavigationProp<any>, fallback?: () => void) => {
  try {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    } else if (fallback) {
      fallback();
      return true;
    }
  } catch (error) {
    if (__DEV__) {
      console.error("Go back failed:", error);
    }
  }
  return false;
};

/**
 * Validates screen state for common issues
 */
export const validateScreenState = (state: {
  isLoading?: boolean;
  error?: string | null;
  data?: any;
}): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check for infinite loading states
  if (state.isLoading && !state.data && !state.error) {
    // This might indicate a stuck loading state
  }

  // Check for error states
  if (state.error && typeof state.error !== "string") {
    issues.push("Error should be a string or null");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * Creates a screen validator function
 */
export const createScreenValidator = (screenName: string) => {
  return {
    log: (message: string, data?: any) => {
      if (__DEV__) {
        console.log(`[${screenName}] ${message}`, data ? data : "");
      }
    },
    warn: (message: string, data?: any) => {
      if (__DEV__) {
        console.warn(`[${screenName}] ${message}`, data ? data : "");
      }
    },
    error: (message: string, error?: any) => {
      if (__DEV__) {
        console.error(`[${screenName}] ${message}`, error ? error : "");
      }
    },
    validateState: (state: any) => validateScreenState(state),
  };
};
