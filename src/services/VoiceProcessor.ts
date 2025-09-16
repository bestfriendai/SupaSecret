import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { IS_EXPO_GO } from "../utils/environmentCheck";

// Lazy load FFmpeg to prevent Expo Go crashes
let FFmpegKit: any;

const loadFFmpeg = async () => {
  if (IS_EXPO_GO) {
    throw new Error("Voice modification not available in Expo Go");
  }

  try {
    if (!FFmpegKit) {
      FFmpegKit = await import("ffmpeg-kit-react-native");
    }
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    throw new Error("FFmpeg not available");
  }
};

export type VoiceEffect = "deep" | "light" | "none";

export interface VoiceProcessingOptions {
  effect: VoiceEffect;
  onProgress?: (progress: number, status: string) => void;
}

export const useVoiceModification = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await loadFFmpeg();
        onProgress?.(10, "Loading video for audio processing...");

        // Check input file
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) {
          throw new Error("Video file not found");
        }

        // Create output path
        const outputUri = videoUri.replace(/\.(mp4|mov)$/i, `_voice_${effect}.$1`);
        onProgress?.(20, `Applying ${effect} voice effect...`);

        // Configure voice effect parameters
        let pitchFactor: number;
        let effectDescription: string;

        switch (effect) {
          case "deep":
            pitchFactor = 0.8; // Lower pitch by 20%
            effectDescription = "deep voice";
            break;
          case "light":
            pitchFactor = 1.2; // Higher pitch by 20%
            effectDescription = "light voice";
            break;
          default:
            throw new Error(`Unsupported voice effect: ${effect}`);
        }

        onProgress?.(40, `Processing audio with ${effectDescription} effect...`);

        // FFmpeg command for pitch shifting
        // asetrate changes the sample rate, aresample resamples back to original rate
        const voiceCommand = `-i "${videoUri}" -af "asetrate=44100*${pitchFactor},aresample=44100" -c:v copy -y "${outputUri}"`;

        console.log("Executing voice modification command:", voiceCommand);

        const session = await FFmpegKit.FFmpegKit.execute(voiceCommand);
        const returnCode = await session.getReturnCode();

        onProgress?.(70, "Finalizing voice-modified video...");

        if (!FFmpegKit.ReturnCode.isSuccess(returnCode)) {
          const logs = await session.getAllLogsAsString();
          console.error("FFmpeg voice processing failed:", logs);
          throw new Error(`Voice processing failed: ${logs.slice(-200)}`);
        }

        // Verify output file
        const outputInfo = await FileSystem.getInfoAsync(outputUri);
        if (!outputInfo.exists) {
          throw new Error("Voice-processed video not created");
        }

        onProgress?.(100, `${effectDescription} effect applied successfully!`);

        return outputUri;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Voice processing failed:", error);
        setError(errorMessage);

        if (errorMessage.includes("Expo Go")) {
          Alert.alert("Feature Unavailable", "Voice modification requires a development build. Using original audio.");
        } else {
          Alert.alert("Processing Error", `Voice modification failed: ${errorMessage}. Using original audio.`);
        }

        return videoUri; // Return original on error
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Process audio file separately (for preview or audio-only processing)
  const processAudioWithVoiceEffect = useCallback(
    async (audioUri: string, effect: VoiceEffect): Promise<string> => {
      if (effect === "none") return audioUri;

      try {
        await loadFFmpeg();

        const outputUri = audioUri.replace(/\.(m4a|wav|mp3)$/i, `_voice_${effect}.$1`);
        const pitchFactor = effect === "deep" ? 0.8 : 1.2;

        const audioCommand = `-i "${audioUri}" -af "asetrate=44100*${pitchFactor},aresample=44100" -y "${outputUri}"`;

        const session = await FFmpegKit.FFmpegKit.execute(audioCommand);
        const returnCode = await session.getReturnCode();

        if (FFmpegKit.ReturnCode.isSuccess(returnCode)) {
          return outputUri;
        } else {
          throw new Error("Audio processing failed");
        }
      } catch (error) {
        console.error("Audio voice processing failed:", error);
        return audioUri;
      }
    },
    []
  );

  return {
    processVideoWithVoiceEffect,
    processAudioWithVoiceEffect,
    isProcessing,
    error,
  };
};

// Advanced voice effects (for future enhancement)
export const advancedVoiceEffects = {
  robot: {
    filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
    description: "Robot voice effect",
  },
  echo: {
    filter: "aecho=0.8:0.88:60:0.4",
    description: "Echo effect",
  },
  reverb: {
    filter: "afreqshift=shift=0:level=0.5",
    description: "Reverb effect",
  },
};

// Fallback voice processing for Expo Go
export const applyVoiceEffectFallback = async (
  videoUri: string,
  effect: VoiceEffect,
  onProgress?: (progress: number, status: string) => void
): Promise<string> => {
  onProgress?.(0, "Processing voice effect...");

  if (IS_EXPO_GO) {
    onProgress?.(100, "Voice effects not available in Expo Go");
    Alert.alert(
      "Feature Limited",
      "Voice modification requires a development build. Original audio will be used."
    );
    return videoUri;
  }

  // For development builds without FFmpeg, return original
  onProgress?.(100, "Voice processing unavailable - using original audio");
  return videoUri;
};

export default {
  useVoiceModification,
  advancedVoiceEffects,
  applyVoiceEffectFallback,
};