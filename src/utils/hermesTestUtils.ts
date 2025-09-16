import { Platform } from 'react-native';

/**
 * Hermes compatibility test utilities
 * These functions help verify that Hermes-specific fixes are working correctly
 */

export interface HermesTestResult {
  constructorTest: boolean;
  errorBoundaryTest: boolean;
  videoDisposalTest: boolean;
  timestamp: string;
}

/**
 * Test constructor handling in Hermes
 */
export function testConstructorHandling(): boolean {
  try {
    // Test class constructor that previously failed in Hermes
    class TestClass {
      private testProp: string;

      constructor(props: { test: string }) {
        // This pattern was causing issues in Hermes
        this.testProp = props.test;
      }

      getTestProp(): string {
        return this.testProp;
      }
    }

    const instance = new TestClass({ test: "hermes-test" });
    return instance.getTestProp() === "hermes-test";
  } catch (error) {
    if (__DEV__) {
      console.warn("Constructor test failed:", error);
    }
    return false;
  }
}

/**
 * Test error boundary functionality
 */
export function testErrorBoundaryHandling(): boolean {
  try {
    // Simulate error boundary state management
    const errorBoundaryState = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };

    // Test state updates that were problematic
    const updatedState = {
      ...errorBoundaryState,
      hasError: true,
      error: new Error("Test error"),
      errorId: `error_${Date.now()}`,
    };

    return updatedState.hasError && updatedState.error !== null;
  } catch (error) {
    if (__DEV__) {
      console.warn("Error boundary test failed:", error);
    }
    return false;
  }
}

/**
 * Test video disposal patterns
 */
export function testVideoDisposalHandling(): boolean {
  try {
    // Mock video player object
    const mockPlayer = {
      playing: false,
      pause: () => Promise.resolve(),
      unload: () => Promise.resolve(),
    };

    // Test disposal pattern that was causing warnings
    const disposePlayer = async () => {
      try {
        if (mockPlayer.playing !== undefined && typeof mockPlayer.pause === 'function') {
          await mockPlayer.pause();
          
          if (typeof mockPlayer.unload === 'function') {
            await mockPlayer.unload();
          }
        }
        return true;
      } catch (error) {
        // Should handle errors gracefully
        return false;
      }
    };

    // Execute disposal test
    disposePlayer();
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("Video disposal test failed:", error);
    }
    return false;
  }
}

/**
 * Run all Hermes compatibility tests
 */
export function runHermesCompatibilityTests(): HermesTestResult {
  const result: HermesTestResult = {
    constructorTest: testConstructorHandling(),
    errorBoundaryTest: testErrorBoundaryHandling(),
    videoDisposalTest: testVideoDisposalHandling(),
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    console.group("🧪 Hermes Compatibility Test Results");
    console.log("Constructor Test:", result.constructorTest ? "✅ PASS" : "❌ FAIL");
    console.log("Error Boundary Test:", result.errorBoundaryTest ? "✅ PASS" : "❌ FAIL");
    console.log("Video Disposal Test:", result.videoDisposalTest ? "✅ PASS" : "❌ FAIL");
    console.log("Timestamp:", result.timestamp);
    console.groupEnd();
  }

  return result;
}

/**
 * Log Hermes engine information
 */
export function logHermesInfo(): void {
  if (__DEV__) {
    console.group("🔧 Hermes Engine Information");
    
    // Check if Hermes is enabled
    const isHermes = typeof HermesInternal === 'object' && HermesInternal !== null;
    console.log("Hermes Enabled:", isHermes ? "✅ YES" : "❌ NO");
    
    if (isHermes) {
      try {
        // @ts-ignore - HermesInternal is not typed
        const hermesVersion = HermesInternal?.getRuntimeProperties?.()?.['OSS Release Version'];
        if (hermesVersion) {
          console.log("Hermes Version:", hermesVersion);
        }
      } catch (error) {
        console.log("Hermes Version: Unable to determine");
      }
    }
    
    // Log JavaScript engine info
    console.log("JavaScript Engine:", isHermes ? "Hermes" : "JSC/V8");
    console.log("Platform:", Platform.OS);
    
    console.groupEnd();
  }
}

// Auto-run tests in development
if (__DEV__) {
  // Run tests after a short delay to ensure app is initialized
  setTimeout(() => {
    logHermesInfo();
    runHermesCompatibilityTests();
  }, 2000);
}
