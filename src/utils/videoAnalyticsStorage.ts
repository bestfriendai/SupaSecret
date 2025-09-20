import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoEvent, VideoSession, VideoAnalytics } from '../services/VideoDataService';

const STORAGE_PREFIX = '@video_analytics';
const EVENTS_KEY = `${STORAGE_PREFIX}_events`;
const SESSIONS_KEY = `${STORAGE_PREFIX}_sessions`;
const ANALYTICS_KEY = `${STORAGE_PREFIX}_analytics`;
const METADATA_KEY = `${STORAGE_PREFIX}_metadata`;

const MAX_EVENTS_PER_VIDEO = 1000;
const MAX_SESSIONS = 100;
const MAX_STORAGE_SIZE_MB = 10;
const CLEANUP_INTERVAL_DAYS = 7;
const COMPRESSION_THRESHOLD = 100; // Compress when more than 100 events

export interface StorageMetadata {
  totalSize: number;
  eventCount: number;
  sessionCount: number;
  lastCleanup: number;
  version: string;
}

export interface BatchEventData {
  videoId: string;
  events: VideoEvent[];
  compressed?: boolean;
}

class VideoAnalyticsStorage {
  private storageVersion = '1.0.0';
  private compressionEnabled = true;

  /**
   * Initialize storage and perform cleanup if needed.
   */
  async initialize(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const now = Date.now();
      const daysSinceCleanup = (now - metadata.lastCleanup) / (1000 * 60 * 60 * 24);

      if (daysSinceCleanup >= CLEANUP_INTERVAL_DAYS) {
        await this.performCleanup();
      }

      // Handle version migration if needed
      if (metadata.version !== this.storageVersion) {
        await this.migrateStorage(metadata.version);
      }
    } catch (error) {
      console.error('Failed to initialize video analytics storage:', error);
    }
  }

  /**
   * Store video events with compression and size management.
   */
  async storeEvents(videoId: string, events: VideoEvent[]): Promise<void> {
    try {
      const key = `${EVENTS_KEY}_${videoId}`;
      const existing = await this.getEvents(videoId);
      const combined = [...existing, ...events];

      // Limit events per video
      const limited = combined.slice(-MAX_EVENTS_PER_VIDEO);

      // Compress if threshold exceeded
      const dataToStore = limited.length > COMPRESSION_THRESHOLD
        ? await this.compressEvents(limited)
        : limited;

      await AsyncStorage.setItem(key, JSON.stringify({
        events: dataToStore,
        compressed: limited.length > COMPRESSION_THRESHOLD,
        timestamp: Date.now(),
      }));

      await this.updateMetadata({ eventCount: limited.length });
    } catch (error) {
      console.error('Failed to store video events:', error);
      throw error;
    }
  }

  /**
   * Retrieve video events with decompression if needed.
   */
  async getEvents(videoId: string): Promise<VideoEvent[]> {
    try {
      const key = `${EVENTS_KEY}_${videoId}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return [];

      const data = JSON.parse(stored);

      if (data.compressed) {
        return await this.decompressEvents(data.events);
      }

      return data.events || [];
    } catch (error) {
      console.error('Failed to retrieve video events:', error);
      return [];
    }
  }

  /**
   * Store batch events for multiple videos.
   */
  async storeBatchEvents(batches: BatchEventData[]): Promise<void> {
    try {
      const operations = batches.map(batch => ({
        key: `${EVENTS_KEY}_${batch.videoId}`,
        value: JSON.stringify({
          events: batch.compressed ? batch.events : batch.events,
          compressed: batch.compressed || false,
          timestamp: Date.now(),
        }),
      }));

      await this.multiSet(operations);

      const totalEvents = batches.reduce((sum, batch) => sum + batch.events.length, 0);
      await this.updateMetadata({ eventCount: totalEvents });
    } catch (error) {
      console.error('Failed to store batch events:', error);
      throw error;
    }
  }

  /**
   * Retrieve all pending events for upload.
   */
  async getAllPendingEvents(): Promise<Map<string, VideoEvent[]>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter(k => k.startsWith(EVENTS_KEY));
      const results = new Map<string, VideoEvent[]>();

      for (const key of eventKeys) {
        const videoId = key.replace(`${EVENTS_KEY}_`, '');
        const events = await this.getEvents(videoId);
        if (events.length > 0) {
          results.set(videoId, events);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to retrieve pending events:', error);
      return new Map();
    }
  }

  /**
   * Clear events after successful upload.
   */
  async clearEvents(videoIds: string[]): Promise<void> {
    try {
      const keys = videoIds.map(id => `${EVENTS_KEY}_${id}`);
      await AsyncStorage.multiRemove(keys);
      await this.updateMetadata({ eventCount: 0 });
    } catch (error) {
      console.error('Failed to clear events:', error);
    }
  }

  /**
   * Store video session data.
   */
  async storeSession(session: VideoSession): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      sessions[session.sessionId] = session;

      // Limit total sessions
      const sessionIds = Object.keys(sessions);
      if (sessionIds.length > MAX_SESSIONS) {
        const sortedIds = sessionIds.sort((a, b) =>
          (sessions[b].startTime || 0) - (sessions[a].startTime || 0)
        );
        sortedIds.slice(MAX_SESSIONS).forEach(id => delete sessions[id]);
      }

      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      await this.updateMetadata({ sessionCount: Object.keys(sessions).length });
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  /**
   * Retrieve a specific session.
   */
  async getSession(sessionId: string): Promise<VideoSession | null> {
    try {
      const sessions = await this.getAllSessions();
      return sessions[sessionId] || null;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Retrieve all sessions.
   */
  async getAllSessions(): Promise<Record<string, VideoSession>> {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to retrieve sessions:', error);
      return {};
    }
  }

  /**
   * Store analytics data for a video.
   */
  async storeAnalytics(videoId: string, analytics: VideoAnalytics): Promise<void> {
    try {
      const key = `${ANALYTICS_KEY}_${videoId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        analytics,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to store analytics:', error);
    }
  }

  /**
   * Retrieve analytics data for a video.
   */
  async getAnalytics(videoId: string): Promise<VideoAnalytics | null> {
    try {
      const key = `${ANALYTICS_KEY}_${videoId}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return null;

      const data = JSON.parse(stored);
      return data.analytics;
    } catch (error) {
      console.error('Failed to retrieve analytics:', error);
      return null;
    }
  }

  /**
   * Get storage size and perform cleanup if needed.
   */
  async getStorageInfo(): Promise<{
    sizeInMB: number;
    eventCount: number;
    sessionCount: number;
    needsCleanup: boolean;
  }> {
    try {
      const metadata = await this.getMetadata();
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));

      let totalSize = 0;
      for (const key of analyticsKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const bytes = typeof value === 'string' ? (new TextEncoder().encode(value)).length : 0;
            totalSize += bytes;
          }
        } catch (error) {
          console.warn(`Failed to read analytics key ${key}:`, error);
        }
      }

      const sizeInMB = totalSize / (1024 * 1024);
      const needsCleanup = sizeInMB > MAX_STORAGE_SIZE_MB;

      return {
        sizeInMB,
        eventCount: metadata.eventCount,
        sessionCount: metadata.sessionCount,
        needsCleanup,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        sizeInMB: 0,
        eventCount: 0,
        sessionCount: 0,
        needsCleanup: false,
      };
    }
  }

  /**
   * Perform storage cleanup to remove old data.
   */
  async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const cutoffTime = now - (CLEANUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

      // Clean up old events
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter(k => k.startsWith(EVENTS_KEY));

      for (const key of eventKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.timestamp < cutoffTime) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      // Clean up old sessions
      const sessions = await this.getAllSessions();
      const filteredSessions: Record<string, VideoSession> = {};

      Object.entries(sessions).forEach(([id, session]) => {
        if ((session.startTime || 0) >= cutoffTime) {
          filteredSessions[id] = session;
        }
      });

      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));

      // Update metadata
      await this.updateMetadata({
        lastCleanup: now,
        sessionCount: Object.keys(filteredSessions).length,
      });
    } catch (error) {
      console.error('Failed to perform cleanup:', error);
    }
  }

  /**
   * Clear all analytics data.
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(analyticsKeys);
      await this.initializeMetadata();
    } catch (error) {
      console.error('Failed to clear all analytics data:', error);
    }
  }

  /**
   * Export analytics data for backup.
   */
  async exportData(): Promise<{
    events: Map<string, VideoEvent[]>;
    sessions: Record<string, VideoSession>;
    analytics: Map<string, VideoAnalytics>;
    metadata: StorageMetadata;
  }> {
    try {
      const events = await this.getAllPendingEvents();
      const sessions = await this.getAllSessions();
      const metadata = await this.getMetadata();

      // Get all analytics
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(k => k.startsWith(ANALYTICS_KEY));
      const analytics = new Map<string, VideoAnalytics>();

      for (const key of analyticsKeys) {
        const videoId = key.replace(`${ANALYTICS_KEY}_`, '');
        const data = await this.getAnalytics(videoId);
        if (data) {
          analytics.set(videoId, data);
        }
      }

      return {
        events,
        sessions,
        analytics,
        metadata,
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import analytics data from backup.
   */
  async importData(data: {
    events: Map<string, VideoEvent[]>;
    sessions: Record<string, VideoSession>;
    analytics: Map<string, VideoAnalytics>;
  }): Promise<void> {
    try {
      // Import events
      for (const [videoId, events] of data.events.entries()) {
        await this.storeEvents(videoId, events);
      }

      // Import sessions
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));

      // Import analytics
      for (const [videoId, analytics] of data.analytics.entries()) {
        await this.storeAnalytics(videoId, analytics);
      }

      await this.updateMetadata({
        sessionCount: Object.keys(data.sessions).length,
      });
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // Private helper methods

  private async compressEvents(events: VideoEvent[]): Promise<any> {
    // Simple compression by removing redundant fields
    return events.map(e => ({
      t: e.type,
      ts: e.timestamp,
      s: e.sessionId,
      m: e.metadata,
    }));
  }

  private async decompressEvents(compressed: any[]): Promise<VideoEvent[]> {
    return compressed.map(c => ({
      type: c.t,
      timestamp: c.ts,
      sessionId: c.s,
      metadata: c.m,
    } as VideoEvent));
  }

  private async getMetadata(): Promise<StorageMetadata> {
    try {
      const stored = await AsyncStorage.getItem(METADATA_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get metadata:', error);
    }

    return this.initializeMetadata();
  }

  private async initializeMetadata(): Promise<StorageMetadata> {
    const metadata: StorageMetadata = {
      totalSize: 0,
      eventCount: 0,
      sessionCount: 0,
      lastCleanup: Date.now(),
      version: this.storageVersion,
    };

    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    return metadata;
  }

  private async updateMetadata(updates: Partial<StorageMetadata>): Promise<void> {
    try {
      const current = await this.getMetadata();
      const updated = { ...current, ...updates };
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }

  private async migrateStorage(fromVersion: string): Promise<void> {
    // Handle storage migration between versions
    console.log(`Migrating storage from version ${fromVersion} to ${this.storageVersion}`);
    // Add migration logic here when needed
  }

  private async multiSet(operations: { key: string; value: string }[]): Promise<void> {
    const pairs = operations.map(op => [op.key, op.value] as [string, string]);
    await AsyncStorage.multiSet(pairs);
  }
}

export const videoAnalyticsStorage = new VideoAnalyticsStorage();

// Initialize storage on module load
videoAnalyticsStorage.initialize();