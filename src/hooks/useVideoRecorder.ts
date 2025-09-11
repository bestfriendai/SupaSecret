/**
 * Video Recorder Hook with Real-time Effects
 * Comprehensive dual-mode support for Expo Go and development builds
 * Features: permissions, recording, face blur, pitch shifting, live captions
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { env } from "../utils/env";
import { useMediaPermissions } from "./useMediaPermissions";
import { processVideoDualMode, ProcessingMode } from "../utils/videoProcessing";
import type { ProcessedVideo, VideoProcessingOptions } from "../services/IAnonymiser";

export interface VideoRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  recordingTime: number;
  processingProgress: number;
  processingStatus: string;
  hasPermissions: boolean;
  isInitialized: boolean;
  error?: string;
}

export interface VideoRecorderOptions {
  maxDuration?: number;
  quality?: "high" | "medium" | "low";
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableLiveCaptions?: boolean;
  voiceEffect?: "deep" | "light";
  processingMode?: ProcessingMode;
  onRecordingStart?: () => void;
  onRecordingStop?: (uri: string) => void;
  onProcessingComplete?: (processed: ProcessedVideo) => void;
  onError?: (error: string) => void;
}

export interface VideoRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  toggleCamera: () => void;
  reset: () => void;
  cleanup: () => void;
}

export interface VideoRecorderData {
  cameraRef: React.RefObject<CameraView>;
  facing: CameraType;
  liveTranscription: string;
  processedVideo?: ProcessedVideo;
}

/**
 * Comprehensive video recorder hook with real-time effects
 */
