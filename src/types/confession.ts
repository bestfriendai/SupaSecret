export interface Confession {
  id: string;
  type: "text" | "video";
  content: string;
  videoUri?: string;
  transcription?: string;
  timestamp: number;
  isAnonymous: boolean;
  likes?: number;
  isLiked?: boolean;
}

export interface VideoAnalytics {
  watchTime: number;
  completionRate: number;
  lastWatched: number;
  interactions: number;
}

export interface UserPreferences {
  autoplay: boolean;
  soundEnabled: boolean;
  qualityPreference: "auto" | "high" | "medium" | "low";
  dataUsageMode: "unlimited" | "wifi-only" | "minimal";
}

export interface ConfessionState {
  confessions: Confession[];
  videoAnalytics: Record<string, VideoAnalytics>;
  userPreferences: UserPreferences;
  addConfession: (confession: Omit<Confession, "id" | "timestamp">) => void;
  deleteConfession: (id: string) => void;
  clearAllConfessions: () => void;
  toggleLike: (id: string) => void;
  updateLikes: (id: string, likes: number) => void;
  updateVideoAnalytics: (id: string, analytics: Partial<VideoAnalytics>) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
}