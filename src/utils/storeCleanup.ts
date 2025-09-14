// Centralized store cleanup and subscription management
// Provides a simple registry to ensure all stores clean up resources

import { AppState } from "react-native";

type CleanupFn = () => void;

const cleanupRegistry = new Map<string, CleanupFn>();
let appStateListenerAdded = false;

/**
 * Store cleanup registration
 */
export const registerStoreCleanup = (storeName: string, cleanupFn: CleanupFn): void => {
  cleanupRegistry.set(storeName, cleanupFn);
};

/**
 * Manual cleanup trigger for all registered stores
 */
export const cleanupAllStores = async (): Promise<void> => {
  const entries = Array.from(cleanupRegistry.entries());
  for (const [name, fn] of entries) {
    try {
      fn();
    } catch (err) {
      if (__DEV__) {
        console.warn(`[storeCleanup] Cleanup failed for ${name}:`, err);
      }
    }
  }
};

/**
 * Subscription management: cleanup all subscriptions across stores
 * Alias to cleanupAllStores for now; can be specialized later.
 */
export const cleanupAllSubscriptions = (): void => {
  const entries = Array.from(cleanupRegistry.entries());
  for (const [name, fn] of entries) {
    try {
      fn();
    } catch (err) {
      if (__DEV__) {
        console.warn(`[storeCleanup] Subscription cleanup failed for ${name}:`, err);
      }
    }
  }
};

/**
 * Handle memory pressure events by attempting aggressive cleanup
 */
export const handleMemoryPressure = (): void => {
  try {
    cleanupAllSubscriptions();
  } catch (err) {
    if (__DEV__) {
      console.warn("[storeCleanup] Memory pressure cleanup encountered errors:", err);
    }
  }
};

/**
 * Automatic cleanup on app lifecycle events
 */
export const setupAutomaticCleanup = (): void => {
  if (appStateListenerAdded) return;
  try {
    AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        // Clean up subscriptions when app goes to background
        cleanupAllSubscriptions();
      }
    });
    appStateListenerAdded = true;
  } catch (err) {
    if (__DEV__) {
      console.warn("[storeCleanup] Failed to attach AppState listener:", err);
    }
  }
};
