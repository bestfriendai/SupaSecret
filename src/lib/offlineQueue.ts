// Enhanced offline queue for Supabase mutations with video analytics support
// Attempts to auto-detect connectivity and flush queued tasks when back online

import type { PostgrestError } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, withSupabaseRetry, checkSupabaseConfig } from "./supabase";
import { consentStore } from "../state/consentStore";
import { videoAnalyticsStorage } from "../utils/videoAnalyticsStorage";
import type { VideoEvent } from "../services/VideoDataService";

export enum TaskPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

type QueueTask = {
  key: string;
  payload: any;
  priority?: TaskPriority;
  retryCount?: number;
  timestamp?: number;
  compressed?: boolean;
};

type Processor = (payload: any) => Promise<void>;

interface QueueConfig {
  maxRetries: number;
  batchSize: number;
  compressionThreshold: number;
  wifiOnly?: boolean;
  maxQueueSize: number;
}

const processors: Record<string, Processor> = {};
const queue: QueueTask[] = [];
const config: QueueConfig = {
  maxRetries: 3,
  batchSize: 50,
  compressionThreshold: 100,
  wifiOnly: false,
  maxQueueSize: 1000,
};

let online = true; // optimistic default
let watcherStarted = false;
let flushing = false;
let networkType: "wifi" | "cellular" | "unknown" = "unknown";
let networkUnsubscribe: (() => void) | null = null;

const QUEUE_STORAGE_KEY = "@offline_queue";
const ANALYTICS_BATCH_KEY = "@analytics_batch";

export const isOnline = () => online;

export const setOnline = (value: boolean) => {
  online = value;
  if (online) void flush();
};

export const registerProcessor = (key: string, fn: Processor) => {
  processors[key] = fn;
};

export const enqueue = async (
  key: string,
  payload: any,
  priority: TaskPriority = TaskPriority.NORMAL,
): Promise<void> => {
  // Check queue size limit
  if (queue.length >= config.maxQueueSize) {
    // Remove oldest low-priority tasks
    const lowPriorityIndex = queue.findIndex((t) => (t.priority || TaskPriority.NORMAL) === TaskPriority.LOW);
    if (lowPriorityIndex !== -1) {
      queue.splice(lowPriorityIndex, 1);
    } else {
      console.warn("Queue is full, dropping new task");
      return;
    }
  }

  const task: QueueTask = {
    key,
    payload,
    priority,
    retryCount: 0,
    timestamp: Date.now(),
  };

  // Compress large payloads for analytics
  if (key === "video.analytics.batch" && payload.events?.length > config.compressionThreshold) {
    task.payload = await compressAnalyticsPayload(payload);
    task.compressed = true;
  }

  queue.push(task);

  // Sort by priority
  queue.sort((a, b) => (a.priority || TaskPriority.NORMAL) - (b.priority || TaskPriority.NORMAL));

  // Persist queue to storage
  await persistQueue();

  // Auto-flush if online
  if (online && !flushing) {
    void flush();
  }
};

export const flush = async (): Promise<void> => {
  if (!online || flushing) return;

  // Check network restrictions
  if (config.wifiOnly && networkType !== "wifi") {
    console.log("Waiting for WiFi connection to flush queue");
    return;
  }

  flushing = true;
  try {
    // Process analytics events in batches
    const analyticsTasks = queue.filter((t) => t.key === "video.analytics.batch");
    if (analyticsTasks.length > 0) {
      await flushAnalyticsBatch(analyticsTasks);
    }

    // Process other tasks
    while (queue.length && online) {
      const task = queue.shift()!;

      // Skip analytics tasks already processed
      if (task.key === "video.analytics.batch") continue;

      const processor = processors[task.key];
      if (!processor) continue;

      try {
        // Decompress if needed
        const payload = task.compressed ? await decompressAnalyticsPayload(task.payload) : task.payload;
        await processor(payload);

        // Remove from persistent storage on success
        await persistQueue();
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const code = (e as PostgrestError)?.code;
        const isNetwork = /network|timeout|fetch|503|429/.test(msg) || code === "503" || code === "429";

        if (isNetwork) {
          // Re-enqueue with retry count
          task.retryCount = (task.retryCount || 0) + 1;

          if (task.retryCount < config.maxRetries) {
            queue.unshift(task);
            await persistQueue();
          } else {
            console.warn(`Task ${task.key} failed after ${config.maxRetries} retries`);
            // Store failed tasks for manual recovery
            await storeFailedTask(task);
          }
          break;
        }
        // Non-network error: log and drop task
        console.error(`Non-recoverable error for task ${task.key}:`, e);
      }
    }
  } finally {
    flushing = false;

    // Schedule next flush if queue not empty
    if (queue.length > 0 && online) {
      setTimeout(() => void flush(), 30000); // Retry after 30 seconds
    }
  }
};

