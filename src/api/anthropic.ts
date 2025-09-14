/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Anthropic API. You may update this service, but you should not need to.

Valid model names:
claude-sonnet-4-20250514
claude-3-7-sonnet-latest
claude-3-5-haiku-latest
*/
import { handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

// Stub implementation for Expo Go compatibility
const createStubClient = () => ({
  messages: {
    create: async () => {
      throw new Error(
        "AI features require development build. This is a stub implementation for Expo Go compatibility.",
      );
    },
  },
});

export const getAnthropicClient = async () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("Anthropic API key not found - using stub client for Expo Go compatibility");
      return createStubClient();
    }

    // In Expo Go, always return stub client to prevent require() errors
    if (process.env.EXPO_PUBLIC_ENV === "development") {
      console.warn("Using Anthropic stub client for Expo Go compatibility");
      return createStubClient();
    }

    // For development builds, try to load the real SDK
    try {
      const module = await import("@anthropic-ai/sdk");
      const AnthropicSDK = module.default || module;
      return new AnthropicSDK({
        apiKey: apiKey,
      });
    } catch (error) {
      console.warn("Anthropic SDK not available, using stub client:", error);
      return createStubClient();
    }
  } catch (error) {
    handleApiError(error, "anthropic", "getAnthropicClient");
    return createStubClient(); // Return stub client on error
  }
};

/**
 * Validate Anthropic model name
 */
export const validateAnthropicModel = (model: string): void => {
  const validModels = [
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-latest",
    "claude-3-5-haiku-latest",
    "claude-3-5-sonnet-20240620", // Default model used in chat-service
  ];

  if (!validModels.includes(model)) {
    const error = createApiError("anthropic", `Invalid model name: ${model}`, API_ERROR_CODES.INVALID_PARAMETER);
    handleApiError(error, "anthropic", "validateAnthropicModel");
  }
};
