import { supabase } from "../../../lib/supabase";
import type { DatabaseConfession, Confession, VideoAnalytics, UserPreferences } from "../types/confession.types";

const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Repository for confession database operations
 * Handles all direct Supabase interactions
 */
export class ConfessionRepository {
  /**
   * Fetch confessions from public view
   */
  async fetchConfessions(limit: number = 20, offset?: Date): Promise<DatabaseConfession[]> {
    let query = supabase.from("public_confessions").select("*").order("created_at", { ascending: false }).limit(limit);

    if (offset) {
      query = query.lt("created_at", offset.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as DatabaseConfession[];
  }

  /**
   * Fetch user's own confessions
   */
  async fetchUserConfessions(userId: string): Promise<DatabaseConfession[]> {
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DatabaseConfession[];
  }

  /**
   * Fetch a single confession by ID
   */
  async fetchConfessionById(id: string): Promise<DatabaseConfession | null> {
    const { data, error } = await supabase.from("public_confessions").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data as DatabaseConfession;
  }

  /**
   * Create a new confession
   */
  async createConfession(input: {
    userId: string;
    type: "text" | "video";
    content: string;
    videoUri?: string;
    transcription?: string;
    isAnonymous: boolean;
  }): Promise<DatabaseConfession> {
    const { data, error } = await supabase
      .from("confessions")
      .insert({
        user_id: input.userId,
        type: input.type,
        content: input.content,
        video_uri: input.videoUri,
        transcription: input.transcription,
        is_anonymous: input.isAnonymous,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("No data returned from confession insert");

    return data as DatabaseConfession;
  }

  /**
   * Delete a confession
   */
  async deleteConfession(id: string, userId: string): Promise<void> {
    const { error } = await supabase.from("confessions").delete().eq("id", id).eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Delete all confessions for a user
   */
  async deleteAllUserConfessions(userId: string): Promise<void> {
    const { error } = await supabase.from("confessions").delete().eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Toggle like on a confession using RPC
   */
  async toggleLike(confessionId: string): Promise<{ likes: number }> {
    const { data, error } = await supabase.rpc("toggle_confession_like", {
      confession_uuid: confessionId,
    });

    if (error) throw error;

    // RPC returns array with likes_count
    if (data && Array.isArray(data) && data.length > 0) {
      return { likes: data[0].likes_count as number };
    }

    throw new Error("Failed to toggle like");
  }

  /**
   * Update confession likes directly (fallback)
   */
  async updateLikes(confessionId: string, likes: number): Promise<void> {
    const { error } = await supabase.from("confessions").update({ likes }).eq("id", confessionId);

    if (error) throw error;
  }

  /**
   * Update video analytics
   */
  async updateVideoAnalytics(confessionId: string, analytics: Partial<VideoAnalytics>): Promise<void> {
    const { error } = await supabase.from("video_analytics").upsert({
      confession_id: confessionId,
      watch_time: analytics.watch_time,
      completion_rate: analytics.completion_rate,
      last_watched: analytics.last_watched ? new Date(analytics.last_watched).toISOString() : new Date().toISOString(),
      interactions: analytics.interactions,
    });

    if (error) throw error;
  }

  /**
   * Fetch user preferences
   */
  async fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", userId).single();

    if (error) {
      if (error.code === "PGRST116") return null; // No preferences yet
      throw error;
    }

    return {
      autoplay: data.autoplay ?? true,
      sound_enabled: data.sound_enabled ?? true,
      quality_preference: data.quality_preference as "auto" | "high" | "medium" | "low",
      data_usage_mode: data.data_usage_mode as "unlimited" | "wifi-only" | "minimal",
      captions_default: data.captions_default ?? true,
      haptics_enabled: data.haptics_enabled ?? true,
      reduced_motion: data.reduced_motion ?? false,
      playback_speed: (data as any).playback_speed ?? 1.0,
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: userId,
      ...preferences,
    });

    if (error) throw error;
  }

  /**
   * Subscribe to confession changes
   */
  subscribeToConfessions(
    onInsert: (confession: DatabaseConfession) => void,
    onUpdate: (confession: DatabaseConfession) => void,
  ) {
    const channel = supabase
      .channel("confessions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (payload) => {
        onInsert(payload.new as DatabaseConfession);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "confessions" }, (payload) => {
        onUpdate(payload.new as DatabaseConfession);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}

// Export singleton instance
export const confessionRepository = new ConfessionRepository();