// Flush analytics events in optimized batches
async function flushAnalyticsBatch(tasks: QueueTask[]): Promise<void> {
  if (!consentStore.preferences.analytics) {
    // Remove analytics tasks if consent not given
    tasks.forEach((t) => {
      const index = queue.indexOf(t);
      if (index !== -1) queue.splice(index, 1);
    });
    await persistQueue();
    return;
  }

  try {
    // Combine all analytics events
    const allEvents: VideoEvent[] = [];
    const sessionIds = new Set<string>();
    const videoIds = new Set<string>();

    for (const task of tasks) {
      const payload = task.compressed ? await decompressAnalyticsPayload(task.payload) : task.payload;
      if (payload.events) {
        // Ensure each event has videoId in metadata
        const eventsWithVideoId = payload.events.map((e: VideoEvent) => ({
          ...e,
          metadata: { ...(e.metadata || {}), videoId: e.metadata?.videoId || payload.videoId },
        }));
        allEvents.push(...eventsWithVideoId);
        payload.events.forEach((e: VideoEvent) => sessionIds.add(e.sessionId));
        if (payload.videoId) {
          videoIds.add(payload.videoId);
        }
      }
    }

    if (allEvents.length === 0) return;

    // Batch by session and send
    for (const sessionId of sessionIds) {
      const sessionEvents = allEvents.filter((e) => e.sessionId === sessionId);

      // Send in chunks
      for (let i = 0; i < sessionEvents.length; i += config.batchSize) {
        const batch = sessionEvents.slice(i, i + config.batchSize);

        await withSupabaseRetry(async () => {
          const { error } = await supabase.functions.invoke("video-analytics-aggregator", {
            body: {
              sessionId,
              events: batch,
              timestamp: Date.now(),
              videoId: batch[0]?.metadata?.videoId,
            },
          });

          if (error) throw error;
        });
      }
    }

    // Remove processed tasks from queue
    tasks.forEach((t) => {
      const index = queue.indexOf(t);
      if (index !== -1) queue.splice(index, 1);
    });

    // Clear from storage
    try {
      const { VideoDataService } = await import("../services/VideoDataService");
      await VideoDataService.clearPersistedEvents([...videoIds]);
    } catch (error) {
      console.error("Failed to clear persisted events:", error);
    }
    await persistQueue();
  } catch (error) {
    // Silently fail analytics - non-critical
    if (__DEV__) {
      console.warn("Analytics batch upload failed (non-critical):", error);
    }
    // Remove failed tasks to prevent infinite retries
    tasks.forEach((t) => {
      const index = queue.indexOf(t);
      if (index !== -1) queue.splice(index, 1);
    });
    await persistQueue();
  }
}

export const startNetworkWatcher = async () => {
  console.log("[DIAG] offlineQueue.ts: startNetworkWatcher() called, watcherStarted =", watcherStarted);
  if (watcherStarted) return;
  watcherStarted = true;

  // Load persisted queue on startup
  console.log("[DIAG] offlineQueue.ts: About to load persisted queue...");
  try {
    await loadPersistedQueue();
    console.log("[DIAG] offlineQueue.ts: Persisted queue loaded successfully");
  } catch (error) {
    console.error("[DIAG] offlineQueue.ts: Failed to load persisted queue:", error);
    throw error;
  }

  try {
    console.log("[DIAG] offlineQueue.ts: About to import @react-native-community/netinfo...");
    // Attempt to use @react-native-community/netinfo if available
    const netinfo = await import("@react-native-community/netinfo").catch((err) => {
      console.log("[DIAG] offlineQueue.ts: netinfo import failed (expected in some environments):", err);
      return null as any;
    });
    if (netinfo && netinfo.default) {
      // Store unsubscribe function for cleanup
      networkUnsubscribe = netinfo.default.addEventListener((state: any) => {
        const wasOnline = online;
        online = !!state?.isConnected && !!state?.isInternetReachable;
        networkType = state?.type === "wifi" ? "wifi" : state?.type === "cellular" ? "cellular" : "unknown";

        if (!wasOnline && online) {
          // Coming back online - flush queue
          void flush();
        }
      });
      const initial = await netinfo.default.fetch();
      setOnline(!!initial?.isConnected && !!initial?.isInternetReachable);
      networkType = initial?.type === "wifi" ? "wifi" : initial?.type === "cellular" ? "cellular" : "unknown";
    }
  } catch {
    // Ignore watcher errors; rely on manual setOnline/flush or retries
  }
};

