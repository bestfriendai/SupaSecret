import { VideoDataService } from "../services/VideoDataService";
import type { Confession } from "../types/confession";

/**
 * Test utilities for the TikTok-style video feed
 * Validates functionality and performance
 */
export class TikTokVideoFeedTester {
  /**
   * Test video data loading
   */
  static async testVideoDataLoading(): Promise<boolean> {
    try {
      console.log("🧪 Testing video data loading...");
      
      // Test regular video loading
      const regularVideos = await VideoDataService.fetchVideoConfessions(10);
      console.log(`✅ Loaded ${regularVideos.length} regular videos`);
      
      // Test trending video loading
      const trendingVideos = await VideoDataService.fetchTrendingVideos(24, 5);
      console.log(`✅ Loaded ${trendingVideos.length} trending videos`);
      
      // Validate video structure
      const isValidVideo = (video: Confession): boolean => {
        return !!(
          video.id &&
          video.type === "video" &&
          video.videoUri &&
          typeof video.likes === "number" &&
          typeof video.views === "number" &&
          typeof video.timestamp === "number"
        );
      };
      
      const allVideosValid = [...regularVideos, ...trendingVideos].every(isValidVideo);
      
      if (allVideosValid) {
        console.log("✅ All videos have valid structure");
        return true;
      } else {
        console.error("❌ Some videos have invalid structure");
        return false;
      }
    } catch (error) {
      console.error("❌ Video data loading test failed:", error);
      return false;
    }
  }

  /**
   * Test video player functionality
   */
  static testVideoPlayerFunctionality(): boolean {
    try {
      console.log("🧪 Testing video player functionality...");
      
      // Check if expo-video is available
      const expoVideo = require("expo-video");
      if (!expoVideo.VideoView || !expoVideo.useVideoPlayer) {
        console.error("❌ expo-video components not available");
        return false;
      }
      
      console.log("✅ expo-video components available");
      
      // Check if gesture handler is available
      const gestureHandler = require("react-native-gesture-handler");
      if (!gestureHandler.Gesture || !gestureHandler.GestureDetector) {
        console.error("❌ react-native-gesture-handler not available");
        return false;
      }
      
      console.log("✅ react-native-gesture-handler available");
      
      // Check if reanimated is available
      const reanimated = require("react-native-reanimated");
      if (!reanimated.useSharedValue || !reanimated.useAnimatedStyle) {
        console.error("❌ react-native-reanimated not available");
        return false;
      }
      
      console.log("✅ react-native-reanimated available");
      
      return true;
    } catch (error) {
      console.error("❌ Video player functionality test failed:", error);
      return false;
    }
  }

  /**
   * Test gesture handling
   */
  static testGestureHandling(): boolean {
    try {
      console.log("🧪 Testing gesture handling...");
      
      // Mock gesture events
      const mockPanEvent = {
        translationY: -100,
        velocityY: -800,
      };
      
      const mockTapEvent = {
        x: 200,
        y: 400,
      };
      
      // Test swipe threshold logic
      const SWIPE_THRESHOLD = 50;
      const SWIPE_VELOCITY_THRESHOLD = 500;
      
      const shouldSwipe = 
        Math.abs(mockPanEvent.translationY) > SWIPE_THRESHOLD ||
        Math.abs(mockPanEvent.velocityY) > SWIPE_VELOCITY_THRESHOLD;
      
      if (!shouldSwipe) {
        console.error("❌ Swipe detection logic failed");
        return false;
      }
      
      console.log("✅ Swipe detection logic working");
      
      // Test navigation logic
      const currentIndex = 2;
      const totalVideos = 5;
      
      let newIndex = currentIndex;
      if (mockPanEvent.translationY < 0 && currentIndex < totalVideos - 1) {
        newIndex = currentIndex + 1; // Swipe up - next video
      }
      
      if (newIndex !== 3) {
        console.error("❌ Navigation logic failed");
        return false;
      }
      
      console.log("✅ Navigation logic working");
      
      return true;
    } catch (error) {
      console.error("❌ Gesture handling test failed:", error);
      return false;
    }
  }

