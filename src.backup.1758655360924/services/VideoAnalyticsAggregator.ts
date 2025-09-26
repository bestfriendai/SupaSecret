import { VideoEvent, VideoAnalytics, VideoEngagementSummary } from "./VideoDataService";
// removed unused videoAnalyticsStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AggregatedMetrics {
  totalWatchTime: number;
  totalSessions: number;
  uniqueViewers: Set<string>;
  averageWatchTime: number;
  averageCompletionRate: number;
  totalInteractions: number;
  engagementScore: number;
  peakViewingHours: Map<number, number>;
  videoPerformance: Map<string, VideoPerformance>;
}

interface VideoPerformance {
  videoId: string;
  watchTime: number;
  completionRate: number;
  engagementScore: number;
  views: number;
  interactions: number;
  averageViewDuration: number;
  retentionRate: number;
  dropOffPoints: number[];
}

interface UserSegment {
  segmentId: string;
  name: string;
  criteria: {
    minWatchTime?: number;
    minCompletionRate?: number;
    minEngagement?: number;
  };
  users: Set<string>;
  metrics: {
    averageWatchTime: number;
    averageCompletionRate: number;
    averageEngagement: number;
    totalUsers: number;
  };
}

interface TrendData {
  timestamp: number;
  value: number;
}

interface PredictiveModel {
  videoId: string;
  predictedViews: number;
  predictedEngagement: number;
  confidence: number;
}

