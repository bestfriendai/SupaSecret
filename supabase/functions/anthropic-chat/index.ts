import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  model?: string;
  messages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const requestBody: ChatRequest = await req.json();
    const {
      model = "claude-3-5-sonnet-20240620",
      messages,
      temperature = 0.7,
      max_tokens = 1024,
      stream = false,
    } = requestBody;

    const message = await anthropic.messages.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
    });

    return new Response(JSON.stringify(message), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Anthropic chat error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Anthropic chat failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
