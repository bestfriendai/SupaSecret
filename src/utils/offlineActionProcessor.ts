/**
 * Offline Action Processor
 * Handles processing of queued offline actions when connection is restored
 */

import { supabase } from "../lib/supabase";
import { OfflineAction, OFFLINE_ACTIONS } from "./offlineQueue";
import { uploadVideoToSupabase, isLocalUri } from "./storage";
import { confessionValidation } from "./validation";
import { normalizeConfession } from "./confessionNormalizer";

/**
 * Process a single offline action
 */
export async function processOfflineAction(action: OfflineAction): Promise<void> {
  if (__DEV__) {
    console.log(`🔄 Processing offline action: ${action.type}`, action.payload);
  }

  switch (action.type) {
    case OFFLINE_ACTIONS.LIKE_CONFESSION:
      await processLikeConfession(
        action.payload as {
          confessionId: string;
          isLiked: boolean;
          likes: number;
        },
      );
      break;

    case OFFLINE_ACTIONS.UNLIKE_CONFESSION:
      await processUnlikeConfession(
        action.payload as {
          confessionId: string;
          isLiked: boolean;
          likes: number;
        },
      );
      break;

    case OFFLINE_ACTIONS.SAVE_CONFESSION:
      await processSaveConfession(
        action.payload as {
          confessionId: string;
        },
      );
      break;

    case OFFLINE_ACTIONS.UNSAVE_CONFESSION:
      await processUnsaveConfession(
        action.payload as {
          confessionId: string;
        },
      );
      break;

    case OFFLINE_ACTIONS.DELETE_CONFESSION:
      await processDeleteConfession(
        action.payload as {
          confessionId: string;
        },
      );
      break;

    case OFFLINE_ACTIONS.CREATE_CONFESSION:
      await processCreateConfession(
        action.payload as {
          tempId: string;
          confession: {
            type: 'text' | 'video';
            content: string;
            videoUri?: string;
            transcription?: string;
            isAnonymous: boolean;
          };
        },
        action.reconciliation,
      );
      break;

    case OFFLINE_ACTIONS.CREATE_REPLY:
      await processCreateReply(
        action.payload as {
          confessionId: string;
          content: string;
        },
      );
      break;

    case OFFLINE_ACTIONS.DELETE_REPLY:
      await processDeleteReply(
        action.payload as {
          replyId: string;
        },
      );
      break;

    case OFFLINE_ACTIONS.LIKE_REPLY:
      await processLikeReply(
        action.payload as {
          replyId: string;
          likes: number;
        },
      );
      break;

    case OFFLINE_ACTIONS.UNLIKE_REPLY:
      await processUnlikeReply(
        action.payload as {
          replyId: string;
          likes: number;
        },
      );
      break;

    case OFFLINE_ACTIONS.MARK_NOTIFICATION_READ:
      await processMarkNotificationRead(
        action.payload as {
          notificationIds: string[];
        },
      );
      break;

    default:
      console.warn(`Unknown offline action type: ${action.type}`);
  }
}

/**
 * Process like confession action
 */
async function processLikeConfession(payload: {
  confessionId: string;
  isLiked: boolean;
  likes: number;
}): Promise<void> {
  const { confessionId } = payload;

  const { data: { user } } = await supabase.auth.getUser();

  // Check authentication first - the function requires it
  if (!user) {
    throw new Error('User must be authenticated to like confessions');
  }

  // Use RPC for server-verified toggle - fail fast if it doesn't work
  const { data: rpcData, error: rpcError } = await supabase.rpc("toggle_confession_like", {
    confession_uuid: confessionId,
    // Note: user_id parameter removed - function gets it from auth.uid() internally
  });

  if (rpcError) {
    throw rpcError; // Fail fast instead of overwriting server state
  }

  // Validate the response format matches documentation
  if (!rpcData || !Array.isArray(rpcData) || rpcData.length === 0) {
    throw new Error('Invalid response from toggle_confession_like function');
  }
}

/**
 * Process unlike confession action
 */
async function processUnlikeConfession(payload: {
  confessionId: string;
  isLiked: boolean;
  likes: number;
}): Promise<void> {
  // Same as like confession - the RPC handles both cases
  await processLikeConfession(payload);
}

/**
 * Process save confession action
 */
