import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TranscriptionRequest {
  audioUri: string;
  options?: {
    language?: string;
    model?: string;
    prompt?: string;
    temperature?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vibecodeApiKey = Deno.env.get("VIBECODE_TRANSCRIPTION_API_KEY");
    if (!vibecodeApiKey) {
      throw new Error("Vibecode transcription API key not configured");
    }

    const requestBody: TranscriptionRequest = await req.json();
    const { audioUri, options } = requestBody;

    if (!audioUri) {
      throw new Error("Audio URI is required");
    }

    // Fetch the audio file from the URI
    const audioResponse = await fetch(audioUri);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();

    // Create form data for Vibecode API
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", options?.model || "whisper-1");

    if (options?.language) {
      formData.append("language", options.language);
    }

    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }

    if (options?.temperature !== undefined) {
      formData.append("temperature", options.temperature.toString());
    }

    const response = await fetch("https://api.vibecode.com/transcribe", {
      method: "POST",
      headers: {
        "X-API-Key": vibecodeApiKey,
      },
      body: formData,
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
    console.error("Transcription error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Transcription failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