// Cleanup function for network watcher
export const stopNetworkWatcher = () => {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
  watcherStarted = false;

  if (__DEV__) {
    console.log("[OfflineQueue] Network watcher stopped");
  }
};

// Configure queue behavior
export const configureQueue = (options: Partial<QueueConfig>): void => {
  Object.assign(config, options);
};

// Get queue statistics
export const getQueueStats = (): {
  queueLength: number;
  byPriority: Record<TaskPriority, number>;
  oldestTask: number | null;
  isOnline: boolean;
  networkType: string;
} => {
  const byPriority: Record<TaskPriority, number> = {
    [TaskPriority.HIGH]: 0,
    [TaskPriority.NORMAL]: 0,
    [TaskPriority.LOW]: 0,
  };

  queue.forEach((task) => {
    byPriority[task.priority || TaskPriority.NORMAL]++;
  });

  const oldestTask = queue.length > 0 ? Math.min(...queue.map((t) => t.timestamp || Date.now())) : null;

  return {
    queueLength: queue.length,
    byPriority,
    oldestTask,
    isOnline: online,
    networkType,
  };
};

// Clear queue (use with caution)
export const clearQueue = async (): Promise<void> => {
  queue.length = 0;
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
};

// Helper functions
async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to persist queue:", error);
  }
}

async function loadPersistedQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const tasks = JSON.parse(stored) as QueueTask[];
      queue.push(...tasks);
      queue.sort((a, b) => (a.priority || TaskPriority.NORMAL) - (b.priority || TaskPriority.NORMAL));
    }
  } catch (error) {
    console.error("Failed to load persisted queue:", error);
  }
}

async function storeFailedTask(task: QueueTask): Promise<void> {
  try {
    const key = `@failed_task_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify(task));
  } catch (error) {
    console.error("Failed to store failed task:", error);
  }
}

async function compressAnalyticsPayload(payload: any): Promise<any> {
  // Simple compression by removing redundant fields
  if (payload.events) {
    return {
      ...payload,
      events: payload.events.map((e: VideoEvent) => ({
        t: e.type,
        ts: e.timestamp,
        s: e.sessionId,
        m: e.metadata,
      })),
    };
  }
  return payload;
}

async function decompressAnalyticsPayload(compressed: any): Promise<any> {
  if (compressed.events && compressed.events[0]?.t !== undefined) {
    return {
      ...compressed,
      events: compressed.events.map((c: any) => ({
        type: c.t,
        timestamp: c.ts,
        sessionId: c.s,
        metadata: c.m,
      })),
    };
  }
  return compressed;
}

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

// Register processor for video analytics batch upload
registerProcessor(
  "video.analytics.batch",
  async (payload: { sessionId: string; events: VideoEvent[]; timestamp: number }) => {
    if (!checkSupabaseConfig() || !consentStore.preferences.analytics) return;

    // This processor is handled specially in flushAnalyticsBatch
    // Individual processing here is a fallback
    try {
      await withSupabaseRetry(async () => {
        const { error } = await supabase.functions.invoke("video-analytics-aggregator", {
          body: payload,
        });

        if (error) throw error;
      });
    } catch (error) {
      // Silently fail analytics - non-critical
      if (__DEV__) {
        console.warn("Analytics upload failed (non-critical):", error);
      }
      // Don't throw - allow task to be removed from queue
    }
  },
);

// Export offlineQueue object for backward compatibility
// NOTE: startNetworkWatcher() is now called from supabase.ts after safe initialization
export const offlineQueue = {
  enqueue,
  flush,
  isOnline,
  setOnline,
  registerProcessor,
  startNetworkWatcher,
  stopNetworkWatcher,
  configureQueue,
  getQueueStats,
  clearQueue,
};
