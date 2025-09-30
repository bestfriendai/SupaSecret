/**
 * Face Blur Service
 * Uses Vision Camera + ML Kit + Skia for real-time and post-processing face blur
 * Based on production implementation from main app
 */

import { Alert } from 'react-native';
import type {
  FaceBlurOptions,
  FaceBlurResult,
  IFaceBlurService,
} from '../types';

const IS_EXPO_GO = !!(global as any).__expo?.isExpoGo;

// Lazy load native modules
let Camera: any;
let useSkiaFrameProcessor: any;
let detectFaces: any;
let Skia: any;

/**
 * Load native modules for face blur
 */
const loadNativeModules = async () => {
  if (IS_EXPO_GO) {
    throw new Error('Face blur not available in Expo Go - use development build');
  }

  try {
    if (!Camera) {
      const visionCamera = await import('react-native-vision-camera');
      Camera = visionCamera.Camera;
      useSkiaFrameProcessor = visionCamera.useSkiaFrameProcessor;
    }

    if (!detectFaces) {
      const faceDetector = await import('@react-native-ml-kit/face-detection');
      detectFaces = faceDetector.default.detect;
    }

    if (!Skia) {
      const skia = await import('@shopify/react-native-skia');
      Skia = skia.Skia;
    }

    return true;
  } catch (error) {
    console.error('Failed to load native modules:', error);
    throw new Error('Native modules not available. Ensure you are using a development build.');
  }
};

/**
 * Face Blur Service Implementation
 */
export class FaceBlurService implements IFaceBlurService {
  private isInitialized = false;
  private error: string | null = null;

  /**
   * Initialize face blur service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loadNativeModules();
      this.isInitialized = true;
      this.error = null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Face blur initialization failed:', error);
      this.error = errorMessage;

      if (errorMessage.includes('Expo Go')) {
        Alert.alert(
          'Feature Unavailable',
          'Face blur requires a development build. Please build the app with "npx expo run:ios" or "npx expo run:android".',
        );
      } else {
        Alert.alert('Initialization Error', `Face blur setup failed: ${errorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Check if face blur is available
   */
  async isAvailable(): Promise<boolean> {
    if (IS_EXPO_GO) return false;

    try {
      await loadNativeModules();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process video with face blur
   * NOTE: This is a post-processing implementation
   * Real-time face blur during recording requires frame processors (see useRealtimeFaceBlur)
   */
  async processVideo(videoUri: string, options: FaceBlurOptions = {}): Promise<FaceBlurResult> {
    const { blurIntensity = 25, onProgress } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    onProgress?.(0, 'Initializing face blur...');

    try {
      // TODO: Implement on-device face blur service for post-processing
      // For now, return the original video
      console.log('On-device face blur not yet implemented - returning original video');

      onProgress?.(100, 'Video processing complete (face blur not applied)');

      Alert.alert('Face Blur Not Available', 'Face blur processing is not yet implemented. The original video has been returned.');

      return {
        uri: videoUri,
        facesDetected: 0,
        framesProcessed: 0,
        duration: 0,
        faceBlurApplied: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Face blur processing failed:', error);
      this.error = errorMessage;

      Alert.alert('Processing Error', `Face blur failed: ${errorMessage}. Returning original video.`);

      // Return original video with error state
      return {
        uri: videoUri,
        facesDetected: 0,
        framesProcessed: 0,
        duration: 0,
        faceBlurApplied: false,
      };
    }
  }

  /**
   * Create frame processor for real-time face blur
   * NOTE: ML Kit requires image files, not raw frames
   * For production use, consider server-side processing or specialized plugins
   */
  createFrameProcessor(blurIntensity: number = 15): any | null {
    if (!this.isInitialized) {
      console.warn('Face blur not initialized. Call initialize() first.');
      return null;
    }

    console.warn(
      'Real-time face blur with ML Kit is computationally expensive. ' +
        'Consider post-processing or using a specialized frame processor plugin.',
    );

    // Return null for now - real implementation would need:
    // - Frame to image conversion
    // - Temp file management
    // - Async ML Kit detection (can't be done in worklet)
    // - Performance optimization
    return null;
  }

  /**
   * Get current error state
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Reset error state
   */
  resetError(): void {
    this.error = null;
  }

  /**
   * Get initialization state
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Singleton instance
 */
let faceBlurServiceInstance: FaceBlurService | null = null;

/**
 * Get face blur service instance
 */
export const getFaceBlurService = (): FaceBlurService => {
  if (!faceBlurServiceInstance) {
    faceBlurServiceInstance = new FaceBlurService();
  }
  return faceBlurServiceInstance;
};

/**
 * Check if face blur is available
 */
export const isFaceBlurAvailable = async (): Promise<boolean> => {
  if (IS_EXPO_GO) return false;

  try {
    await loadNativeModules();
    return true;
  } catch {
    return false;
  }
};

/**
 * Request camera permissions for face blur
 */
export const requestFaceBlurPermissions = async (): Promise<boolean> => {
  try {
    await loadNativeModules();

    const cameraPermission = await Camera.requestCameraPermission();
    const microphonePermission = await Camera.requestMicrophonePermission();

    return cameraPermission === 'granted' && microphonePermission === 'granted';
  } catch (error) {
    console.error('Failed to request permissions:', error);
    return false;
  }
};

export default FaceBlurService;
