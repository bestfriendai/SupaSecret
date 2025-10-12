/**
 * Simplified Face Blur Hook - No Skia
 * Uses standard frame processor without Skia for better stability
 * This approach may have lower performance but should be more stable
 */

import { useEffect, useRef } from "react";

let useFrameProcessor: any = null;
let useFaceDetector: any = null;

try {
  const visionCamera = require("react-native-vision-camera");
  if ("useFrameProcessor" in visionCamera) {
    useFrameProcessor = visionCamera.useFrameProcessor;
    console.log("✅ useFrameProcessor loaded (simple)");
  }

  const faceDetector = require("react-native-vision-camera-face-detector");
  useFaceDetector = faceDetector.useFaceDetector;
  console.log("✅ Face detector loaded (simple)");
} catch (error) {
  console.error("❌ Simple face blur modules not available:", error);
}

export const useSimpleFaceBlur = (enabled: boolean = true) => {
  const frameCountRef = useRef(0);
  const lastLogTimeRef = useRef(Date.now());
  const faceCountRef = useRef(0);

  const isAvailable = useFrameProcessor && useFaceDetector;

  useEffect(() => {
    console.log("🎭 SimpleFaceBlur initialized:", {
      enabled,
      isAvailable,
      hasFrameProcessor: !!useFrameProcessor,
      hasFaceDetector: !!useFaceDetector,
    });
  }, [enabled, isAvailable]);

  const faceDetectorHook = isAvailable
    ? useFaceDetector({
        performanceMode: "fast",
        contourMode: "none",
        landmarkMode: "none",
        classificationMode: "none",
      })
    : null;

  const detectFaces = faceDetectorHook?.detectFaces;

  const frameProcessor =
    isAvailable && enabled && useFrameProcessor && detectFaces
      ? useFrameProcessor(
          (frame: any) => {
            "worklet";
            try {
              frameCountRef.current++;

              const now = Date.now();
              if (now - lastLogTimeRef.current > 3000) {
                const fps = (frameCountRef.current * 1000) / (now - lastLogTimeRef.current);
                console.log(`📊 Simple FP: ${fps.toFixed(1)} FPS, faces detected: ${faceCountRef.current} (last 3s)`);
                lastLogTimeRef.current = now;
                frameCountRef.current = 0;
                faceCountRef.current = 0;
              }

              const faces = detectFaces(frame);

              if (faces && faces.length > 0) {
                faceCountRef.current += faces.length;
              }
            } catch (error) {
              console.error("❌ Simple frame processor error:", error);
            }
          },
          [detectFaces],
        )
      : null;

  useEffect(() => {
    if (frameProcessor) {
      console.log("✅ Simple frame processor created and active");
    } else if (enabled && isAvailable) {
      console.warn("⚠️ Simple frame processor should be active but is null");
    }
  }, [frameProcessor, enabled, isAvailable]);

  return {
    frameProcessor,
    isAvailable,
    isActive: enabled && frameProcessor !== null,
  };
};
