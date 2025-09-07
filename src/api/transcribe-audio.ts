/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom audio transcription service that uses a server-side API endpoint.
You can use this function to transcribe audio files, and it will return the text of the audio file.
*/

// Development fallback constants
const DEV_FALLBACK_TRANSCRIPTION =
  "This is a simulated transcription for development purposes. The actual audio content would be transcribed here in production with a valid API key.";
const isDevFallbackEnabled = process.env.NODE_ENV === "development";

/**
 * Transcribe an audio file via server-side endpoint
 * @param localAudioUri - The local URI of the audio file to transcribe. Obtained via the expo-av library.
 * @returns The text of the audio file
 * @throws Error if transcription fails and dev fallback is disabled
 */
export const transcribeAudio = async (localAudioUri: string) => {
  try {
    // Get server endpoint URL - should be configured server-side
    const SERVER_TRANSCRIPTION_ENDPOINT = process.env.EXPO_PUBLIC_SERVER_URL
      ? `${process.env.EXPO_PUBLIC_SERVER_URL}/api/transcribe`
      : null;

    if (!SERVER_TRANSCRIPTION_ENDPOINT) {
      // Strict handling: only return fallback in dev mode, otherwise throw
      if (isDevFallbackEnabled) {
        console.warn("Server transcription endpoint not configured, using dev fallback");
        return DEV_FALLBACK_TRANSCRIPTION;
      }
      throw new Error("Transcription service not configured. Please contact support.");
    }

    // Create FormData for the audio file
    const formData = new FormData();
    formData.append("file", {
      uri: localAudioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as any);
    formData.append("model", "gpt-4o-transcribe");
    formData.append("language", "en");

    // Call server-side endpoint (no API keys in client)
    const response = await fetch(SERVER_TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server transcription failed:", errorText);

      // Strict handling: only return fallback in dev mode, otherwise throw
      if (isDevFallbackEnabled) {
        console.warn("Using dev fallback due to server error");
        return DEV_FALLBACK_TRANSCRIPTION;
      }
      throw new Error("Transcription service temporarily unavailable. Please try again later.");
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Transcription error:", error);

    // Strict handling: only return fallback in dev mode, otherwise re-throw
    if (isDevFallbackEnabled) {
      console.warn("Using dev fallback due to error:", error);
      return DEV_FALLBACK_TRANSCRIPTION;
    }

    // Re-throw the error for proper error handling by callers
    throw error;
  }
};
