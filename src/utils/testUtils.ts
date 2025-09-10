/**
 * Comprehensive testing utilities for the SupaSecret app
 * Provides mock data, test helpers, and validation functions
 */

import type { Confession } from "../types/confession";
import type { Notification } from "../types/notification";

/**
 * Mock data generators
 */
export const mockData = {
  confession: (overrides: Partial<Confession> = {}): Confession => ({
    id: `confession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: "This is a test confession for development purposes.",
    type: "text",
    isAnonymous: true,
    likes: Math.floor(Math.random() * 100),
    isLiked: Math.random() > 0.5,
    timestamp: Date.now(),
    ...overrides,
  }),

  videoConfession: (overrides: Partial<Confession> = {}): Confession => ({
    ...mockData.confession(),
    type: "video",
    content: "This is a video confession.",
    videoUri: "https://example.com/video.mp4",
    transcription: "This is the transcription of the video confession.",
    ...overrides,
  }),

  notification: (overrides: Partial<Notification> = {}): Notification => ({
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: "test_user",
    type: "like",
    entity_id: "test_confession_id",
    entity_type: "confession",
    actor_user_id: null,
    message: "Your secret received a new like!",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides: any = {}) => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: "test@example.com",
    username: "testuser",
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  userPreferences: () => ({
    autoplay: true,
    soundEnabled: true,
    qualityPreference: "auto" as const,
    dataUsageMode: "standard" as const,
    captionsDefault: false,
    hapticsEnabled: true,
    reducedMotion: false,
    playbackSpeed: 1.0,
  }),

  confessionBatch: (count: number = 10): Confession[] => {
    return Array.from({ length: count }, (_, index) =>
      mockData.confession({
        content: `Test confession #${index + 1} with some interesting content to test the UI.`,
        likes: Math.floor(Math.random() * 50),
        isLiked: Math.random() > 0.7,
      }),
    );
  },

  notificationBatch: (count: number = 5): Notification[] => {
    const types: Notification["type"][] = ["like", "reply"];

    return Array.from({ length: count }, (_, index) =>
      mockData.notification({
        type: types[index % types.length],
        message: `This is test notification #${index + 1}`,
        read_at: Math.random() > 0.5 ? new Date().toISOString() : null,
      }),
    );
  },
};

/**
 * Test environment detection
 */
export const testEnvironment = {
  isDevelopment: __DEV__,
  isTest: process.env.NODE_ENV === "test",
  isStorybook: process.env.STORYBOOK === "true",

  shouldUseMockData: () => testEnvironment.isDevelopment || testEnvironment.isTest || testEnvironment.isStorybook,
};

/**
 * Performance testing utilities
 */
