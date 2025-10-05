/**
 * Safe Face Blur Hook
 * Provides frame processor with automatic fallback if blur fails
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { detectFaceBlurCapabilities, FaceBlurCapabilities } from "../utils/faceBlurCapabilities";
import { IS_EXPO_GO } from "../utils/environmentCheck";

export interface SafeFaceBlurResult {
  frameProcessor: any | null;
  blurStatus: "disabled" | "available" | "active" | "failed";
  blurReason: string;
  canAttemptBlur: boolean;
}

export const useSafeFaceBlur = (enabled: boolean = true) => {
  const [capabilities, setCapabilities] = useState<FaceBlurCapabilities | null>(null);
  const [blurFailed, setBlurFailed] = useState(false);

  // Detect capabilities on mount
  useEffect(() => {
    detectFaceBlurCapabilities().then(setCapabilities);
  }, []);

  // Determine blur status
  const blurStatus = useMemo(() => {
    if (!enabled) return "disabled";
    if (!capabilities) return "disabled";
    if (blurFailed) return "failed";
    if (!capabilities.canUseRealTimeBlur) return "disabled";
    return "available";
  }, [enabled, capabilities, blurFailed]);

  // Create frame processor if capable
  const frameProcessor = useMemo(() => {
    if (IS_EXPO_GO || !enabled || !capabilities?.canUseRealTimeBlur || blurFailed) {
      return null;
    }

    try {
      // Lazy load modules
      const { useSkiaFrameProcessor } = require("react-native-vision-camera");
      const { useFaceDetector } = require("react-native-vision-camera-face-detector");
      const { Skia, TileMode, ClipOp } = require("@shopify/react-native-skia");

      // Create blur paint
      const blurRadius = 25;
      const blurFilter = Skia.ImageFilter.MakeBlur(blurRadius, blurRadius, TileMode.Repeat, null);
      const paint = Skia.Paint();
      paint.setImageFilter(blurFilter);

      // Get face detector
      const { detectFaces } = useFaceDetector({
        performanceMode: "fast",
        contourMode: "all",
        landmarkMode: "none",
        classificationMode: "none",
      });

      // Create processor
      const processor = useSkiaFrameProcessor(
        (frame: any) => {
          "worklet";

          try {
            // Render original frame first
            frame.render();

            // Detect faces
            const result = detectFaces(frame);
            if (!result?.faces) return;

            // Blur each face
            for (const face of result.faces) {
              if (face.contours != null) {
                const path = Skia.Path.Make();
                const necessaryContours = ["FACE", "LEFT_CHEEK", "RIGHT_CHEEK"] as const;

                for (const key of necessaryContours) {
                  const points = face.contours[key];
                  if (points && points.length > 0) {
                    points.forEach((point: any, index: number) => {
                      if (index === 0) {
                        path.moveTo(point.x, point.y);
                      } else {
                        path.lineTo(point.x, point.y);
                      }
                    });
                    path.close();
                  }
                }

                frame.save();
                frame.clipPath(path, ClipOp.Intersect, true);
                frame.render(paint);
                frame.restore();
              }
            }
          } catch (e) {
            // Silent fail - continue without blur for this frame
          }
        },
        [paint, detectFaces]
      );

      console.log("✅ Face blur frame processor created successfully");
      return processor;
    } catch (error) {
      console.error("❌ Failed to create frame processor:", error);
      setBlurFailed(true);
      return null;
    }
  }, [enabled, capabilities, blurFailed]);

  const result: SafeFaceBlurResult = {
    frameProcessor,
    blurStatus,
    blurReason: capabilities?.reason || "Checking capabilities...",
    canAttemptBlur: capabilities?.canUseRealTimeBlur || false,
  };

  return result;
};
