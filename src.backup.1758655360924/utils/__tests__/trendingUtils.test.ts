import { calculateEngagementScore, getTrendingHashtags, getTrendingSecrets } from "../../utils/trending";
import type { Confession } from "../../types/confession";

describe("trending utils", () => {
  const baseTimestamp = Date.now();

  const createConfession = (overrides: Partial<Confession>): Confession => ({
    id: "id-" + Math.random().toString(36).slice(2),
    type: "text",
    content: "#confess testing content",
    transcription: null,
    videoUri: undefined,
    timestamp: baseTimestamp,
    isAnonymous: true,
    likes: 0,
    views: 0,
    isLiked: false,
    ...overrides,
  });

  it("weights likes and views with decay", () => {
    const recent = createConfession({ likes: 10, views: 100, timestamp: baseTimestamp });
    const older = createConfession({ likes: 20, views: 50, timestamp: baseTimestamp - 48 * 3600 * 1000 });

    const recentScore = calculateEngagementScore(recent);
    const olderScore = calculateEngagementScore(older);

    expect(recentScore).toBeGreaterThan(olderScore);
  });

  it("aggregates trending hashtags", () => {
    const confessions: Confession[] = [
      createConfession({ content: "Loving #expo and #Expo" }),
      createConfession({ content: "#expo rocks", transcription: "Working on #Expo today" }),
    ];

    const hashtags = getTrendingHashtags(confessions, 24);
    expect(hashtags[0].hashtag).toBe("#expo");
    expect(hashtags[0].count).toBeGreaterThanOrEqual(3);
  });

  it("sorts trending secrets by engagement score", () => {
    const confessions: Confession[] = [
      createConfession({ id: "a", likes: 5, views: 10, timestamp: baseTimestamp }),
      createConfession({ id: "b", likes: 15, views: 30, timestamp: baseTimestamp - 5 * 3600 * 1000 }),
    ];

    const trending = getTrendingSecrets(confessions, 24, 2);
    expect(trending.length).toBe(2);
    expect(trending[0].engagementScore).toBeGreaterThanOrEqual(trending[1].engagementScore);
  });
});
