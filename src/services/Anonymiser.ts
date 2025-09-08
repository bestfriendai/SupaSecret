import { env } from '../utils/env';
import { IAnonymiser } from './IAnonymiser';
import { demoAnonymiser } from './VideoProcessingService';

// Lazy load native anonymiser to prevent Expo Go crashes
let nativeAnonymiser: IAnonymiser | null = null;

const getNativeAnonymiser = async (): Promise<IAnonymiser> => {
  if (!nativeAnonymiser) {
    const { nativeAnonymiser: native } = await import('./NativeAnonymiser');
    nativeAnonymiser = native;
  }
  return nativeAnonymiser;
};

// Factory function that returns the appropriate anonymiser
export const getAnonymiser = async (): Promise<IAnonymiser> => {
  if (env.expoGo) {
    console.log('🎯 Using DemoAnonymiser (Expo Go mode)');
    return demoAnonymiser;
  } else {
    console.log('🚀 Using NativeAnonymiser (Development/Standalone build)');
    try {
      return await getNativeAnonymiser();
    } catch (error) {
      console.warn('Failed to load NativeAnonymiser, falling back to demo mode:', error);
      return demoAnonymiser;
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
    return anonymiser.startRealTimeTranscription?.();
  },

  async stopRealTimeTranscription() {
    const anonymiser = await getAnonymiser();
    return anonymiser.stopRealTimeTranscription?.();
  }
};
