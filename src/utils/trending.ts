import { Confession } from "../types/confession";

export interface HashtagData {
  hashtag: string;
  count: number;
  percentage: number;
}

export interface TrendingSecret {
  confession: Confession;
  engagementScore: number;
}

/**
 * Extract hashtags from text content
 */
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

/**
 * Get confessions from the past specified hours
 */
export const getRecentConfessions = (confessions: Confession[], hours: number = 24): Confession[] => {
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
  return confessions.filter((confession) => confession.timestamp >= cutoffTime);
};

/**
 * Calculate trending hashtags from recent confessions
 */
export const getTrendingHashtags = (confessions: Confession[], hours: number = 24): HashtagData[] => {
  const recentConfessions = getRecentConfessions(confessions, hours);
  const hashtagCounts: Record<string, number> = {};

  // Count hashtag occurrences
  recentConfessions.forEach((confession) => {
    const hashtags = extractHashtags(confession.content);
    if (confession.transcription) {
      hashtags.push(...extractHashtags(confession.transcription));
    }

    hashtags.forEach((hashtag) => {
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    });
  });

  // Convert to array and calculate percentages
  const totalHashtags = Object.values(hashtagCounts).reduce((sum, count) => sum + count, 0);
  const hashtagData: HashtagData[] = Object.entries(hashtagCounts)
    .map(([hashtag, count]) => ({
      hashtag,
      count,
      percentage: totalHashtags > 0 ? (count / totalHashtags) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return hashtagData;
};

/**
 * Calculate engagement score for a confession
 */
export const calculateEngagementScore = (confession: Confession): number => {
  const likes = confession.likes || 0;
  const hoursOld = (Date.now() - confession.timestamp) / (1000 * 60 * 60);

  // Decay factor: newer posts get higher scores
  const decayFactor = Math.exp(-hoursOld / 24); // Half-life of 24 hours

  // Base score from likes, with time decay
  return likes * decayFactor;
};

/**
 * Get trending secrets based on engagement
 */
export const getTrendingSecrets = (
  confessions: Confession[],
  hours: number = 24,
  limit: number = 10,
): TrendingSecret[] => {
  const recentConfessions = getRecentConfessions(confessions, hours);

  const trendingSecrets: TrendingSecret[] = recentConfessions
    .map((confession) => ({
      confession,
      engagementScore: calculateEngagementScore(confession),
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit);

  return trendingSecrets;
};

/**
 * Search confessions by hashtag
 */
export const searchByHashtag = (confessions: Confession[], hashtag: string): Confession[] => {
  const normalizedHashtag = hashtag.toLowerCase().startsWith("#") ? hashtag.toLowerCase() : `#${hashtag.toLowerCase()}`;

  return confessions.filter((confession) => {
    const contentHashtags = extractHashtags(confession.content);
    const transcriptionHashtags = confession.transcription ? extractHashtags(confession.transcription) : [];
    const allHashtags = [...contentHashtags, ...transcriptionHashtags];

    return allHashtags.includes(normalizedHashtag);
  });
};

/**
 * Get time period display text
 */
export const getTimePeriodText = (hours: number): string => {
  if (hours === 24) return "Past 24 hours";
  if (hours === 168) return "Past week";
  if (hours === 720) return "Past month";
  return `Past ${hours} hours`;
};

/**
 * Format engagement score for display
 */
export const formatEngagementScore = (score: number): string => {
  if (score < 1) return score.toFixed(1);
  if (score < 10) return score.toFixed(1);
  return Math.round(score).toString();
};
