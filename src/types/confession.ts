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
  watchProgress: number; // 0-1 representing how much of the video was watched
  totalDuration: number; // Total video duration in seconds
  watchSessions: number; // Number of times the video was played
}

export interface UserPreferences {
  autoplay: boolean;
  soundEnabled: boolean;
  qualityPreference: "auto" | "high" | "medium" | "low";
  dataUsageMode: "unlimited" | "wifi-only" | "minimal";
  captionsDefault: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  playbackSpeed: number;
}

export interface ConfessionState {
  confessions: Confession[];
  userConfessions: Confession[];
  videoAnalytics: Record<string, VideoAnalytics>;
  userPreferences: UserPreferences;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;

  // Async methods for Supabase operations
  loadConfessions: () => Promise<void>;
  loadMoreConfessions: () => Promise<void>;
  loadUserConfessions: () => Promise<void>;
  addConfession: (
    confession: Omit<Confession, "id" | "timestamp">,
    opts?: { onUploadProgress?: (progressPercent: number) => void },
  ) => Promise<void>;
  deleteConfession: (id: string) => Promise<void>;
  deleteUserConfession: (id: string) => Promise<void>;
  clearAllConfessions: () => Promise<void>;
  clearAllUserConfessions: () => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  updateLikes: (id: string, likes: number) => Promise<void>;
  updateVideoAnalytics: (id: string, analytics: Partial<VideoAnalytics>) => Promise<void>;
  loadUserPreferences: () => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
}
