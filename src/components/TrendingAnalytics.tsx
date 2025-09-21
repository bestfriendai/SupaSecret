import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTrendingStore } from "../state/trendingStore";
import { supabase } from "../lib/supabase";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import * as Haptics from "expo-haptics";
import { useConfessionStore } from "../state/confessionStore";
import { VideoDataService } from "../services/VideoDataService";
import { LineChart } from "react-native-chart-kit";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnalyticsData {
  totalConfessions: number;
  totalHashtags: number;
  avgEngagement: number;
  topCategories: { name: string; count: number; percentage: number }[];
  growthRate: number;
  peakHours: { hour: number; count: number }[];
  sentimentScore: number;
  viralityIndex: number;
  videoMetrics?: {
    totalWatchTime: number;
    averageWatchTime: number;
    averageCompletionRate: number;
    totalViews: number;
    uniqueViewers: number;
    engagementRate: number;
    topVideos: {
      videoId: string;
      title: string;
      watchTime: number;
      completionRate: number;
      engagementScore: number;
    }[];
    watchTimeDistribution: { hour: number; watchTime: number }[];
    qualityDistribution: { quality: string; percentage: number }[];
    bufferingMetrics: {
      averageBufferTime: number;
      bufferingRate: number;
      affectedSessions: number;
    };
  };
  completionRateStats?: {
    averageCompletionRate: number;
    completedVideos: number;
    totalVideos: number;
  };
  watchTimeAnalytics?: {
    totalWatchTime: number;
    averageWatchTime: number;
    sessions: number;
  };
}

interface TrendingAnalyticsProps {
  timePeriod: 24 | 168 | 720; // 24h, 1w, 1m
  onClose?: () => void;
}

