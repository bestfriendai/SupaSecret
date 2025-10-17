/**
 * Caption Generator Service
 * Generates word-by-word captions with timestamps for TikTok/Instagram-style captions
 * Uses OpenAI Whisper API for accurate speech-to-text with word-level timestamps
 */

// API key will be accessed directly from process.env

export interface CaptionWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

export interface CaptionData {
  segments: CaptionSegment[];
  duration: number;
  language: string;
}

/**
 * Generate captions from audio/video file using Whisper API
 * Returns word-level timestamps for precise caption display
 */
export async function generateCaptions(
  audioUri: string,
  onProgress?: (progress: number, status: string) => void,
): Promise<CaptionData> {
  try {
    onProgress?.(10, "Preparing audio for transcription...");

    // Create form data with audio file
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/mp4",
      name: "audio.m4a",
    } as any);

    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json"); // Get word timestamps
    formData.append("timestamp_granularities", JSON.stringify(["word", "segment"]));

    onProgress?.(30, "Transcribing audio...");

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file");
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    onProgress?.(80, "Processing captions...");

    const data = await response.json();

    onProgress?.(100, "Captions ready!");

    return {
      segments: data.segments || [],
      duration: data.duration || 0,
      language: data.language || "en",
    };
  } catch (error) {
    console.error("Caption generation failed:", error);
    throw error;
  }
}

/**
 * Get the current word(s) that should be displayed at a given time
 */
export function getCurrentCaptions(
  captionData: CaptionData,
  currentTime: number,
  wordsPerLine: number = 3,
): string | null {
  // Find all words that should be visible at current time
  const visibleWords: string[] = [];

  for (const segment of captionData.segments) {
    for (const word of segment.words) {
      // Show word if current time is within its duration
      if (currentTime >= word.start && currentTime <= word.end) {
        visibleWords.push(word.word);
      }
      // Also show upcoming words for smooth display
      else if (currentTime >= word.start - 0.3 && currentTime < word.start) {
        visibleWords.push(word.word);
      }
    }
  }

  if (visibleWords.length === 0) return null;

  // Join words and limit to wordsPerLine
  return visibleWords.slice(-wordsPerLine).join(" ");
}

/**
 * Get caption styling based on word timing (for emphasis effect)
 */
export function getCaptionStyle(
  word: CaptionWord,
  currentTime: number,
): {
  opacity: number;
  scale: number;
  color: string;
} {
  const progress = (currentTime - word.start) / (word.end - word.start);

  // Fade in at start, fade out at end
  let opacity = 1;
  if (progress < 0.1) {
    opacity = progress / 0.1; // Fade in
  } else if (progress > 0.9) {
    opacity = 1 - (progress - 0.9) / 0.1; // Fade out
  }

  // Scale for emphasis
  const scale = progress < 0.5 ? 1 + progress * 0.1 : 1.05 - (progress - 0.5) * 0.1;

  // Color based on timing (white -> yellow for current word)
  const isCurrent = progress > 0.3 && progress < 0.7;
  const color = isCurrent ? "#FFD700" : "#FFFFFF";

  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    scale: Math.max(1, Math.min(1.1, scale)),
    color,
  };
}

/**
 * Save caption data to file for later use
 */
export async function saveCaptionData(captionData: CaptionData, videoUri: string): Promise<string> {
  const FileSystem = await import("../utils/legacyFileSystem");
  const captionUri = videoUri.replace(/\.(mp4|mov)$/i, ".captions.json");

  await FileSystem.writeAsStringAsync(captionUri, JSON.stringify(captionData));

  return captionUri;
}

/**
 * Load caption data from file
 */
export async function loadCaptionData(captionUri: string): Promise<CaptionData | null> {
  try {
    const FileSystem = await import("../utils/legacyFileSystem");

    // Check if file exists first
    const fileInfo = await FileSystem.getInfoAsync(captionUri);
    if (!fileInfo.exists) {
      if (__DEV__) {
        console.log("📝 Caption file not found:", captionUri);
      }
      return null;
    }

    const data = await FileSystem.readAsStringAsync(captionUri);
    return JSON.parse(data);
  } catch (error) {
    // Only log error if it's not a "file not found" error
    if (error instanceof Error && !error.message.includes("not readable") && !error.message.includes("not found")) {
      console.error("Failed to load captions:", error);
    } else if (__DEV__) {
      console.log("📝 Caption file not available:", captionUri);
    }
    return null;
  }
}
