#!/usr/bin/env node

/**
 * Video Cleanup Report Script
 * 
 * Generates a report of orphaned video entries in the database
 * and optionally cleans them up.
 * 
 * Usage:
 *   node scripts/video-cleanup-report.js                    # Generate report only
 *   node scripts/video-cleanup-report.js --dry-run          # Show what would be deleted
 *   node scripts/video-cleanup-report.js --cleanup          # Actually delete orphaned entries
 */

const fs = require('fs');
const path = require('path');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Check for required environment variables
const requiredEnvVars = [
  'EXPO_PUBLIC_VIBECODE_SUPABASE_URL',
  'EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   ${varName}`));
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const shouldCleanup = args.includes('--cleanup');

  if (isDryRun && shouldCleanup) {
    console.error('❌ Cannot use both --dry-run and --cleanup flags');
    process.exit(1);
  }

  try {
    // Import the cleanup utilities (this needs to be done after env vars are loaded)
    const { scanForOrphanedVideos, cleanupOrphanedVideos } = require('../src/utils/videoCleanup.ts');

    console.log('🔍 Scanning for orphaned video entries...\n');
    
    const report = await scanForOrphanedVideos();
    
    console.log('📊 Video Cleanup Report:');
    console.log(`   Total video confessions: ${report.totalVideoConfessions}`);
    console.log(`   Valid entries: ${report.validEntries}`);
    console.log(`   Orphaned entries: ${report.orphanedEntries.length}`);
    
    if (report.orphanedEntries.length > 0) {
      console.log('\n🗑️ Orphaned entries:');
      report.orphanedEntries.forEach((entry, index) => {
        console.log(`   ${index + 1}. ID: ${entry.id}`);
        console.log(`      Path: ${entry.video_uri}`);
        console.log(`      Created: ${new Date(entry.created_at).toLocaleString()}`);
        console.log(`      Content: ${entry.content}`);
        console.log('');
      });
    }
    
    console.log('💡 Recommendations:');
    report.cleanupRecommendations.forEach(rec => console.log(`   ${rec}`));
    
    // Handle cleanup operations
    if (isDryRun || shouldCleanup) {
      console.log('\n🧹 Cleanup Operation:');
      
      const cleanupResult = await cleanupOrphanedVideos(isDryRun);
      
      if (isDryRun) {
        console.log(`   DRY RUN: Would delete ${cleanupResult.deletedIds.length} entries`);
        if (cleanupResult.errors.length > 0) {
          console.log('   Errors:', cleanupResult.errors);
        }
      } else if (shouldCleanup) {
        console.log(`   ✅ Deleted ${cleanupResult.deletedCount} orphaned entries`);
        if (cleanupResult.errors.length > 0) {
          console.log('   ❌ Errors:', cleanupResult.errors);
        }
      }
    } else if (report.orphanedEntries.length > 0) {
      console.log('\n🧹 To clean up orphaned entries:');
      console.log('   node scripts/video-cleanup-report.js --dry-run   # Preview deletions');
      console.log('   node scripts/video-cleanup-report.js --cleanup   # Actually delete');
    }
    
  } catch (error) {
    console.error('❌ Error running video cleanup report:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