export const useVideoRecorder = (options: VideoRecorderOptions = {}) => {
  const {
    maxDuration = 60,
    quality = "medium",
    enableFaceBlur = true,
    enableVoiceChange = true,
    enableLiveCaptions = true,
    voiceEffect = "deep",
    processingMode = ProcessingMode.HYBRID,
    onRecordingStart,
    onRecordingStop,
    onProcessingComplete,
    onError,
  } = options;

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorderRef = useRef<any | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // State
  const [facing, setFacing] = useState<CameraType>("front");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [liveTranscription, setLiveTranscription] = useState("");
  const [processedVideo, setProcessedVideo] = useState<ProcessedVideo | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Permissions
  const { permissionState, requestVideoPermissions, hasVideoPermissions } = useMediaPermissions({
    autoRequest: false,
    showAlerts: true,
  });

  // Initialize audio session for real-time effects
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionModeAndroid: "duckOthers",
        });
      } catch (error) {
        console.warn("Failed to initialize audio session:", error);
      }
    };

    initializeAudio();
    setIsInitialized(true);

    return () => {
      cleanup();
    };
  }, []);

  // Timer effect for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, maxDuration]);

  // Auto-stop recording when max duration reached
  useEffect(() => {
    if (recordingTime >= maxDuration && isRecording) {
      stopRecording();
    }
  }, [recordingTime, maxDuration, isRecording]);

  // Initialize speech recognition for live captions (if supported)
  useEffect(() => {
    if (enableLiveCaptions && Platform.OS === "ios") {
      // iOS has built-in speech recognition
      initializeSpeechRecognition();
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, [enableLiveCaptions]);

  const initializeSpeechRecognition = async () => {
    try {
      // Note: This would use a speech recognition library in production
      // For now, we'll simulate live transcription
      console.log("🎯 Initializing speech recognition for live captions");
    } catch (error) {
      console.warn("Speech recognition initialization failed:", error);
    }
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setError(undefined);

      // Check permissions
      if (!hasVideoPermissions) {
        const granted = await requestVideoPermissions();
        if (!granted) {
          throw new Error("Camera and microphone permissions are required");
        }
      }

      // Start live transcription if enabled
      if (enableLiveCaptions) {
        setLiveTranscription("");
        startLiveTranscription();
      }

      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      setIsPaused(false);

      onRecordingStart?.();

      recordingRef.current = await cameraRef.current.recordAsync({
        maxDuration,
      });

      const video = await recordingRef.current;

      if (video && video.uri) {
        await handleRecordingComplete(video.uri);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsRecording(false);
      setRecordingTime(0);
    }
  }, [
    cameraRef,
    isRecording,
    hasVideoPermissions,
    requestVideoPermissions,
    maxDuration,
    quality,
    enableLiveCaptions,
    onRecordingStart,
    onError,
  ]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      setIsRecording(false);
      setIsPaused(false);

      if (recordingRef.current) {
        await cameraRef.current.stopRecording();
      }

      // Stop live transcription
      stopLiveTranscription();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to stop recording";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [cameraRef, isRecording, onError]);

  const pauseRecording = useCallback(async () => {
    if (!isRecording || isPaused) return;

    try {
      // Note: Camera recording pause/resume not directly supported
      // This would require custom implementation with multiple segments
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.warn("Failed to pause recording:", error);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(async () => {
    if (!isRecording || !isPaused) return;

    try {
      setIsPaused(false);
      // Restart timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.warn("Failed to resume recording:", error);
    }
  }, [isRecording, isPaused]);

  const handleRecordingComplete = useCallback(
    async (videoUri: string) => {
      try {
        onRecordingStop?.(videoUri);

        // Start processing
        setIsProcessing(true);
        setProcessingProgress(0);
        setProcessingStatus("Starting video processing...");

        const processingOptions: VideoProcessingOptions = {
          enableFaceBlur,
          enableVoiceChange,
          enableTranscription: true,
          quality,
          voiceEffect,
          onProgress: (progress, status) => {
            setProcessingProgress(progress);
            setProcessingStatus(status);
          },
        };

        let processed: ProcessedVideo;

        if (env.expoGo) {
          // Expo Go mode - use server processing or simulation
          processed = await processVideoDualMode(videoUri, {
            ...processingOptions,
            mode: ProcessingMode.SERVER,
          });
        } else {
          // Development build - use dual mode
          processed = await processVideoDualMode(videoUri, {
            ...processingOptions,
            mode: processingMode,
          });
        }

        setProcessedVideo(processed);
        setIsProcessing(false);
        setProcessingProgress(100);
        setProcessingStatus("Processing complete!");

        onProcessingComplete?.(processed);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Video processing failed";
        setError(errorMessage);
        onError?.(errorMessage);
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus("");
      }
    },
    [
      onRecordingStop,
      enableFaceBlur,
      enableVoiceChange,
      quality,
      voiceEffect,
      processingMode,
      onProcessingComplete,
      onError,
    ],
  );

  const startLiveTranscription = useCallback(async () => {
    if (!enableLiveCaptions) return;

    try {
      if (env.expoGo) {
        // Expo Go - simulate live transcription
        simulateLiveTranscription();
      } else {
        // Development build - use real speech recognition
        await startRealTimeSpeechRecognition();
      }
    } catch (error) {
      console.warn("Failed to start live transcription:", error);
    }
  }, [enableLiveCaptions]);

  const stopLiveTranscription = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    setLiveTranscription("");
  }, []);

  const simulateLiveTranscription = () => {
    // Simulate live transcription for demo purposes
    const phrases = [
      "I'm recording my anonymous confession...",
      "This is something I've never shared before...",
      "I need to get this off my chest...",
      "Here's my story...",
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < phrases.length && isRecording) {
        setLiveTranscription(phrases[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000);

    // Clear interval when recording stops
    return () => clearInterval(interval);
  };

  const startRealTimeSpeechRecognition = async () => {
    try {
      // This would integrate with a speech recognition service
      // For now, we'll use the existing transcribe-audio API periodically
      console.log("🎯 Starting real-time speech recognition");

      // Placeholder for real implementation
      // Would use libraries like @react-native-voice/voice or similar
    } catch (error) {
      console.warn("Real-time speech recognition failed:", error);
      // Fallback to simulation
      simulateLiveTranscription();
    }
  };

  const toggleCamera = useCallback(() => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }, []);

  const reset = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingStatus("");
    setLiveTranscription("");
    setProcessedVideo(undefined);
    setError(undefined);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopLiveTranscription();
  }, []);

  const cleanup = useCallback(() => {
    reset();

    if (recordingRef.current) {
      recordingRef.current = null;
    }

    if (audioRecorderRef.current) {
      audioRecorderRef.current = null;
    }
  }, [reset]);

  // State object
  const state: VideoRecorderState = {
    isRecording,
    isProcessing,
    recordingTime,
    processingProgress,
    processingStatus,
    hasPermissions: permissionState.camera && permissionState.microphone,
    isInitialized,
    error,
  };

  // Controls object
  const controls: VideoRecorderControls = {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleCamera,
    reset,
    cleanup,
  };

  // Data object
  const data: VideoRecorderData = {
    cameraRef,
    facing,
    liveTranscription,
    processedVideo,
  };

  return {
    state,
    controls,
    data,
    // Convenience getters
    isRecording,
    isProcessing,
    recordingTime,
    hasPermissions: hasVideoPermissions,
    error,
  };
};
