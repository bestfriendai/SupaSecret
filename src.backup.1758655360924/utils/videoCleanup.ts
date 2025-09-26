/**
 * Video Cleanup Utilities
 *
 * Utilities for identifying and cleaning up orphaned video entries
 * where database records reference non-existent storage files.
 */

import { supabase } from "../lib/supabase";
import { ensureSignedVideoUrl } from "./storage";

export interface OrphanedVideoEntry {
  id: string;
  video_uri: string | null;
  created_at: string;
  content: string;
}

export interface VideoCleanupReport {
  totalVideoConfessions: number;
  orphanedEntries: OrphanedVideoEntry[];
  validEntries: number;
  cleanupRecommendations: string[];
}

/**
 * Scan the database for video confessions that reference non-existent storage files
 */
export async function scanForOrphanedVideos(): Promise<VideoCleanupReport> {
  try {
    // Get all video confessions from the database
    const { data: videoConfessions, error } = await supabase
      .from("confessions")
      .select("id, video_uri, created_at, content")
      .eq("type", "video")
      .not("video_uri", "is", null);

    if (error) {
      throw new Error(`Failed to fetch video confessions: ${error.message}`);
    }

    const totalVideoConfessions = videoConfessions?.length || 0;
    const orphanedEntries: OrphanedVideoEntry[] = [];
    let validEntries = 0;

    if (videoConfessions && videoConfessions.length > 0) {
      // Check each video confession to see if the file exists
      for (const confession of videoConfessions) {
        const signedUrl = confession.video_uri ? await ensureSignedVideoUrl(confession.video_uri) : null;

        if (!signedUrl) {
          // File doesn't exist in storage
          orphanedEntries.push({
            id: confession.id,
            video_uri: confession.video_uri,
            created_at: confession.created_at,
            content: confession.content?.substring(0, 100) + "..." || "No content",
          });
        } else {
          validEntries++;
        }
      }
    }

    const cleanupRecommendations: string[] = [];

    if (orphanedEntries.length > 0) {
      cleanupRecommendations.push(
        `Found ${orphanedEntries.length} orphaned video entries that reference non-existent files.`,
      );
      cleanupRecommendations.push(
        "Consider running cleanupOrphanedVideos() to remove these entries from the database.",
      );

      if (orphanedEntries.length > totalVideoConfessions * 0.5) {
        cleanupRecommendations.push(
          "⚠️ More than 50% of video entries are orphaned. This suggests a storage migration or cleanup issue.",
        );
      }
    } else {
      cleanupRecommendations.push("✅ All video confessions have valid storage files.");
    }

    return {
      totalVideoConfessions,
      orphanedEntries,
      validEntries,
      cleanupRecommendations,
    };
  } catch (error) {
    console.error("Error scanning for orphaned videos:", error);
    throw error;
  }
}

/**
 * Remove orphaned video entries from the database
 * WARNING: This permanently deletes database records
 */
export async function cleanupOrphanedVideos(dryRun: boolean = true): Promise<{
  deletedCount: number;
  deletedIds: string[];
  errors: string[];
}> {
  try {
    const report = await scanForOrphanedVideos();
    const { orphanedEntries } = report;

    if (orphanedEntries.length === 0) {
      return {
        deletedCount: 0,
        deletedIds: [],
        errors: [],
      };
    }

    const orphanedIds = orphanedEntries.map((entry) => entry.id);

    if (dryRun) {
      console.log("🔍 DRY RUN: Would delete the following orphaned video entries:");
      orphanedEntries.forEach((entry) => {
        console.log(`  - ID: ${entry.id}, Path: ${entry.video_uri}, Created: ${entry.created_at}`);
      });

      return {
        deletedCount: 0,
        deletedIds: orphanedIds,
        errors: [`DRY RUN: Would delete ${orphanedIds.length} entries`],
      };
    }

    // Actually delete the orphaned entries
    const { error } = await supabase.from("confessions").delete().in("id", orphanedIds);

    if (error) {
      throw new Error(`Failed to delete orphaned entries: ${error.message}`);
    }

    console.log(`✅ Successfully deleted ${orphanedIds.length} orphaned video entries`);

    return {
      deletedCount: orphanedIds.length,
      deletedIds: orphanedIds,
      errors: [],
    };
  } catch (error) {
    console.error("Error cleaning up orphaned videos:", error);
    return {
      deletedCount: 0,
      deletedIds: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Development utility to log video cleanup report
 */
export async function logVideoCleanupReport(): Promise<void> {
  if (!__DEV__) {
    console.warn("logVideoCleanupReport() should only be used in development");
    return;
  }

  try {
    console.log("🔍 Scanning for orphaned video entries...");
    const report = await scanForOrphanedVideos();

    console.log("\n📊 Video Cleanup Report:");
    console.log(`  Total video confessions: ${report.totalVideoConfessions}`);
    console.log(`  Valid entries: ${report.validEntries}`);
    console.log(`  Orphaned entries: ${report.orphanedEntries.length}`);

    if (report.orphanedEntries.length > 0) {
      console.log("\n🗑️ Orphaned entries:");
      report.orphanedEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ID: ${entry.id}`);
        console.log(`     Path: ${entry.video_uri}`);
        console.log(`     Created: ${entry.created_at}`);
        console.log(`     Content: ${entry.content}`);
        console.log("");
      });
    }

    console.log("\n💡 Recommendations:");
    report.cleanupRecommendations.forEach((rec) => console.log(`  ${rec}`));

    if (report.orphanedEntries.length > 0) {
      console.log("\n🧹 To clean up orphaned entries:");
      console.log("  import { cleanupOrphanedVideos } from './src/utils/videoCleanup';");
      console.log("  await cleanupOrphanedVideos(true);  // Dry run first");
      console.log("  await cleanupOrphanedVideos(false); // Actually delete");
    }
  } catch (error) {
    console.error("Failed to generate video cleanup report:", error);
  }
}