export const perf = {
  measureRender: (componentName: string, renderFn: () => void) => {
    if (!__DEV__) return renderFn();

    const startTime = Date.now();
    const result = renderFn();
    const endTime = Date.now();

    console.log(`🎯 ${componentName} render time: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  },

  measureAsync: async (operationName: string, asyncFn: () => Promise<any>) => {
    if (!__DEV__) return await asyncFn();

    const startTime = Date.now();
    const result = await asyncFn();
    const endTime = Date.now();

    console.log(`⏱️ ${operationName} execution time: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  },

  logMemoryUsage: (label: string) => {
    if (!__DEV__ || !(global as any).performance?.memory) return;

    const memory = (global as any).performance.memory;
    console.log(`💾 ${label} Memory Usage:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
    });
  },
};

/**
 * API testing utilities
 */
export const apiTesting = {
  mockResponse: <T>(data: T, delay: number = 100): Promise<T> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(data), delay);
    });
  },

  mockError: (message: string, delay: number = 100): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), delay);
    });
  },

  simulateNetworkDelay: (min: number = 100, max: number = 500): Promise<void> => {
    const delay = Math.random() * (max - min) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  },

  mockSupabaseResponse: <T>(data: T[], error: any = null) => ({
    data: error ? null : data,
    error,
    count: error ? null : data.length,
    status: error ? 400 : 200,
    statusText: error ? "Bad Request" : "OK",
  }),
};

/**
 * UI testing utilities
 */
export const uiTesting = {
  generateTestId: (component: string, element?: string): string => {
    return element ? `${component}-${element}` : component;
  },

  createMockNavigation: () => ({
    navigate: jestShim.fn(),
    goBack: jestShim.fn(),
    reset: jestShim.fn(),
    setParams: jestShim.fn(),
    dispatch: jestShim.fn(),
    isFocused: jestShim.fn(() => true),
    canGoBack: jestShim.fn(() => true),
    getId: jestShim.fn(() => "test-screen"),
    getParent: jestShim.fn(),
    getState: jestShim.fn(),
  }),

  createMockRoute: (name: string, params: any = {}) => ({
    key: `${name}-${Date.now()}`,
    name,
    params,
  }),

  waitFor: (condition: () => boolean, timeout: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  },
};

/**
 * Store testing utilities
 */
export const storeTesting = {
  createMockStore: <T>(initialState: T) => {
    let state = initialState;
    const listeners: (() => void)[] = [];

    return {
      getState: () => state,
      setState: (newState: Partial<T>) => {
        state = { ...state, ...newState };
        listeners.forEach((listener) => listener());
      },
      subscribe: (listener: () => void) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index > -1) listeners.splice(index, 1);
        };
      },
      reset: () => {
        state = initialState;
        listeners.forEach((listener) => listener());
      },
    };
  },

  mockZustandStore: <T>(store: any, mockState: Partial<T>) => {
    const originalState = store.getState();
    store.setState(mockState);

    return () => store.setState(originalState);
  },
};

/**
 * Accessibility testing utilities
 */
export const a11yTesting = {
  checkAccessibilityProps: (props: any) => {
    const issues: string[] = [];

    if (props.onPress && !props.accessibilityRole) {
      issues.push("Interactive element missing accessibilityRole");
    }

    if (props.onPress && !props.accessibilityLabel) {
      issues.push("Interactive element missing accessibilityLabel");
    }

    if (props.disabled && props.accessibilityState?.disabled !== true) {
      issues.push("Disabled element should have accessibilityState.disabled = true");
    }

    return issues;
  },

  validateTouchTarget: (width: number, height: number) => {
    const minSize = 44; // iOS minimum touch target size
    const issues: string[] = [];

    if (width < minSize) {
      issues.push(`Touch target width (${width}) is below minimum (${minSize})`);
    }

    if (height < minSize) {
      issues.push(`Touch target height (${height}) is below minimum (${minSize})`);
    }

    return issues;
  },
};

/**
 * Debug utilities
 */
const jestShim: any = (global as any).jest || { fn: () => () => {} };

export const debug = {
  logProps: (componentName: string, props: any) => {
    if (__DEV__) {
      console.group(`🔍 ${componentName} Props`);
      console.log(props);
      console.groupEnd();
    }
  },

  logState: (storeName: string, state: any) => {
    if (__DEV__) {
      console.group(`📊 ${storeName} State`);
      console.log(state);
      console.groupEnd();
    }
  },

  logError: (context: string, error: any) => {
    if (__DEV__) {
      console.group(`❌ Error in ${context}`);
      console.error(error);
      console.groupEnd();
    }
  },

  logPerformance: (operation: string, startTime: number) => {
    if (__DEV__) {
      const duration = Date.now() - startTime;
      console.log(`⚡ ${operation}: ${duration.toFixed(2)}ms`);
    }
  },
};

/**
 * Feature flag utilities for testing
 */
export const featureFlags = {
  isEnabled: (flag: string): boolean => {
    // In a real app, this would check against a feature flag service
    const flags = {
      "enhanced-video-player": true,
      "new-ui-design": false,
      "beta-features": __DEV__,
      analytics: !__DEV__,
    };

    return flags[flag as keyof typeof flags] ?? false;
  },

  override: (flag: string, value: boolean) => {
    // For testing purposes
    if (__DEV__) {
      (global as any).__featureFlags = {
        ...(global as any).__featureFlags,
        [flag]: value,
      };
    }
  },
};

/**
 * Test data cleanup utilities
 */
export const cleanup = {
  clearAsyncStorage: async () => {
    if (testEnvironment.isTest) {
      const AsyncStorage = require("@react-native-async-storage/async-storage");
      await AsyncStorage.clear();
    }
  },

  resetStores: () => {
    // Reset all Zustand stores to initial state
    // This would need to be implemented per store
    if (__DEV__) {
      console.log("🧹 Resetting all stores to initial state");
    }
  },

  clearCaches: () => {
    // Clear all caches
    if (__DEV__) {
      console.log("🗑️ Clearing all caches");
    }
  },
};
