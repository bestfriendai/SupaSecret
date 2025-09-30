import { supabase } from "../lib/supabase";
import { handleApiError } from "../utils/apiUtils";
import { createApiError, API_ERROR_CODES } from "../types/apiError";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  prompt?: string;
  temperature?: number;
}

export interface ImageGenerationOptions {
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
}

export interface CaptionGenerationOptions {
  onProgress?: (progress: number, status: string) => void;
}

/**
 * Secure API Gateway for AI services
 * Routes all AI API calls through Supabase Edge Functions to keep API keys secure
 */
export class SecureAPIGateway {
  /**
   * Call OpenAI chat completion via Edge Function
   */
  static async callOpenAIChat(options: ChatCompletionOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("openai-chat", {
        body: options,
      });

      if (error) {
        throw createApiError("openai", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "openai", "callOpenAIChat");
    }
  }

  /**
   * Call Anthropic chat completion via Edge Function
   */
  static async callAnthropicChat(options: ChatCompletionOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("anthropic-chat", {
        body: options,
      });

      if (error) {
        throw createApiError("anthropic", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "anthropic", "callAnthropicChat");
    }
  }

  /**
   * Call Grok chat completion via Edge Function
   */
  static async callGrokChat(options: ChatCompletionOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("grok-chat", {
        body: options,
      });

      if (error) {
        throw createApiError("grok", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "grok", "callGrokChat");
    }
  }

  /**
   * Transcribe audio via Edge Function
   */
  static async transcribeAudio(audioUri: string, options?: TranscriptionOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("transcription", {
        body: { audioUri, options },
      });

      if (error) {
        throw createApiError("transcription", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "transcription", "transcribeAudio");
    }
  }

  /**
   * Generate image via Edge Function
   */
  static async generateImage(prompt: string, options?: ImageGenerationOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("image-generation", {
        body: { prompt, options },
      });

      if (error) {
        throw createApiError("image-generation", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "image-generation", "generateImage");
    }
  }

  /**
   * Generate captions via Edge Function
   */
  static async generateCaptions(audioUri: string, options?: CaptionGenerationOptions) {
    try {
      const { data, error } = await supabase.functions.invoke("caption-generation", {
        body: { audioUri, options },
      });

      if (error) {
        throw createApiError("transcription", error.message, API_ERROR_CODES.INTERNAL_ERROR);
      }

      return data;
    } catch (error) {
      return handleApiError(error, "transcription", "generateCaptions");
    }
  }
}
