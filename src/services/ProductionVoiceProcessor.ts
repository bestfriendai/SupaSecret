/**
 * Production Voice Processor for audio-only voice modification
 * Uses react-native-audio-api for pitch shifting on standalone audio files
 * Implements deep/light voice effects with proper audio processing and file handling
 */

import * as FileSystem from "../utils/legacyFileSystem";

// Lazy load audio API to prevent issues
let AudioContext: any;

const loadAudioAPI = async () => {
  try {
    const audioAPI = await import("react-native-audio-api");
    AudioContext = audioAPI.AudioContext;
    return true;
  } catch (error) {
    console.error("Failed to load react-native-audio-api:", error);
    throw new Error("Audio API not available");
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
    default:
      return 1.0; // No change
  }
};

/**
 * Production Voice Processor class
 */
export class ProductionVoiceProcessor {
  private audioContext: any = null;

  /**
   * Initialize the audio context
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.audioContext) return;

    await loadAudioAPI();
    this.audioContext = new AudioContext();
  }

  /**
   * Process standalone audio file with voice effect
   */
  async processAudio(audioUri: string, options: VoiceProcessingOptions): Promise<string> {
    const { effect, onProgress } = options;

    if (effect === "none") {
      return audioUri; // No processing needed
    }

    onProgress?.(0, "Initializing audio processing...");

    try {
      await this.initializeAudioContext();
      onProgress?.(10, "Loading audio...");

      const pitchRate = getPitchShiftRate(effect);
      const effectDescription = effect === "deep" ? "deeper" : "lighter";

      onProgress?.(20, `Preparing ${effectDescription} voice effect...`);

      // Create output path
      const outputUri = audioUri.replace(/\.(m4a|wav|mp3|aac)$/i, `_voice_${effect}.wav`);

      onProgress?.(30, "Loading audio buffer...");

      // Load and decode audio
      const audioData = await FileSystem.readAsStringAsync(audioUri, {
        encoding: "base64" as any,
      });

      const arrayBuffer = base64ToArrayBuffer(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      onProgress?.(50, `Applying ${effectDescription} voice effect...`);

      // Create offline context for rendering
      const offlineContext = new AudioContext({
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: Math.floor(audioBuffer.length / pitchRate),
      } as any);

      // Create source node with pitch shift
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = pitchRate;
      source.connect(offlineContext.destination);

      // Render audio
      source.start();
      const renderedBuffer = await (offlineContext as any).startRendering();

      onProgress?.(80, "Encoding processed audio...");

      // Save processed audio
      await this.saveAudioBuffer(renderedBuffer, outputUri);

      onProgress?.(100, "Voice processing complete!");

      return outputUri;
    } catch (error) {
      console.error("Audio processing failed:", error);
      throw error;
    }
  }

  /**
   * Save audio buffer to WAV file
   */
  private async saveAudioBuffer(buffer: AudioBuffer, outputUri: string): Promise<void> {
    const wavArrayBuffer = this.audioBufferToWav(buffer);
    const base64 = arrayBufferToBase64(wavArrayBuffer);
    await FileSystem.writeAsStringAsync(outputUri, base64, { encoding: "base64" as any });
  }

  /**
   * Convert AudioBuffer to WAV ArrayBuffer
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    // Get channel data
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, length - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true); // ByteRate
    view.setUint16(32, buffer.numberOfChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, length - 44, true); // Subchunk2Size

    // Write interleaved PCM data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let j = 0; j < buffer.numberOfChannels; j++) {
        const sample = Math.max(-1, Math.min(1, channels[j][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return arrayBuffer;
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

export default ProductionVoiceProcessor;
