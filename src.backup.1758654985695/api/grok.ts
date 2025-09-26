/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Grok API. You may update this service, but you should not need to.
The Grok API can be communicated with the "openai" package, so you can use the same functions as the openai package. It may not support all the same features, so please be careful.


grok-3-latest
grok-3-fast-latest
grok-3-mini-latest
*/
import { handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

// Stub implementation for Expo Go compatibility
const createStubClient = () => ({
  chat: {
    completions: {
      create: async () => {
        throw new Error(
          "AI features require development build. This is a stub implementation for Expo Go compatibility.",
        );
      },
    },
  },
});

export const getGrokClient = async () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY || process.env.EXPO_PUBLIC_GROK_API_KEY;
    if (!apiKey) {
      console.warn("Grok API key not found - using stub client for Expo Go compatibility");
      return createStubClient();
    }

    // In Expo Go, always return stub client to prevent require() errors
    if (process.env.EXPO_PUBLIC_ENV === "development") {
      console.warn("Using Grok stub client for Expo Go compatibility");
      return createStubClient();
    }

    // For development builds, try to load the real SDK
    try {
      const module = await import("openai");
      const OpenAISDK = module.default || module;
      return new OpenAISDK({
        apiKey: apiKey,
        baseURL: "https://api.x.ai/v1",
      });
    } catch (error) {
      console.warn("OpenAI SDK not available for Grok, using stub client:", error);
      return createStubClient();
    }
  } catch (error) {
    handleApiError(error, "grok", "getGrokClient");
    return createStubClient(); // Return stub client on error
  }
};

/**
 * Validate Grok model name
 */
export const validateGrokModel = (model: string): void => {
  const validModels = [
    "grok-3-latest",
    "grok-3-fast-latest",
    "grok-3-mini-latest",
    "grok-3-beta", // Default model used in chat-service
  ];

  if (!validModels.includes(model)) {
    const error = createApiError("grok", `Invalid model name: ${model}`, API_ERROR_CODES.INVALID_PARAMETER);
    handleApiError(error, "grok", "validateGrokModel");
  }
};
