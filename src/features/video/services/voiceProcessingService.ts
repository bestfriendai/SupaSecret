/**
 * Voice Processing Service
 * Uses react-native-audio-api for pitch shifting and voice effects
 * Based on production implementation from main app
 */

import * as FileSystem from "../../../utils/legacyFileSystem";
import type { VoiceEffect, VoiceProcessingOptions, VoiceProcessingResult, IVoiceProcessingService } from "../types";

// Lazy load audio API
let AudioContext: any;

/**
 * Load react-native-audio-api (optional dependency)
 */
const loadAudioAPI = async () => {
  try {
    // @ts-ignore - Optional dependency
    const audioAPI = await import("react-native-audio-api");
    AudioContext = audioAPI.AudioContext;
    return true;
  } catch (error) {
    console.error("react-native-audio-api not installed. Voice effects will be unavailable.");
    return false;
  }
};

/**
 * Get pitch shift rate for voice effects
 */
const getPitchShiftRate = (effect: VoiceEffect): number => {
  switch (effect) {
    case "deep":
      return 0.8; // Lower pitch (20% slower)
    case "light":
      return 1.2; // Higher pitch (20% faster)
    default:
      return 1.0; // No change
  }
};

/**
 * Voice Processing Service Implementation
 */
export class VoiceProcessingService implements IVoiceProcessingService {
  private audioContext: any = null;
  private isInitialized = false;

  /**
   * Initialize audio context
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.audioContext) return;

    try {
      await loadAudioAPI();
      this.audioContext = new AudioContext();
      this.isInitialized = true;
    } catch (error) {
      console.error("Voice processing initialization failed:", error);
      throw error;
    }
  }

  /**
   * Process audio file with voice effect
   */
  async processAudio(audioUri: string, options: VoiceProcessingOptions): Promise<VoiceProcessingResult> {
    const { effect, onProgress } = options;

    if (effect === "none") {
      return {
        uri: audioUri,
        effect: "none",
        duration: 0,
        voiceChangeApplied: false,
      };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    onProgress?.(0, "Initializing voice processing...");

    try {
      const startTime = Date.now();
      const pitchRate = getPitchShiftRate(effect);
      const effectDescription = effect === "deep" ? "deeper" : "lighter";

      onProgress?.(10, "Loading audio file...");

      // Create output path
      const outputUri = audioUri.replace(/\.(m4a|wav|mp3|aac)$/i, `_voice_${effect}.wav`);

      onProgress?.(20, `Preparing ${effectDescription} voice effect...`);

      // Load audio file
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.(30, "Decoding audio...");

      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      onProgress?.(50, `Applying ${effectDescription} voice effect...`);

      // Create offline context for rendering
      const duration = audioBuffer.duration / pitchRate;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;

      const offlineContext = new AudioContext({
        sampleRate,
        numberOfChannels,
        length: Math.floor(audioBuffer.length / pitchRate),
      });

      // Create source node with pitch shift
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = pitchRate;
      source.connect(offlineContext.destination);

      onProgress?.(70, "Rendering audio...");

      // Render audio
      source.start();
      const renderedBuffer = await offlineContext.startRendering();

      onProgress?.(85, "Encoding processed audio...");

      // Save processed audio as WAV
      await this.saveAudioBuffer(renderedBuffer, outputUri);

      onProgress?.(100, "Voice processing complete!");

      const processingTime = Date.now() - startTime;

      return {
        uri: outputUri,
        effect,
        duration: processingTime,
        voiceChangeApplied: true,
      };
    } catch (error) {
      console.error("Voice processing failed:", error);
      throw error;
    }
  }

  /**
   * Save audio buffer to WAV file
   */
  private async saveAudioBuffer(buffer: any, outputUri: string): Promise<void> {
    const wavArrayBuffer = this.audioBufferToWav(buffer);
    const base64 = arrayBufferToBase64(wavArrayBuffer);
    await FileSystem.writeAsStringAsync(outputUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  /**
   * Convert AudioBuffer to WAV ArrayBuffer
   */
  private audioBufferToWav(buffer: any): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    // Get channel data
    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, "RIFF");
    view.setUint32(4, length - 8, true);
    writeString(8, "WAVE");

    // fmt sub-chunk
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true); // ByteRate
    view.setUint16(32, buffer.numberOfChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeString(36, "data");
    view.setUint32(40, length - 44, true);

    // Write interleaved PCM data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let j = 0; j < buffer.numberOfChannels; j++) {
        const sample = Math.max(-1, Math.min(1, channels[j][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  /**
   * Check if voice processing is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.audioContext !== null;
  }

  /**
   * Release audio context resources
   */
  async release(): Promise<void> {
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error("Failed to close audio context:", error);
      }
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
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
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Singleton instance
 */
let voiceProcessingServiceInstance: VoiceProcessingService | null = null;

/**
 * Get voice processing service instance
 */
export const getVoiceProcessingService = (): VoiceProcessingService => {
  if (!voiceProcessingServiceInstance) {
    voiceProcessingServiceInstance = new VoiceProcessingService();
  }
  return voiceProcessingServiceInstance;
};

/**
 * Check if voice processing is available
 */
export const isVoiceProcessingAvailable = async (): Promise<boolean> => {
  try {
    await loadAudioAPI();
    return true;
  } catch {
    return false;
  }
};

export default VoiceProcessingService;
