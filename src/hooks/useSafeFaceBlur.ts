/**
 * Safe Face Blur Hook
 * Returns null frame processor for now - face blur will be handled server-side
 * This maintains compatibility while we wait for proper implementation
 */

import { useEffect, useState, useMemo } from "react";
import { detectFaceBlurCapabilities, FaceBlurCapabilities } from "../utils/faceBlurCapabilities";

export interface SafeFaceBlurResult {
  frameProcessor: any | null;
  blurStatus: "disabled" | "available" | "active" | "failed";
  blurReason: string;
  canAttemptBlur: boolean;
}

export const useSafeFaceBlur = (enabled: boolean = true): SafeFaceBlurResult => {
  const [capabilities, setCapabilities] = useState<FaceBlurCapabilities | null>(null);

  useEffect(() => {
    detectFaceBlurCapabilities().then(setCapabilities);
  }, []);

  const blurStatus = useMemo(() => {
    if (!enabled) return "disabled";
    if (!capabilities) return "disabled";
    return "available";
  }, [enabled, capabilities]);

  const blurReason = useMemo(() => {
    if (!enabled) return "Blur disabled by user";
    if (!capabilities) return "Checking capabilities...";
    return "Server-side blur will be applied during upload";
  }, [enabled, capabilities]);

  const result: SafeFaceBlurResult = {
    frameProcessor: null,
    blurStatus: blurStatus as "disabled" | "available" | "active" | "failed",
    blurReason,
    canAttemptBlur: true,
  };

  return result;
};
