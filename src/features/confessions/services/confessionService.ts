import { confessionRepository } from "./confessionRepository";
import type {
  Confession,
  DatabaseConfession,
  CreateConfessionInput,
  VideoAnalytics,
  UserPreferences,
} from "../types/confession.types";

const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Extracts video URI from database row
 */
function getVideoUriFromRow(dbRow: any): string | null {
  if (!dbRow) return null;
  const videoPath = dbRow.video_uri || dbRow.video_url;
  if (!videoPath || typeof videoPath !== "string") return null;
  return videoPath.trim() || null;
}

/**
 * Check if a string is an HTTP(S) URL
 */
export const isHttpUrl = (value?: string): boolean => !!value && /^https?:\/\//i.test(value);

/**
 * Check if a string is a local file URI
 */
export const isLocalUri = (value?: string): boolean => !!value && /^file:\/\//i.test(value);

/**
 * Normalize a database confession to app format
 */
export function normalizeConfession(dbRow: DatabaseConfession): Confession {
  const base: Confession = {
    id: dbRow.id,
    type: dbRow.type === "video" || dbRow.type === "text" ? dbRow.type : "text",
    content: dbRow.content || "",
    videoUri: undefined,
    transcription: dbRow.transcription || undefined,
    timestamp: dbRow.created_at ? new Date(dbRow.created_at).getTime() : Date.now(),
    isAnonymous: Boolean(dbRow.is_anonymous),
    likes: Math.max(0, parseInt(String(dbRow.likes)) || 0),
    views: Math.max(0, parseInt(String(dbRow.views)) || 0),
    isLiked: false,
  };

  // Handle video URI for video confessions
  if (base.type === "video") {
    const videoPath = getVideoUriFromRow(dbRow);
    if (videoPath) {
      // If it's already a URL, use it directly
      if (isHttpUrl(videoPath)) {
        base.videoUri = videoPath;
      } else {
        // For storage paths, we'll need to get signed URLs elsewhere
        base.videoUri = undefined;
      }
    }
  }

  return base;
}

/**
 * Normalize multiple confessions
 */
export function normalizeConfessions(dbRows: DatabaseConfession[]): Confession[] {
  if (!Array.isArray(dbRows)) return [];
  return dbRows.map(normalizeConfession).filter((c) => c !== null);
}

/**
 * Service class for confession business logic
 */
export class ConfessionService {
  /**
   * Fetch confessions from the public feed
   */
  async fetchConfessions(limit: number = 20, offset?: Date): Promise<Confession[]> {
    const dbConfessions = await confessionRepository.fetchConfessions(limit, offset);
    return normalizeConfessions(dbConfessions);
  }

  /**
   * Fetch user's own confessions
   */
  async fetchUserConfessions(userId: string): Promise<Confession[]> {
    const dbConfessions = await confessionRepository.fetchUserConfessions(userId);
    return normalizeConfessions(dbConfessions);
  }

  /**
   * Fetch a single confession by ID
   */
  async fetchConfessionById(id: string): Promise<Confession | null> {
    const dbConfession = await confessionRepository.fetchConfessionById(id);
    if (!dbConfession) return null;
    return normalizeConfession(dbConfession);
  }

  /**
   * Create a new confession
   */
  async createConfession(
    userId: string,
    input: CreateConfessionInput,
    options?: {
      onUploadProgress?: (percent: number) => void;
    },
  ): Promise<Confession> {
    // Validation
    const trimmedContent = input.content.trim();
    if (!trimmedContent) {
      throw new Error("Please enter your confession");
    }

    if (trimmedContent.length > 280) {
      throw new Error("Your confession is too long. Please keep it under 280 characters.");
    }

    if (trimmedContent.length < 10) {
      throw new Error("Your confession is too short. Please write at least 10 characters.");
    }

    if (input.type === "video" && !input.videoUri) {
      throw new Error("Video file is required for video confessions");
    }

    // Create in database
    const dbConfession = await confessionRepository.createConfession({
      userId,
      type: input.type,
      content: trimmedContent,
      videoUri: input.videoUri,
      transcription: input.transcription,
      isAnonymous: input.isAnonymous,
    });

    return normalizeConfession(dbConfession);
  }

  /**
   * Delete a confession
   */
  async deleteConfession(id: string, userId: string): Promise<void> {
    await confessionRepository.deleteConfession(id, userId);
  }

  /**
   * Delete all user confessions
   */
  async deleteAllUserConfessions(userId: string): Promise<void> {
    await confessionRepository.deleteAllUserConfessions(userId);
  }

  /**
   * Toggle like on a confession
   */
  async toggleLike(confessionId: string): Promise<{ likes: number }> {
    try {
      return await confessionRepository.toggleLike(confessionId);
    } catch (error) {
      // Fallback to direct update if RPC fails
      if (__DEV__) {
        console.warn("RPC toggle_like failed, using fallback", error);
      }
      throw error;
    }
  }

  /**
   * Update video analytics
   */
  async updateVideoAnalytics(confessionId: string, analytics: Partial<VideoAnalytics>): Promise<void> {
    await confessionRepository.updateVideoAnalytics(confessionId, analytics);
  }

  /**
   * Fetch user preferences
   */
  async fetchUserPreferences(userId: string): Promise<UserPreferences> {
    const prefs = await confessionRepository.fetchUserPreferences(userId);

    // Return defaults if no preferences exist
    return (
      prefs || {
        autoplay: true,
        sound_enabled: true,
        quality_preference: "auto",
        data_usage_mode: "unlimited",
        captions_default: true,
        haptics_enabled: true,
        reduced_motion: false,
        playback_speed: 1.0,
      }
    );
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    await confessionRepository.updateUserPreferences(userId, preferences);
  }

  /**
   * Subscribe to real-time confession updates
   */
  subscribeToConfessions(onInsert: (confession: Confession) => void, onUpdate: (confession: Confession) => void) {
    return confessionRepository.subscribeToConfessions(
      (dbConfession) => onInsert(normalizeConfession(dbConfession)),
      (dbConfession) => onUpdate(normalizeConfession(dbConfession)),
    );
  }
}

// Export singleton instance
export const confessionService = new ConfessionService();
