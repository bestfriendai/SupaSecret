/**
 * Unified Video Service for September 2025
 * Combines Vision Camera v4, Expo Video, and FFmpeg processing
 * Compatible with Reanimated v4 and supports Expo Go fallbacks
 */

import React from 'react';
import { Platform } from 'react-native';
import { isExpoGo, hasVideoProcessing, environmentDetector } from '../utils/environmentDetector';
import { videoProcessor } from './ModernVideoProcessor';
import { getVisionCameraProcessor, VisionCameraProcessor } from './VisionCameraProcessor';

export interface UnifiedVideoCapabilities {
  recording: {
    visionCamera: boolean;  // High-quality recording with Vision Camera v4
    expoCamera: boolean;    // Fallback recording with Expo Camera
    ffmpeg: boolean;        // Post-processing with FFmpeg
  };
  effects: {
    realtimeFaceBlur: boolean;  // Vision Camera frame processor
    realtimeFilters: boolean;   // Skia integration
    postProcessBlur: boolean;   // FFmpeg blur
    postProcessTrim: boolean;   // FFmpeg trim
    postProcessCompress: boolean; // FFmpeg compression
  };
  playback: {
    expoVideo: boolean;     // Expo Video player
    streaming: boolean;     // HLS/DASH support
    controls: boolean;      // Native controls
  };
  animation: {
    reanimatedV4: boolean;  // Reanimated v4 support
    worklets: boolean;      // Worklets support
    gestureHandler: boolean; // Gesture support
  };
}

export class UnifiedVideoService {
  private static instance: UnifiedVideoService | null = null;
  private static initializationPromise: Promise<UnifiedVideoService> | null = null;
  private visionCameraProcessor: VisionCameraProcessor | null = null;
  private capabilities: UnifiedVideoCapabilities | null = null;
  private initialized = false;

