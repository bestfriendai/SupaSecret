/**
 * Hermes Compatibility Utilities
 * Basic compatibility checks and polyfills for Hermes runtime
 */

// Check if we're running on Hermes
const isHermes = () => {
  return typeof HermesInternal === "object" && HermesInternal !== null;
};

// Log Hermes status for debugging
if (__DEV__) {
  console.log("[Hermes] Runtime detected:", isHermes());
}

// Basic global polyfills for Hermes compatibility
if (typeof global !== "undefined") {
  // Ensure global.performance exists for timing operations
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
    } as any;
  }

  // Ensure global.requestAnimationFrame exists
  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return setTimeout(callback, 16); // ~60fps
    };
  }
}

export {};
