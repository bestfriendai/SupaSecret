import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageGenerationRequest {
  prompt: string;
  options?: {
    model?: string;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vibecodeApiKey = Deno.env.get("VIBECODE_IMAGE_API_KEY");
    if (!vibecodeApiKey) {
      throw new Error("Vibecode Image API key not configured");
    }

    const requestBody: ImageGenerationRequest = await req.json();
    const { prompt, options } = requestBody;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const response = await fetch("https://api.vibecode.com/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": vibecodeApiKey,
      },
      body: JSON.stringify({
        prompt,
        model: options?.model || "flux",
        width: options?.width || 1024,
        height: options?.height || 1024,
        steps: options?.steps || 4,
        seed: options?.seed,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Image generation error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Image generation failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
