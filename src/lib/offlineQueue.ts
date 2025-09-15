// Basic offline queue for Supabase mutations
// Attempts to auto-detect connectivity and flush queued tasks when back online

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, withSupabaseRetry, checkSupabaseConfig } from "./supabase";

type QueueTask = {
  key: string;
  payload: any;
};

type Processor = (payload: any) => Promise<void>;

const processors: Record<string, Processor> = {};
const queue: QueueTask[] = [];
let online = true; // optimistic default
let watcherStarted = false;
let flushing = false;

export const isOnline = () => online;

export const setOnline = (value: boolean) => {
  online = value;
  if (online) void flush();
};

export const registerProcessor = (key: string, fn: Processor) => {
  processors[key] = fn;
};

export const enqueue = (key: string, payload: any) => {
  queue.push({ key, payload });
};

export const flush = async () => {
  if (!online || flushing) return;
  flushing = true;
  try {
    while (queue.length && online) {
      const task = queue.shift()!;
      const processor = processors[task.key];
      if (!processor) continue;
      try {
        await processor(task.payload);
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const code = (e as PostgrestError)?.code;
        const isNetwork = /network|timeout|fetch|503|429/.test(msg) || code === "503" || code === "429";
        if (isNetwork) {
          // Re-enqueue and pause flush
          queue.unshift(task);
          break;
        }
        // Non-network error: drop task to prevent infinite loop
      }
    }
  } finally {
    flushing = false;
  }
};

export const startNetworkWatcher = async () => {
  if (watcherStarted) return;
  watcherStarted = true;
  try {
    // Attempt to use @react-native-community/netinfo if available
    const netinfo = await import("@react-native-community/netinfo").catch(() => null as any);
    if (netinfo && netinfo.default) {
      netinfo.default.addEventListener((state: any) => {
        setOnline(!!state?.isConnected && !!state?.isInternetReachable);
      });
      const initial = await netinfo.default.fetch();
      setOnline(!!initial?.isConnected && !!initial?.isInternetReachable);
    }
  } catch {
    // Ignore watcher errors; rely on manual setOnline/flush or retries
  }
};

// Register default processor for subscription sync
registerProcessor(
  "subscription.sync",
  async (payload: { userId: string; isPremium: boolean; activeSubscriptions: string[]; customerInfo: any }) => {
    if (!checkSupabaseConfig()) return;
    await withSupabaseRetry(async () => {
      // Use user_memberships table to store subscription status
      const { error } = await supabase.from("user_memberships").upsert({
        user_id: payload.userId,
        tier: payload.isPremium ? "plus" : "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    });
  },
);
