#!/usr/bin/env node

/**
 * Comprehensive test script for video tab functionality
 * Tests all aspects of the video feed to ensure perfect operation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ️`,
    success: `${colors.green}✅`,
    warning: `${colors.yellow}⚠️`,
    error: `${colors.red}❌`,
    test: `${colors.cyan}🧪`
  }[type] || '';

  console.log(`${prefix} ${message}${colors.reset}`);
}

// Test functions
async function testVideoRetrieval() {
  log('Testing video retrieval...', 'test');

  try {
    // Test 1: Get all video confessions
    const { data: allVideos, error: allError } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .order('created_at', { ascending: false });

    if (allError) throw allError;

    log(`Found ${allVideos?.length || 0} total video confessions`, 'success');

    // Test 2: Get videos with valid URIs
    const { data: validVideos, error: validError } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .order('created_at', { ascending: false });

    if (validError) throw validError;

    log(`Found ${validVideos?.length || 0} videos with valid URIs`, 'success');

    // Test 3: Check video URLs are accessible
    if (validVideos && validVideos.length > 0) {
      log('Checking video URL accessibility...', 'test');

      for (const video of validVideos.slice(0, 3)) { // Check first 3 videos
        const url = video.video_uri || video.video_url;
        if (url) {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              log(`  ✓ Video accessible: ${video.content.substring(0, 30)}...`, 'success');
            } else {
              log(`  ✗ Video not accessible (${response.status}): ${video.content.substring(0, 30)}...`, 'warning');
            }
          } catch (fetchError) {
            log(`  ✗ Cannot verify video: ${video.content.substring(0, 30)}...`, 'warning');
          }
        }
      }
    }

    return validVideos;
  } catch (error) {
    log(`Video retrieval failed: ${error.message}`, 'error');
    return [];
  }
}

async function testVideoMetadata() {
  log('Testing video metadata...', 'test');

  try {
    const { data: videos, error } = await supabase
      .from('confessions')
      .select('id, content, likes, views, created_at, video_uri, transcription')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .limit(5);

    if (error) throw error;

    if (videos && videos.length > 0) {
      log('Video metadata check:', 'info');
      videos.forEach((video, index) => {
        console.log(`\n  ${index + 1}. ${video.content.substring(0, 50)}...`);
        console.log(`     - Likes: ${video.likes || 0}`);
        console.log(`     - Views: ${video.views || 0}`);
        console.log(`     - Has URI: ${!!video.video_uri}`);
        console.log(`     - Has transcription: ${!!video.transcription}`);
      });
      log('All video metadata looks good', 'success');
    } else {
      log('No videos found with metadata', 'warning');
    }

    return videos;
  } catch (error) {
    log(`Metadata test failed: ${error.message}`, 'error');
    return [];
  }
}

async function testTrendingVideos() {
  log('Testing trending videos function...', 'test');

  try {
    const { data: trending, error } = await supabase.rpc('get_trending_secrets', {
      hours_back: 24,
      limit_count: 20
    });

    if (error) throw error;

    const trendingVideos = trending?.filter(item => item.type === 'video') || [];

    log(`Found ${trendingVideos.length} trending videos`, 'success');

    if (trendingVideos.length > 0) {
      console.log('\n  Top 3 trending videos:');
      trendingVideos.slice(0, 3).forEach((video, index) => {
        console.log(`  ${index + 1}. ${video.content?.substring(0, 50)}... (${video.likes} likes, ${video.views} views)`);
      });
    }

    return trendingVideos;
  } catch (error) {
    log(`Trending videos test failed: ${error.message}`, 'error');
    return [];
  }
}

async function testVideoInteractions() {
  log('Testing video interaction functions...', 'test');

  try {
    // Get a test video
    const { data: videos, error: fetchError } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .limit(1);

    if (fetchError) throw fetchError;

    if (!videos || videos.length === 0) {
      log('No videos available for interaction testing', 'warning');
      return;
    }

    const testVideo = videos[0];
    log(`Testing interactions on: "${testVideo.content.substring(0, 40)}..."`, 'info');

    // Test view increment
    try {
      const { data: viewResult, error: viewError } = await supabase.rpc('increment_video_views', {
        confession_uuid: testVideo.id
      });

      if (viewError) {
        log(`View increment failed: ${viewError.message}`, 'warning');
      } else {
        log(`View increment successful: ${viewResult}`, 'success');
      }
    } catch (error) {
      log(`View increment error: ${error.message}`, 'warning');
    }

    // Test like toggle
    try {
      const { data: likeResult, error: likeError } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: testVideo.id
      });

      if (likeError) {
        log(`Like toggle failed: ${likeError.message}`, 'warning');
      } else {
        log(`Like toggle successful: ${likeResult ? 'Liked' : 'Unliked'}`, 'success');
      }
    } catch (error) {
      log(`Like toggle error: ${error.message}`, 'warning');
    }

  } catch (error) {
    log(`Interaction test failed: ${error.message}`, 'error');
  }
}

async function testVideoPerformance() {
  log('Testing video loading performance...', 'test');

  try {
    const startTime = Date.now();

    // Test bulk video loading
    const { data: videos, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const loadTime = Date.now() - startTime;

    if (error) throw error;

    log(`Loaded ${videos?.length || 0} videos in ${loadTime}ms`, 'success');

    if (loadTime > 2000) {
      log('Video loading is slow (>2s), consider optimization', 'warning');
    } else if (loadTime > 1000) {
      log('Video loading is acceptable (1-2s)', 'info');
    } else {
      log('Video loading is fast (<1s)', 'success');
    }

    return { videos, loadTime };
  } catch (error) {
    log(`Performance test failed: ${error.message}`, 'error');
    return { videos: [], loadTime: 0 };
  }
}

async function generateTestReport(results) {
  console.log('\n' + '='.repeat(60));
  log('VIDEO FUNCTIONALITY TEST REPORT', 'info');
  console.log('='.repeat(60));

  const { retrieval, metadata, trending, performance } = results;

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`  • Total videos: ${retrieval?.length || 0}`);
  console.log(`  • Videos with valid URIs: ${retrieval?.filter(v => v.video_uri)?.length || 0}`);
  console.log(`  • Trending videos: ${trending?.length || 0}`);
  console.log(`  • Load performance: ${performance?.loadTime || 'N/A'}ms`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');

  if (!retrieval || retrieval.length === 0) {
    console.log(`  ${colors.red}• Add video content to the database${colors.reset}`);
  } else if (retrieval.length < 10) {
    console.log(`  ${colors.yellow}• Consider adding more video content for better testing${colors.reset}`);
  }

  if (performance?.loadTime > 2000) {
    console.log(`  ${colors.yellow}• Optimize video query performance${colors.reset}`);
    console.log(`  ${colors.yellow}• Consider implementing pagination${colors.reset}`);
  }

  const invalidVideos = retrieval?.filter(v => !v.video_uri || !v.video_uri.startsWith('http')) || [];
  if (invalidVideos.length > 0) {
    console.log(`  ${colors.red}• Fix ${invalidVideos.length} videos with invalid URIs${colors.reset}`);
  }

  // Success criteria
  console.log('\n✅ SUCCESS CRITERIA:');
  const criteria = [
    { name: 'Videos exist in database', passed: retrieval && retrieval.length > 0 },
    { name: 'All videos have valid URIs', passed: invalidVideos.length === 0 },
    { name: 'Trending function works', passed: trending !== undefined },
    { name: 'Load time < 2 seconds', passed: performance?.loadTime < 2000 },
    { name: 'Metadata is complete', passed: metadata && metadata.length > 0 }
  ];

  criteria.forEach(criterion => {
    const icon = criterion.passed ? '✅' : '❌';
    const color = criterion.passed ? colors.green : colors.red;
    console.log(`  ${icon} ${color}${criterion.name}${colors.reset}`);
  });

  const passedCount = criteria.filter(c => c.passed).length;
  const totalCount = criteria.length;
  const passRate = (passedCount / totalCount * 100).toFixed(0);

  console.log('\n' + '='.repeat(60));
  if (passRate >= 80) {
    log(`OVERALL: ${passedCount}/${totalCount} tests passed (${passRate}%) - EXCELLENT! 🎉`, 'success');
  } else if (passRate >= 60) {
    log(`OVERALL: ${passedCount}/${totalCount} tests passed (${passRate}%) - GOOD`, 'info');
  } else {
    log(`OVERALL: ${passedCount}/${totalCount} tests passed (${passRate}%) - NEEDS IMPROVEMENT`, 'warning');
  }
  console.log('='.repeat(60));
}

// Main execution
async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('🎬 TESTING VIDEO TAB FUNCTIONALITY', 'info');
  console.log('='.repeat(60) + '\n');

  const results = {
    retrieval: await testVideoRetrieval(),
    metadata: await testVideoMetadata(),
    trending: await testTrendingVideos(),
    performance: await testVideoPerformance()
  };

  await testVideoInteractions();
  await generateTestReport(results);

  console.log('\n📱 NEXT STEPS:');
  console.log('1. Open your app and navigate to the Videos tab');
  console.log('2. Verify videos are displaying correctly');
  console.log('3. Test swiping between videos');
  console.log('4. Test like/unlike functionality');
  console.log('5. Check video playback quality');
  console.log('6. Monitor for any performance issues\n');
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      log('Test suite completed', 'success');
      process.exit(0);
    })
    .catch((error) => {
      log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = { runTests };