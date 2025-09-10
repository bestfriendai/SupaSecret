/**
 * Offline Action Processor
 * Handles processing of queued offline actions when connection is restored
 */

import { supabase } from "../lib/supabase";
import { OfflineAction, OFFLINE_ACTIONS } from "./offlineQueue";

/**
 * Process a single offline action
 */
export async function processOfflineAction(action: OfflineAction): Promise<void> {
  if (__DEV__) {
    console.log(`🔄 Processing offline action: ${action.type}`, action.payload);
  }

  switch (action.type) {
    case OFFLINE_ACTIONS.LIKE_CONFESSION:
      await processLikeConfession(action.payload);
      break;

    case OFFLINE_ACTIONS.UNLIKE_CONFESSION:
      await processUnlikeConfession(action.payload);
      break;

    case OFFLINE_ACTIONS.SAVE_CONFESSION:
      await processSaveConfession(action.payload);
      break;

    case OFFLINE_ACTIONS.UNSAVE_CONFESSION:
      await processUnsaveConfession(action.payload);
      break;

    case OFFLINE_ACTIONS.DELETE_CONFESSION:
      await processDeleteConfession(action.payload);
      break;

    case OFFLINE_ACTIONS.CREATE_REPLY:
      await processCreateReply(action.payload);
      break;

    case OFFLINE_ACTIONS.DELETE_REPLY:
      await processDeleteReply(action.payload);
      break;

    case OFFLINE_ACTIONS.LIKE_REPLY:
      await processLikeReply(action.payload);
      break;

    case OFFLINE_ACTIONS.UNLIKE_REPLY:
      await processUnlikeReply(action.payload);
      break;

    case OFFLINE_ACTIONS.MARK_NOTIFICATION_READ:
      await processMarkNotificationRead(action.payload);
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

  // Use RPC for server-verified toggle - fail fast if it doesn't work
  const { data: rpcData, error: rpcError } = await supabase.rpc("toggle_confession_like", {
    confession_uuid: confessionId,
  });

  if (rpcError) {
    throw rpcError; // Fail fast instead of overwriting server state
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
