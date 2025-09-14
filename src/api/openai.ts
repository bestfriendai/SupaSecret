/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the OpenAI API. You may update this service, but you should not need to.

valid model names:
gpt-4.1-2025-04-14
o4-mini-2025-04-16
gpt-4o-2024-11-20
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

export const getOpenAIClient = async () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OpenAI API key not found - using stub client for Expo Go compatibility");
      return createStubClient();
    }

    // In Expo Go, always return stub client to prevent require() errors
    if (process.env.EXPO_PUBLIC_ENV === "development") {
      console.warn("Using OpenAI stub client for Expo Go compatibility");
      return createStubClient();
    }

    // For development builds, try to load the real SDK
    try {
      const module = await import("openai");
      const OpenAISDK = module.default || module;
      return new OpenAISDK({
        apiKey: apiKey,
      });
    } catch (error) {
      console.warn("OpenAI SDK not available, using stub client:", error);
      return createStubClient();
    }
  } catch (error) {
    handleApiError(error, "openai", "getOpenAIClient");
    return createStubClient(); // Return stub client on error
  }
};

/**
 * Validate OpenAI model name
 */
export const validateOpenAIModel = (model: string): void => {
  const validModels = [
    "gpt-4.1-2025-04-14",
    "o4-mini-2025-04-16",
    "gpt-4o-2024-11-20",
    "gpt-4o", // Default model used in chat-service
  ];

  if (!validModels.includes(model)) {
    const error = createApiError("openai", `Invalid model name: ${model}`, API_ERROR_CODES.INVALID_PARAMETER);
    handleApiError(error, "openai", "validateOpenAIModel");
  }
};
