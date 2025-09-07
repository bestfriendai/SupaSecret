/**
 * Comprehensive testing utilities for the SupaSecret app
 * Provides mock data, test helpers, and validation functions
 */

import type { Confession } from '../types/confession';
import type { Notification } from '../types/notification';

/**
 * Mock data generators
 */
export const mockData = {
  confession: (overrides: Partial<Confession> = {}): Confession => ({
    id: `confession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: 'This is a test confession for development purposes.',
    type: 'text',
    isAnonymous: true,
    likes: Math.floor(Math.random() * 100),
    isLiked: Math.random() > 0.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    hashtags: ['#test', '#development'],
    transcription: null,
    video_url: null,
    thumbnail_url: null,
    ...overrides,
  }),

  videoConfession: (overrides: Partial<Confession> = {}): Confession => ({
    ...mockData.confession(),
    type: 'video',
    content: 'This is a video confession.',
    video_url: 'https://example.com/video.mp4',
    thumbnail_url: 'https://example.com/thumbnail.jpg',
    transcription: 'This is the transcription of the video confession.',
    ...overrides,
  }),

  notification: (overrides: Partial<Notification> = {}): Notification => ({
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'like',
    title: 'Someone liked your secret',
    message: 'Your secret received a new like!',
    data: { confession_id: 'test_confession_id' },
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides: any = {}) => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    username: 'testuser',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  userPreferences: () => ({
    autoplay: true,
    soundEnabled: true,
    qualityPreference: 'auto' as const,
    dataUsageMode: 'standard' as const,
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
        hashtags: [`#test${index}`, '#development'],
      })
    );
  },

  notificationBatch: (count: number = 5): Notification[] => {
    const types: Notification['type'][] = ['like', 'comment', 'mention', 'follow'];
    
    return Array.from({ length: count }, (_, index) => 
      mockData.notification({
        type: types[index % types.length],
        title: `Test notification #${index + 1}`,
        message: `This is test notification #${index + 1}`,
        read: Math.random() > 0.5,
      })
    );
  },
};

/**
 * Test environment detection
 */
export const testEnvironment = {
  isDevelopment: __DEV__,
  isTest: process.env.NODE_ENV === 'test',
  isStorybook: process.env.STORYBOOK === 'true',
  
  shouldUseMockData: () => 
    testEnvironment.isDevelopment || 
    testEnvironment.isTest || 
    testEnvironment.isStorybook,
};

/**
 * Performance testing utilities
 */
export const performance = {
  measureRender: (componentName: string, renderFn: () => void) => {
    if (!__DEV__) return renderFn();
    
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    console.log(`🎯 ${componentName} render time: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  },

  measureAsync: async (operationName: string, asyncFn: () => Promise<any>) => {
    if (!__DEV__) return await asyncFn();
    
    const startTime = performance.now();
    const result = await asyncFn();
    const endTime = performance.now();
    
    console.log(`⏱️ ${operationName} execution time: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  },

  logMemoryUsage: (label: string) => {
    if (!__DEV__ || !global.performance?.memory) return;
    
    const memory = (global.performance as any).memory;
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
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  mockSupabaseResponse: <T>(data: T[], error: any = null) => ({
    data: error ? null : data,
    error,
    count: error ? null : data.length,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
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
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(() => 'test-screen'),
    getParent: jest.fn(),
    getState: jest.fn(),
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
    const listeners: Array<() => void> = [];
    
    return {
      getState: () => state,
      setState: (newState: Partial<T>) => {
        state = { ...state, ...newState };
        listeners.forEach(listener => listener());
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
        listeners.forEach(listener => listener());
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
      issues.push('Interactive element missing accessibilityRole');
    }
    
    if (props.onPress && !props.accessibilityLabel) {
      issues.push('Interactive element missing accessibilityLabel');
    }
    
    if (props.disabled && props.accessibilityState?.disabled !== true) {
      issues.push('Disabled element should have accessibilityState.disabled = true');
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
      const duration = performance.now() - startTime;
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
      'enhanced-video-player': true,
      'new-ui-design': false,
      'beta-features': __DEV__,
      'analytics': !__DEV__,
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
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.clear();
    }
  },

  resetStores: () => {
    // Reset all Zustand stores to initial state
    // This would need to be implemented per store
    if (__DEV__) {
      console.log('🧹 Resetting all stores to initial state');
    }
  },

  clearCaches: () => {
    // Clear all caches
    if (__DEV__) {
      console.log('🗑️ Clearing all caches');
    }
  },
};