async function processSaveConfession(payload: { confessionId: string }): Promise<void> {
  const { confessionId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("user_saved_confessions" as any)
    .upsert({ user_id: user.id, confession_id: confessionId }, { onConflict: "user_id,confession_id" });

  if (error) throw error;
}

/**
 * Process unsave confession action
 */
async function processUnsaveConfession(payload: { confessionId: string }): Promise<void> {
  const { confessionId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("user_saved_confessions" as any)
    .delete()
    .eq("user_id", user.id)
    .eq("confession_id", confessionId);

  if (error) throw error;
}

/**
 * Process delete confession action
 */
async function processDeleteConfession(payload: { confessionId: string }): Promise<void> {
  const { confessionId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase.from("confessions").delete().eq("id", confessionId).eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Process create confession action (offline to online sync)
 */
async function processCreateConfession(
  payload: {
    tempId: string;
    confession: {
      type: 'text' | 'video';
      content: string;
      videoUri?: string;
      transcription?: string;
      isAnonymous: boolean;
    };
  },
  reconciliation?: {
    tempId?: string;
    targetStore?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { tempId, confession } = payload;

  if (__DEV__) {
    console.log(`🔄 Processing offline CREATE_CONFESSION for tempId: ${tempId}`);
  }

  // Validate the confession before processing
  const validationResult = confessionValidation.complete({
    content: confession.content,
    type: confession.type,
    video: confession.type === 'video' && confession.videoUri ? {
      file: { uri: confession.videoUri },
    } : undefined,
  });

  if (!validationResult.isValid) {
    throw new Error(`Validation failed: ${validationResult.error}`);
  }

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  let videoStoragePath: string | undefined;

  // Handle video upload if needed
  if (confession.type === "video" && confession.videoUri) {
    if (isLocalUri(confession.videoUri)) {
      try {
        const result = await uploadVideoToSupabase(confession.videoUri, user.id);
        videoStoragePath = result.path;

        if (__DEV__) {
          console.log(`📹 Video uploaded successfully for tempId ${tempId}, path: ${videoStoragePath}`);
        }
      } catch (uploadError) {
        if (__DEV__) {
          console.error(`❌ Video upload failed for tempId ${tempId}:`, uploadError);
        }
        throw new Error(`Video upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
    } else {
      // If it's already a remote URL, we can't use it directly in the database
      // This shouldn't happen in normal offline flow, but let's handle it
      console.warn(`⚠️ Unexpected remote video URI in offline confession: ${confession.videoUri}`);
    }
  }

  // Insert confession into database
  const { data, error } = await supabase
    .from("confessions")
    .insert({
      user_id: user.id,
      type: confession.type,
      content: confession.content,
      video_uri: videoStoragePath,
      transcription: confession.transcription,
      is_anonymous: confession.isAnonymous,
    })
    .select()
    .single();

  if (error) {
    if (__DEV__) {
      console.error(`❌ Database insert failed for tempId ${tempId}:`, error);
    }
    throw error;
  }

  if (!data) {
    throw new Error("No data returned from confession insert");
  }

  // Handle state reconciliation - replace temp confession with real one
  if (reconciliation?.targetStore === 'confessionStore') {
    try {
      // Dynamically import the store to avoid circular dependencies
      const { useConfessionStore } = await import('../state/confessionStore');

      // Get current store state
      const { confessions } = useConfessionStore.getState();

      // Find and replace the temp confession with the real one
      const tempIndex = confessions.findIndex(c => c.id === tempId);
      if (tempIndex !== -1) {
        // Use normalizeConfession to properly handle field mapping and signed URLs
        const realConfession = await normalizeConfession(data);

        // Replace temp confession with real one
        const updatedConfessions = [...confessions];
        updatedConfessions[tempIndex] = realConfession;

        useConfessionStore.setState({ confessions: updatedConfessions });

        if (__DEV__) {
          console.log(`✅ Reconciled tempId ${tempId} with real confession ID ${data.id}`);
        }
      }
    } catch (reconciliationError) {
      // Log the error but don't fail the entire operation
      if (__DEV__) {
        console.error(`⚠️ Failed to reconcile confession state for tempId ${tempId}:`, reconciliationError);
      }
    }
  }

  if (__DEV__) {
    console.log(`✅ Successfully processed CREATE_CONFESSION for tempId ${tempId}, real ID: ${data.id}`);
  }
}

/**
 * Process create reply action
 */
async function processCreateReply(payload: { confessionId: string; content: string }): Promise<void> {
  const { confessionId, content } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Validate content is not empty after trimming
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error("Reply content cannot be empty");
  }

  const { error } = await supabase.from("replies").insert({
    confession_id: confessionId,
    user_id: user.id,
    content: trimmedContent,
  });

  if (error) throw error;
}

/**
 * Process delete reply action
 */
async function processDeleteReply(payload: { replyId: string }): Promise<void> {
  const { replyId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase.from("replies").delete().eq("id", replyId).eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Process like reply action
 */
async function processLikeReply(payload: { replyId: string; likes: number }): Promise<void> {
  const { replyId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Add like with upsert for idempotency
  const { error: likeError } = await supabase
    .from("user_likes")
    .upsert({ user_id: user.id, reply_id: replyId }, { onConflict: "user_id,reply_id" });

  if (likeError) throw likeError;

  // Get server-derived likes count
  const { count, error: countError } = await supabase
    .from("user_likes")
    .select("id", { count: "exact" })
    .eq("reply_id", replyId);

  if (countError) throw countError;

  // Update reply with authoritative count
  const { error: updateError } = await supabase
    .from("replies")
    .update({ likes: count || 0 })
    .eq("id", replyId);

  if (updateError) throw updateError;
}

/**
 * Process unlike reply action
 */
async function processUnlikeReply(payload: { replyId: string; likes: number }): Promise<void> {
  const { replyId } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Remove like (idempotent - no error if row doesn't exist)
  const { error: unlikeError } = await supabase
    .from("user_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("reply_id", replyId);

  if (unlikeError) throw unlikeError;

  // Get server-derived likes count
  const { count, error: countError } = await supabase
    .from("user_likes")
    .select("id", { count: "exact" })
    .eq("reply_id", replyId);

  if (countError) throw countError;

  // Update reply with authoritative count
  const { error: updateError } = await supabase
    .from("replies")
    .update({ likes: count || 0 })
    .eq("id", replyId);

  if (updateError) throw updateError;
}

/**
 * Process mark notification read action
 */
async function processMarkNotificationRead(payload: { notificationIds: string[] }): Promise<void> {
  const { notificationIds } = payload;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", notificationIds)
    .eq("user_id", user.id);

  if (error) throw error;
}
