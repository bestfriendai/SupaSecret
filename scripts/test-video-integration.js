#!/usr/bin/env node

/**
 * Integration test for video tab functionality
 * Tests the complete flow from database to UI components
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
  const prefix = {
    info: `${colors.blue}[INFO]`,
    success: `${colors.green}[PASS]`,
    warning: `${colors.yellow}[WARN]`,
    error: `${colors.red}[FAIL]`,
    test: `${colors.cyan}[TEST]`,
    metric: `${colors.magenta}[METRIC]`
  }[type] || '';

  console.log(`${timestamp} ${prefix} ${message}${colors.reset}`);
}

// Integration test suite
class VideoIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      metrics: {}
    };
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}🎬 VIDEO TAB INTEGRATION TEST SUITE${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    const tests = [
      { name: 'Database Connectivity', fn: () => this.testDatabaseConnectivity() },
      { name: 'Video Data Integrity', fn: () => this.testVideoDataIntegrity() },
      { name: 'Video URLs Validation', fn: () => this.testVideoUrls() },
      { name: 'Performance Benchmarks', fn: () => this.testPerformance() },
      { name: 'User Interactions', fn: () => this.testUserInteractions() },
      { name: 'Trending Algorithm', fn: () => this.testTrendingAlgorithm() },
      { name: 'Data Consistency', fn: () => this.testDataConsistency() }
    ];

    for (const test of tests) {
      console.log(`\n${colors.bright}▶ ${test.name}${colors.reset}`);
      console.log('-'.repeat(40));

      try {
        await test.fn();
      } catch (error) {
        log(`${test.name} failed: ${error.message}`, 'error');
        this.results.failed++;
      }
    }

    this.generateReport();
  }

  async testDatabaseConnectivity() {
    log('Checking database connection...', 'test');

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('confessions')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      log(`Database connection failed: ${error.message}`, 'error');
      this.results.failed++;
      return;
    }

    log(`Database connected (${responseTime}ms)`, 'success');
    this.results.passed++;
    this.results.metrics.dbResponseTime = responseTime;

    if (responseTime > 1000) {
      log('Database response time is high', 'warning');
      this.results.warnings++;
    }
  }

  async testVideoDataIntegrity() {
    log('Checking video data integrity...', 'test');

    const { data: videos, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null);

    if (error) {
      log(`Failed to fetch videos: ${error.message}`, 'error');
      this.results.failed++;
      return;
    }

    const issues = [];
    let validCount = 0;

    videos.forEach(video => {
      const hasRequiredFields =
        video.id &&
        video.content &&
        video.video_uri &&
        video.created_at;

      if (!hasRequiredFields) {
        issues.push(`Video ${video.id} missing required fields`);
      } else {
        validCount++;
      }

      // Check for data quality
      if (video.video_uri && !video.video_uri.startsWith('http')) {
        issues.push(`Video ${video.id} has invalid URI format`);
      }

      if (video.likes < 0 || video.views < 0) {
        issues.push(`Video ${video.id} has negative metrics`);
      }
    });

    if (issues.length > 0) {
      issues.forEach(issue => log(issue, 'warning'));
      this.results.warnings += issues.length;
    }

    log(`${validCount}/${videos.length} videos have valid data`, 'success');
    this.results.passed++;
    this.results.metrics.validVideos = validCount;
    this.results.metrics.totalVideos = videos.length;
  }

  async testVideoUrls() {
    log('Validating video URLs...', 'test');

    const { data: videos, error } = await supabase
      .from('confessions')
      .select('id, video_uri, content')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .limit(5);

    if (error) {
      log(`Failed to fetch video URLs: ${error.message}`, 'error');
      this.results.failed++;
      return;
    }

    let accessibleCount = 0;
    let failedUrls = [];

    for (const video of videos) {
      try {
        const response = await fetch(video.video_uri, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok || response.status === 206) { // 206 is partial content (valid for video)
          accessibleCount++;
          log(`✓ ${video.content.substring(0, 30)}...`, 'success');
        } else {
          failedUrls.push({ id: video.id, status: response.status });
          log(`✗ ${video.content.substring(0, 30)}... (${response.status})`, 'warning');
        }
      } catch (error) {
        failedUrls.push({ id: video.id, error: error.message });
        log(`✗ ${video.content.substring(0, 30)}... (Network error)`, 'warning');
      }
    }

    const accessRate = (accessibleCount / videos.length * 100).toFixed(1);
    log(`${accessibleCount}/${videos.length} URLs accessible (${accessRate}%)`,
        accessRate >= 80 ? 'success' : 'warning');

    if (accessRate >= 80) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }

    this.results.metrics.urlAccessibility = accessRate;
  }

  async testPerformance() {
    log('Running performance benchmarks...', 'test');

    const benchmarks = [];

    // Test 1: Single video fetch
    let startTime = Date.now();
    await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .limit(1);
    benchmarks.push({ name: 'Single video fetch', time: Date.now() - startTime });

    // Test 2: Batch fetch (20 videos)
    startTime = Date.now();
    await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .limit(20);
    benchmarks.push({ name: 'Batch fetch (20)', time: Date.now() - startTime });

    // Test 3: Complex query with ordering
    startTime = Date.now();
    await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    benchmarks.push({ name: 'Complex query', time: Date.now() - startTime });

    // Test 4: Trending videos RPC
    startTime = Date.now();
    await supabase.rpc('get_trending_secrets', {
      hours_back: 24,
      limit_count: 10
    });
    benchmarks.push({ name: 'Trending RPC', time: Date.now() - startTime });

    // Analyze results
    benchmarks.forEach(bench => {
      const status = bench.time < 100 ? 'success' :
                     bench.time < 500 ? 'warning' : 'error';
      log(`${bench.name}: ${bench.time}ms`, status);

      if (bench.time < 500) {
        this.results.passed++;
      } else {
        this.results.failed++;
      }
    });

    const avgTime = benchmarks.reduce((sum, b) => sum + b.time, 0) / benchmarks.length;
    this.results.metrics.avgQueryTime = avgTime.toFixed(0);

    log(`Average query time: ${avgTime.toFixed(0)}ms`,
        avgTime < 200 ? 'success' : 'warning');
  }

  async testUserInteractions() {
    log('Testing user interaction functions...', 'test');

    const { data: videos } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .limit(1);

    if (!videos || videos.length === 0) {
      log('No videos available for interaction testing', 'warning');
      this.results.warnings++;
      return;
    }

    const testVideo = videos[0];
    const initialLikes = testVideo.likes || 0;
    const initialViews = testVideo.views || 0;

    // Test view increment
    try {
      const { error: viewError } = await supabase.rpc('increment_video_views', {
        confession_uuid: testVideo.id
      });

      if (viewError) {
        log(`View increment failed: ${viewError.message}`, 'error');
        this.results.failed++;
      } else {
        log('View increment successful', 'success');
        this.results.passed++;
      }
    } catch (error) {
      log(`View increment error: ${error.message}`, 'error');
      this.results.failed++;
    }

    // Test like toggle
    try {
      const { data: likeResult, error: likeError } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: testVideo.id
      });

      if (likeError) {
        log(`Like toggle failed: ${likeError.message}`, 'error');
        this.results.failed++;
      } else {
        log(`Like toggle successful: ${likeResult ? 'Liked' : 'Unliked'}`, 'success');
        this.results.passed++;
      }

      // Toggle back
      await supabase.rpc('toggle_confession_like', {
        confession_uuid: testVideo.id
      });
    } catch (error) {
      log(`Like toggle error: ${error.message}`, 'error');
      this.results.failed++;
    }

    // Verify changes
    const { data: updatedVideo } = await supabase
      .from('confessions')
      .select('likes, views')
      .eq('id', testVideo.id)
      .single();

    if (updatedVideo) {
      const viewsIncreased = updatedVideo.views > initialViews;
      log(`Views ${viewsIncreased ? 'increased' : 'unchanged'}: ${initialViews} → ${updatedVideo.views}`,
          viewsIncreased ? 'success' : 'warning');
    }
  }

  async testTrendingAlgorithm() {
    log('Testing trending algorithm...', 'test');

    try {
      const { data: trending, error } = await supabase.rpc('get_trending_secrets', {
        hours_back: 24,
        limit_count: 20
      });

      if (error) {
        log(`Trending function failed: ${error.message}`, 'error');
        this.results.failed++;
        return;
      }

      const trendingVideos = trending?.filter(item => item.type === 'video') || [];

      log(`Found ${trendingVideos.length} trending videos`, 'success');
      this.results.passed++;

      // Verify trending videos are properly sorted
      let properlyOrdered = true;
      for (let i = 1; i < trendingVideos.length; i++) {
        const prevScore = (trendingVideos[i-1].likes || 0) + (trendingVideos[i-1].views || 0);
        const currScore = (trendingVideos[i].likes || 0) + (trendingVideos[i].views || 0);

        if (prevScore < currScore) {
          properlyOrdered = false;
          break;
        }
      }

      if (properlyOrdered) {
        log('Trending videos are properly ordered', 'success');
        this.results.passed++;
      } else {
        log('Trending videos ordering issue detected', 'warning');
        this.results.warnings++;
      }

      this.results.metrics.trendingVideos = trendingVideos.length;

    } catch (error) {
      log(`Trending test error: ${error.message}`, 'error');
      this.results.failed++;
    }
  }

  async testDataConsistency() {
    log('Checking data consistency...', 'test');

    const { data: videos, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video');

    if (error) {
      log(`Failed to fetch videos: ${error.message}`, 'error');
      this.results.failed++;
      return;
    }

    const inconsistencies = [];

    videos.forEach(video => {
      // Check for logical inconsistencies
      if (video.views < video.likes) {
        inconsistencies.push(`Video ${video.id}: More likes than views`);
      }

      if (video.type === 'video' && !video.video_uri && !video.video_url) {
        inconsistencies.push(`Video ${video.id}: No video URL`);
      }

      if (video.transcription && video.transcription.length > 5000) {
        inconsistencies.push(`Video ${video.id}: Transcription too long`);
      }
    });

    if (inconsistencies.length === 0) {
      log('No data inconsistencies found', 'success');
      this.results.passed++;
    } else {
      inconsistencies.slice(0, 3).forEach(issue => log(issue, 'warning'));
      if (inconsistencies.length > 3) {
        log(`... and ${inconsistencies.length - 3} more issues`, 'warning');
      }
      this.results.warnings += inconsistencies.length;
    }

    this.results.metrics.dataIssues = inconsistencies.length;
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}📊 INTEGRATION TEST REPORT${colors.reset}`);
    console.log('='.repeat(70));

    const total = this.results.passed + this.results.failed;
    const passRate = (this.results.passed / total * 100).toFixed(1);

    console.log('\n📈 TEST RESULTS:');
    console.log(`  ${colors.green}✅ Passed: ${this.results.passed}${colors.reset}`);
    console.log(`  ${colors.red}❌ Failed: ${this.results.failed}${colors.reset}`);
    console.log(`  ${colors.yellow}⚠️  Warnings: ${this.results.warnings}${colors.reset}`);
    console.log(`  📊 Pass Rate: ${passRate}%`);

    console.log('\n⚡ PERFORMANCE METRICS:');
    Object.entries(this.results.metrics).forEach(([key, value]) => {
      const formatted = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`  • ${formatted}: ${value}`);
    });

    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (passRate >= 90) {
      console.log(`  ${colors.green}${colors.bright}EXCELLENT - Video tab is production ready!${colors.reset}`);
    } else if (passRate >= 75) {
      console.log(`  ${colors.blue}${colors.bright}GOOD - Video tab is functional with minor issues${colors.reset}`);
    } else if (passRate >= 60) {
      console.log(`  ${colors.yellow}${colors.bright}FAIR - Video tab needs some improvements${colors.reset}`);
    } else {
      console.log(`  ${colors.red}${colors.bright}POOR - Video tab has critical issues${colors.reset}`);
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Exit code based on results
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the integration tests
const tester = new VideoIntegrationTest();
tester.runAllTests().catch(error => {
  console.error(`${colors.red}Test suite crashed: ${error.message}${colors.reset}`);
  process.exit(1);
});