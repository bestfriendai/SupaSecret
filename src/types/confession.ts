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
  isLoading: boolean;
  error: string | null;

  // Async methods for Supabase operations
  loadConfessions: () => Promise<void>;
  addConfession: (
    confession: Omit<Confession, "id" | "timestamp">,
    opts?: { onUploadProgress?: (progressPercent: number) => void }
  ) => Promise<void>;
  deleteConfession: (id: string) => Promise<void>;
  clearAllConfessions: () => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  updateLikes: (id: string, likes: number) => Promise<void>;
  updateVideoAnalytics: (id: string, analytics: Partial<VideoAnalytics>) => Promise<void>;
  loadUserPreferences: () => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
}
