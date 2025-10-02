/**
 * Modern Voice Processor using react-native-audio-api (Web Audio API)
 * Replaces FFmpegKit with native audio processing
 * Works with Expo and native builds
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as FileSystem from "../utils/legacyFileSystem";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load audio API to prevent issues
let AudioContext: any;
let AudioBufferSourceNode: any;
let GainNode: any;

const loadAudioAPI = async () => {
  try {
    // @ts-ignore - Optional dependency
    const audioAPI = await import("react-native-audio-api");
    AudioContext = audioAPI.AudioContext;
    AudioBufferSourceNode = audioAPI.AudioBufferSourceNode;
    GainNode = audioAPI.GainNode;
    return true;
  } catch (error) {
    console.error("react-native-audio-api not installed. Voice effects will be unavailable.");
    return false;
  }
};

export type VoiceEffect = "deep" | "light" | "none";

export interface VoiceProcessingOptions {
  effect: VoiceEffect;
  onProgress?: (progress: number, status: string) => void;
}

/**
 * Get pitch shift rate for voice effects
 * deep = lower pitch (0.8x speed)
 * light = higher pitch (1.2x speed)
 */
const getPitchShiftRate = (effect: VoiceEffect): number => {
  switch (effect) {
    case "deep":
      return 0.8; // Lower pitch
    case "light":
      return 1.2; // Higher pitch
    case "none":
    default:
      return 1.0; // No change
  }
};

/**
 * Hook for voice modification using Web Audio API
 */
