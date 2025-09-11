/* eslint-disable import/no-unresolved */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoProcessingRequest {
  videoUrl?: string;
  videoPath?: string;
  uploadId?: string;
  options: {
    enableFaceBlur?: boolean;
    enableVoiceChange?: boolean;
    enableTranscription?: boolean;
    quality?: "low" | "medium" | "high";
    voiceEffect?: "deep" | "light";
  };
}

serve(async (req) => {
  console.log("Edge Function called with method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error("Invalid JSON in request body");
    }

    const { videoUrl, videoPath, uploadId, options }: VideoProcessingRequest = requestBody;

    console.log("Processing request:", { videoUrl, videoPath, uploadId, options });

    // Handle different payload formats from client
    // Prefer storage path contract for private buckets
    const storagePath = videoPath || undefined;

    if (!videoUrl && !storagePath && uploadId) {
      // Deprecated: derive a best-effort path; clients should send videoPath explicitly
      const fileName = uploadId.includes(".") ? uploadId : `${uploadId}.mp4`;
      // Default to confessions bucket root when path is unknown
      console.warn("[process-video] uploadId provided without videoPath; assuming confessions/" + fileName);
      // Note: We do not generate a public URL here; clients must use signed URLs for private buckets
    }

    if (!videoUrl && !storagePath) {
      throw new Error("videoPath is required for private storage; send the storage path returned from upload");
    }

    // For now, let's just return a successful response without actually processing
    // This will help us verify the Edge Function is working
    console.log("Video processing simulation - returning success");

    return new Response(
      JSON.stringify({
        success: true,
        storagePath: storagePath || null,
        thumbnailUrl: null,
        transcription: "Mock transcription for testing",
        duration: 30,
        faceBlurApplied: options?.enableFaceBlur || false,
        voiceChangeApplied: options?.enableVoiceChange || false,
        message: "Edge Function is working correctly",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Video processing error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Video processing failed",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Remove the old processing functions for now to avoid any issues
/*
async function processVideo(videoBuffer: ArrayBuffer, options: any) {
  // For now, return the original video with mock processing
  // In a real implementation, this would use FFmpeg or similar
  console.log("Mock processing video with options:", options);

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    buffer: videoBuffer,
    duration: 30, // Mock duration
  };
}

async function generateThumbnail(videoBuffer: ArrayBuffer): Promise<Uint8Array> {
  // Mock thumbnail generation
  // In real implementation, use FFmpeg or canvas API
  console.log("Generating thumbnail...");

  // Return a small mock JPEG
  const mockThumbnail = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00,
    0x00, 0xff, 0xd9,
  ]);

  return mockThumbnail;
}

async function generateTranscription(videoBuffer: ArrayBuffer): Promise<string> {
  // Mock transcription
  // In real implementation, use speech-to-text service
  console.log("Generating transcription...");

  const mockTranscriptions = [
    "This is my anonymous confession about something I've never told anyone.",
    "I have a secret that I need to share with the world anonymously.",
    "Here's something I've been keeping to myself for too long.",
    "This confession is about a personal experience I want to share.",
    "I'm sharing this story because I think others might relate to it.",
  ];

  return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
}
*/
