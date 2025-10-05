/**
 * Performance Monitor for Face Blur and Emoji Recording
 * Tracks FPS, memory usage, and processing time
 * Provides optimization recommendations
 */

import { Platform } from "react-native";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Memory info interface
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  nativeHeapSize?: number;
  availableMemory?: number;
}

// Performance metrics interface
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  processingTime: number;
  memoryUsage: MemoryInfo;
  timestamp: number;
  effectType: "blur" | "emoji" | "combined" | "none";
  facesDetected: number;
}

// Performance recommendations
export interface PerformanceRecommendation {
  type: "warning" | "error" | "info";
  message: string;
  action?: string;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FPS_LOW: 20,
  FPS_TARGET: 30,
  FPS_HIGH: 60,
  FRAME_TIME_HIGH: 50, // ms
  PROCESSING_TIME_HIGH: 30, // ms
  MEMORY_USAGE_HIGH: 0.8, // 80% of heap limit
  MEMORY_USAGE_CRITICAL: 0.9, // 90% of heap limit
};

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsCount = 100; // Keep last 100 metrics
  private frameTimestamps: number[] = [];
  private lastFrameTime = 0;
  private processingStartTime = 0;
  private isMonitoring = false;
  private memoryCheckInterval: number | null = null;

  private constructor() {
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metrics = [];
    this.frameTimestamps = [];
    console.log("🔍 Performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log("🛑 Performance monitoring stopped");
  }

  /**
   * Record frame start time
   */
  public startFrame(): void {
    this.processingStartTime = Date.now();
  }

  /**
   * Record frame completion and calculate metrics
   */
  public endFrame(effectType: "blur" | "emoji" | "combined" | "none", facesDetected: number = 0): void {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const frameTime = this.lastFrameTime ? now - this.lastFrameTime : 0;
    const processingTime = this.processingStartTime ? now - this.processingStartTime : 0;

    // Calculate FPS
    this.frameTimestamps.push(now);
    if (this.frameTimestamps.length > 30) {
      this.frameTimestamps.shift();
    }

    let fps = 0;
    if (this.frameTimestamps.length > 1) {
      const timeSpan = now - this.frameTimestamps[0];
      fps = Math.round((this.frameTimestamps.length / timeSpan) * 1000);
    }

    // Get memory info
    const memoryUsage = this.getMemoryInfo();

    // Create metrics object
    const metrics: PerformanceMetrics = {
      fps,
      frameTime,
      processingTime,
      memoryUsage,
      timestamp: now,
      effectType,
      facesDetected,
    };

    // Add to metrics array
    this.metrics.push(metrics);

    // Keep only the last maxMetricsCount metrics
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics.shift();
    }

    this.lastFrameTime = now;

    // Log performance warnings
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Get current memory information
   */
  private getMemoryInfo(): MemoryInfo {
    if (typeof global !== "undefined" && (global as any).nativePerformance) {
      // Native memory info (if available)
      return {
        usedJSHeapSize: (global as any).nativePerformance.usedJSHeapSize || 0,
        totalJSHeapSize: (global as any).nativePerformance.totalJSHeapSize || 0,
        jsHeapSizeLimit: (global as any).nativePerformance.jsHeapSizeLimit || 0,
        nativeHeapSize: (global as any).nativePerformance.nativeHeapSize,
        availableMemory: (global as any).nativePerformance.availableMemory,
      };
    } else if (typeof performance !== "undefined" && (performance as any).memory) {
      // Browser memory info
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    } else {
      // Fallback values
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      };
    }
  }

  /**
   * Start memory monitoring interval
   */
  private startMemoryMonitoring(): void {
    if (IS_EXPO_GO) return; // Skip in Expo Go

    // Check memory every 5 seconds
    this.memoryCheckInterval = setInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      const memoryUsageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

      if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_CRITICAL) {
        console.warn("🚨 Critical memory usage detected:", {
          used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024),
          ratio: Math.round(memoryUsageRatio * 100),
        });

        // Trigger garbage collection if available
        if (typeof global !== "undefined" && global.gc) {
          global.gc();
        }
      } else if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_HIGH) {
        console.warn("⚠️ High memory usage detected:", {
          used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024),
          ratio: Math.round(memoryUsageRatio * 100),
        });
      }
    }, 5000);
  }

  /**
   * Check performance against thresholds and log warnings
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const { fps, frameTime, processingTime, memoryUsage, effectType } = metrics;
    const memoryUsageRatio = memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit;

    // FPS warnings
    if (fps < PERFORMANCE_THRESHOLDS.FPS_LOW) {
      console.warn(`🚨 Low FPS detected: ${fps} (effect: ${effectType})`);
    } else if (fps < PERFORMANCE_THRESHOLDS.FPS_TARGET) {
      console.log(`⚠️ Suboptimal FPS: ${fps} (effect: ${effectType})`);
    }

    // Frame time warnings
    if (frameTime > PERFORMANCE_THRESHOLDS.FRAME_TIME_HIGH) {
      console.warn(`🚨 High frame time: ${frameTime}ms (effect: ${effectType})`);
    }

    // Processing time warnings
    if (processingTime > PERFORMANCE_THRESHOLDS.PROCESSING_TIME_HIGH) {
      console.warn(`🚨 High processing time: ${processingTime}ms (effect: ${effectType})`);
    }

    // Memory warnings
    if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_CRITICAL) {
      console.error(`🚨 Critical memory usage: ${Math.round(memoryUsageRatio * 100)}%`);
    } else if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_HIGH) {
      console.warn(`⚠️ High memory usage: ${Math.round(memoryUsageRatio * 100)}%`);
    }
  }

  /**
   * Get average performance metrics
   */
  public getAverageMetrics(): Partial<PerformanceMetrics> | null {
    if (this.metrics.length === 0) return null;

    const sum = this.metrics.reduce(
      (acc, metric) => ({
        fps: acc.fps + metric.fps,
        frameTime: acc.frameTime + metric.frameTime,
        processingTime: acc.processingTime + metric.processingTime,
        facesDetected: acc.facesDetected + metric.facesDetected,
        memoryUsage: {
          usedJSHeapSize: acc.memoryUsage.usedJSHeapSize + metric.memoryUsage.usedJSHeapSize,
          totalJSHeapSize: acc.memoryUsage.totalJSHeapSize + metric.memoryUsage.totalJSHeapSize,
          jsHeapSizeLimit: acc.memoryUsage.jsHeapSizeLimit + metric.memoryUsage.jsHeapSizeLimit,
        },
      }),
      {
        fps: 0,
        frameTime: 0,
        processingTime: 0,
        facesDetected: 0,
        memoryUsage: {
          usedJSHeapSize: 0,
          totalJSHeapSize: 0,
          jsHeapSizeLimit: 0,
        },
      },
    );

    const count = this.metrics.length;
    return {
      fps: Math.round(sum.fps / count),
      frameTime: Math.round(sum.frameTime / count),
      processingTime: Math.round(sum.processingTime / count),
      facesDetected: Math.round(sum.facesDetected / count),
      memoryUsage: {
        usedJSHeapSize: Math.round(sum.memoryUsage.usedJSHeapSize / count),
        totalJSHeapSize: Math.round(sum.memoryUsage.totalJSHeapSize / count),
        jsHeapSizeLimit: Math.round(sum.memoryUsage.jsHeapSizeLimit / count),
      },
    };
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const avgMetrics = this.getAverageMetrics();

    if (!avgMetrics) return recommendations;

    // FPS recommendations
    if (typeof avgMetrics.fps === "number" && avgMetrics.fps < PERFORMANCE_THRESHOLDS.FPS_LOW) {
      recommendations.push({
        type: "error",
        message: `Very low FPS (${avgMetrics.fps}). Consider reducing effect complexity.`,
        action: "Try disabling combined effects or reducing emoji scale.",
      });
    } else if (typeof avgMetrics.fps === "number" && avgMetrics.fps < PERFORMANCE_THRESHOLDS.FPS_TARGET) {
      recommendations.push({
        type: "warning",
        message: `Low FPS (${avgMetrics.fps}). Performance may be impacted.`,
        action: "Consider using a simpler effect or reducing blur intensity.",
      });
    }

    // Processing time recommendations
    if (
      typeof avgMetrics.processingTime === "number" &&
      avgMetrics.processingTime > PERFORMANCE_THRESHOLDS.PROCESSING_TIME_HIGH
    ) {
      recommendations.push({
        type: "warning",
        message: `High processing time (${avgMetrics.processingTime}ms).`,
        action: "Try reducing blur intensity or emoji scale.",
      });
    }

    // Memory recommendations
    if (avgMetrics.memoryUsage) {
      const memoryUsageRatio = avgMetrics.memoryUsage.usedJSHeapSize / avgMetrics.memoryUsage.jsHeapSizeLimit;
      if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_CRITICAL) {
        recommendations.push({
          type: "error",
          message: `Critical memory usage (${Math.round(memoryUsageRatio * 100)}%).`,
          action: "Restart the app to free up memory.",
        });
      } else if (memoryUsageRatio > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_HIGH) {
        recommendations.push({
          type: "warning",
          message: `High memory usage (${Math.round(memoryUsageRatio * 100)}%).`,
          action: "Close other apps or restart the recording session.",
        });
      }
    }

    // Platform-specific recommendations
    if (
      Platform.OS === "android" &&
      typeof avgMetrics.fps === "number" &&
      avgMetrics.fps < PERFORMANCE_THRESHOLDS.FPS_TARGET
    ) {
      recommendations.push({
        type: "info",
        message: "Android performance may vary by device.",
        action: "Try using a lower resolution or simpler effects.",
      });
    }

    return recommendations;
  }

  /**
   * Get recent metrics (last 10)
   */
  public getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.frameTimestamps = [];
    console.log("🗑️ Performance metrics cleared");
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopMonitoring();
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.clearMetrics();
  }
}

export default PerformanceMonitor.getInstance();
