/**
 * Real-Time Transcription Service
 * Uses on-device speech recognition for live transcription during video recording
 * Supports both iOS (Speech framework) and Android (Speech Recognition API)
 */

import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";

// Try to import @react-native-voice/voice if available
let Voice: any = null;
let isVoiceAvailable = false;

const loadVoiceModule = async () => {
  try {
    Voice = await import("@react-native-voice/voice");
    isVoiceAvailable = true;
    return true;
  } catch (error) {
    console.log("Voice recognition module not available, using fallback");
    return false;
  }
};

export interface TranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export type TranscriptionCallback = (result: TranscriptionResult) => void;
export type ErrorCallback = (error: string) => void;

/**
 * Real-Time Transcription Service
 */
class RealTimeTranscriptionService {
  private isListening: boolean = false;
  private isInitialized: boolean = false;
  private transcriptionCallback: TranscriptionCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private recording: Audio.Recording | null = null;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the transcription service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Try to load voice recognition module
      await loadVoiceModule();

      if (isVoiceAvailable && Voice) {
        // Set up voice recognition callbacks
        Voice.onSpeechStart = this.handleSpeechStart.bind(this);
        Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
        Voice.onSpeechResults = this.handleSpeechResults.bind(this);
        Voice.onSpeechPartialResults = this.handleSpeechPartialResults.bind(this);
        Voice.onSpeechError = this.handleSpeechError.bind(this);

        console.log("✅ Voice recognition initialized");
      } else {
        console.log("⚠️ Voice recognition not available, using simulation mode");
      }

      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Audio permission not granted");
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize transcription service:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Start listening for speech
   */
  async startListening(
    onTranscription: TranscriptionCallback,
    onError?: ErrorCallback,
    options: TranscriptionOptions = {},
  ): Promise<boolean> {
    if (this.isListening) {
      console.warn("Already listening");
      return false;
    }

    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        onError?.("Failed to initialize transcription service");
        return false;
      }
    }

    this.transcriptionCallback = onTranscription;
    this.errorCallback = onError || null;

    try {
      if (isVoiceAvailable && Voice) {
        // Use real voice recognition
        await this.startRealVoiceRecognition(options);
      } else {
        // Use simulation mode for development/testing
        await this.startSimulationMode();
      }

      this.isListening = true;
      console.log("✅ Started listening for speech");
      return true;
    } catch (error) {
      console.error("Failed to start listening:", error);
      this.errorCallback?.(error instanceof Error ? error.message : "Failed to start listening");
      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      if (isVoiceAvailable && Voice) {
        await Voice.stop();
        await Voice.destroy();
      }

      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }

      this.isListening = false;
      console.log("✅ Stopped listening for speech");
    } catch (error) {
      console.error("Failed to stop listening:", error);
    }
  }

  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopListening();
    this.transcriptionCallback = null;
    this.errorCallback = null;
    this.isInitialized = false;
  }

  // Private methods

  private async startRealVoiceRecognition(options: TranscriptionOptions): Promise<void> {
    if (!Voice) return;

    const voiceOptions = {
      language: options.language || "en-US",
      continuous: options.continuous !== false,
      interimResults: options.interimResults !== false,
      maxAlternatives: options.maxAlternatives || 1,
    };

    await Voice.start(voiceOptions.language, {
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
      EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1500,
    });
  }

  private async startSimulationMode(): Promise<void> {
    // Simulate transcription for development/testing
    const simulatedPhrases = [
      "This is my anonymous confession",
      "I need to share something important",
      "Here is what I want to say",
      "My secret story begins here",
      "I have been keeping this to myself",
      "It is time to speak the truth",
    ];

    let phraseIndex = 0;

    this.simulationInterval = setInterval(() => {
      if (phraseIndex < simulatedPhrases.length) {
        const text = simulatedPhrases[phraseIndex];
        this.transcriptionCallback?.({
          text,
          isFinal: phraseIndex === simulatedPhrases.length - 1,
          confidence: 0.9,
        });
        phraseIndex++;
      } else {
        // Loop back to start
        phraseIndex = 0;
      }
    }, 3000);
  }

  // Voice recognition event handlers

  private handleSpeechStart(): void {
    console.log("🎤 Speech started");
  }

  private handleSpeechEnd(): void {
    console.log("🎤 Speech ended");
  }

  private handleSpeechResults(event: any): void {
    if (!event || !event.value || event.value.length === 0) {
      return;
    }

    const text = event.value[0];
    this.transcriptionCallback?.({
      text,
      isFinal: true,
      confidence: 1.0,
    });
  }

  private handleSpeechPartialResults(event: any): void {
    if (!event || !event.value || event.value.length === 0) {
      return;
    }

    const text = event.value[0];
    this.transcriptionCallback?.({
      text,
      isFinal: false,
      confidence: 0.8,
    });
  }

  private handleSpeechError(event: any): void {
    console.error("Speech recognition error:", event);
    this.errorCallback?.(event?.error?.message || "Speech recognition error");
  }
}

// Export singleton instance
export const transcriptionService = new RealTimeTranscriptionService();

/**
 * Hook-friendly wrapper for transcription service
 */
export function useRealTimeTranscription() {
  const startTranscription = async (
    onTranscription: TranscriptionCallback,
    onError?: ErrorCallback,
    options?: TranscriptionOptions,
  ): Promise<boolean> => {
    return transcriptionService.startListening(onTranscription, onError, options);
  };

  const stopTranscription = async (): Promise<void> => {
    return transcriptionService.stopListening();
  };

  const isTranscribing = (): boolean => {
    return transcriptionService.isActive();
  };

  return {
    startTranscription,
    stopTranscription,
    isTranscribing,
  };
}

/**
 * Transcribe audio file (post-recording)
 * Uses server-side API for better accuracy
 */
export async function transcribeAudioFile(audioUri: string): Promise<string> {
  try {
    // Import the existing transcription API
    const { transcribeAudio } = await import("../api/transcribe-audio");
    const transcription = await transcribeAudio(audioUri);
    return transcription;
  } catch (error) {
    console.error("Audio file transcription failed:", error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
