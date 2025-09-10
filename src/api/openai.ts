/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the OpenAI API. You may update this service, but you should not need to.

valid model names:
gpt-4.1-2025-04-14
o4-mini-2025-04-16
gpt-4o-2024-11-20
*/
import OpenAI from "openai";
import { validateEnvironmentVariables, handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

export const getOpenAIClient = () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
    if (!apiKey) {
      const error = createApiError(
        "openai",
        "OpenAI API key not found in environment variables",
        API_ERROR_CODES.API_KEY_NOT_FOUND,
      );
      handleApiError(error, "openai", "getOpenAIClient");
    }
    
    return new OpenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    handleApiError(error, "openai", "getOpenAIClient");
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
    const error = createApiError(
      "openai",
      `Invalid model name: ${model}`,
      API_ERROR_CODES.INVALID_PARAMETER,
    );
    handleApiError(error, "openai", "validateOpenAIModel");
  }
};
