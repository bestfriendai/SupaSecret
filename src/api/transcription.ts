/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Transcription API. You may update this service, but you should not need to.
*/
import {
  executeApiRequest,
  validateApiResponse,
  logApiRequest,
  logApiResponse,
  handleApiError,
} from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

/**
 * Transcribe audio using the Transcription API
 * @param audioUri - The URI of the audio file to transcribe
 * @param options - The options for the request
 * @returns The response from the API
 */
export const transcribeAudio = async (
  audioUri: string,
  options?: {
    language?: string;
    model?: string;
    prompt?: string;
    temperature?: number;
  },
): Promise<{ text: string }> => {
  const startTime = Date.now();
  const context = "transcribeAudio";

  try {
    // Validate inputs
    if (!audioUri || audioUri.trim() === "") {
      const error = createApiError(
        "transcription",
        "Audio URI is required and cannot be empty",
        API_ERROR_CODES.MISSING_PARAMETER,
      );
      return handleApiError(error, "transcription", context);
    }

    // Validate options
    const language = options?.language || "en";
    const model = options?.model || "whisper-1";
    const prompt = options?.prompt;
    const temperature = options?.temperature ?? 0.0;

    if (temperature < 0.0 || temperature > 1.0) {
      const error = createApiError(
        "transcription",
        "Temperature must be between 0.0 and 1.0",
        API_ERROR_CODES.INVALID_PARAMETER,
      );
      return handleApiError(error, "transcription", context);
    }

    return await executeApiRequest(
      async () => {
        const apiKey = process.env.EXPO_PUBLIC_VIBECODE_TRANSCRIPTION_API_KEY;
        if (!apiKey) {
          const error = createApiError(
            "transcription",
            "Transcription API key not found in environment variables",
            API_ERROR_CODES.API_KEY_NOT_FOUND,
          );
          throw error;
        }

        // Log request for debugging
        logApiRequest("transcription", "/transcribe", "POST", {
          audioUri: "[REDACTED]", // Don't log the full URI for privacy
          language,
          model,
          prompt,
          temperature,
        });

        // Create form data
        const formData = new FormData();
        formData.append("file", {
          uri: audioUri,
          type: "audio/mpeg",
          name: "audio.mp3",
        } as any);
        formData.append("model", model);
        formData.append("language", language);

        if (prompt) {
          formData.append("prompt", prompt);
        }

        if (temperature !== 0.0) {
          formData.append("temperature", temperature.toString());
        }

        const response = await fetch("https://api.vibecode.com/transcribe", {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = createApiError(
            "transcription",
            errorData.message || `HTTP error! status: ${response.status}`,
            undefined,
            response.status,
            errorData,
            response.status >= 500, // Retry on server errors
          );
          return handleApiError(error, "transcription", context);
        }

        const data = await response.json();

        // Log response for debugging
        logApiResponse("transcription", "/transcribe", data, Date.now() - startTime);

        // Validate response structure
        const validatedResponse = validateApiResponse(data, ["text"], "transcription", context) as { text: string };

        return {
          text: validatedResponse.text,
        };
      },
      {
        serviceName: "transcription",
        context,
        timeoutMs: 60000, // 60 second timeout for transcription
        maxRetries: 2,
      },
    );
  } catch (error) {
    handleApiError(error, "transcription", context);
    // This line is unreachable because handleApiError always throws
    throw new Error("Unreachable code");
  }
};
