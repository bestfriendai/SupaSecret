export interface Confession {
  id: string;
  type: "text" | "video";
  content: string;
  videoUri?: string | null;
  originalVideoUri?: string | null;
  selectedVideoUri?: string | null;
  videoQuality?: "360p" | "720p" | "1080p";
  videoVariants?: {
    quality: "360p" | "720p" | "1080p";
    uri: string;
    width?: number;
    height?: number;
  }[];
  qualityMetadata?: {
    deviceTier?: string;
    networkQuality?: string;
    selectedQuality?: "360p" | "720p" | "1080p";
  };
  transcription?: string | null;
  timestamp: number;
  isAnonymous: boolean;
  likes: number;
  views: number;
  sessionId?: string | null;
  isLiked?: boolean | null;
  // Video processing fields
  faceBlurApplied?: boolean;
  voiceChangeApplied?: boolean;
  processed?: boolean;
  // Video metadata
  duration?: number;
}

// Database schema representation (snake_case)
export interface DatabaseConfession {
  id: string;
  type: "text" | "video";
  content: string;
  video_uri?: string | null;
  transcription?: string | null;
  created_at: string;
  is_anonymous: boolean;
  likes: number;
  views: number;
  session_id?: string | null;
  user_id?: string | null;
}

export interface VideoAnalytics {
  watch_time: number;
  completion_rate: number;
  last_watched: string;
  interactions: number;
  watch_progress: number; // 0-1 representing how much of the video was watched
  total_duration?: number; // Total video duration in seconds
  watch_sessions?: number; // Number of times the video was played
  sessions: number; // Number of viewing sessions
}

export interface UserPreferences {
  autoplay: boolean;
  sound_enabled: boolean;
  quality_preference: "auto" | "high" | "medium" | "low";
  data_usage_mode: "unlimited" | "wifi-only" | "minimal";
  captions_default: boolean;
  haptics_enabled: boolean;
  reduced_motion: boolean;
  playback_speed: number;
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
  isStoreInitialized: boolean;

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
  queueTempConfession: (confession: any, metadata: any) => Promise<void>;
  clearError: () => void;
}

export interface ConfessionApiResponse {
  confession: Confession;
  success: boolean;
  message?: string;
}

export interface ConfessionApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface ConfessionListApiResponse {
  confessions: Confession[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}
