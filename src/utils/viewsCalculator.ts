import { supabase } from "../lib/supabase";

/**
 * Calculate the number of views for a confession based on video_analytics
 * @param confessionId The ID of the confession to calculate views for
 * @returns The number of views (unique sessions that watched the video)
 */
export const calculateViews = async (confessionId: string): Promise<number> => {
  try {
    // Count unique sessions that watched this video
    const { data, error } = await supabase
      .from("video_analytics")
      .select("session_id")
      .eq("confession_id", confessionId);

    if (error) {
      console.error("Error fetching video analytics:", error);
      return 0;
    }

    // Count unique session_ids
    const rows = (data ?? []) as Array<{ session_id?: string }>;
    const uniqueSessions = new Set(rows.map((item) => item.session_id).filter((id): id is string => Boolean(id)));
    return uniqueSessions.size;
  } catch (e) {
    console.error("Error calculating views:", e);
    return 0;
  }
};

/**
 * Calculate views for multiple confessions at once
 * @param confessionIds Array of confession IDs
 * @returns Object mapping confession IDs to view counts
 */
export const calculateBulkViews = async (confessionIds: string[]): Promise<Record<string, number>> => {
  if (!confessionIds.length) return {};

  try {
    // Get all analytics for the provided confession IDs
    const { data, error } = await supabase
      .from("video_analytics")
      .select("confession_id, session_id")
      .in("confession_id", confessionIds);

    if (error) {
      console.error("Error fetching bulk video analytics:", error);
      return {};
    }

    // Group by confession_id and count unique session_ids
    const viewCounts: Record<string, Set<string>> = {};

    // Initialize all confession IDs with empty sets
    confessionIds.forEach((id) => {
      viewCounts[id] = new Set();
    });

    // Add session IDs to the appropriate sets
    ((data ?? []) as Array<{ confession_id?: string; session_id?: string }>).forEach((item) => {
      if (item.confession_id && item.session_id) {
        if (!viewCounts[item.confession_id]) {
          viewCounts[item.confession_id] = new Set();
        }
        viewCounts[item.confession_id].add(item.session_id);
      }
    });

    // Convert sets to counts
    const result: Record<string, number> = {};
    Object.entries(viewCounts).forEach(([id, sessions]) => {
      result[id] = sessions.size;
    });

    return result;
  } catch (e) {
    console.error("Error calculating bulk views:", e);
    return {};
  }
};

/**
 * Get a memoized view count for a confession
 * This can be used in components to avoid excessive database queries
 * @param confession The confession object
 * @param videoAnalytics Optional video analytics data if already available
 * @returns The view count (defaults to 0)
 */
export const getViewCount = (
  confession: { id: string; views?: number },
  videoAnalytics?: { confession_id: string; session_id: string }[],
): number => {
  // If we have video analytics data, calculate from that
  if (videoAnalytics?.length) {
    const sessions = new Set(
      videoAnalytics.filter((va) => va.confession_id === confession.id).map((va) => va.session_id),
    );
    return sessions.size;
  }

  // Fall back to confession.views if it exists (for backward compatibility)
  return confession.views || 0;
};
