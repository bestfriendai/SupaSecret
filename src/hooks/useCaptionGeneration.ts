/**
 * Hook for generating captions from video
 * Handles transcription, caching, and error states
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { generateCaptions, saveCaptionData, loadCaptionData, type CaptionData } from "../services/CaptionGenerator";

export interface UseCaptionGenerationResult {
  captionData: CaptionData | null;
  isGenerating: boolean;
  error: string | null;
  progress: number;
  progressStatus: string;
  generateCaptionsForVideo: (videoUri: string, forceRegenerate?: boolean) => Promise<void>;
  clearCaptions: () => void;
}

export function useCaptionGeneration(): UseCaptionGenerationResult {
  const [captionData, setCaptionData] = useState<CaptionData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");

  const generateCaptionsForVideo = useCallback(async (videoUri: string, forceRegenerate = false) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setProgressStatus("Starting...");

    try {
      // Check if captions already exist
      const captionUri = videoUri.replace(/\.(mp4|mov)$/i, ".captions.json");

      if (!forceRegenerate) {
        setProgressStatus("Checking for existing captions...");
        const existingCaptions = await loadCaptionData(captionUri);

        if (existingCaptions) {
          setCaptionData(existingCaptions);
          setProgress(100);
          setProgressStatus("Captions loaded!");
          setIsGenerating(false);
          return;
        }
      }

      // Extract audio from video (use video URI directly for now)
      // Whisper API accepts video files
      setProgressStatus("Generating captions...");

      const captions = await generateCaptions(videoUri, (prog, status) => {
        setProgress(prog);
        setProgressStatus(status);
      });

      // Save captions for future use
      await saveCaptionData(captions, videoUri);

      setCaptionData(captions);
      setProgressStatus("Complete!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate captions";
      console.error("Caption generation error:", err);
      setError(errorMessage);
      Alert.alert("Caption Error", errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearCaptions = useCallback(() => {
    setCaptionData(null);
    setError(null);
    setProgress(0);
    setProgressStatus("");
  }, []);

  return {
    captionData,
    isGenerating,
    error,
    progress,
    progressStatus,
    generateCaptionsForVideo,
    clearCaptions,
  };
}