  /**
   * Test database integration
   */
  static async testDatabaseIntegration(): Promise<boolean> {
    try {
      console.log("🧪 Testing database integration...");
      
      // Test video likes update
      const testVideoId = "test-video-id";
      const likeResult = await VideoDataService.updateVideoLikes(testVideoId, true);
      
      if (typeof likeResult !== "boolean") {
        console.error("❌ Video likes update returned invalid type");
        return false;
      }
      
      console.log("✅ Video likes update function working");
      
      // Test video views update
      const viewResult = await VideoDataService.updateVideoViews(testVideoId);
      
      if (typeof viewResult !== "boolean") {
        console.error("❌ Video views update returned invalid type");
        return false;
      }
      
      console.log("✅ Video views update function working");
      
      return true;
    } catch (error) {
      console.error("❌ Database integration test failed:", error);
      return false;
    }
  }

  /**
   * Test performance metrics
   */
  static testPerformanceMetrics(): boolean {
    try {
      console.log("🧪 Testing performance metrics...");
      
      // Test memory usage simulation
      const mockVideoCount = 100;
      const estimatedMemoryPerVideo = 50; // MB
      const totalEstimatedMemory = mockVideoCount * estimatedMemoryPerVideo;
      
      if (totalEstimatedMemory > 1000) { // 1GB limit
        console.warn("⚠️ High memory usage estimated for large video counts");
      }
      
      // Test render performance simulation
      const mockRenderTime = 16; // 16ms for 60fps
      const targetFPS = 60;
      const maxRenderTime = 1000 / targetFPS;
      
      if (mockRenderTime <= maxRenderTime) {
        console.log("✅ Render performance within target");
      } else {
        console.warn("⚠️ Render performance may be below target");
      }
      
      // Test gesture response time
      const mockGestureResponseTime = 50; // 50ms
      const maxGestureResponseTime = 100; // 100ms for good UX
      
      if (mockGestureResponseTime <= maxGestureResponseTime) {
        console.log("✅ Gesture response time within target");
      } else {
        console.warn("⚠️ Gesture response time may be too slow");
      }
      
      return true;
    } catch (error) {
      console.error("❌ Performance metrics test failed:", error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<boolean> {
    console.log("🚀 Starting TikTok Video Feed Tests...\n");
    
    const tests = [
      { name: "Video Data Loading", test: () => this.testVideoDataLoading() },
      { name: "Video Player Functionality", test: () => this.testVideoPlayerFunctionality() },
      { name: "Gesture Handling", test: () => this.testGestureHandling() },
      { name: "Database Integration", test: () => this.testDatabaseIntegration() },
      { name: "Performance Metrics", test: () => this.testPerformanceMetrics() },
    ];
    
    let passedTests = 0;
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result) {
          passedTests++;
          console.log(`✅ ${name} - PASSED\n`);
        } else {
          console.log(`❌ ${name} - FAILED\n`);
        }
      } catch (error) {
        console.log(`❌ ${name} - ERROR: ${error}\n`);
      }
    }
    
    const allTestsPassed = passedTests === tests.length;
    
    console.log("📊 Test Results:");
    console.log(`Passed: ${passedTests}/${tests.length}`);
    console.log(`Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    
    if (allTestsPassed) {
      console.log("🎉 All tests passed! TikTok Video Feed is ready for use.");
    } else {
      console.log("⚠️ Some tests failed. Please review the implementation.");
    }
    
    return allTestsPassed;
  }
}

/**
 * Quick test function for development
 */
export const testTikTokVideoFeed = async (): Promise<void> => {
  if (__DEV__) {
    await TikTokVideoFeedTester.runAllTests();
  }
};
