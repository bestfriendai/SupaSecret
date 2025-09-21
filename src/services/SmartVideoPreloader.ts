import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import { videoPerformanceConfig, DevicePerformanceTier, NetworkQualityTier } from "../config/videoPerformance";
import { videoCacheManager } from "../utils/videoCacheManager";
import { environmentDetector } from "../utils/environmentDetector";

interface PreloadContext {
  networkType: string;
  networkSpeed: number;
  deviceTier: DevicePerformanceTier;
  batteryLevel: number;
  memoryPressure: boolean;
  userBehavior: UserBehaviorPattern;
  contentType: "feed" | "profile" | "search";
}

interface UserBehaviorPattern {
  averageWatchTime: number;
  skipRate: number;
  interactionRate: number;
  preferredContentTypes: string[];
  timeOfDay: number;
  dayOfWeek: number;
}

interface PreloadDecision {
  shouldPreload: boolean;
  priority: "high" | "normal" | "low";
  quality: "high" | "medium" | "low";
  count: number;
  strategy: "aggressive" | "conservative" | "predictive";
}

class SmartVideoPreloader {
  private preloadQueue: Map<string, PreloadJob> = new Map();
  private activePreloads: Set<string> = new Set();
  private contextHistory: PreloadContext[] = [];
  private maxConcurrentPreloads = 3;

  constructor() {
    this.initializeContextMonitoring();
  }

  private initializeContextMonitoring() {
    // Monitor network changes
    NetInfo.addEventListener((state) => {
      this.updateNetworkContext(state);
    });

    // Monitor device performance
    this.startPerformanceMonitoring();
  }

  private updateNetworkContext(state: any) {
    const context: Partial<PreloadContext> = {
      networkType: state.type,
      networkSpeed: this.estimateNetworkSpeed(state),
    };
    this.updateContext(context);
  }

  private estimateNetworkSpeed(state: any): number {
    // Estimate speed based on connection type
    switch (state.type) {
      case "wifi":
        return 50; // Mbps
      case "cellular":
        if (state.details?.cellularGeneration === "5g") return 100;
        if (state.details?.cellularGeneration === "4g") return 25;
        if (state.details?.cellularGeneration === "3g") return 5;
        return 1;
      default:
        return 1;
    }
  }

  private startPerformanceMonitoring() {
    // Monitor device performance every 30 seconds
    setInterval(() => {
      this.updateDeviceContext();
    }, 30000);
  }

  private async updateDeviceContext() {
    // Get device tier from config (assuming it's stored internally)
    const deviceTier = DevicePerformanceTier.MID; // Default to mid, would need to get from config
    const memoryPressure = await this.checkMemoryPressure();

    const context: Partial<PreloadContext> = {
      deviceTier,
      memoryPressure,
      batteryLevel: 0.8, // Would need battery API
    };

    this.updateContext(context);
  }

  private async checkMemoryPressure(): Promise<boolean> {
    // Check if we're approaching memory limits
    const perfConfig = videoPerformanceConfig.getPreloadProfile();
    return this.activePreloads.size >= perfConfig.preloadWindowSize;
  }

  private updateContext(updates: Partial<PreloadContext>) {
    // Maintain rolling history of context (last 10 entries)
    if (this.contextHistory.length >= 10) {
      this.contextHistory.shift();
    }

    const currentContext = this.contextHistory[this.contextHistory.length - 1] || this.getDefaultContext();
    this.contextHistory.push({ ...currentContext, ...updates });
  }

  private getDefaultContext(): PreloadContext {
    return {
      networkType: "unknown",
      networkSpeed: 1,
      deviceTier: DevicePerformanceTier.MID,
      batteryLevel: 1,
      memoryPressure: false,
      userBehavior: {
        averageWatchTime: 30,
        skipRate: 0.3,
        interactionRate: 0.2,
        preferredContentTypes: [],
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      },
      contentType: "feed",
    };
  }

  async preloadVideos(
    videos: any[],
    activeIndex: number,
    contentType: "feed" | "profile" | "search" = "feed",
  ): Promise<void> {
    const context = this.getCurrentContext();
    context.contentType = contentType;

    const decisions = videos.map((video, index) => {
      const distance = Math.abs(index - activeIndex);
      return this.makePreloadDecision(video, distance, context);
    });

    // Execute preloads based on decisions
    const preloadPromises = decisions
      .filter((decision) => decision.shouldPreload)
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .slice(0, this.maxConcurrentPreloads)
      .map(async (decision, index) => {
        const video = videos[index + activeIndex];
        if (video) {
          await this.executePreload(video, decision);
        }
      });

    await Promise.allSettled(preloadPromises);
  }

