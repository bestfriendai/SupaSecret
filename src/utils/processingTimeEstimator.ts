/**
 * Processing Time Estimator
 * Estimates processing times for video operations based on device capabilities
 * Provides formatted time estimates for user feedback
 */

import * as Device from "expo-device";
import { Platform } from "react-native";
import { environmentDetector } from "./environmentDetector";

export type DeviceTier = "low" | "medium" | "high";

export interface ProcessingBenchmark {
  faceBlur: {
    baseTime: number; // Base processing time in seconds per minute of video
    multiplier: Record<DeviceTier, number>; // Multiplier for device tier
  };
  voiceProcessing: {
    baseTime: number; // Base processing time in seconds per minute of video
    multiplier: Record<DeviceTier, number>; // Multiplier for device tier
  };
}

export interface TimeEstimate {
  estimatedSeconds: number;
  formattedTime: string;
  tier: DeviceTier;
}

class ProcessingTimeEstimator {
  private static instance: ProcessingTimeEstimator;
  private cachedTier: DeviceTier | null = null;

  // Benchmark data based on typical performance measurements
  private readonly benchmarks: ProcessingBenchmark = {
    faceBlur: {
      baseTime: 45, // 45 seconds per minute on high-end device
      multiplier: {
        low: 3.0, // 3x slower on low-end devices
        medium: 1.5, // 1.5x slower on medium devices
        high: 1.0, // Baseline
      },
    },
    voiceProcessing: {
      baseTime: 15, // 15 seconds per minute on high-end device
      multiplier: {
        low: 2.5, // 2.5x slower on low-end devices
        medium: 1.3, // 1.3x slower on medium devices
        high: 1.0, // Baseline
      },
    },
  };

  static getInstance(): ProcessingTimeEstimator {
    if (!this.instance) {
      this.instance = new ProcessingTimeEstimator();
    }
    return this.instance;
  }

  /**
   * Detect device tier based on hardware capabilities
   */
  private async detectDeviceTier(): Promise<DeviceTier> {
    if (this.cachedTier) {
      return this.cachedTier;
    }

    try {
      const envInfo = environmentDetector.getEnvironmentInfo();
      const memoryInfo = await environmentDetector.getMemoryInfo();

      // Convert bytes to GB
      const totalMemoryGB = memoryInfo.totalMemory / (1024 * 1024 * 1024);

      // Base tier on memory and device type
      let tier: DeviceTier = "medium";

      if (totalMemoryGB < 3) {
        tier = "low";
      } else if (totalMemoryGB >= 6 || envInfo.deviceType === "desktop") {
        tier = "high";
      }

      // Adjust for platform-specific performance
      if (Platform.OS === "android" && totalMemoryGB < 4) {
        // Android devices often need more memory for processing
        tier = tier === "medium" ? "low" : tier;
      }

      // Older iOS devices or tablets might be slower
      if (Platform.OS === "ios" && envInfo.deviceType === "tablet") {
        tier = tier === "high" ? "medium" : tier;
      }

      this.cachedTier = tier;
      return tier;
    } catch (error) {
      console.warn("Failed to detect device tier, using medium as fallback:", error);
      this.cachedTier = "medium";
      return "medium";
    }
  }

  /**
   * Get device tier
   */
  async getDeviceTier(): Promise<DeviceTier> {
    return this.detectDeviceTier();
  }

  /**
   * Estimate processing time for face blur
   * @param videoDurationMinutes Duration of video in minutes
   */
  async estimateFaceBlurTime(videoDurationMinutes: number): Promise<TimeEstimate> {
    const tier = await this.detectDeviceTier();
    const benchmark = this.benchmarks.faceBlur;

    const baseTime = benchmark.baseTime * videoDurationMinutes;
    const multiplier = benchmark.multiplier[tier];
    const estimatedSeconds = Math.ceil(baseTime * multiplier);

    return {
      estimatedSeconds,
      formattedTime: this.formatTimeEstimate(estimatedSeconds),
      tier,
    };
  }

  /**
   * Estimate processing time for voice processing
   * @param videoDurationMinutes Duration of video in minutes
   */
  async estimateVoiceProcessingTime(videoDurationMinutes: number): Promise<TimeEstimate> {
    const tier = await this.detectDeviceTier();
    const benchmark = this.benchmarks.voiceProcessing;

    const baseTime = benchmark.baseTime * videoDurationMinutes;
    const multiplier = benchmark.multiplier[tier];
    const estimatedSeconds = Math.ceil(baseTime * multiplier);

    return {
      estimatedSeconds,
      formattedTime: this.formatTimeEstimate(estimatedSeconds),
      tier,
    };
  }

  /**
   * Estimate total processing time for both face blur and voice processing
   * @param videoDurationMinutes Duration of video in minutes
   */
  async estimateTotalProcessingTime(videoDurationMinutes: number): Promise<TimeEstimate> {
    const [faceBlurEstimate, voiceEstimate] = await Promise.all([
      this.estimateFaceBlurTime(videoDurationMinutes),
      this.estimateVoiceProcessingTime(videoDurationMinutes),
    ]);

    const totalSeconds = faceBlurEstimate.estimatedSeconds + voiceEstimate.estimatedSeconds;

    return {
      estimatedSeconds: totalSeconds,
      formattedTime: this.formatTimeEstimate(totalSeconds),
      tier: faceBlurEstimate.tier, // Both should have same tier
    };
  }

  /**
   * Format time estimate into human-readable string
   */
  private formatTimeEstimate(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? "" : "s"}`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes === 1 ? "" : "s"}`;
      }
      return `${minutes} minute${minutes === 1 ? "" : "s"} ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
  }

  /**
   * Get benchmark data for debugging/testing
   */
  getBenchmarks(): ProcessingBenchmark {
    return { ...this.benchmarks };
  }

  /**
   * Reset cached device tier (useful for testing)
   */
  resetCache(): void {
    this.cachedTier = null;
  }
}

// Export singleton instance
export const processingTimeEstimator = ProcessingTimeEstimator.getInstance();

// Export convenience functions
export const estimateFaceBlurTime = (videoDurationMinutes: number) =>
  processingTimeEstimator.estimateFaceBlurTime(videoDurationMinutes);

export const estimateVoiceProcessingTime = (videoDurationMinutes: number) =>
  processingTimeEstimator.estimateVoiceProcessingTime(videoDurationMinutes);

export const estimateTotalProcessingTime = (videoDurationMinutes: number) =>
  processingTimeEstimator.estimateTotalProcessingTime(videoDurationMinutes);

export const getDeviceTier = () => processingTimeEstimator.getDeviceTier();
