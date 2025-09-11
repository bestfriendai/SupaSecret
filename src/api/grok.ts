/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Grok API. You may update this service, but you should not need to.
The Grok API can be communicated with the "openai" package, so you can use the same functions as the openai package. It may not support all the same features, so please be careful.


grok-3-latest
grok-3-fast-latest
grok-3-mini-latest
*/
import OpenAI from "openai";
import { handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

export const getGrokClient = () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GROK_API_KEY || process.env.EXPO_PUBLIC_GROK_API_KEY;
    if (!apiKey) {
      const error = createApiError(
        "grok",
        "Grok API key not found in environment variables. Please set EXPO_PUBLIC_VIBECODE_GROK_API_KEY or EXPO_PUBLIC_GROK_API_KEY",
        API_ERROR_CODES.API_KEY_NOT_FOUND,
      );
      handleApiError(error, "grok", "getGrokClient");
      return null; // Return null instead of throwing to prevent app crashes
    }

    return new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.x.ai/v1",
    });
  } catch (error) {
    handleApiError(error, "grok", "getGrokClient");
    return null; // Return null on error to prevent app crashes
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
