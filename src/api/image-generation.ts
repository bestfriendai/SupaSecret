/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Image Generation API. You may update this service, but you should not need to.
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
 * Generate an image using the Image Generation API
 * @param prompt - The prompt to generate an image from
 * @param options - The options for the request
 * @returns The response from the API
 */
export const generateImage = async (
  prompt: string,
  options?: {
    model?: string;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  },
): Promise<{ imageUrl: string }> => {
  const startTime = Date.now();
  const context = "generateImage";

  try {
    // Validate inputs
    if (!prompt || prompt.trim() === "") {
      const error = createApiError(
        "image-generation",
        "Prompt is required and cannot be empty",
        API_ERROR_CODES.MISSING_PARAMETER,
      );
      handleApiError(error, "image-generation", context);
    }

    // Validate options
    const model = options?.model || "flux";
    const width = options?.width || 1024;
    const height = options?.height || 1024;
    const steps = options?.steps || 4;
    const seed = options?.seed;

    if (width <= 0 || height <= 0) {
      const error = createApiError(
        "image-generation",
        "Width and height must be positive numbers",
        API_ERROR_CODES.INVALID_PARAMETER,
      );
      handleApiError(error, "image-generation", context);
    }

    if (steps <= 0 || steps > 50) {
      const error = createApiError(
        "image-generation",
        "Steps must be between 1 and 50",
        API_ERROR_CODES.INVALID_PARAMETER,
      );
      handleApiError(error, "image-generation", context);
    }

    return await executeApiRequest(
      async () => {
        const apiKey = process.env.EXPO_PUBLIC_VIBECODE_IMAGE_API_KEY;
        if (!apiKey) {
          const error = createApiError(
            "image-generation",
            "Image generation API key not found in environment variables",
            API_ERROR_CODES.API_KEY_NOT_FOUND,
          );
          handleApiError(error, "image-generation", context);
        }

        // Log request for debugging
        logApiRequest("image-generation", "/generate", "POST", {
          prompt,
          model,
          width,
          height,
          steps,
          seed,
        });

        const response = await fetch("https://api.vibecode.com/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            prompt,
            model,
            width,
            height,
            steps,
            seed,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = createApiError(
            "image-generation",
            errorData.message || `HTTP error! status: ${response.status}`,
            undefined,
            response.status,
            errorData,
            response.status >= 500, // Retry on server errors
          );
          handleApiError(error, "image-generation", context);
        }

        const data = await response.json();

        // Log response for debugging
        logApiResponse("image-generation", "/generate", data, Date.now() - startTime);

        // Validate response structure
        const validatedResponse = validateApiResponse(data, ["imageUrl"], "image-generation", context) as {
          imageUrl: string;
        };

        return {
          imageUrl: validatedResponse.imageUrl,
        };
      },
      {
        serviceName: "image-generation",
        context,
        timeoutMs: 120000, // 2 minute timeout for image generation
        maxRetries: 3,
      },
    );
  } catch (error) {
    handleApiError(error, "image-generation", context);
    // This line is unreachable because handleApiError always throws
    throw new Error("Unreachable code");
  }
};
