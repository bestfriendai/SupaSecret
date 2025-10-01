/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { getAnthropicClient, validateAnthropicModel } from "./anthropic";
import { getOpenAIClient, validateOpenAIModel } from "./openai";
import { getGrokClient, validateGrokModel } from "./grok";
import {
  executeApiRequest,
  validateApiResponse,
  logApiRequest,
  logApiResponse,
  handleApiError,
} from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  const startTime = Date.now();
  const context = "getAnthropicTextResponse";

  try {
    // Validate inputs
    if (!messages || messages.length === 0) {
      const error = createApiError(
        "anthropic",
        "Messages array is required and cannot be empty",
        API_ERROR_CODES.MISSING_PARAMETER,
      );
      handleApiError(error, "anthropic", context);
    }

    const model = options?.model || "claude-3-5-sonnet-20240620";
    validateAnthropicModel(model);

    return await executeApiRequest(
      async () => {
        const client = await getAnthropicClient();
        if (!client) {
          throw new Error("Failed to initialize Anthropic client");
        }

        // Log request for debugging
        logApiRequest("anthropic", "messages.create", "POST", {
          model,
          messages,
          maxTokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
        });

        const response = await client.messages.create({
          model,
          messages: messages.map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          })),
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
        });

        // Log response for debugging
        logApiResponse("anthropic", "messages.create", response, Date.now() - startTime);

        // Validate response structure
        const validatedResponse = validateApiResponse(response, ["content", "usage"], "anthropic", context) as any;

        // Handle content blocks from the response
        const content = validatedResponse.content.reduce((acc: string, block: any) => {
          if ("text" in block) {
            return acc + block.text;
          }
          return acc;
        }, "");

        return {
          content,
          usage: {
            promptTokens: validatedResponse.usage?.input_tokens || 0,
            completionTokens: validatedResponse.usage?.output_tokens || 0,
            totalTokens: (validatedResponse.usage?.input_tokens || 0) + (validatedResponse.usage?.output_tokens || 0),
          },
        };
      },
      {
        serviceName: "anthropic",
        context,
        timeoutMs: 60000, // 60 second timeout for AI requests
        maxRetries: 2,
      },
    );
  } catch (error) {
    return handleApiError(error, "anthropic", context);
  }
};

/**
 * Get a simple chat response from Anthropic
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  if (!prompt || prompt.trim() === "") {
    const error = createApiError(
      "anthropic",
      "Prompt is required and cannot be empty",
      API_ERROR_CODES.MISSING_PARAMETER,
    );
    handleApiError(error, "anthropic", "getAnthropicChatResponse");
  }

  return getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const startTime = Date.now();
  const context = "getOpenAITextResponse";

  try {
    // Validate inputs
    if (!messages || messages.length === 0) {
      const error = createApiError(
        "openai",
        "Messages array is required and cannot be empty",
        API_ERROR_CODES.MISSING_PARAMETER,
      );
      handleApiError(error, "openai", context);
    }

    const model = options?.model || "gpt-4o"; // accepts images as well, use this for image analysis
    validateOpenAIModel(model);

    return await executeApiRequest(
      async () => {
        const client = await getOpenAIClient();
        if (!client) {
          throw new Error("Failed to initialize OpenAI client");
        }

        // Log request for debugging
        logApiRequest("openai", "chat.completions.create", "POST", {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens || 2048,
        });

        const response = await client.chat.completions.create({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens || 2048,
        });

        // Log response for debugging
        logApiResponse("openai", "chat.completions.create", response, Date.now() - startTime);

        // Validate response structure
        const validatedResponse = validateApiResponse(response, ["choices", "usage"], "openai", context) as any;

        return {
          content: validatedResponse.choices[0]?.message?.content || "",
          usage: {
            promptTokens: validatedResponse.usage?.prompt_tokens || 0,
            completionTokens: validatedResponse.usage?.completion_tokens || 0,
            totalTokens: validatedResponse.usage?.total_tokens || 0,
          },
        };
      },
      {
        serviceName: "openai",
        context,
        timeoutMs: 60000, // 60 second timeout for AI requests
        maxRetries: 2,
      },
    );
  } catch (error) {
    handleApiError(error, "openai", context);
    // This line is unreachable because handleApiError always throws
    throw new Error("Unreachable code");
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  if (!prompt || prompt.trim() === "") {
    const error = createApiError("openai", "Prompt is required and cannot be empty", API_ERROR_CODES.MISSING_PARAMETER);
    handleApiError(error, "openai", "getOpenAIChatResponse");
  }

  return getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  const startTime = Date.now();
  const context = "getGrokTextResponse";

  try {
    // Validate inputs
    if (!messages || messages.length === 0) {
      const error = createApiError(
        "grok",
        "Messages array is required and cannot be empty",
        API_ERROR_CODES.MISSING_PARAMETER,
      );
      handleApiError(error, "grok", context);
    }

    const model = options?.model || "grok-3-beta";
    validateGrokModel(model);

    return await executeApiRequest(
      async () => {
        const client = await getGrokClient();
        if (!client) {
          throw new Error("Failed to initialize Grok client");
        }

        // Log request for debugging
        logApiRequest("grok", "chat.completions.create", "POST", {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens || 2048,
        });

        const response = await client.chat.completions.create({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens || 2048,
        });

        // Log response for debugging
        logApiResponse("grok", "chat.completions.create", response, Date.now() - startTime);

        // Validate response structure
        const validatedResponse = validateApiResponse(response, ["choices", "usage"], "grok", context) as any;

        return {
          content: validatedResponse.choices[0]?.message?.content || "",
          usage: {
            promptTokens: validatedResponse.usage?.prompt_tokens || 0,
            completionTokens: validatedResponse.usage?.completion_tokens || 0,
            totalTokens: validatedResponse.usage?.total_tokens || 0,
          },
        };
      },
      {
        serviceName: "grok",
        context,
        timeoutMs: 60000, // 60 second timeout for AI requests
        maxRetries: 2,
      },
    );
  } catch (error) {
    return handleApiError(error, "grok", context);
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  if (!prompt || prompt.trim() === "") {
    const error = createApiError("grok", "Prompt is required and cannot be empty", API_ERROR_CODES.MISSING_PARAMETER);
    handleApiError(error, "grok", "getGrokChatResponse");
  }

  return getGrokTextResponse([{ role: "user", content: prompt }]);
};
