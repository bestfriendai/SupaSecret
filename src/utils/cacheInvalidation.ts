/**
 * Cache invalidation utilities for cross-store data consistency
 * Manages cache invalidation when data mutations affect multiple stores
 */

export type CacheKey =
  | "confessions"
  | "replies"
  | "notifications"
  | "saved"
  | "trending"
  | "user_likes"
  | "user_preferences"
  | "video_analytics";

export type InvalidationEvent =
  | "confession_created"
  | "confession_updated"
  | "confession_deleted"
  | "confession_liked"
  | "confession_unliked"
  | "confession_saved"
  | "confession_unsaved"
  | "reply_created"
  | "reply_updated"
  | "reply_deleted"
  | "reply_liked"
  | "reply_unliked"
  | "user_preferences_updated"
  | "notification_read"
  | "notification_created";

export interface InvalidationRule {
  event: InvalidationEvent;
  affectedCaches: CacheKey[];
  condition?: (data: any) => boolean;
}

// Define which caches are affected by which events
const INVALIDATION_RULES: InvalidationRule[] = [
  // Confession events
  {
    event: "confession_created",
    affectedCaches: ["confessions", "trending"],
  },
  {
    event: "confession_updated",
    affectedCaches: ["confessions", "saved", "trending"],
  },
  {
    event: "confession_deleted",
    affectedCaches: ["confessions", "saved", "trending", "replies", "user_likes"],
  },
  {
    event: "confession_liked",
    affectedCaches: ["confessions", "user_likes", "trending"],
  },
  {
    event: "confession_unliked",
    affectedCaches: ["confessions", "user_likes", "trending"],
  },
  {
    event: "confession_saved",
    affectedCaches: ["saved"],
  },
  {
    event: "confession_unsaved",
    affectedCaches: ["saved"],
  },

  // Reply events
  {
    event: "reply_created",
    affectedCaches: ["replies", "confessions", "notifications"],
  },
  {
    event: "reply_updated",
    affectedCaches: ["replies"],
  },
  {
    event: "reply_deleted",
    affectedCaches: ["replies", "user_likes", "confessions"],
  },
  {
    event: "reply_liked",
    affectedCaches: ["replies", "user_likes"],
  },
  {
    event: "reply_unliked",
    affectedCaches: ["replies", "user_likes"],
  },

  // Other events
  {
    event: "user_preferences_updated",
    affectedCaches: ["user_preferences"],
  },
  {
    event: "notification_read",
    affectedCaches: ["notifications"],
  },
  {
    event: "notification_created",
    affectedCaches: ["notifications"],
  },
];

// Store invalidation callbacks
type InvalidationCallback = (event: InvalidationEvent, data?: any) => void;
const invalidationCallbacks = new Map<CacheKey, Set<InvalidationCallback>>();

/**
 * Register a callback for cache invalidation events
 */
export const registerInvalidationCallback = (cacheKey: CacheKey, callback: InvalidationCallback): (() => void) => {
  if (!invalidationCallbacks.has(cacheKey)) {
    invalidationCallbacks.set(cacheKey, new Set());
  }

  const callbacks = invalidationCallbacks.get(cacheKey)!;
  callbacks.add(callback);

  // Return unregister function
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      invalidationCallbacks.delete(cacheKey);
    }
  };
};

/**
 * Trigger cache invalidation for a specific event
 */
export const invalidateCache = (event: InvalidationEvent, data?: any): void => {
  if (__DEV__) {
    console.log(`[Cache Invalidation] Event: ${event}`, data);
  }

  // Find all rules that match this event
  const matchingRules = INVALIDATION_RULES.filter((rule) => {
    if (rule.event !== event) return false;
    if (rule.condition && !rule.condition(data)) return false;
    return true;
  });

  // Collect all affected caches
  const affectedCaches = new Set<CacheKey>();
  matchingRules.forEach((rule) => {
    rule.affectedCaches.forEach((cache) => affectedCaches.add(cache));
  });

  // Trigger callbacks for affected caches
  affectedCaches.forEach((cacheKey) => {
    const callbacks = invalidationCallbacks.get(cacheKey);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event, data);
        } catch (error) {
          if (__DEV__) {
            console.error(`[Cache Invalidation] Error in callback for ${cacheKey}:`, error);
          }
        }
      });
    }
  });
};

/**
 * Batch invalidation for multiple events
 */
export const batchInvalidateCache = (events: { event: InvalidationEvent; data?: any }[]): void => {
  const allAffectedCaches = new Set<CacheKey>();
  const eventDataMap = new Map<InvalidationEvent, any[]>();

  // Collect all affected caches and group event data
  events.forEach(({ event, data }) => {
    if (!eventDataMap.has(event)) {
      eventDataMap.set(event, []);
    }
    eventDataMap.get(event)!.push(data);

    const matchingRules = INVALIDATION_RULES.filter((rule) => {
      if (rule.event !== event) return false;
      if (rule.condition && !rule.condition(data)) return false;
      return true;
    });

    matchingRules.forEach((rule) => {
      rule.affectedCaches.forEach((cache) => allAffectedCaches.add(cache));
    });
  });

  if (__DEV__) {
    console.log(`[Cache Invalidation] Batch invalidation for caches:`, Array.from(allAffectedCaches));
  }

  // Trigger callbacks for all affected caches
  allAffectedCaches.forEach((cacheKey) => {
    const callbacks = invalidationCallbacks.get(cacheKey);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          // Call with all events that affect this cache
          const relevantEvents = events.filter(({ event }) =>
            INVALIDATION_RULES.some((rule) => rule.event === event && rule.affectedCaches.includes(cacheKey)),
          );
          relevantEvents.forEach((relevantEvent) => {
            callback(relevantEvent.event, relevantEvent.data);
          });
        } catch (error) {
          if (__DEV__) {
            console.error(`[Cache Invalidation] Error in batch callback for ${cacheKey}:`, error);
          }
        }
      });
    }
  });
};

/**
 * Clear all invalidation callbacks (useful for cleanup)
 */
export const clearAllInvalidationCallbacks = (): void => {
  invalidationCallbacks.clear();
};

/**
 * Get current invalidation rules (useful for debugging)
 */
export const getInvalidationRules = (): InvalidationRule[] => {
  return [...INVALIDATION_RULES];
};

/**
 * Add custom invalidation rule
 */
export const addInvalidationRule = (rule: InvalidationRule): void => {
  INVALIDATION_RULES.push(rule);
};

/**
 * Remove invalidation rule
 */
export const removeInvalidationRule = (event: InvalidationEvent, affectedCaches: CacheKey[]): void => {
  const index = INVALIDATION_RULES.findIndex(
    (rule) =>
      rule.event === event &&
      rule.affectedCaches.length === affectedCaches.length &&
      rule.affectedCaches.every((cache) => affectedCaches.includes(cache)),
  );

  if (index !== -1) {
    INVALIDATION_RULES.splice(index, 1);
  }
};
