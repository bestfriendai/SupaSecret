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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const requestBody: ChatRequest = await req.json();
    const { model = "gpt-4o", messages, temperature = 0.7, max_tokens, stream = false } = requestBody;

    const completion = await openai.chat.completions.create({
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
    console.error("OpenAI chat error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "OpenAI chat failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
