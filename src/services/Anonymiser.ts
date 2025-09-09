import { env } from "../utils/env";
import { IAnonymiser } from "./IAnonymiser";
import { videoProcessingService } from "./VideoProcessingService";

// Lazy load native anonymiser to prevent Expo Go crashes
let nativeAnonymiser: IAnonymiser | null = null;
let loadingPromise: Promise<IAnonymiser> | null = null;

const getNativeAnonymiser = async (): Promise<IAnonymiser> => {
  if (nativeAnonymiser) {
    return nativeAnonymiser;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const { nativeAnonymiser: native } = await import("./NativeAnonymiser");
      nativeAnonymiser = native;
      return native;
    } catch (error) {
      // Reset loading promise on failure to allow retries
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

// Factory function that returns the appropriate anonymiser
export const getAnonymiser = async (): Promise<IAnonymiser> => {
  if (env.expoGo) {
    console.log("🎯 Using DemoAnonymiser (Expo Go mode)");
    return videoProcessingService;
  } else {
    console.log("🚀 Using NativeAnonymiser (Development/Standalone build)");
    try {
      return await getNativeAnonymiser();
    } catch (error) {
      console.warn("Failed to load NativeAnonymiser, falling back to demo mode:", error);
      return videoProcessingService;
    }
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