const CACHE_KEY_PREFIX = "@analytics_aggregator_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class VideoAnalyticsAggregator {
  private cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Aggregate raw analytics events into meaningful metrics.
   */
  async aggregateEvents(
    events: VideoEvent[],
    period: "hour" | "day" | "week" | "month" = "day",
  ): Promise<AggregatedMetrics> {
    const metrics: AggregatedMetrics = {
      totalWatchTime: 0,
      totalSessions: 0,
      uniqueViewers: new Set(),
      averageWatchTime: 0,
      averageCompletionRate: 0,
      totalInteractions: 0,
      engagementScore: 0,
      peakViewingHours: new Map(),
      videoPerformance: new Map(),
    };

    // Group events by session
    const sessionMap = new Map<string, VideoEvent[]>();
    events.forEach((event) => {
      const sessionEvents = sessionMap.get(event.sessionId) || [];
      sessionEvents.push(event);
      sessionMap.set(event.sessionId, sessionEvents);
    });

    // Process each session
    for (const [sessionId, sessionEvents] of sessionMap.entries()) {
      metrics.totalSessions++;
      metrics.uniqueViewers.add(sessionId); // Simplified: use sessionId as unique viewer

      // Calculate session metrics
      const sessionMetrics = this.calculateSessionMetrics(sessionEvents);
      metrics.totalWatchTime += sessionMetrics.watchTime;

      // Track peak hours
      const hour = new Date(sessionEvents[0].timestamp).getHours();
      metrics.peakViewingHours.set(hour, (metrics.peakViewingHours.get(hour) || 0) + 1);

      // Track video performance
      const videoId = sessionEvents[0].metadata?.videoId || "unknown";
      const videoPerf = metrics.videoPerformance.get(videoId) || this.createEmptyVideoPerformance(videoId);

      videoPerf.watchTime += sessionMetrics.watchTime;
      videoPerf.views++;
      videoPerf.interactions += sessionMetrics.interactions;
      videoPerf.completionRate =
        (videoPerf.completionRate * (videoPerf.views - 1) + sessionMetrics.completionRate) / videoPerf.views;

      metrics.videoPerformance.set(videoId, videoPerf);
    }

    // Calculate averages
    if (metrics.totalSessions > 0) {
      metrics.averageWatchTime = metrics.totalWatchTime / metrics.totalSessions;

      // Calculate average completion rate from video performances
      const completionRates = Array.from(metrics.videoPerformance.values()).map((v) => v.completionRate);
      metrics.averageCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;

      // Calculate overall engagement score
      metrics.engagementScore = this.calculateEngagementScore(metrics);
    }

    return metrics;
  }

  /**
   * Calculate engagement score based on multiple factors.
   */
  calculateEngagementScore(metrics: AggregatedMetrics): number {
    const watchTimeScore = Math.min(metrics.averageWatchTime / 300, 1) * 30; // Normalize to 5 minutes
    const completionScore = metrics.averageCompletionRate * 40;
    const interactionScore = Math.min(metrics.totalInteractions / metrics.totalSessions, 1) * 30;

    return Math.round(watchTimeScore + completionScore + interactionScore);
  }

  /**
   * Calculate metrics for a single session.
   */
  private calculateSessionMetrics(events: VideoEvent[]): {
    watchTime: number;
    completionRate: number;
    interactions: number;
  } {
    let watchTime = 0;
    let completionRate = 0;
    let interactions = 0;

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    let lastPlayTime: number | null = null;

    events.forEach((event) => {
      switch (event.type) {
        case "play":
        case "resume":
          lastPlayTime = event.timestamp;
          break;
        case "pause":
        case "complete":
        case "session_end":
          if (lastPlayTime) {
            watchTime += (event.timestamp - lastPlayTime) / 1000; // Convert to seconds
            lastPlayTime = null;
          }
          if (event.type === "complete") {
            completionRate = event.metadata?.completionRate || 100;
          }
          break;
        case "like":
        case "unlike":
        case "comment":
        case "share":
        case "save":
          interactions++;
          break;
      }
    });

    return { watchTime, completionRate, interactions };
  }

  /**
   * Create empty video performance object.
   */
  private createEmptyVideoPerformance(videoId: string): VideoPerformance {
    return {
      videoId,
      watchTime: 0,
      completionRate: 0,
      engagementScore: 0,
      views: 0,
      interactions: 0,
      averageViewDuration: 0,
      retentionRate: 0,
      dropOffPoints: [],
    };
  }

  /**
   * Analyze user behavior patterns and segment users.
   */
  async analyzeUserSegments(analytics: VideoAnalytics[]): Promise<UserSegment[]> {
    const segments: UserSegment[] = [
      {
        segmentId: "highly-engaged",
        name: "Highly Engaged",
        criteria: {
          minWatchTime: 300, // 5 minutes
          minCompletionRate: 80,
          minEngagement: 70,
        },
        users: new Set(),
        metrics: {
          averageWatchTime: 0,
          averageCompletionRate: 0,
          averageEngagement: 0,
          totalUsers: 0,
        },
      },
      {
        segmentId: "casual-viewers",
        name: "Casual Viewers",
        criteria: {
          minWatchTime: 60, // 1 minute
          minCompletionRate: 30,
          minEngagement: 30,
        },
        users: new Set(),
        metrics: {
          averageWatchTime: 0,
          averageCompletionRate: 0,
          averageEngagement: 0,
          totalUsers: 0,
        },
      },
      {
        segmentId: "new-users",
        name: "New Users",
        criteria: {
          minWatchTime: 0,
          minCompletionRate: 0,
          minEngagement: 0,
        },
        users: new Set(),
        metrics: {
          averageWatchTime: 0,
          averageCompletionRate: 0,
          averageEngagement: 0,
          totalUsers: 0,
        },
      },
    ];

    // Segment users based on their analytics
    analytics.forEach((userAnalytics) => {
      const userId = userAnalytics.sessionId;

      // Determine segment
      let assignedSegment: UserSegment | null = null;

      if (userAnalytics.watchTime >= 300 && userAnalytics.completionRate >= 80 && userAnalytics.engagementScore >= 70) {
        assignedSegment = segments[0]; // Highly engaged
      } else if (
        userAnalytics.watchTime >= 60 &&
        userAnalytics.completionRate >= 30 &&
        userAnalytics.engagementScore >= 30
      ) {
        assignedSegment = segments[1]; // Casual viewers
      } else {
        assignedSegment = segments[2]; // New users
      }

      if (assignedSegment) {
        assignedSegment.users.add(userId);
        assignedSegment.metrics.totalUsers++;
        assignedSegment.metrics.averageWatchTime += userAnalytics.watchTime;
        assignedSegment.metrics.averageCompletionRate += userAnalytics.completionRate;
        assignedSegment.metrics.averageEngagement += userAnalytics.engagementScore;
      }
    });

    // Calculate segment averages
    segments.forEach((segment) => {
      if (segment.metrics.totalUsers > 0) {
        segment.metrics.averageWatchTime /= segment.metrics.totalUsers;
        segment.metrics.averageCompletionRate /= segment.metrics.totalUsers;
        segment.metrics.averageEngagement /= segment.metrics.totalUsers;
      }
    });

    return segments;
  }

  /**
   * Identify trending videos based on recent performance.
   */
  async identifyTrendingVideos(
    videoPerformances: VideoPerformance[],
    timeWindow: number = 24 * 60 * 60 * 1000, // 24 hours
  ): Promise<{
    trending: VideoPerformance[];
    rising: VideoPerformance[];
    declining: VideoPerformance[];
  }> {
    const now = Date.now();
    const cutoffTime = now - timeWindow;

    // Sort by engagement score
    const sorted = [...videoPerformances].sort((a, b) => b.engagementScore - a.engagementScore);

    // Calculate trend scores
    const trending = sorted.slice(0, 10); // Top 10 by engagement

    // Identify rising (improving performance)
    const rising = sorted
      .filter((video) => {
        // Simplified: videos with high recent engagement
        return video.engagementScore > 70 && video.views > 10;
      })
      .slice(0, 5);

    // Identify declining (decreasing performance)
    const declining = sorted
      .filter((video) => {
        // Simplified: videos with low recent engagement despite views
        return video.engagementScore < 30 && video.views > 20;
      })
      .slice(0, 5);

    return { trending, rising, declining };
  }

  /**
   * Predict video performance based on historical data.
   */
  async predictVideoPerformance(videoId: string, historicalData: VideoPerformance[]): Promise<PredictiveModel> {
    // Simple linear prediction based on recent trends
    const videoHistory = historicalData.filter((d) => d.videoId === videoId);

    if (videoHistory.length < 2) {
      return {
        videoId,
        predictedViews: 0,
        predictedEngagement: 0,
        confidence: 0,
      };
    }

    // Calculate growth rate
    const recent = videoHistory[videoHistory.length - 1];
    const previous = videoHistory[videoHistory.length - 2];

    const viewGrowthRate = (recent.views - previous.views) / Math.max(previous.views, 1);
    const engagementGrowthRate =
      (recent.engagementScore - previous.engagementScore) / Math.max(previous.engagementScore, 1);

    // Predict next period
    const predictedViews = Math.round(recent.views * (1 + viewGrowthRate));
    const predictedEngagement = Math.round(recent.engagementScore * (1 + engagementGrowthRate));

    // Calculate confidence based on data points and consistency
    const dataPoints = videoHistory.length;
    const consistency = 1 - Math.abs(viewGrowthRate - engagementGrowthRate);
    const confidence = Math.min((dataPoints / 10) * consistency, 1) * 100;

    return {
      videoId,
      predictedViews,
      predictedEngagement,
      confidence,
    };
  }

  /**
   * Generate comprehensive analytics report.
   */
  async generateReport(
    events: VideoEvent[],
    period: "day" | "week" | "month",
  ): Promise<{
    summary: AggregatedMetrics;
    trends: TrendData[];
    topVideos: VideoPerformance[];
    userSegments: UserSegment[];
    predictions: PredictiveModel[];
  }> {
    // Get aggregated metrics
    const summary = await this.aggregateEvents(events, period);

    // Generate trend data
    const trends = this.generateTrendData(events, period);

    // Get top videos
    const topVideos = Array.from(summary.videoPerformance.values())
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    // Analyze user segments (simplified - using mock data)
    const mockAnalytics: VideoAnalytics[] = Array.from(summary.videoPerformance.values()).map((perf) => ({
      videoId: perf.videoId,
      sessionId: `session-${perf.videoId}`,
      watchTime: perf.watchTime,
      completionRate: perf.completionRate,
      engagementScore: perf.engagementScore,
      interactions: {
        likes: Math.floor(perf.interactions * 0.4),
        comments: Math.floor(perf.interactions * 0.2),
        shares: Math.floor(perf.interactions * 0.2),
        saves: Math.floor(perf.interactions * 0.2),
      },
      bufferingEvents: 0,
      seekCount: 0,
      averageViewDuration: perf.averageViewDuration,
      sessionStartTime: Date.now() - 24 * 60 * 60 * 1000,
      lastWatchedPosition: 0,
    }));
    const userSegments = await this.analyzeUserSegments(mockAnalytics);

    // Generate predictions for top videos
    const predictions: PredictiveModel[] = [];
    for (const video of topVideos.slice(0, 5)) {
      const prediction = await this.predictVideoPerformance(video.videoId, [video]);
      predictions.push(prediction);
    }

    return {
      summary,
      trends,
      topVideos,
      userSegments,
      predictions,
    };
  }

  /**
   * Generate trend data over time.
   */
  private generateTrendData(events: VideoEvent[], period: "day" | "week" | "month"): TrendData[] {
    const trends: TrendData[] = [];
    const now = Date.now();

    // Determine time buckets
    let bucketSize: number;
    let bucketCount: number;

    switch (period) {
      case "day":
        bucketSize = 60 * 60 * 1000; // 1 hour
        bucketCount = 24;
        break;
      case "week":
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        bucketCount = 7;
        break;
      case "month":
        bucketSize = 24 * 60 * 60 * 1000; // 1 day
        bucketCount = 30;
        break;
    }

    // Create buckets
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = now - (bucketCount - i) * bucketSize;
      const bucketEnd = bucketStart + bucketSize;

      // Count events in this bucket
      const bucketEvents = events.filter((e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd);

      trends.push({
        timestamp: bucketStart,
        value: bucketEvents.length,
      });
    }

    return trends;
  }

  /**
   * Cache analytics results for performance.
   */
  async cacheResult(key: string, data: any): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Also persist to AsyncStorage
    try {
      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}_${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (_error) {
      console.error("Failed to cache analytics result");
    }
  }

  /**
   * Get cached result if available and not expired.
   */
  async getCachedResult(key: string): Promise<any | null> {
    // Check memory cache first
    const memCached = this.cache.get(key);
    if (memCached && Date.now() - memCached.timestamp < CACHE_TTL) {
      return memCached.data;
    }

    // Check persistent cache
    try {
      const stored = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}_${key}`);
      if (stored) {
        const cached = JSON.parse(stored);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          // Update memory cache
          this.cache.set(key, cached);
          return cached.data;
        }
      }
    } catch (error) {
      console.error("Failed to get cached analytics result:", error);
    }

    return null;
  }

  /**
   * Clear analytics cache.
   */
  async clearCache(): Promise<void> {
    this.cache.clear();

    // Clear persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Failed to clear analytics cache:", error);
    }
  }

  /**
   * Export analytics data in various formats.
   */
  async exportData(data: any, format: "json" | "csv" = "json"): Promise<string> {
    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // CSV export
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {}).join(",");
      const rows = data.map((item) =>
        Object.values(item)
          .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
          .join(","),
      );
      return [headers, ...rows].join("\n");
    }

    return "";
  }
}

export const videoAnalyticsAggregator = new VideoAnalyticsAggregator();
