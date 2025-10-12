/**
 * Shared App Initialization Module
 * Consolidates initialization logic used by both App.tsx and app/_layout.tsx
 * This eliminates code duplication and ensures consistent initialization across entry points
 */

import * as Audio from "expo-audio";
import { checkEnvironment } from "../utils/environmentCheck";
import { initializeServices } from "../services/ServiceInitializer";
import { startNetworkWatcher } from "../lib/offlineQueue";
import { setupAuthListener } from "../state/authStore";
import { setupConfessionSubscriptions } from "../state/confessionStore";
import { setupNotificationSubscriptions } from "../state/notificationStore";
import { logger } from "../utils/logger";

export interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Initialize all app services and configurations
 * This is the main initialization function called by both App.tsx and app/_layout.tsx
 */
export async function initializeApp(): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  try {
    logger.log("[Init] Starting app initialization...");

    // Step 1: Check environment configuration
    logger.log("[Init] Step 1: Checking environment...");
    try {
      checkEnvironment();
      logger.log("[Init] Environment check passed");
    } catch (error) {
      const errorMsg = `Environment check failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      logger.error("[Init]", errorMsg);
      // Continue with initialization even if env check fails in dev mode
      if (!__DEV__) {
        result.success = false;
      }
    }

    // Step 2: Start network watcher (for offline queue)
    logger.log("[Init] Step 2: Starting network watcher...");
    try {
      await startNetworkWatcher();
      logger.log("[Init] Network watcher started successfully");
    } catch (error) {
      const errorMsg = `Network watcher failed (non-critical): ${error instanceof Error ? error.message : "Unknown error"}`;
      result.warnings.push(errorMsg);
      logger.warn("[Init]", errorMsg);
      // Non-critical - offline queue will work without network detection
    }

    // Step 3: Initialize services (AdMob, RevenueCat, Analytics, etc.)
    logger.log("[Init] Step 3: Initializing services...");
    try {
      const serviceResult = await initializeServices();
      if (!serviceResult.success) {
        result.errors.push(...serviceResult.errors);
        result.warnings.push(...serviceResult.warnings);
        logger.warn("[Init] Some services failed to initialize");
      } else {
        logger.log("[Init] All services initialized successfully");
      }
    } catch (error) {
      const errorMsg = `Service initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      logger.error("[Init]", errorMsg);
      // Continue anyway - app can work with partial service initialization
    }

    // Step 4: Set up audio session
    logger.log("[Init] Step 4: Setting up audio...");
    try {
      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      logger.log("[Init] Audio setup successful");
    } catch (error) {
      const errorMsg = `Audio setup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.warnings.push(errorMsg);
      logger.warn("[Init]", errorMsg);
      // Non-critical - video recording may still work
    }

    // Step 5: Set up auth listener
    logger.log("[Init] Step 5: Setting up auth listener...");
    try {
      setupAuthListener();
      logger.log("[Init] Auth listener setup successful");
    } catch (error) {
      const errorMsg = `Auth listener setup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      logger.error("[Init]", errorMsg);
    }

    // Step 6: Set up store subscriptions
    logger.log("[Init] Step 6: Setting up store subscriptions...");
    try {
      setupConfessionSubscriptions();
      setupNotificationSubscriptions();
      logger.log("[Init] Store subscriptions setup successful");
    } catch (error) {
      const errorMsg = `Store subscriptions setup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.warnings.push(errorMsg);
      logger.warn("[Init]", errorMsg);
    }

    logger.log("[Init] App initialization completed");

    // Determine overall success
    if (result.errors.length > 0) {
      result.success = false;
      logger.error(`[Init] Initialization completed with ${result.errors.length} error(s)`);
    } else if (result.warnings.length > 0) {
      logger.warn(`[Init] Initialization completed with ${result.warnings.length} warning(s)`);
    } else {
      logger.log("[Init] Initialization completed successfully with no errors");
    }

    return result;
  } catch (error) {
    const errorMsg = `Critical initialization failure: ${error instanceof Error ? error.message : "Unknown error"}`;
    result.errors.push(errorMsg);
    result.success = false;
    logger.error("[Init]", errorMsg);
    return result;
  }
}

/**
 * Load user data after authentication
 * This should be called after checkAuthState in both entry points
 */
export async function loadUserData(
  checkAuthState: () => Promise<void>,
  loadUserPreferences: () => Promise<void>,
  loadConfessions: () => Promise<void>,
): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: true,
    errors: [],
    warnings: [],
  };

  try {
    // Step 1: Check auth state first
    logger.log("[Init] Loading auth state...");
    try {
      await checkAuthState();
      logger.log("[Init] Auth state loaded successfully");
    } catch (error) {
      const errorMsg = `Auth state check failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.errors.push(errorMsg);
      logger.error("[Init]", errorMsg);
    }

    // Step 2: Load user preferences before confessions (ensures store is initialized)
    logger.log("[Init] Loading user preferences...");
    try {
      await loadUserPreferences();
      logger.log("[Init] User preferences loaded successfully");
    } catch (error) {
      const errorMsg = `Failed to load user preferences: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.warnings.push(errorMsg);
      logger.warn("[Init]", errorMsg);
      // Continue with default preferences
    }

    // Step 3: Load confessions after preferences are set
    logger.log("[Init] Loading confessions...");
    try {
      await loadConfessions();
      logger.log("[Init] Confessions loaded successfully");
    } catch (error) {
      const errorMsg = `Failed to load confessions: ${error instanceof Error ? error.message : "Unknown error"}`;
      result.warnings.push(errorMsg);
      logger.warn("[Init]", errorMsg);
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  } catch (error) {
    const errorMsg = `User data loading failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    result.errors.push(errorMsg);
    result.success = false;
    logger.error("[Init]", errorMsg);
    return result;
  }
}

/**
 * Setup global error handlers
 * Should be called once at app startup
 */
export function setupGlobalErrorHandlers(): void {
  if (__DEV__) {
    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.error("[Unhandled Promise Rejection]", event.reason);
      // Prevent default error logging in dev tools (we're handling it)
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    // For web environments
    if (typeof window !== "undefined" && "addEventListener" in window) {
      window.addEventListener("unhandledrejection", handleRejection);
    }

    // For React Native - ErrorUtils is available in React Native global
    if (typeof global !== "undefined") {
      const globalWithErrorUtils = global as any;
      const originalHandler = globalWithErrorUtils.ErrorUtils?.getGlobalHandler?.();
      globalWithErrorUtils.ErrorUtils?.setGlobalHandler?.((error: any, isFatal: boolean) => {
        logger.error("[Global Error Handler]", { error, isFatal });
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    logger.log("[Init] Global error handlers installed");
  }
}
