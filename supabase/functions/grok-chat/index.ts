import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

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
    const grokApiKey = Deno.env.get("GROK_API_KEY");
    if (!grokApiKey) {
      throw new Error("Grok API key not configured");
    }

    const grok = new OpenAI({
      apiKey: grokApiKey,
      baseURL: "https://api.x.ai/v1",
    });

    const requestBody: ChatRequest = await req.json();
    const { model = "grok-3-beta", messages, temperature = 0.7, max_tokens, stream = false } = requestBody;

    const completion = await grok.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
    });

    return new Response(JSON.stringify(completion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Grok chat error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Grok chat failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