  static async getInstance(): Promise<UnifiedVideoService> {
    // If already initialized, return the instance
    if (this.instance && this.instance.initialized) {
      return this.instance;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = (async () => {
      try {
        const service = new UnifiedVideoService();
        await service.initialize();
        this.instance = service;
        return service;
      } catch (error) {
        // Clear promise on failure to allow retry
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  private async initialize() {
    // Initialize Vision Camera if available
    if (!isExpoGo()) {
      try {
        this.visionCameraProcessor = await getVisionCameraProcessor();
      } catch (error) {
        console.log('Vision Camera not available, using fallbacks');
      }
    }

    // Detect capabilities
    this.capabilities = this.detectCapabilities();

    // Mark as initialized
    this.initialized = true;

    if (__DEV__) {
      this.logCapabilities();
    }
  }

  private detectCapabilities(): UnifiedVideoCapabilities {
    const env = environmentDetector.getEnvironmentInfo();
    const visionCameraAvailable = this.visionCameraProcessor?.isAvailable() || false;

    return {
      recording: {
        visionCamera: visionCameraAvailable,
        expoCamera: true, // Always available
        ffmpeg: env.features.ffmpeg,
      },
      effects: {
        realtimeFaceBlur: visionCameraAvailable && env.features.mlKit,
        realtimeFilters: visionCameraAvailable && Platform.OS !== 'web',
        postProcessBlur: env.features.ffmpeg,
        postProcessTrim: env.features.ffmpeg,
        postProcessCompress: env.features.ffmpeg,
      },
      playback: {
        expoVideo: true,
        streaming: true,
        controls: true,
      },
      animation: {
        reanimatedV4: true, // We're using v4
        worklets: !isExpoGo(), // Not in Expo Go
        gestureHandler: true,
      },
    };
  }

  /**
   * Get video recording component based on availability
   */
  getRecordingComponent() {
    if (this.capabilities?.recording.visionCamera) {
      // Return Vision Camera v4 components
      return this.visionCameraProcessor?.getCameraComponents();
    }

    // Return Expo Camera fallback
    return {
      Camera: null, // Would import expo-camera here
      isVisionCamera: false,
      isExpoCamera: true,
    };
  }

  /**
   * Record video with best available method
   */
  async recordVideo(options: {
    camera?: any; // Camera ref
    quality?: 'low' | 'medium' | 'high';
    maxDuration?: number;
    onProgress?: (progress: number) => void;
    onFinished?: (video: { uri: string; duration: number }) => void;
    onError?: (error: any) => void;
  }) {
    // Use Vision Camera if available
    if (this.capabilities?.recording.visionCamera && options.camera) {
      return this.visionCameraProcessor?.recordVideo(options.camera, {
        onRecordingFinished: async (video) => {
          // Process the recorded video
          const processed = await this.processVideo(video.path, {
            quality: options.quality,
          });
          options.onFinished?.(processed);
        },
        onRecordingError: options.onError,
      });
    }

    // Fallback to Expo Camera
    console.log('Using Expo Camera fallback for recording');
    // Implementation would go here
  }

  /**
   * Process video with all available methods
   */
  async processVideo(
    videoUri: string,
    options: {
      quality?: 'low' | 'medium' | 'high';
      blur?: boolean;
      trim?: { start: number; end: number };
      effects?: string[];
    } = {}
  ): Promise<{
    uri: string;
    duration: number;
    width?: number;
    height?: number;
    thumbnail?: string;
  }> {
    // Check if we can use FFmpeg
    if (this.capabilities?.effects.postProcessCompress) {
      const processed = await videoProcessor.processVideo(
        videoUri,
        {
          quality: options.quality || 'high',
        }
      );

      return {
        uri: processed.uri,
        duration: processed.duration,
        width: processed.width,
        height: processed.height,
        thumbnail: processed.thumbnail,
      };
    }

    // Fallback for Expo Go - minimal processing
    console.log('Using minimal processing in Expo Go');

    // Generate thumbnail at least
    let thumbnail: string | undefined;
    try {
      const VideoThumbnails = await import('expo-video-thumbnails');
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.8,
      });
      thumbnail = uri;
    } catch (error) {
      console.warn('Thumbnail generation failed:', error);
    }

    return {
      uri: videoUri,
      duration: 60, // Default duration
      thumbnail,
    };
  }

  /**
   * Create a frame processor for real-time effects
   * Works with Reanimated v4 worklets
   */
  createFrameProcessor(effect: 'blur' | 'filter' | 'custom', customProcessor?: (frame: any) => void) {
    'worklet';

    if (!this.capabilities?.effects.realtimeFaceBlur) {
      console.log('Frame processors not available');
      return null;
    }

    switch (effect) {
      case 'blur':
        return this.visionCameraProcessor?.createFaceBlurProcessor();
      case 'custom':
        if (customProcessor) {
          return this.visionCameraProcessor?.createFrameProcessor(customProcessor);
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Get video player component
   */
  getVideoPlayer() {
    // Always use Expo Video for playback
    return {
      VideoView: require('expo-video').VideoView,
      useVideoPlayer: require('expo-video').useVideoPlayer,
      isExpoVideo: true,
    };
  }

  /**
   * Check and request permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (this.visionCameraProcessor) {
      return this.visionCameraProcessor.requestPermissions();
    }

    // Fallback to Expo permissions
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): UnifiedVideoCapabilities | null {
    if (!this.initialized) {
      console.warn('UnifiedVideoService not initialized. Call getInstance() first.');
      return null;
    }
    return this.capabilities;
  }

  /**
   * Log capabilities for debugging
   */
  private logCapabilities() {
    console.log('📹 Unified Video Service Capabilities:');
    console.log('=====================================');
    console.log('Recording:');
    console.log(`  Vision Camera v4: ${this.capabilities?.recording.visionCamera ? '✅' : '❌'}`);
    console.log(`  Expo Camera: ${this.capabilities?.recording.expoCamera ? '✅' : '❌'}`);
    console.log(`  FFmpeg: ${this.capabilities?.recording.ffmpeg ? '✅' : '❌'}`);
    console.log('');
    console.log('Real-time Effects:');
    console.log(`  Face Blur: ${this.capabilities?.effects.realtimeFaceBlur ? '✅' : '❌'}`);
    console.log(`  Filters: ${this.capabilities?.effects.realtimeFilters ? '✅' : '❌'}`);
    console.log('');
    console.log('Post-processing:');
    console.log(`  Blur: ${this.capabilities?.effects.postProcessBlur ? '✅' : '❌'}`);
    console.log(`  Trim: ${this.capabilities?.effects.postProcessTrim ? '✅' : '❌'}`);
    console.log(`  Compress: ${this.capabilities?.effects.postProcessCompress ? '✅' : '❌'}`);
    console.log('');
    console.log('Animation:');
    console.log(`  Reanimated v4: ${this.capabilities?.animation.reanimatedV4 ? '✅' : '❌'}`);
    console.log(`  Worklets: ${this.capabilities?.animation.worklets ? '✅' : '❌'}`);
    console.log('=====================================');
  }

  /**
   * Check if a specific feature is available
   */
  isFeatureAvailable(feature: keyof UnifiedVideoCapabilities['effects'] | keyof UnifiedVideoCapabilities['recording']): boolean {
    const effects = this.capabilities?.effects as any;
    const recording = this.capabilities?.recording as any;

    return effects?.[feature] || recording?.[feature] || false;
  }

  /**
   * Get recommendation for current environment
   */
  getEnvironmentRecommendation(): string {
    if (isExpoGo()) {
      return 'You are in Expo Go. Basic video features are available. For full features, create a development build.';
    }

    if (!this.capabilities?.recording.visionCamera) {
      return 'Vision Camera not available. Using Expo Camera for recording. Consider installing Vision Camera for better quality.';
    }

    if (!this.capabilities?.effects.postProcessCompress) {
      return 'FFmpeg not available. Video compression and advanced processing disabled.';
    }

    return 'All video features are available! You have Vision Camera v4, FFmpeg, and Reanimated v4.';
  }
}

// Export singleton getter
export const getUnifiedVideoService = () => UnifiedVideoService.getInstance();

// Export convenience hooks for React components
export const useVideoCapabilities = () => {
  const [capabilities, setCapabilities] = React.useState<UnifiedVideoCapabilities | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    getUnifiedVideoService()
      .then(service => {
        if (!cancelled) {
          setCapabilities(service.getCapabilities());
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Failed to get video capabilities:', error);
          setCapabilities(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return capabilities;
};

export const useVideoRecorder = () => {
  const [service, setService] = React.useState<UnifiedVideoService | null>(null);

  React.useEffect(() => {
    getUnifiedVideoService().then(setService);
  }, []);

  return {
    record: service?.recordVideo.bind(service),
    process: service?.processVideo.bind(service),
    requestPermissions: service?.requestPermissions.bind(service),
    getComponents: service?.getRecordingComponent.bind(service),
    isReady: !!service,
  };
};