export const useVoiceModification = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process video with voice effect
   * Extracts audio, applies pitch shift, and merges back
   */
  const processVideoWithVoiceEffect = useCallback(
    async (videoUri: string, options: VoiceProcessingOptions): Promise<string> => {
      const { effect, onProgress } = options;

      if (effect === "none") {
        return videoUri; // No processing needed
      }

      setIsProcessing(true);
      setError(null);
      onProgress?.(0, "Initializing voice processing...");

      try {
        await loadAudioAPI();
        onProgress?.(10, "Loading audio...");

        const effectDescription = effect === "deep" ? "deeper" : "lighter";
        const pitchRate = getPitchShiftRate(effect);

        onProgress?.(20, `Preparing ${effectDescription} voice effect...`);

        // Create output path
        const outputUri = videoUri.replace(/\.(mp4|mov)$/i, `_voice_${effect}.$1`);

        onProgress?.(30, "Extracting audio from video...");

        // Extract audio from video
        const audioUri = await extractAudioFromVideo(videoUri);

        onProgress?.(50, `Applying ${effectDescription} voice effect...`);

        // Process audio with pitch shift
        const processedAudioUri = await processAudioWithPitchShift(audioUri, pitchRate, onProgress);

        onProgress?.(80, "Merging processed audio with video...");

        // Merge processed audio back with video
        const finalVideoUri = await mergeAudioWithVideo(videoUri, processedAudioUri, outputUri);

        onProgress?.(100, "Voice processing complete!");

        // Clean up temporary files
        await cleanupTempFiles([audioUri, processedAudioUri]);

        return finalVideoUri;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Voice processing failed:", error);
        setError(errorMessage);

        Alert.alert("Processing Error", `Voice modification failed: ${errorMessage}. Using original audio.`);

        return videoUri;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  /**
   * Process standalone audio file with voice effect
   */
  const processAudioFile = useCallback(
    async (
      audioUri: string,
      effect: VoiceEffect,
      onProgress?: (progress: number, status: string) => void,
    ): Promise<string> => {
      if (effect === "none") {
        return audioUri;
      }

      setIsProcessing(true);
      setError(null);
      onProgress?.(0, "Processing audio...");

      try {
        await loadAudioAPI();

        const pitchRate = getPitchShiftRate(effect);
        const outputUri = audioUri.replace(/\.(m4a|wav|mp3)$/i, `_voice_${effect}.$1`);

        onProgress?.(30, "Applying voice effect...");

        const processedUri = await processAudioWithPitchShift(audioUri, pitchRate, onProgress);

        onProgress?.(100, "Complete!");

        return processedUri;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Audio processing failed:", error);
        setError(errorMessage);
        return audioUri;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    processVideoWithVoiceEffect,
    processAudioFile,
    isProcessing,
    error,
  };
};

/**
 * Extract audio from video file
 * Note: This requires native video processing capabilities
 * For Expo, consider using expo-av or server-side processing
 */
async function extractAudioFromVideo(videoUri: string): Promise<string> {
  // TODO: Implement audio extraction
  // Options:
  // 1. Use expo-av to extract audio track
  // 2. Use native modules (iOS: AVAssetExportSession, Android: MediaExtractor)
  // 3. Server-side processing

  console.warn("Audio extraction not yet implemented. Using placeholder.");

  // For now, return a placeholder path
  const audioUri = videoUri.replace(/\.(mp4|mov)$/i, "_audio.m4a");

  // In production, implement actual extraction here
  throw new Error("Audio extraction not implemented. Consider server-side processing.");
}

/**
 * Process audio with pitch shift using Web Audio API
 */
async function processAudioWithPitchShift(
  audioUri: string,
  pitchRate: number,
  onProgress?: (progress: number, status: string) => void,
): Promise<string> {
  try {
    // Create audio context
    const audioContext = new AudioContext();

    onProgress?.(40, "Loading audio buffer...");

    // Load audio file
    const audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: "base64" as any, // expo-file-system encoding
    });

    // Decode audio data
    const arrayBuffer = base64ToArrayBuffer(audioData);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    onProgress?.(60, "Applying pitch shift...");

    // Create source node
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Apply pitch shift by changing playback rate
    source.playbackRate.value = pitchRate;

    // Create destination for offline rendering
    const offlineContext = new AudioContext({
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: Math.floor(audioBuffer.length / pitchRate),
    });

    const offlineSource = offlineContext.createBufferSource();
    offlineSource.buffer = audioBuffer;
    offlineSource.playbackRate.value = pitchRate;
    offlineSource.connect(offlineContext.destination);

    // Render audio
    offlineSource.start();
    const renderedBuffer = await offlineContext.startRendering();

    onProgress?.(70, "Encoding processed audio...");

    // Convert rendered buffer to file
    const outputUri = audioUri.replace(/\.(m4a|wav|mp3)$/i, "_processed.$1");
    await saveAudioBuffer(renderedBuffer, outputUri);

    return outputUri;
  } catch (error) {
    console.error("Pitch shift processing failed:", error);
    throw error;
  }
}

/**
 * Merge processed audio with original video
 */
async function mergeAudioWithVideo(videoUri: string, audioUri: string, outputUri: string): Promise<string> {
  // TODO: Implement audio/video merging
  // Options:
  // 1. Use native modules (iOS: AVMutableComposition, Android: MediaMuxer)
  // 2. Server-side processing
  // 3. Use a maintained video processing library

  console.warn("Audio/video merging not yet implemented. Using placeholder.");

  // In production, implement actual merging here
  throw new Error("Audio/video merging not implemented. Consider server-side processing.");
}

/**
 * Helper: Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper: Save audio buffer to file
 */
async function saveAudioBuffer(buffer: AudioBuffer, outputUri: string): Promise<void> {
  // TODO: Implement audio buffer encoding and saving
  // This requires converting AudioBuffer to a file format (WAV, M4A, etc.)
  console.warn("Audio buffer saving not yet implemented.");
  throw new Error("Audio buffer saving not implemented.");
}

/**
 * Helper: Clean up temporary files
 */
async function cleanupTempFiles(uris: string[]): Promise<void> {
  for (const uri of uris) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (error) {
      console.warn(`Failed to delete temp file ${uri}:`, error);
    }
  }
}

export default {
  useVoiceModification,
  getPitchShiftRate,
};
