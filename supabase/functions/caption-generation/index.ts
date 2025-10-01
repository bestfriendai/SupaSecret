import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptionGenerationRequest {
  audioUri: string;
  options?: {
    onProgress?: (progress: number, status: string) => void;
  };
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

    const requestBody: CaptionGenerationRequest = await req.json();
    const { audioUri } = requestBody;

    if (!audioUri) {
      throw new Error("Audio URI is required");
    }

    // Fetch the audio file from the URI
    const audioResponse = await fetch(audioUri);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();

    // Create form data for OpenAI Whisper with word-level timestamps
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities", JSON.stringify(["word", "segment"]));

    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    } as any);

    // Format the response to match the expected caption data structure
    const captionData = {
      segments: transcription.segments || [],
      duration: transcription.duration || 0,
      language: transcription.language || "en",
    };

    return new Response(JSON.stringify(captionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Caption generation error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Caption generation failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
