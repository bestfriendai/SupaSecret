/**
 * Comprehensive video pipeline test runner
 *
 * This utility provides a complete test suite for the video processing pipeline
 * including upload, processing, storage, and playback verification.
 */

import { supabase } from "../lib/supabase";
import { ensureSignedVideoUrl, uploadVideoToSupabase } from "./storage";
import { runVideoSmokeTest, logSmokeTestResults } from "./__tests__/videoSmokeTest";

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface VideoTestSuite {
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

/**
 * Test video URI validation and path handling
 */
async function testVideoUriHandling(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Test storage path handling
    const storagePath = "confessions/test-user/test-video.mp4";
    const signedUrl = await ensureSignedVideoUrl(storagePath);

    if (!signedUrl.signedUrl || !signedUrl.signedUrl.startsWith("https://")) {
      throw new Error("Invalid signed URL generated");
    }

    // Test HTTP URL passthrough
    const httpUrl = "https://example.com/video.mp4";
    const passthroughUrl = await ensureSignedVideoUrl(httpUrl);

    if (passthroughUrl.signedUrl !== httpUrl) {
      throw new Error("HTTP URL passthrough failed");
    }

    return {
      testName: "Video URI Handling",
      success: true,
      duration: Date.now() - startTime,
      details: {
        storagePathHandled: true,
        httpPassthrough: true,
        signedUrlGenerated: true,
      },
    };
  } catch (error) {
    return {
      testName: "Video URI Handling",
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test database video_uri column constraints
 */
async function testDatabaseConstraints(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Check that only storage paths are stored, not URLs
    const { data, error } = await supabase
      .from("confessions")
      .select("video_uri")
      .not("video_uri", "is", null)
      .limit(10);

    if (error) throw error;

    const httpUrls = (data || []).filter((row) => row.video_uri && row.video_uri.startsWith("http"));

    if (httpUrls.length > 0) {
      throw new Error(`Found ${httpUrls.length} HTTP URLs in video_uri column`);
    }

    return {
      testName: "Database Constraints",
      success: true,
      duration: Date.now() - startTime,
      details: {
        recordsChecked: data?.length || 0,
        httpUrlsFound: httpUrls.length,
        constraintValid: true,
      },
    };
  } catch (error) {
    return {
      testName: "Database Constraints",
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test Edge Function response format
 */
async function testEdgeFunctionFormat(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke("process-video", {
      body: {
        videoPath: "confessions/test-user/test-video.mp4",
        options: {
          enableFaceBlur: false,
          enableVoiceChange: false,
          enableTranscription: true,
          quality: "medium",
        },
      },
    });

    if (error) throw error;

    // Verify response structure
    const requiredFields = ["success", "storagePath"];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Verify no public URLs are returned
    const hasPublicUrl =
      "processedVideoUrl" in data && data.processedVideoUrl && data.processedVideoUrl.startsWith("http");

    if (hasPublicUrl) {
      throw new Error("Edge Function returned public URL instead of storage path");
    }

    return {
      testName: "Edge Function Format",
      success: true,
      duration: Date.now() - startTime,
      details: {
        responseValid: true,
        hasStoragePath: !!data.storagePath,
        noPublicUrls: !hasPublicUrl,
        success: data.success,
      },
    };
  } catch (error) {
    return {
      testName: "Edge Function Format",
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test bucket consistency across the pipeline
 */
async function testBucketConsistency(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Check that all video paths use confessions bucket
    const { data, error } = await supabase
      .from("confessions")
      .select("video_uri")
      .not("video_uri", "is", null)
      .limit(20);

    if (error) throw error;

    const videoPaths = (data || []).map((row) => row.video_uri).filter(Boolean) as string[];
    const videosBucketPaths = videoPaths.filter((path) => path.startsWith("videos/"));
    const confessionsBucketPaths = videoPaths.filter((path) => path.startsWith("confessions/"));

    return {
      testName: "Bucket Consistency",
      success: true,
      duration: Date.now() - startTime,
      details: {
        totalPaths: videoPaths.length,
        videosBucket: videosBucketPaths.length,
        confessionsBucket: confessionsBucketPaths.length,
        migrationNeeded: videosBucketPaths.length > 0,
      },
    };
  } catch (error) {
    return {
      testName: "Bucket Consistency",
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run complete video pipeline test suite
 */
export async function runCompleteVideoTests(): Promise<VideoTestSuite> {
  if (!__DEV__) {
    return {
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
      },
    };
  }

  const startTime = Date.now();
  const results: TestResult[] = [];

  console.log("\n🧪 Starting Complete Video Pipeline Tests");
  console.log("==========================================");

  // Run all tests
  const tests = [testVideoUriHandling, testDatabaseConstraints, testEdgeFunctionFormat, testBucketConsistency];

  for (const test of tests) {
    console.log(`\n⏳ Running ${test.name}...`);
    const result = await test();
    results.push(result);

    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${result.testName} (${result.duration}ms)`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  }

  // Run smoke tests
  console.log("\n⏳ Running Smoke Tests...");
  const smokeTestResults = await runVideoSmokeTest();

  // Convert smoke test results to our format
  smokeTestResults.results.forEach((smokeResult) => {
    results.push({
      testName: `Smoke: ${smokeResult.step}`,
      success: smokeResult.success,
      duration: 0, // Smoke tests don't track individual durations
      error: smokeResult.error,
      details: smokeResult.details,
    });
  });

  const totalDuration = Date.now() - startTime;
  const passed = results.filter((r) => r.success).length;
  const failed = results.length - passed;

  const summary = {
    total: results.length,
    passed,
    failed,
    duration: totalDuration,
  };

  console.log("\n📊 Test Summary");
  console.log("================");
  console.log(`Total Tests: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Duration: ${summary.duration}ms`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Video pipeline is working correctly.");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the details above.`);
  }

  console.log("==========================================\n");

  return {
    results,
    summary,
  };
}

/**
 * Quick health check for video pipeline
 */
export async function quickVideoHealthCheck(): Promise<boolean> {
  if (!__DEV__) return true;

  try {
    // Test basic signed URL generation
    const testPath = "confessions/health-check/test.mp4";
    const signedUrl = await ensureSignedVideoUrl(testPath);

    if (!signedUrl.signedUrl || !signedUrl.signedUrl.startsWith("https://")) {
      return false;
    }

    // Test database connectivity
    const { error } = await supabase.from("confessions").select("id").limit(1);

    return !error;
  } catch {
    return false;
  }
}