  private makePreloadDecision(video: any, distance: number, context: PreloadContext): PreloadDecision {
    const baseDecision: PreloadDecision = {
      shouldPreload: false,
      priority: "low",
      quality: "low",
      count: 1,
      strategy: "conservative",
    };

    // Distance-based preloading
    if (distance === 0) {
      return { ...baseDecision, shouldPreload: true, priority: "high", quality: "high" };
    }
    if (distance <= 2) {
      baseDecision.shouldPreload = true;
      baseDecision.priority = "high";
    } else if (distance <= 5 && context.deviceTier !== "low") {
      baseDecision.shouldPreload = true;
      baseDecision.priority = "normal";
    }

    // Network-aware quality selection
    if (context.networkSpeed >= 25) {
      baseDecision.quality = "high";
    } else if (context.networkSpeed >= 5) {
      baseDecision.quality = "medium";
    }

    // Device-aware adjustments
    if (context.deviceTier === "low") {
      baseDecision.quality = "low";
      baseDecision.count = Math.min(baseDecision.count, 2);
    }

    // Memory pressure adjustments
    if (context.memoryPressure) {
      baseDecision.count = Math.max(1, baseDecision.count - 1);
      baseDecision.quality = baseDecision.quality === "high" ? "medium" : "low";
    }

    // Battery-aware adjustments
    if (context.batteryLevel < 0.2) {
      baseDecision.strategy = "conservative";
      baseDecision.count = 1;
    }

    // User behavior predictions
    if (context.userBehavior.skipRate > 0.5) {
      baseDecision.count = Math.max(1, baseDecision.count - 1);
    }

    return baseDecision;
  }

  private getPriorityWeight(priority: "high" | "normal" | "low"): number {
    switch (priority) {
      case "high":
        return 3;
      case "normal":
        return 2;
      case "low":
        return 1;
      default:
        return 1;
    }
  }

  private async executePreload(video: any, decision: PreloadDecision): Promise<void> {
    const cacheKey = `${video.id}-${decision.quality}`;

    if (this.preloadQueue.has(cacheKey) || this.activePreloads.has(cacheKey)) {
      return;
    }

    this.preloadQueue.set(cacheKey, {
      id: cacheKey,
      video,
      decision,
      timestamp: Date.now(),
    });

    try {
      this.activePreloads.add(cacheKey);

      // Select appropriate URI based on quality decision
      const uri = this.selectUriForQuality(video, decision.quality);

      // Use existing cache manager with enhanced priority
      await videoCacheManager.preloadVideos([uri], decision.priority);

      this.preloadQueue.delete(cacheKey);
      this.activePreloads.delete(cacheKey);
    } catch (error) {
      console.warn("Smart preload failed:", error);
      this.preloadQueue.delete(cacheKey);
      this.activePreloads.delete(cacheKey);
    }
  }

  private selectUriForQuality(video: any, quality: "high" | "medium" | "low"): string {
    // Use existing quality selection logic
    if (video.selectedVideoUri) return video.selectedVideoUri;
    if (video.videoVariants?.length > 0) {
      const qualityMap = { high: "1080p", medium: "720p", low: "360p" };
      const targetQuality = qualityMap[quality];
      const variant = video.videoVariants.find((v: any) => v.quality === targetQuality);
      if (variant?.uri) return variant.uri;
    }
    return video.videoUri || video.uri;
  }

  private getCurrentContext(): PreloadContext {
    return this.contextHistory[this.contextHistory.length - 1] || this.getDefaultContext();
  }

  // Public API methods
  async preloadForFeed(videos: any[], activeIndex: number): Promise<void> {
    await this.preloadVideos(videos, activeIndex, "feed");
  }

  async preloadForProfile(videos: any[], activeIndex: number): Promise<void> {
    await this.preloadVideos(videos, activeIndex, "profile");
  }

  async preloadForSearch(videos: any[], activeIndex: number): Promise<void> {
    await this.preloadVideos(videos, activeIndex, "search");
  }

  getActivePreloads(): string[] {
    return Array.from(this.activePreloads);
  }

  clearQueue(): void {
    this.preloadQueue.clear();
    this.activePreloads.clear();
  }
}

interface PreloadJob {
  id: string;
  video: any;
  decision: PreloadDecision;
  timestamp: number;
}

// Export singleton instance
export const smartVideoPreloader = new SmartVideoPreloader();
