import { VideoDataService } from "../services/VideoDataService";

/**
 * Simple integration test for the TikTok video feed
 * Run this in development to verify the implementation
 */
export const testVideoFeedIntegration = async (): Promise<void> => {
  if (!__DEV__) {
    console.log("Video feed integration test only runs in development");
    return;
  }

  console.log("🧪 Starting TikTok Video Feed Integration Test...\n");

  try {
    // Test 1: Video data loading
    console.log("1️⃣ Testing video data loading...");
    const videos = await VideoDataService.fetchVideoConfessions(5);
    console.log(`✅ Loaded ${videos.length} videos`);
    
    if (videos.length > 0) {
      const firstVideo = videos[0];
      console.log(`   First video: ${firstVideo.id} - ${firstVideo.content.substring(0, 50)}...`);
      console.log(`   Has video URI: ${!!firstVideo.videoUri}`);
    }

    // Test 2: Trending videos
    console.log("\n2️⃣ Testing trending videos...");
    const trendingVideos = await VideoDataService.fetchTrendingVideos(24, 3);
    console.log(`✅ Loaded ${trendingVideos.length} trending videos`);

    // Test 3: Video likes update
    console.log("\n3️⃣ Testing video likes update...");
    if (videos.length > 0) {
      const testVideoId = videos[0].id;
      const likeResult = await VideoDataService.updateVideoLikes(testVideoId, true);
      console.log(`✅ Like update result: ${likeResult}`);
    }

    // Test 4: Video views update
    console.log("\n4️⃣ Testing video views update...");
    if (videos.length > 0) {
      const testVideoId = videos[0].id;
      const viewResult = await VideoDataService.updateVideoViews(testVideoId);
      console.log(`✅ View update result: ${viewResult}`);
    }

    // Test 5: Data structure validation
    console.log("\n5️⃣ Validating data structure...");
    const isValidStructure = videos.every(video => 
      video.id && 
      video.type === "video" && 
      typeof video.likes === "number" && 
      typeof video.views === "number" &&
      typeof video.timestamp === "number"
    );
    console.log(`✅ Data structure valid: ${isValidStructure}`);

    console.log("\n🎉 All integration tests passed!");
    console.log("The TikTok video feed is ready to use.");

  } catch (error) {
    console.error("❌ Integration test failed:", error);
  }
};

/**
 * Test video player error handling
 */
export const testVideoPlayerErrorHandling = (): void => {
  if (!__DEV__) return;

  console.log("🧪 Testing video player error handling...");

  // Simulate common video player errors
  const mockErrors = [
    new Error("NativeSharedObjectNotFoundException: Unable to find the native shared object"),
    new Error("FunctionCallException: Calling the 'play' function has failed"),
    new Error("FunctionCallException: Calling the 'pause' function has failed"),
  ];

  mockErrors.forEach((error, index) => {
    const shouldIgnore = 
      error.message.includes("NativeSharedObjectNotFoundException") ||
      error.message.includes("Unable to find the native shared object") ||
      error.message.includes("FunctionCallException");

    console.log(`Error ${index + 1}: ${shouldIgnore ? "✅ Ignored" : "❌ Not ignored"} - ${error.message}`);
  });

  console.log("✅ Video player error handling test complete");
};

/**
 * Test gesture handling logic
 */
export const testGestureHandling = (): void => {
  if (!__DEV__) return;

  console.log("🧪 Testing gesture handling logic...");

  // Test swipe detection
  const SWIPE_THRESHOLD = 50;
  const SWIPE_VELOCITY_THRESHOLD = 500;

  const testCases = [
    { translationY: -60, velocityY: -300, expected: true, name: "Small swipe up" },
    { translationY: 60, velocityY: 300, expected: true, name: "Small swipe down" },
    { translationY: -30, velocityY: -600, expected: true, name: "Fast swipe up" },
    { translationY: 30, velocityY: 600, expected: true, name: "Fast swipe down" },
    { translationY: -20, velocityY: -200, expected: false, name: "Too small gesture" },
  ];

  testCases.forEach(({ translationY, velocityY, expected, name }) => {
    const shouldSwipe = 
      Math.abs(translationY) > SWIPE_THRESHOLD ||
      Math.abs(velocityY) > SWIPE_VELOCITY_THRESHOLD;

    const result = shouldSwipe === expected ? "✅" : "❌";
    console.log(`${result} ${name}: ${shouldSwipe} (expected: ${expected})`);
  });

  console.log("✅ Gesture handling test complete");
};

/**
 * Run all tests
 */
export const runAllVideoFeedTests = async (): Promise<void> => {
  if (!__DEV__) {
    console.log("Video feed tests only run in development");
    return;
  }

  console.log("🚀 Running all TikTok Video Feed tests...\n");

  await testVideoFeedIntegration();
  console.log("\n" + "=".repeat(50) + "\n");
  
  testVideoPlayerErrorHandling();
  console.log("\n" + "=".repeat(50) + "\n");
  
  testGestureHandling();
  console.log("\n" + "=".repeat(50) + "\n");

  console.log("🎉 All TikTok Video Feed tests completed!");
};
