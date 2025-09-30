import { env } from "../utils/env";
import { IAnonymiser, ProcessedVideo, VideoProcessingOptions } from "./IAnonymiser";
import { getUnifiedVideoService } from "./UnifiedVideoService";

let cachedAnonymiser: IAnonymiser | null = null;
let loadingPromise: Promise<IAnonymiser> | null = null;

const createAnonymiser = async (): Promise<IAnonymiser> => {
  const videoService = await getUnifiedVideoService();

  return {
    async initialize() {
      console.log("Unified Video Service anonymiser initialized");
    },

    async processVideo(videoUri: string, options: VideoProcessingOptions = {}): Promise<ProcessedVideo> {
      console.log("Processing video with UnifiedVideoService:", videoUri);

      const quality = options.quality === "highest" ? "high" : options.quality || "high";
      const result = await videoService.processVideo(videoUri, {
        quality: quality as "high" | "medium" | "low",
        blur: options.enableFaceBlur,
      });

      return {
        uri: result.uri,
        duration: result.duration,
        thumbnailUri: result.thumbnail,
        faceBlurApplied: options.enableFaceBlur || false,
        voiceChangeApplied: options.enableVoiceChange || false,
        metadata:
          result.width && result.height
            ? {
                width: result.width,
                height: result.height,
                duration: result.duration,
                size: 0,
              }
            : undefined,
      };
    },
  };
};

const getNativeAnonymiser = async (): Promise<IAnonymiser> => {
  if (cachedAnonymiser) {
    return cachedAnonymiser;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      cachedAnonymiser = await createAnonymiser();
      return cachedAnonymiser;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

export const getAnonymiser = async (): Promise<IAnonymiser> => {
  console.log("🚀 Using UnifiedVideoService for anonymisation");
  try {
    return await getNativeAnonymiser();
  } catch (error) {
    console.error("Failed to load anonymiser:", error);
    throw error;
  }
};

// Convenience export for direct usage
export const Anonymiser = {
  async initialize() {
    const anonymiser = await getAnonymiser();
    return anonymiser.initialize();
  },

  async processVideo(videoUri: string, options: any = {}) {
    const anonymiser = await getAnonymiser();
    return anonymiser.processVideo(videoUri, options);
  },

  async startRealTimeTranscription() {
    const anonymiser = await getAnonymiser();
    if (!anonymiser.startRealTimeTranscription || typeof anonymiser.startRealTimeTranscription !== "function") {
      throw new Error("Real-time transcription not supported");
    }
    return anonymiser.startRealTimeTranscription();
  },

  async stopRealTimeTranscription() {
    const anonymiser = await getAnonymiser();
    if (!anonymiser.stopRealTimeTranscription || typeof anonymiser.stopRealTimeTranscription !== "function") {
      throw new Error("Real-time transcription not supported");
    }
    return anonymiser.stopRealTimeTranscription();
  },
};
