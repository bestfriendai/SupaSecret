/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the Anthropic API. You may update this service, but you should not need to.

Valid model names: 
claude-sonnet-4-20250514
claude-3-7-sonnet-latest
claude-3-5-haiku-latest
*/
import Anthropic from "@anthropic-ai/sdk";
import { handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

export const getAnthropicClient = () => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      const error = createApiError(
        "anthropic",
        "Anthropic API key not found in environment variables",
        API_ERROR_CODES.API_KEY_NOT_FOUND,
      );
      handleApiError(error, "anthropic", "getAnthropicClient");
    }

    return new Anthropic({
      apiKey: apiKey,
    });
  } catch (error) {
    handleApiError(error, "anthropic", "getAnthropicClient");
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
