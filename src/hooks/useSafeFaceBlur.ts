/**
 * Safe Face Blur Hook
 * Provides frame processor with automatic fallback if blur fails
 *
 * IMPORTANT: This hook does NOT call useSkiaFrameProcessor or useFaceDetector
 * because those are hooks and cannot be called conditionally. Instead, we
 * simply detect capabilities and return null if blur is not available.
 */

import { useEffect, useState, useMemo } from "react";
import { detectFaceBlurCapabilities, FaceBlurCapabilities } from "../utils/faceBlurCapabilities";
import { IS_EXPO_GO } from "../utils/environmentCheck";

export interface SafeFaceBlurResult {
  frameProcessor: any | null;
  blurStatus: "disabled" | "available" | "active" | "failed";
  blurReason: string;
  canAttemptBlur: boolean;
}

export const useSafeFaceBlur = (enabled: boolean = true): SafeFaceBlurResult => {
  const [capabilities, setCapabilities] = useState<FaceBlurCapabilities | null>(null);

  // Detect capabilities on mount
  useEffect(() => {
    detectFaceBlurCapabilities().then(setCapabilities);
  }, []);

  // Determine blur status
  const blurStatus = useMemo(() => {
    if (!enabled) return "disabled";
    if (!capabilities) return "disabled";
    if (!capabilities.canUseRealTimeBlur) return "disabled";
    return "disabled"; // Always disabled for now since New Arch is off
  }, [enabled, capabilities]);

  // Determine reason
  const blurReason = useMemo(() => {
    if (!enabled) return "Blur disabled by user";
    if (!capabilities) return "Checking capabilities...";
    return capabilities.reason;
  }, [enabled, capabilities]);

  const result: SafeFaceBlurResult = {
    frameProcessor: null, // Always null - no frame processor until New Arch enabled
    blurStatus,
    blurReason,
    canAttemptBlur: capabilities?.canUseRealTimeBlur || false,
  };

  return result;
};
