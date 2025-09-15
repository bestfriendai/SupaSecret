import { Confession } from "../types/confession";
import { ensureSignedVideoUrl } from "./storage";

const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * Extracts video URI from database row, handling both video_uri and video_url fields
 * Centralizes the logic for consistent field mapping across the application
 */
export function getVideoUriFromRow(dbRow: any): string | null {
  if (!dbRow) return null;

  // Check both field variations for backward compatibility
  const videoPath = dbRow.video_uri || dbRow.video_url;

  if (!videoPath || typeof videoPath !== 'string') {
    return null;
  }

  return videoPath.trim() || null;
}

/**
 * Normalizes database confession rows into consistent Confession objects (synchronous parts only)
 * Handles field mapping and validation without async signed URL generation
 * Useful for stores that need consistent field mapping but can't await full normalization
 */
export function normalizeConfessionSync(dbRow: any): Confession {
  if (!dbRow || !dbRow.id) {
    throw new Error('Invalid database row: missing required id field');
  }

  const base: Confession = {
    id: dbRow.id,
    type: (dbRow.type === "video" || dbRow.type === "text") ? dbRow.type : "text",
    content: dbRow.content || "",
    videoUri: undefined,
    transcription: dbRow.transcription || undefined,
    timestamp: dbRow.created_at ? new Date(dbRow.created_at).getTime() : Date.now(),
    isAnonymous: Boolean(dbRow.is_anonymous),
    likes: Math.max(0, parseInt(dbRow.likes) || 0),
    isLiked: false,
  };

  // Handle video URI for video confessions
  if (base.type === "video") {
    const videoPath = getVideoUriFromRow(dbRow);

    if (videoPath) {
      // If it's already a signed URL, use it directly
      if (/^https?:\/\//i.test(videoPath)) {
        base.videoUri = videoPath;
      } else {
        // For storage paths, we'll need async processing - set to undefined for now
        base.videoUri = undefined;
      }
    } else {
      // No video path, will need fallback
      base.videoUri = undefined;
    }
  }

  return base;
}

/**
 * Normalizes database confession rows into consistent Confession objects
 * Handles both video_uri and video_url fields for backward compatibility
 * Includes async signed URL generation for storage paths
 */
export async function normalizeConfession(dbRow: any): Promise<Confession> {
  try {
    // Start with synchronous normalization
    const base = normalizeConfessionSync(dbRow);

    // Handle async video URL processing for video confessions
    if (base.type === "video") {
      const videoPath = getVideoUriFromRow(dbRow);

      if (videoPath) {
        // Check if it's already an absolute URL (signed URL or external URL)
        if (/^https?:\/\//i.test(videoPath)) {
          base.videoUri = videoPath;
        } else {
          // It's a storage path, get signed URL
          try {
            if (__DEV__) {
              console.log(`Getting signed URL for confession ${dbRow.id}, path: ${videoPath}`);
            }
            const signedResult = await ensureSignedVideoUrl(videoPath);
            base.videoUri = signedResult.signedUrl || FALLBACK_VIDEO;
          } catch (error) {
            if (__DEV__) {
              console.warn(`Failed to get signed URL for confession ${dbRow.id}, path: ${videoPath}:`, error);
            }
            // Leave undefined for UI to handle missing videos
            base.videoUri = undefined;
          }
        }
      } else {
        // No video path provided, leave undefined for UI to handle
        if (__DEV__) {
          console.warn(`No video path found for video confession ${dbRow.id}`);
        }
        base.videoUri = undefined;
      }
    }

    return base;
  } catch (error) {
    if (__DEV__) {
      console.error(`Failed to normalize confession ${dbRow?.id}:`, error);
    }

    // Return a minimal valid confession object on error
    return {
      id: dbRow?.id || 'unknown',
      type: "text",
      content: "Content unavailable",
      videoUri: undefined,
      transcription: undefined,
      timestamp: Date.now(),
      isAnonymous: true,
      likes: 0,
      isLiked: false,
    };
  }
}

/**
 * Normalizes multiple confessions in parallel with error resilience
 * Failed normalizations won't break the entire batch
 */
export async function normalizeConfessions(dbRows: any[]): Promise<Confession[]> {
  if (!Array.isArray(dbRows)) {
    if (__DEV__) {
      console.warn('normalizeConfessions called with non-array input:', dbRows);
    }
    return [];
  }

  const promises = dbRows.map(async (row) => {
    try {
      return await normalizeConfession(row);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to normalize confession in batch:', error);
      }
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((confession): confession is Confession => confession !== null);
}