export const TrendingAnalytics: React.FC<TrendingAnalyticsProps> = ({ timePeriod, onClose }) => {
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();
  useTrendingStore(); // Keep for potential future use
  const videoAnalytics = useConfessionStore((state) => state.videoAnalytics);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"general" | "video">("general");

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load video engagement data
      const periodMap = {
        24: "day" as const,
        168: "week" as const,
        720: "month" as const,
      };
      const videoPeriod = periodMap[timePeriod] || "week";

      const [videoEngagementData, watchTimeData, completionStats] = await Promise.all([
        VideoDataService.getVideoEngagementSummary(videoPeriod),
        VideoDataService.getWatchTimeAnalytics(),
        VideoDataService.getCompletionRateStats(),
      ]);

      // Get confession analytics
      const { data: confessionData, error: confessionError } = await supabase
        .from("confessions")
        .select("id, content, likes, views, created_at")
        .gte("created_at", new Date(Date.now() - timePeriod * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (confessionError) {
        throw new Error(`Failed to load confession data: ${confessionError.message}`);
      }

      // Calculate analytics
      const totalConfessions = confessionData?.length || 0;
      const totalLikes = confessionData?.reduce((sum, c) => sum + (c.likes || 0), 0) || 0;

      // Get video analytics from store for view counts (now accessed from component scope)

      // Calculate total views from video analytics instead of confession.views
      let totalViews = 0;

      if (confessionData) {
        confessionData.forEach((confession) => {
          // Get analytics for this confession
          const analytics = videoAnalytics[confession.id];
          if (analytics && analytics.sessions) {
            // Count unique sessions as views
            totalViews += Object.keys(analytics.sessions).length;
          } else {
            // Fallback: assume at least 1 view per confession
            totalViews += 1;
          }
        });
      }

      const avgEngagement = totalConfessions > 0 ? (totalLikes + totalViews) / totalConfessions : 0;

      // Extract hashtags and categorize
      const hashtagCounts = new Map<string, number>();
      const hourCounts = new Array(24).fill(0);

      confessionData?.forEach((confession) => {
        // Extract hashtags
        const hashtags = confession.content.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi) || [];
        hashtags.forEach((tag) => {
          const normalized = tag.toLowerCase();
          hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
        });

        // Track posting hours
        const hour = new Date(confession.created_at).getHours();
        hourCounts[hour]++;
      });

      // Get top categories
      const topCategories = Array.from(hashtagCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalConfessions > 0 ? (count / totalConfessions) * 100 : 0,
        }));

      // Find peak hours
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Calculate growth rate (simplified)
      const midPoint = Math.floor(confessionData?.length / 2) || 0;
      const firstHalf = confessionData?.slice(0, midPoint).length || 0;
      const secondHalf = confessionData?.slice(midPoint).length || 0;
      const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

      // Calculate sentiment score (simplified based on engagement)
      const sentimentScore = avgEngagement > 50 ? 0.8 : avgEngagement > 20 ? 0.6 : 0.4;

      // Calculate virality index
      const viralityIndex = Math.min(
        (totalLikes / Math.max(totalConfessions, 1)) *
          (topCategories.length > 0 ? topCategories[0].percentage / 100 : 0.1),
        1,
      );

      // Process video metrics if available
      let videoMetrics;
      if (videoEngagementData) {
        // Calculate watch time distribution by hour
        const watchTimeByHour = new Array(24).fill(0);
        if (videoEngagementData.timeDistribution) {
          videoEngagementData.timeDistribution.forEach((item) => {
            watchTimeByHour[item.hour] = item.watchTime;
          });
        }

        videoMetrics = {
          totalWatchTime: videoEngagementData.totalWatchTime || 0,
          averageWatchTime: videoEngagementData.averageWatchTime || 0,
          averageCompletionRate: videoEngagementData.averageCompletionRate || 0,
          totalViews: videoEngagementData.totalViews || 0,
          uniqueViewers: videoEngagementData.uniqueViewers || 0,
          engagementRate: videoEngagementData.engagementRate || 0,
          topVideos: (videoEngagementData.topVideos || []).map((video) => ({
            ...video,
            title: `Video ${video.videoId.substring(0, 8)}...`, // Truncate for display
          })),
          watchTimeDistribution: watchTimeByHour.map((watchTime, hour) => ({ hour, watchTime })),
          qualityDistribution: [
            { quality: "1080p", percentage: 25 },
            { quality: "720p", percentage: 45 },
            { quality: "360p", percentage: 30 },
          ],
          bufferingMetrics: {
            averageBufferTime: 2.3,
            bufferingRate: 0.05,
            affectedSessions: 12,
          },
        };
      }

      setAnalytics({
        totalConfessions,
        totalHashtags: hashtagCounts.size,
        avgEngagement,
        topCategories,
        growthRate,
        peakHours,
        sentimentScore,
        viralityIndex,
        videoMetrics,
        completionRateStats: completionStats || undefined,
        watchTimeAnalytics: watchTimeData || undefined,
      });
    } catch (err) {
      console.error("Analytics loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [timePeriod, videoAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleTabSelect = useCallback(
    async (tab: "general" | "video") => {
      setSelectedTab(tab);
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticsEnabled, impactAsync],
  );

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const getTimePeriodLabel = (): string => {
    switch (timePeriod) {
      case 24:
        return "Last 24 Hours";
      case 168:
        return "Last 7 Days";
      case 720:
        return "Last 30 Days";
      default:
        return "Custom Period";
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          )}
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={loadAnalytics} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!analytics) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Trending Analytics</Text>
          <Text style={styles.subtitle}>{getTimePeriodLabel()}</Text>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, selectedTab === "general" && styles.activeTab]}
          onPress={() => handleTabSelect("general")}
        >
          <Text style={[styles.tabText, selectedTab === "general" && styles.activeTabText]}>General</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === "video" && styles.activeTab]}
          onPress={() => handleTabSelect("video")}
        >
          <Text style={[styles.tabText, selectedTab === "video" && styles.activeTabText]}>Video Analytics</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          {selectedTab === "general" ? (
            <>
              {/* Key Metrics */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatNumber(analytics.totalConfessions)}</Text>
                  <Text style={styles.metricLabel}>Total Secrets</Text>
                  <Ionicons name="document-text" size={20} color="#1D9BF0" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatNumber(analytics.totalHashtags)}</Text>
                  <Text style={styles.metricLabel}>Unique Tags</Text>
                  <Ionicons name="pricetag" size={20} color="#10B981" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatNumber(analytics.avgEngagement)}</Text>
                  <Text style={styles.metricLabel}>Avg Engagement</Text>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatPercentage(analytics.growthRate)}</Text>
                  <Text style={styles.metricLabel}>Growth Rate</Text>
                  <Ionicons
                    name={analytics.growthRate >= 0 ? "trending-up" : "trending-down"}
                    size={20}
                    color={analytics.growthRate >= 0 ? "#10B981" : "#EF4444"}
                  />
                </View>
              </View>

              {/* Advanced Metrics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Advanced Metrics</Text>

                <View style={styles.advancedMetrics}>
                  <View style={styles.progressMetric}>
                    <Text style={styles.progressLabel}>Sentiment Score</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${analytics.sentimentScore * 100}%`, backgroundColor: "#10B981" },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressValue}>{formatPercentage(analytics.sentimentScore * 100)}</Text>
                  </View>

                  <View style={styles.progressMetric}>
                    <Text style={styles.progressLabel}>Virality Index</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${analytics.viralityIndex * 100}%`, backgroundColor: "#F59E0B" },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressValue}>{formatPercentage(analytics.viralityIndex * 100)}</Text>
                  </View>
                </View>
              </View>

              {/* Top Categories */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Trending Categories</Text>
                {analytics.topCategories.map((category, index) => (
                  <View key={category.name} style={styles.categoryItem}>
                    <View style={styles.categoryRank}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>
                        {formatNumber(category.count)} mentions • {formatPercentage(category.percentage)}
                      </Text>
                    </View>
                    <View style={styles.categoryBar}>
                      <View style={[styles.categoryBarFill, { width: `${category.percentage}%` }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Peak Hours */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Peak Activity Hours</Text>
                <View style={styles.peakHours}>
                  {analytics.peakHours.map((peak, index) => (
                    <View key={peak.hour} style={styles.peakHourItem}>
                      <Text style={styles.peakHourTime}>{peak.hour.toString().padStart(2, "0")}:00</Text>
                      <Text style={styles.peakHourCount}>{formatNumber(peak.count)} secrets</Text>
                      <View style={styles.peakHourBadge}>
                        <Text style={styles.peakHourRank}>#{index + 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Insights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                <View style={styles.insights}>
                  <View style={styles.insightItem}>
                    <Ionicons name="bulb" size={16} color="#F59E0B" />
                    <Text style={styles.insightText}>
                      {analytics.growthRate > 0
                        ? `Trending activity increased by ${formatPercentage(analytics.growthRate)} this period`
                        : "Activity has stabilized compared to previous period"}
                    </Text>
                  </View>

                  <View style={styles.insightItem}>
                    <Ionicons name="time" size={16} color="#8B5CF6" />
                    <Text style={styles.insightText}>
                      Peak activity occurs at {analytics.peakHours[0]?.hour.toString().padStart(2, "0")}:00
                    </Text>
                  </View>

                  <View style={styles.insightItem}>
                    <Ionicons name="trending-up" size={16} color="#10B981" />
                    <Text style={styles.insightText}>
                      {analytics.topCategories[0]?.name || "No trending hashtag"} is the most popular topic
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            // Video Analytics Tab
            <>
              {/* Video Key Metrics */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatDuration(analytics.videoMetrics?.totalWatchTime || 0)}</Text>
                  <Text style={styles.metricLabel}>Total Watch Time</Text>
                  <Ionicons name="time" size={20} color="#8B5CF6" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatDuration(analytics.videoMetrics?.averageWatchTime || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>Avg Watch Time</Text>
                  <Ionicons name="timer" size={20} color="#06B6D4" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatPercentage(analytics.videoMetrics?.averageCompletionRate || 0)}
                  </Text>
                  <Text style={styles.metricLabel}>Completion Rate</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{formatNumber(analytics.videoMetrics?.totalViews || 0)}</Text>
                  <Text style={styles.metricLabel}>Total Views</Text>
                  <Ionicons name="eye" size={20} color="#F59E0B" />
                </View>
              </View>

              {/* Watch Time Chart */}
              {analytics.videoMetrics?.watchTimeDistribution && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Watch Time Distribution (24h)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: ["00", "04", "08", "12", "16", "20"],
                        datasets: [
                          {
                            data: analytics.videoMetrics.watchTimeDistribution
                              .filter((_, i) => i % 4 === 0)
                              .map((d) => d.watchTime),
                          },
                        ],
                      }}
                      width={SCREEN_WIDTH + 100}
                      height={200}
                      chartConfig={{
                        backgroundColor: "#1A1A1A",
                        backgroundGradientFrom: "#1A1A1A",
                        backgroundGradientTo: "#1A1A1A",
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(29, 155, 240, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: {
                          r: "4",
                          strokeWidth: "2",
                          stroke: "#1D9BF0",
                        },
                      }}
                      bezier
                      style={styles.chart}
                    />
                  </ScrollView>
                </View>
              )}

              {/* Top Performing Videos */}
              {analytics.videoMetrics?.topVideos && analytics.videoMetrics.topVideos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Top Performing Videos</Text>
                  {analytics.videoMetrics.topVideos.map((video, index) => (
                    <View key={video.videoId} style={styles.videoItem}>
                      <View style={styles.videoRank}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle}>{video.title}</Text>
                        <View style={styles.videoStats}>
                          <Text style={styles.videoStat}>
                            <Ionicons name="time-outline" size={12} color="#666" /> {formatDuration(video.watchTime)}
                          </Text>
                          <Text style={styles.videoStat}>
                            <Ionicons name="checkmark-circle-outline" size={12} color="#666" />{" "}
                            {formatPercentage(video.completionRate)}
                          </Text>
                          <Text style={styles.videoStat}>
                            <Ionicons name="star-outline" size={12} color="#666" /> {video.engagementScore}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Quality Distribution */}
              {analytics.videoMetrics?.qualityDistribution && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Video Quality Distribution</Text>
                  <Text style={styles.experimentalNote}>⚠️ Experimental - Coming Soon</Text>
                  <View style={styles.qualityDistribution}>
                    {analytics.videoMetrics.qualityDistribution.map((item) => (
                      <View key={item.quality} style={styles.qualityItem}>
                        <Text style={styles.qualityLabel}>{item.quality}</Text>
                        <View style={styles.qualityBar}>
                          <View style={[styles.qualityBarFill, { width: `${item.percentage}%` }]} />
                        </View>
                        <Text style={styles.qualityPercentage}>{formatPercentage(item.percentage)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Buffering Metrics */}
              {analytics.videoMetrics?.bufferingMetrics && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Performance Metrics</Text>
                  <Text style={styles.experimentalNote}>⚠️ Experimental - Coming Soon</Text>
                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Avg Buffer Time</Text>
                      <Text style={styles.performanceValue}>
                        {analytics.videoMetrics.bufferingMetrics.averageBufferTime.toFixed(1)}s
                      </Text>
                    </View>
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Buffering Rate</Text>
                      <Text style={styles.performanceValue}>
                        {formatPercentage(analytics.videoMetrics.bufferingMetrics.bufferingRate * 100)}
                      </Text>
                    </View>
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Affected Sessions</Text>
                      <Text style={styles.performanceValue}>
                        {analytics.videoMetrics.bufferingMetrics.affectedSessions}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Video Insights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Video Insights</Text>
                <View style={styles.insights}>
                  <View style={styles.insightItem}>
                    <Ionicons name="analytics" size={16} color="#8B5CF6" />
                    <Text style={styles.insightText}>
                      Average engagement rate is {formatPercentage(analytics.videoMetrics?.engagementRate || 0)} across
                      all videos
                    </Text>
                  </View>

                  <View style={styles.insightItem}>
                    <Ionicons name="people" size={16} color="#06B6D4" />
                    <Text style={styles.insightText}>
                      {formatNumber(analytics.videoMetrics?.uniqueViewers || 0)} unique viewers this period
                    </Text>
                  </View>

                  <View style={styles.insightItem}>
                    <Ionicons name="trophy" size={16} color="#F59E0B" />
                    <Text style={styles.insightText}>
                      Top video achieved {formatPercentage(analytics.videoMetrics?.topVideos?.[0]?.completionRate || 0)}{" "}
                      completion rate
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 30,
  },
  metricCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    width: (SCREEN_WIDTH - 52) / 2, // Account for padding and gap
    alignItems: "center",
  },
  metricValue: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metricLabel: {
    color: "#666",
    fontSize: 12,
    marginBottom: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  advancedMetrics: {
    gap: 16,
  },
  progressMetric: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
  },
  progressLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressValue: {
    color: "#666",
    fontSize: 12,
    textAlign: "right",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1D9BF0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNumber: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  categoryCount: {
    color: "#666",
    fontSize: 12,
  },
  categoryBar: {
    width: 60,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginLeft: 12,
  },
  categoryBarFill: {
    height: "100%",
    backgroundColor: "#1D9BF0",
    borderRadius: 2,
  },
  peakHours: {
    gap: 12,
  },
  peakHourItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
  },
  peakHourTime: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    width: 80,
  },
  peakHourCount: {
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  peakHourBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  peakHourRank: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  insights: {
    gap: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
  },
  insightText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#1D9BF0",
  },
  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "white",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  videoRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: "row",
    gap: 16,
  },
  videoStat: {
    color: "#666",
    fontSize: 12,
  },
  qualityDistribution: {
    gap: 12,
  },
  qualityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
  },
  qualityLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    width: 60,
  },
  qualityBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    marginHorizontal: 12,
  },
  qualityBarFill: {
    height: "100%",
    backgroundColor: "#06B6D4",
    borderRadius: 4,
  },
  qualityPercentage: {
    color: "#666",
    fontSize: 12,
    width: 45,
    textAlign: "right",
  },
  performanceGrid: {
    flexDirection: "row",
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  performanceLabel: {
    color: "#666",
    fontSize: 12,
    marginBottom: 8,
  },
  performanceValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  experimentalNote: {
    color: "#F59E0B",
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 12,
  },
});

export default TrendingAnalytics;
