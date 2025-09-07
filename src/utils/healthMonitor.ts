/**
 * App health monitoring system
 * Tracks performance, errors, and user experience metrics
 */

import * as React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import NetInfo from '@react-native-community/netinfo';

export interface HealthMetrics {
  performance: {
    appStartTime: number;
    screenLoadTimes: Record<string, number>;
    apiResponseTimes: Record<string, number[]>;
    memoryUsage: number[];
    crashCount: number;
  };
  user: {
    sessionDuration: number;
    screenViews: Record<string, number>;
    interactions: Record<string, number>;
    errors: Array<{
      timestamp: number;
      error: string;
      screen: string;
      userId?: string;
    }>;
  };
  system: {
    deviceInfo: any;
    appVersion: string;
    networkStatus: string;
    batteryLevel?: number;
    storageUsage: number;
  };
}

class HealthMonitor {
  private metrics: HealthMetrics;
  private sessionStartTime: number;
  private currentScreen: string = 'Unknown';
  private isMonitoring: boolean = false;
  private reportingInterval: NodeJS.Timeout | null = null;
  private appStateListener: any = null;
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.sessionStartTime = Date.now();
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): HealthMetrics {
    return {
      performance: {
        appStartTime: Date.now(),
        screenLoadTimes: {},
        apiResponseTimes: {},
        memoryUsage: [],
        crashCount: 0,
      },
      user: {
        sessionDuration: 0,
        screenViews: {},
        interactions: {},
        errors: [],
      },
      system: {
        deviceInfo: {},
        appVersion: Application.nativeApplicationVersion || 'unknown',
        networkStatus: 'unknown',
        storageUsage: 0,
      },
    };
  }

  /**
   * Start monitoring app health
   */
  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect initial system info
    await this.collectSystemInfo();
    
    // Set up periodic monitoring
    this.setupPeriodicMonitoring();
    
    // Set up app state monitoring
    this.setupAppStateMonitoring();
    
    // Set up network monitoring
    this.setupNetworkMonitoring();
    
    if (__DEV__) {
      console.log('🏥 Health monitoring started');
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    if (this.appStateListener) {
      // Note: React Native AppState.removeEventListener is deprecated
      // In newer versions, the subscription returned by addEventListener should be used
      // For compatibility, we'll just set to null
      this.appStateListener = null;
    }
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    if (__DEV__) {
      console.log('🏥 Health monitoring stopped');
    }
  }

  /**
   * Track screen navigation
   */
  trackScreenView(screenName: string) {
    const now = Date.now();
    
    // Record screen load time if we have a previous screen
    if (this.currentScreen !== 'Unknown') {
      const loadTime = now - this.sessionStartTime;
      this.metrics.performance.screenLoadTimes[screenName] = loadTime;
    }
    
    // Update session start time for next screen
    this.sessionStartTime = now;
    
    // Update screen view count
    this.metrics.user.screenViews[screenName] = 
      (this.metrics.user.screenViews[screenName] || 0) + 1;
    
    this.currentScreen = screenName;
    
    if (__DEV__) {
      console.log(`📱 Screen view: ${screenName}`);
    }
  }

  /**
   * Track user interactions
   */
  trackInteraction(action: string, details?: any) {
    this.metrics.user.interactions[action] = 
      (this.metrics.user.interactions[action] || 0) + 1;
    
    if (__DEV__ && details) {
      console.log(`👆 Interaction: ${action}`, details);
    }
  }

  /**
   * Track API performance
   */
  trackApiCall(endpoint: string, responseTime: number, success: boolean) {
    if (!this.metrics.performance.apiResponseTimes[endpoint]) {
      this.metrics.performance.apiResponseTimes[endpoint] = [];
    }
    
    this.metrics.performance.apiResponseTimes[endpoint].push(responseTime);
    
    // Keep only last 100 response times per endpoint
    if (this.metrics.performance.apiResponseTimes[endpoint].length > 100) {
      this.metrics.performance.apiResponseTimes[endpoint].shift();
    }
    
    if (__DEV__) {
      console.log(`🌐 API ${success ? '✅' : '❌'}: ${endpoint} (${responseTime}ms)`);
    }
  }

  /**
   * Track errors
   */
  trackError(error: Error, screen?: string, userId?: string) {
    this.metrics.user.errors.push({
      timestamp: Date.now(),
      error: error.message,
      screen: screen || this.currentScreen,
      userId,
    });
    
    // Keep only last 50 errors
    if (this.metrics.user.errors.length > 50) {
      this.metrics.user.errors.shift();
    }
    
    if (__DEV__) {
      console.error('🚨 Error tracked:', error.message, 'on', screen || this.currentScreen);
    }
  }

  /**
   * Track app crashes
   */
  trackCrash() {
    this.metrics.performance.crashCount++;
    
    if (__DEV__) {
      console.error('💥 Crash tracked');
    }
  }

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    // Update session duration
    this.metrics.user.sessionDuration = Date.now() - this.sessionStartTime;
    
    return { ...this.metrics };
  }

  /**
   * Get health summary
   */
  getHealthSummary() {
    const metrics = this.getMetrics();
    
    // Calculate averages
    const avgApiResponseTimes: Record<string, number> = {};
    for (const [endpoint, times] of Object.entries(metrics.performance.apiResponseTimes)) {
      avgApiResponseTimes[endpoint] = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    const avgMemoryUsage = metrics.performance.memoryUsage.length > 0
      ? metrics.performance.memoryUsage.reduce((a, b) => a + b, 0) / metrics.performance.memoryUsage.length
      : 0;
    
    return {
      sessionDuration: metrics.user.sessionDuration,
      totalScreenViews: Object.values(metrics.user.screenViews).reduce((a, b) => a + b, 0),
      totalInteractions: Object.values(metrics.user.interactions).reduce((a, b) => a + b, 0),
      totalErrors: metrics.user.errors.length,
      crashCount: metrics.performance.crashCount,
      avgApiResponseTime: Object.values(avgApiResponseTimes).reduce((a, b) => a + b, 0) / Object.keys(avgApiResponseTimes).length || 0,
      avgMemoryUsage,
      networkStatus: metrics.system.networkStatus,
      appVersion: metrics.system.appVersion,
    };
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics() {
    const metrics = this.getMetrics();
    const summary = this.getHealthSummary();
    
    return {
      timestamp: new Date().toISOString(),
      summary,
      detailed: metrics,
    };
  }

  private async collectSystemInfo() {
    try {
      // Device info
      this.metrics.system.deviceInfo = {
        deviceName: Device.deviceName,
        deviceType: Device.deviceType,
        osName: Device.osName,
        osVersion: Device.osVersion,
        modelName: Device.modelName,
        totalMemory: Device.totalMemory,
      };
      
      // Network status
      const netInfo = await NetInfo.fetch();
      this.metrics.system.networkStatus = `${netInfo.type}-${netInfo.isConnected ? 'connected' : 'disconnected'}`;
      
    } catch (error) {
      console.error('Failed to collect system info:', error);
    }
  }

  private setupPeriodicMonitoring() {
    this.reportingInterval = setInterval(() => {
      this.collectMemoryUsage();
      
      // Log health summary in development
      if (__DEV__) {
        const summary = this.getHealthSummary();
        console.log('🏥 Health Summary:', summary);
      }
    }, 30000); // Every 30 seconds
  }

  private setupAppStateMonitoring() {
    this.appStateListener = (nextAppState: AppStateStatus) => {
      this.trackInteraction('app_state_change', { state: nextAppState });
      
      if (nextAppState === 'background') {
        // App went to background - good time to report metrics
        this.reportMetrics();
      }
    };
    AppState.addEventListener('change', this.appStateListener);
  }

  private setupNetworkMonitoring() {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const status = `${state.type}-${state.isConnected ? 'connected' : 'disconnected'}`;
      this.metrics.system.networkStatus = status;
      this.trackInteraction('network_change', { status });
    });
  }

  private collectMemoryUsage() {
    try {
      if (global.performance && (global.performance as any).memory) {
        const memory = (global.performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        this.metrics.performance.memoryUsage.push(usedMB);
        
        // Keep only last 100 memory readings
        if (this.metrics.performance.memoryUsage.length > 100) {
          this.metrics.performance.memoryUsage.shift();
        }
      }
    } catch (error) {
      // Memory API not available, skip silently
    }
  }

  private async reportMetrics() {
    if (!this.isMonitoring) return;
    
    try {
      const report = this.exportMetrics();
      
      // In a real app, you would send this to your analytics service
      if (__DEV__) {
        console.log('📊 Health Report:', report);
      }
      
      // TODO: Send to analytics service
      // await analyticsService.reportHealth(report);
      
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();

/**
 * React hook for health monitoring
 */
export function useHealthMonitor() {
  React.useEffect(() => {
    healthMonitor.startMonitoring();
    
    return () => {
      healthMonitor.stopMonitoring();
    };
  }, []);

  return {
    trackScreenView: healthMonitor.trackScreenView.bind(healthMonitor),
    trackInteraction: healthMonitor.trackInteraction.bind(healthMonitor),
    trackApiCall: healthMonitor.trackApiCall.bind(healthMonitor),
    trackError: healthMonitor.trackError.bind(healthMonitor),
    getMetrics: healthMonitor.getMetrics.bind(healthMonitor),
    getHealthSummary: healthMonitor.getHealthSummary.bind(healthMonitor),
  };
}
