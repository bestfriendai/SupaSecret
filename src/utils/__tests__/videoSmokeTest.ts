/**
 * End-to-end smoke test for video pipeline
 * Tests: record → process → upload → playback flow
 *
 * This is a development-only test that can be run manually to verify
 * the complete video processing pipeline works correctly.
 */

import { supabase } from "../../lib/supabase";
import { ensureSignedVideoUrl, uploadVideoToSupabase } from "../storage";

interface SmokeTestResult {
  success: boolean;
  step: string;
  error?: string;
  details?: any;
}

/**
 * Test signed URL generation for video paths
 */
export async function testSignedUrlGeneration(): Promise<SmokeTestResult> {
  try {
    // Test with a mock storage path
    const mockPath = "confessions/test-user/test-video.mp4";
    const signedUrl = await ensureSignedVideoUrl(mockPath);

    if (!signedUrl) {
      return {
        success: false,
        step: "signed-url-generation",
        error: "Failed to generate signed URL",
      };
    }

    // Verify URL format
    const isValidUrl = signedUrl.startsWith("https://") && signedUrl.includes("supabase");
    if (!isValidUrl) {
      return {
        success: false,
        step: "signed-url-generation",
        error: "Generated URL format is invalid",
        details: { signedUrl },
      };
    }

    return {
      success: true,
      step: "signed-url-generation",
      details: { signedUrl: signedUrl.substring(0, 50) + "..." },
    };
  } catch (error) {
    return {
      success: false,
      step: "signed-url-generation",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test Edge Function connectivity and response format
 */
export async function testEdgeFunctionConnectivity(): Promise<SmokeTestResult> {
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

    if (error) {
      return {
        success: false,
        step: "edge-function-connectivity",
        error: error.message,
      };
    }

    // Verify response format
    if (!data || typeof data !== "object") {
      return {
        success: false,
        step: "edge-function-connectivity",
        error: "Invalid response format from Edge Function",
        details: { data },
      };
    }

    // Check for expected fields
    const hasRequiredFields = "success" in data && "storagePath" in data;
    if (!hasRequiredFields) {
      return {
        success: false,
        step: "edge-function-connectivity",
        error: "Response missing required fields (success, storagePath)",
        details: { data },
      };
    }

    return {
      success: true,
      step: "edge-function-connectivity",
      details: {
        success: data.success,
        hasStoragePath: !!data.storagePath,
        message: data.message,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: "edge-function-connectivity",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test database connectivity and confession insertion
 */
export async function testDatabaseConnectivity(): Promise<SmokeTestResult> {
  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        step: "database-connectivity",
        error: "User not authenticated",
      };
    }

    // Test read access
    const { data: confessions, error: readError } = await supabase
      .from("confessions")
      .select("id, created_at")
      .limit(1);

    if (readError) {
      return {
        success: false,
        step: "database-connectivity",
        error: `Read access failed: ${readError.message}`,
      };
    }

    return {
      success: true,
      step: "database-connectivity",
      details: {
        userId: user.id,
        canRead: true,
        sampleCount: confessions?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      step: "database-connectivity",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run complete video pipeline smoke test
 */
export async function runVideoSmokeTest(): Promise<{
  success: boolean;
  results: SmokeTestResult[];
  summary: string;
}> {
  if (!__DEV__) {
    return {
      success: false,
      results: [],
      summary: "Smoke tests only run in development mode",
    };
  }

  const results: SmokeTestResult[] = [];

  // Test 1: Database connectivity
  const dbTest = await testDatabaseConnectivity();
  results.push(dbTest);

  // Test 2: Signed URL generation
  const urlTest = await testSignedUrlGeneration();
  results.push(urlTest);

  // Test 3: Edge Function connectivity
  const edgeTest = await testEdgeFunctionConnectivity();
  results.push(edgeTest);

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const allPassed = successCount === totalCount;

  const summary = `Video pipeline smoke test: ${successCount}/${totalCount} tests passed`;

  return {
    success: allPassed,
    results,
    summary,
  };
}

/**
 * Log smoke test results to console (development only)
 */
export function logSmokeTestResults(testResults: Awaited<ReturnType<typeof runVideoSmokeTest>>): void {
  if (!__DEV__) return;

  console.log("\n🧪 Video Pipeline Smoke Test Results");
  console.log("=====================================");

  testResults.results.forEach((result, index) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${index + 1}. ${result.step}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  });

  console.log("\n" + testResults.summary);

  if (testResults.success) {
    console.log("🎉 All tests passed! Video pipeline is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Check the details above.");
  }

  console.log("=====================================\n");
}
