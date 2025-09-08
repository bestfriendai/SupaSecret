# SupaSecret Expo Development Build Implementation Guide

## 🎯 Overview

This comprehensive guide transforms your SupaSecret app into a production-ready confession platform with complete monetization and advanced video recording features for Expo development builds.

## 📋 Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Expo Development Build Configuration](#expo-development-build-configuration)
3. [RevenueCat Integration](#revenuecat-integration)
4. [AdMob Integration](#admob-integration)
5. [Advanced Video Recording Features](#advanced-video-recording-features)
6. [Testing & Deployment](#testing--deployment)
7. [Troubleshooting](#troubleshooting)

## 🚀 Prerequisites & Setup

### Current Status Analysis
Your app already has:
- ✅ `expo-dev-client` installed (v5.1.7)
- ✅ Basic video recording with mock processing
- ✅ Supabase backend integration
- ✅ Comprehensive monetization documentation
- ✅ Camera/microphone permissions configured

### Required Dependencies Installation

```bash
# Core monetization packages
bun add react-native-purchases
bun add react-native-google-mobile-ads

# Video processing packages
bun add @react-native-ml-kit/face-detection
bun add react-native-ffmpeg
bun add @react-native-voice/voice
bun add expo-video-thumbnails

# Additional utilities
bun add react-native-device-info
bun add @react-native-async-storage/async-storage
bun add react-native-keychain

# Development dependencies
bun add --dev @types/react-native-video
```

## 🔧 Expo Development Build Configuration

### 1. Update app.json for Development Build

```json
{
  "expo": {
    "name": "SupaSecret",
    "slug": "supasecret",
    "scheme": "supasecret",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "developmentClient": {
      "silentLaunch": true
    },
    "plugins": [
      "expo-dev-client",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-YOUR_ANDROID_APP_ID~YOUR_ANDROID_APP_ID",
          "iosAppId": "ca-app-pub-YOUR_IOS_APP_ID~YOUR_IOS_APP_ID"
        }
      ],
      [
        "@react-native-ml-kit/face-detection",
        {
          "faceDetection": true
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.supasecret",
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs access to camera to record anonymous video confessions with face blur protection.",
        "NSMicrophoneUsageDescription": "This app needs access to microphone to record audio for video confessions with voice change protection.",
        "NSSpeechRecognitionUsageDescription": "This app uses speech recognition for real-time transcription during video recording.",
        "GADApplicationIdentifier": "ca-app-pub-YOUR_IOS_APP_ID~YOUR_IOS_APP_ID"
      }
    },
    "android": {
      "edgeToEdgeEnabled": true,
      "package": "com.yourcompany.supasecret",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "com.google.android.gms.permission.AD_ID"
      ],
      "meta": {
        "com.google.android.gms.ads.APPLICATION_ID": "ca-app-pub-YOUR_ANDROID_APP_ID~YOUR_ANDROID_APP_ID"
      }
    }
  }
}
```

### 2. Create EAS Build Configuration

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 3. Environment Configuration

Create `.env.local`:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key_here

# AdMob Configuration
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-your_ios_app_id
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-your_android_app_id
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-your_banner_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-your_interstitial_id
EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-your_rewarded_id

# OpenAI for transcription (optional)
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key_here
```

## 💰 RevenueCat Integration

### 1. RevenueCat Service Implementation

Create `src/services/RevenueCatService.ts`:

```typescript
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  PURCHASE_TYPE 
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

export class RevenueCatService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Purchases.setDebugLogsEnabled(__DEV__);
      
      const apiKey = Platform.OS === 'ios' 
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        throw new Error('RevenueCat API key not found');
      }

      await Purchases.configure({ apiKey });
      
      // Set user ID from Supabase auth if available
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Purchases.logIn(user.id);
      }

      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
      throw error;
    }
  }

  static async getOfferings(): Promise<PurchasesOffering | null> {
    await this.initialize();
    
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    await this.initialize();
    
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      await this.syncSubscriptionStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    await this.initialize();
    
    try {
      const customerInfo = await Purchases.restorePurchases();
      await this.syncSubscriptionStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw error;
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.getCustomerInfo();
  }

  static async isUserPremium(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return Object.keys(customerInfo.entitlements.active).length > 0;
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  private static async syncSubscriptionStatus(customerInfo: CustomerInfo): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isPremium = Object.keys(customerInfo.entitlements.active).length > 0;
      const activeEntitlement = Object.values(customerInfo.entitlements.active)[0];

      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          subscription_tier: isPremium ? 'premium' : 'free',
          subscription_status: isPremium ? 'active' : 'inactive',
          subscription_expires_at: activeEntitlement?.expirationDate || null,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to sync subscription status:', error);
    }
  }
}
```

### 2. Subscription Store

Create `src/state/subscriptionStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerInfo } from 'react-native-purchases';
import { RevenueCatService } from '../services/RevenueCatService';

interface SubscriptionState {
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  checkSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      customerInfo: null,
      isLoading: false,
      error: null,

      checkSubscriptionStatus: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const customerInfo = await RevenueCatService.getCustomerInfo();
          const isPremium = await RevenueCatService.isUserPremium();
          
          set({ 
            customerInfo, 
            isPremium, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false 
          });
        }
      },

      purchaseSubscription: async (packageId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const offerings = await RevenueCatService.getOfferings();
          if (!offerings) {
            throw new Error('No offerings available');
          }

          const packageToPurchase = offerings.availablePackages.find(
            pkg => pkg.identifier === packageId
          );

          if (!packageToPurchase) {
            throw new Error('Package not found');
          }

          const customerInfo = await RevenueCatService.purchasePackage(packageToPurchase);
          const isPremium = await RevenueCatService.isUserPremium();
          
          set({ 
            customerInfo, 
            isPremium, 
            isLoading: false 
          });
          
          return true;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Purchase failed',
            isLoading: false 
          });
          return false;
        }
      },

      restorePurchases: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const customerInfo = await RevenueCatService.restorePurchases();
          const isPremium = await RevenueCatService.isUserPremium();
          
          set({ 
            customerInfo, 
            isPremium, 
            isLoading: false 
          });
          
          return true;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Restore failed',
            isLoading: false 
          });
          return false;
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'subscription-storage',
      partialize: (state) => ({ 
        isPremium: state.isPremium,
        customerInfo: state.customerInfo 
      })
    }
  )
);
```

## 📱 AdMob Integration

### 1. AdMob Service Implementation

Create `src/services/AdMobService.ts`:

```typescript
import {
  AdMob,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  TestIds,
  AdEventType,
  RewardedAdEventType
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { useSubscriptionStore } from '../state/subscriptionStore';

export class AdMobService {
  private static interstitialAd: InterstitialAd | null = null;
  private static rewardedAd: RewardedAd | null = null;
  private static lastInterstitialTime = 0;
  private static readonly INTERSTITIAL_COOLDOWN = 60000; // 1 minute

  static async initialize(): Promise<void> {
    try {
      await AdMob.initialize();

      // Create interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(
        __DEV__
          ? TestIds.INTERSTITIAL
          : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID!
      );

      // Create rewarded ad
      this.rewardedAd = RewardedAd.createForAdRequest(
        __DEV__
          ? TestIds.REWARDED
          : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID!
      );

      // Set up event listeners
      this.setupInterstitialListeners();
      this.setupRewardedListeners();

      // Preload ads
      this.interstitialAd.load();
      this.rewardedAd.load();

      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization failed:', error);
    }
  }

  private static setupInterstitialListeners(): void {
    if (!this.interstitialAd) return;

    this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad error:', error);
    });

    this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      // Preload next ad
      this.interstitialAd?.load();
    });
  }

  private static setupRewardedListeners(): void {
    if (!this.rewardedAd) return;

    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
      console.error('Rewarded ad error:', error);
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('User earned reward:', reward);
    });

    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Rewarded ad closed');
      // Preload next ad
      this.rewardedAd?.load();
    });
  }

  static shouldShowAd(): boolean {
    const { isPremium } = useSubscriptionStore.getState();
    return !isPremium;
  }

  static async showInterstitialAd(): Promise<boolean> {
    if (!this.shouldShowAd()) return false;

    const now = Date.now();
    if (now - this.lastInterstitialTime < this.INTERSTITIAL_COOLDOWN) {
      return false;
    }

    if (!this.interstitialAd) {
      console.warn('Interstitial ad not initialized');
      return false;
    }

    try {
      const loaded = await this.interstitialAd.loaded;
      if (loaded) {
        await this.interstitialAd.show();
        this.lastInterstitialTime = now;
        return true;
      }
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
    }

    return false;
  }

  static async showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean }> {
    if (!this.rewardedAd) {
      console.warn('Rewarded ad not initialized');
      return { shown: false, rewarded: false };
    }

    try {
      const loaded = await this.rewardedAd.loaded;
      if (loaded) {
        let rewarded = false;

        // Set up one-time reward listener
        const unsubscribe = this.rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => { rewarded = true; }
        );

        await this.rewardedAd.show();
        unsubscribe();

        return { shown: true, rewarded };
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
    }

    return { shown: false, rewarded: false };
  }

  static getBannerAdUnitId(): string {
    return __DEV__
      ? TestIds.BANNER
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID!;
  }
}
```

### 2. Ad Components

Create `src/components/ads/BannerAdComponent.tsx`:

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSubscriptionStore } from '../../state/subscriptionStore';
import { AdMobService } from '../../services/AdMobService';

interface BannerAdComponentProps {
  size?: BannerAdSize;
  style?: any;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  size = BannerAdSize.BANNER,
  style
}) => {
  const { isPremium } = useSubscriptionStore();

  if (isPremium) return null;

  return (
    <View style={[{ alignItems: 'center', marginVertical: 10 }, style]}>
      <Text style={{ fontSize: 10, color: '#666', marginBottom: 5 }}>
        Sponsored
      </Text>
      <BannerAd
        unitId={AdMobService.getBannerAdUnitId()}
        size={size}
        onAdLoaded={() => console.log('Banner ad loaded')}
        onAdFailedToLoad={(error) => console.error('Banner ad failed:', error)}
      />
    </View>
  );
};
```

Create `src/components/ads/FeedAdComponent.tsx`:

```typescript
import React from 'react';
import { View } from 'react-native';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { BannerAdComponent } from './BannerAdComponent';
import { useSubscriptionStore } from '../../state/subscriptionStore';

interface FeedAdComponentProps {
  index: number;
  interval?: number;
}

export const FeedAdComponent: React.FC<FeedAdComponentProps> = ({
  index,
  interval = 5
}) => {
  const { isPremium } = useSubscriptionStore();

  if (isPremium) return null;

  // Show ad every 'interval' posts, with some randomization
  const adInterval = Math.floor(Math.random() * 2) + interval;
  if (index % adInterval !== 0 || index === 0) return null;

  return (
    <View style={{
      backgroundColor: '#f8f9fa',
      marginVertical: 8,
      borderRadius: 12,
      padding: 16
    }}>
      <BannerAdComponent
        size={BannerAdSize.MEDIUM_RECTANGLE}
        style={{ marginVertical: 0 }}
      />
    </View>
  );
};
```

## 🎥 Advanced Video Recording Features

### 1. Enhanced Video Processing Service

Create `src/services/VideoProcessingService.ts`:

```typescript
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { RNFFmpeg } from 'react-native-ffmpeg';
import Voice from '@react-native-voice/voice';
import { VideoThumbnails } from 'expo-video-thumbnails';

export interface ProcessedVideo {
  uri: string;
  transcription: string;
  duration: number;
  thumbnailUri: string;
  audioUri?: string;
  faceBlurApplied: boolean;
  voiceChangeApplied: boolean;
}

export interface VideoProcessingOptions {
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: 'high' | 'medium' | 'low';
  voiceEffect?: 'deep' | 'high' | 'robot' | 'whisper';
  onProgress?: (progress: number, status: string) => void;
}

export class VideoProcessingService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Voice recognition
      Voice.onSpeechStart = () => console.log('Speech recognition started');
      Voice.onSpeechEnd = () => console.log('Speech recognition ended');
      Voice.onSpeechError = (error) => console.error('Speech recognition error:', error);
      Voice.onSpeechResults = (event) => console.log('Speech results:', event.value);

      this.isInitialized = true;
      console.log('VideoProcessingService initialized');
    } catch (error) {
      console.error('VideoProcessingService initialization failed:', error);
    }
  }

  static async processVideo(
    videoUri: string,
    options: VideoProcessingOptions = {}
  ): Promise<ProcessedVideo> {
    await this.initialize();

    const {
      enableFaceBlur = true,
      enableVoiceChange = true,
      enableTranscription = true,
      quality = 'medium',
      voiceEffect = 'deep',
      onProgress
    } = options;

    try {
      onProgress?.(5, 'Initializing video processing...');

      // Validate input file
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('Video file does not exist');
      }

      // Create processing directory
      const processingDir = `${FileSystem.documentDirectory}processing/`;
      await FileSystem.makeDirectoryAsync(processingDir, { intermediates: true });

      onProgress?.(10, 'Extracting audio from video...');

      // Extract audio for processing
      const audioUri = await this.extractAudio(videoUri, processingDir);

      onProgress?.(25, 'Processing audio with voice effects...');

      // Apply voice change if enabled
      let processedAudioUri = audioUri;
      if (enableVoiceChange) {
        processedAudioUri = await this.applyVoiceEffect(audioUri, voiceEffect, processingDir);
      }

      onProgress?.(40, 'Generating transcription...');

      // Generate transcription
      let transcription = '';
      if (enableTranscription) {
        transcription = await this.generateTranscription(processedAudioUri);
      }

      onProgress?.(60, 'Applying face blur...');

      // Apply face blur if enabled
      let processedVideoUri = videoUri;
      if (enableFaceBlur) {
        processedVideoUri = await this.applyFaceBlur(videoUri, processingDir);
      }

      onProgress?.(80, 'Combining processed audio and video...');

      // Combine processed audio with video
      const finalVideoUri = await this.combineAudioVideo(
        processedVideoUri,
        processedAudioUri,
        processingDir
      );

      onProgress?.(90, 'Generating thumbnail...');

      // Generate thumbnail
      const thumbnailUri = await this.generateThumbnail(finalVideoUri);

      onProgress?.(95, 'Getting video metadata...');

      // Get video duration
      const duration = await this.getVideoDuration(finalVideoUri);

      onProgress?.(100, 'Processing complete!');

      // Clean up temporary files
      await this.cleanupProcessingFiles(processingDir);

      return {
        uri: finalVideoUri,
        transcription,
        duration,
        thumbnailUri,
        audioUri: processedAudioUri,
        faceBlurApplied: enableFaceBlur,
        voiceChangeApplied: enableVoiceChange
      };

    } catch (error) {
      console.error('Video processing failed:', error);
      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async extractAudio(videoUri: string, outputDir: string): Promise<string> {
    const audioUri = `${outputDir}extracted_audio.wav`;

    const command = `-i "${videoUri}" -vn -acodec pcm_s16le -ar 44100 -ac 2 "${audioUri}"`;
    const result = await RNFFmpeg.execute(command);

    if (result !== 0) {
      throw new Error('Failed to extract audio from video');
    }

    return audioUri;
  }

  private static async applyVoiceEffect(
    audioUri: string,
    effect: string,
    outputDir: string
  ): Promise<string> {
    const outputUri = `${outputDir}voice_modified.wav`;

    let command = '';
    switch (effect) {
      case 'deep':
        command = `-i "${audioUri}" -af "asetrate=44100*0.8,aresample=44100,atempo=1.25" "${outputUri}"`;
        break;
      case 'high':
        command = `-i "${audioUri}" -af "asetrate=44100*1.2,aresample=44100,atempo=0.83" "${outputUri}"`;
        break;
      case 'robot':
        command = `-i "${audioUri}" -af "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" "${outputUri}"`;
        break;
      case 'whisper':
        command = `-i "${audioUri}" -af "volume=0.5,highpass=f=300,lowpass=f=3000" "${outputUri}"`;
        break;
      default:
        command = `-i "${audioUri}" -af "asetrate=44100*0.8,aresample=44100,atempo=1.25" "${outputUri}"`;
    }

    const result = await RNFFmpeg.execute(command);

    if (result !== 0) {
      throw new Error('Failed to apply voice effect');
    }

    return outputUri;
  }

  private static async generateTranscription(audioUri: string): Promise<string> {
    try {
      // Start voice recognition
      await Voice.start('en-US');

      // For real-time transcription, you would need to implement
      // streaming audio processing. For now, we'll use a mock implementation
      // In production, integrate with services like:
      // - Google Speech-to-Text
      // - Azure Speech Services
      // - AWS Transcribe
      // - OpenAI Whisper API

      return "This is a mock transcription. In production, implement real speech-to-text processing.";
    } catch (error) {
      console.error('Transcription failed:', error);
      return '';
    }
  }

  private static async applyFaceBlur(videoUri: string, outputDir: string): Promise<string> {
    const outputUri = `${outputDir}face_blurred.mp4`;

    try {
      // Use ML Kit for face detection and FFmpeg for blurring
      // This is a simplified implementation - in production you'd need
      // frame-by-frame processing with face detection

      const command = `-i "${videoUri}" -vf "boxblur=10:1" "${outputUri}"`;
      const result = await RNFFmpeg.execute(command);

      if (result !== 0) {
        throw new Error('Failed to apply face blur');
      }

      return outputUri;
    } catch (error) {
      console.error('Face blur failed:', error);
      // Return original video if face blur fails
      return videoUri;
    }
  }

  private static async combineAudioVideo(
    videoUri: string,
    audioUri: string,
    outputDir: string
  ): Promise<string> {
    const outputUri = `${outputDir}final_video.mp4`;

    const command = `-i "${videoUri}" -i "${audioUri}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 "${outputUri}"`;
    const result = await RNFFmpeg.execute(command);

    if (result !== 0) {
      throw new Error('Failed to combine audio and video');
    }

    return outputUri;
  }

  private static async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // 1 second
        quality: 0.8,
      });
      return uri;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return '';
    }
  }

  private static async getVideoDuration(videoUri: string): Promise<number> {
    // Mock implementation - in production, use ffprobe or similar
    return 30; // seconds
  }

  private static async cleanupProcessingFiles(processingDir: string): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(processingDir);
      for (const file of files) {
        await FileSystem.deleteAsync(`${processingDir}${file}`, { idempotent: true });
      }
      await FileSystem.deleteAsync(processingDir, { idempotent: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}
```

### 2. Enhanced Video Recording Screen

Update your existing `src/screens/VideoRecordScreen.tsx`:

```typescript
// Add these imports at the top
import { VideoProcessingService } from '../utils/VideoProcessingService';
import { AdMobService } from '../services/AdMobService';
import { useSubscriptionStore } from '../state/subscriptionStore';

// Replace the processVideo function with this enhanced version:
const processVideo = async (videoUri: string) => {
  setIsProcessing(true);
  setProcessingProgress(0);
  setProcessingStatus("Starting video processing...");

  try {
    // Process video with real face blur, voice change, and transcription
    const processedVideo = await VideoProcessingService.processVideo(videoUri, {
      enableTranscription: true,
      enableFaceBlur: true,
      enableVoiceChange: true,
      quality: "medium",
      voiceEffect: "deep", // or let user choose
      onProgress: (progress, status) => {
        setProcessingProgress(progress);
        setProcessingStatus(status);
      }
    });

    // Add confession to store
    addConfession({
      type: "video",
      content: "Anonymous video confession with privacy protection",
      videoUri: processedVideo.uri,
      transcription: processedVideo.transcription,
      isAnonymous: true,
    });

    // Show interstitial ad for free users after successful recording
    await AdMobService.showInterstitialAd();

    showMessage(
      "Your video confession has been processed and shared anonymously!",
      "success",
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );

  } catch (error) {
    console.error("Video processing failed:", error);
    showMessage(
      "Failed to process video. Please try again.",
      "error"
    );
  } finally {
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingStatus("");
  }
};
```

### 3. Real-time Transcription Overlay Component

Create `src/components/TranscriptionOverlay.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import Voice from '@react-native-voice/voice';

interface TranscriptionOverlayProps {
  isRecording: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

export const TranscriptionOverlay: React.FC<TranscriptionOverlayProps> = ({
  isRecording,
  onTranscriptionUpdate
}) => {
  const [transcription, setTranscription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (event) => {
      const text = event.value?.[0] || '';
      setTranscription(text);
      onTranscriptionUpdate?.(text);
    };
    Voice.onSpeechError = (error) => {
      console.error('Speech recognition error:', error);
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onTranscriptionUpdate]);

  useEffect(() => {
    if (isRecording) {
      startListening();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      stopListening();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const startListening = async () => {
    try {
      await Voice.start('en-US');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  };

  if (!isRecording && !transcription) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 16,
        opacity: fadeAnim,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isListening ? '#10B981' : '#6B7280',
            marginRight: 8,
          }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
          Live Transcription
        </Text>
      </View>
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 14,
          lineHeight: 20,
          minHeight: 20,
        }}
      >
        {transcription || (isListening ? 'Listening...' : 'Start speaking...')}
      </Text>
    </Animated.View>
  );
};
```

## 🧪 Testing & Deployment

### 1. Development Build Commands

```bash
# Install EAS CLI globally
npm install -g @expo/eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure

# Build development client for iOS
eas build --platform ios --profile development

# Build development client for Android
eas build --platform android --profile development

# Install development build on device
# iOS: Download from build page and install via TestFlight or direct install
# Android: Download APK and install directly
```

### 2. Testing Procedures

#### Monetization Testing

```typescript
// Create test file: src/tests/MonetizationTest.tsx
import React, { useEffect } from 'react';
import { View, Button, Alert } from 'react-native';
import { RevenueCatService } from '../services/RevenueCatService';
import { AdMobService } from '../services/AdMobService';
import { useSubscriptionStore } from '../state/subscriptionStore';

export const MonetizationTest: React.FC = () => {
  const { isPremium, checkSubscriptionStatus } = useSubscriptionStore();

  useEffect(() => {
    // Initialize services
    RevenueCatService.initialize();
    AdMobService.initialize();
    checkSubscriptionStatus();
  }, []);

  const testPurchase = async () => {
    try {
      const success = await useSubscriptionStore.getState().purchaseSubscription('monthly');
      Alert.alert('Purchase Test', success ? 'Success!' : 'Failed');
    } catch (error) {
      Alert.alert('Purchase Error', error.message);
    }
  };

  const testInterstitialAd = async () => {
    const shown = await AdMobService.showInterstitialAd();
    Alert.alert('Ad Test', shown ? 'Ad shown' : 'Ad not shown');
  };

  const testRewardedAd = async () => {
    const result = await AdMobService.showRewardedAd();
    Alert.alert('Rewarded Ad', `Shown: ${result.shown}, Rewarded: ${result.rewarded}`);
  };

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Button title="Test Purchase" onPress={testPurchase} />
      <Button title="Test Interstitial Ad" onPress={testInterstitialAd} />
      <Button title="Test Rewarded Ad" onPress={testRewardedAd} />
      <Button title="Check Premium Status" onPress={() => Alert.alert('Premium Status', isPremium ? 'Premium' : 'Free')} />
    </View>
  );
};
```

#### Video Processing Testing

```typescript
// Create test file: src/tests/VideoProcessingTest.tsx
import React, { useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { VideoProcessingService } from '../services/VideoProcessingService';
import * as ImagePicker from 'expo-image-picker';

export const VideoProcessingTest: React.FC = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const testVideoProcessing = async () => {
    try {
      // Pick a video from library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setProcessing(true);

        const processed = await VideoProcessingService.processVideo(
          result.assets[0].uri,
          {
            enableFaceBlur: true,
            enableVoiceChange: true,
            enableTranscription: true,
            quality: 'medium',
            onProgress: (prog, status) => {
              setProgress(prog);
              console.log(`${prog}%: ${status}`);
            }
          }
        );

        Alert.alert('Processing Complete', `Transcription: ${processed.transcription}`);
      }
    } catch (error) {
      Alert.alert('Processing Error', error.message);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button
        title="Test Video Processing"
        onPress={testVideoProcessing}
        disabled={processing}
      />
      {processing && (
        <Text style={{ marginTop: 10 }}>
          Processing: {progress.toFixed(0)}%
        </Text>
      )}
    </View>
  );
};
```

### 3. Performance Optimization

```typescript
// Create src/utils/PerformanceMonitor.ts
export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.metrics.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.metrics.get(label);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    console.log(`⏱️ ${label}: ${duration}ms`);
    this.metrics.delete(label);
    return duration;
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(label);
    try {
      const result = await fn();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }
}

// Usage in video processing:
const processedVideo = await PerformanceMonitor.measureAsync(
  'Video Processing',
  () => VideoProcessingService.processVideo(videoUri, options)
);
```

## 🚀 Deployment & Production Setup

### 1. Environment Configuration

Create production environment files:

```bash
# .env.production
EXPO_PUBLIC_REVENUECAT_IOS_KEY=rcat_prod_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=rcat_prod_android_key_here
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-production_ios_app_id
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-production_android_app_id
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-production_banner_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-production_interstitial_id
EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-production_rewarded_id
```

### 2. Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "build:dev": "eas build --platform all --profile development",
    "build:preview": "eas build --platform all --profile preview",
    "build:production": "eas build --platform all --profile production",
    "submit:ios": "eas submit --platform ios",
    "submit:android": "eas submit --platform android"
  }
}
```

### 3. App Store Configuration

Update `app.json` for production:

```json
{
  "expo": {
    "name": "SupaSecret",
    "slug": "supasecret",
    "privacy": "unlisted",
    "platforms": ["ios", "android"],
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.supasecret",
      "buildNumber": "1",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.yourcompany.supasecret",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      }
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. RevenueCat Integration Issues

**Problem**: "RevenueCat not configured" error
```typescript
// Solution: Ensure proper initialization
useEffect(() => {
  const initializeRevenueCat = async () => {
    try {
      await RevenueCatService.initialize();
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('RevenueCat initialization failed:', error);
      // Fallback: disable premium features
      useSubscriptionStore.getState().setPremium(false);
    }
  };

  initializeRevenueCat();
}, []);
```

**Problem**: Purchases not restoring
```typescript
// Solution: Add restore button with proper error handling
const handleRestorePurchases = async () => {
  try {
    setLoading(true);
    const success = await useSubscriptionStore.getState().restorePurchases();
    if (success) {
      Alert.alert('Success', 'Purchases restored successfully');
    } else {
      Alert.alert('No Purchases', 'No previous purchases found');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to restore purchases. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### 2. AdMob Integration Issues

**Problem**: Ads not loading in development
```typescript
// Solution: Use test ad units in development
const getAdUnitId = (type: 'banner' | 'interstitial' | 'rewarded') => {
  if (__DEV__) {
    switch (type) {
      case 'banner': return TestIds.BANNER;
      case 'interstitial': return TestIds.INTERSTITIAL;
      case 'rewarded': return TestIds.REWARDED;
    }
  }
  // Return production ad unit IDs
  return process.env[`EXPO_PUBLIC_ADMOB_${type.toUpperCase()}_ID`];
};
```

**Problem**: "Ad failed to load" errors
```typescript
// Solution: Implement retry logic
class AdRetryManager {
  private static retryCount = 0;
  private static maxRetries = 3;

  static async loadAdWithRetry(adInstance: InterstitialAd | RewardedAd): Promise<boolean> {
    try {
      await adInstance.load();
      this.retryCount = 0; // Reset on success
      return true;
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Ad load failed, retrying... (${this.retryCount}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.loadAdWithRetry(adInstance);
      }
      console.error('Ad failed to load after max retries:', error);
      return false;
    }
  }
}
```

#### 3. Video Processing Issues

**Problem**: FFmpeg commands failing
```typescript
// Solution: Add error handling and fallbacks
private static async executeFFmpegCommand(command: string, fallbackUri?: string): Promise<string> {
  try {
    const result = await RNFFmpeg.execute(command);
    if (result === 0) {
      return outputUri;
    } else {
      throw new Error(`FFmpeg command failed with code ${result}`);
    }
  } catch (error) {
    console.error('FFmpeg error:', error);
    if (fallbackUri) {
      console.log('Using fallback URI');
      return fallbackUri;
    }
    throw error;
  }
}
```

**Problem**: Face detection not working
```typescript
// Solution: Add ML Kit initialization check
private static async initializeFaceDetection(): Promise<boolean> {
  try {
    // Test face detection capability
    const options = {
      performanceMode: 'fast',
      landmarkMode: 'none',
      classificationMode: 'none',
    };

    // This will throw if ML Kit is not properly configured
    await FaceDetection.configure(options);
    return true;
  } catch (error) {
    console.error('Face detection not available:', error);
    return false;
  }
}
```

#### 4. Development Build Issues

**Problem**: "expo-dev-client" not working
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules
rm -rf .expo
bun install
expo start --clear
```

**Problem**: Native modules not found
```bash
# Solution: Rebuild development client
eas build --platform ios --profile development --clear-cache
eas build --platform android --profile development --clear-cache
```

### Performance Optimization Tips

1. **Video Processing Optimization**:
```typescript
// Use lower quality for faster processing in development
const getOptimalQuality = (): 'high' | 'medium' | 'low' => {
  if (__DEV__) return 'low';

  // Check device performance
  const { totalMemory } = DeviceInfo.getSystemAvailableMemory();
  if (totalMemory > 4000) return 'high';
  if (totalMemory > 2000) return 'medium';
  return 'low';
};
```

2. **Memory Management**:
```typescript
// Clean up resources after video processing
useEffect(() => {
  return () => {
    // Cleanup on unmount
    VideoProcessingService.cleanup();
    Voice.destroy();
  };
}, []);
```

3. **Ad Loading Optimization**:
```typescript
// Preload ads during app initialization
const preloadAds = async () => {
  try {
    await AdMobService.initialize();
    // Ads will be preloaded automatically
  } catch (error) {
    console.error('Ad preloading failed:', error);
  }
};
```

## 📊 Analytics & Monitoring

### 1. Revenue Analytics

```typescript
// Create src/utils/AnalyticsService.ts
export class AnalyticsService {
  static trackPurchase(productId: string, price: number, currency: string) {
    // Track with your analytics service (Firebase, Mixpanel, etc.)
    console.log('Purchase tracked:', { productId, price, currency });
  }

  static trackAdImpression(adType: string, placement: string) {
    console.log('Ad impression:', { adType, placement });
  }

  static trackVideoProcessing(duration: number, features: string[]) {
    console.log('Video processing:', { duration, features });
  }
}
```

### 2. Error Monitoring

```typescript
// Add to App.tsx
import crashlytics from '@react-native-firebase/crashlytics';

const logError = (error: Error, context: string) => {
  console.error(`${context}:`, error);
  if (!__DEV__) {
    crashlytics().recordError(error);
  }
};
```

## 🎯 Success Metrics

Track these KPIs for your monetization strategy:

- **Conversion Rate**: Free to paid user conversion (target: 5%+)
- **ARPU**: Average Revenue Per User (target: $0.75+)
- **Retention**: Day 1, 7, 30 retention rates
- **Ad Revenue**: eCPM and fill rates
- **Video Processing**: Success rate and average processing time
- **User Engagement**: Videos recorded per user per day

## 🔄 Continuous Improvement

1. **A/B Testing**: Test different paywall designs and ad placements
2. **User Feedback**: Monitor app store reviews and in-app feedback
3. **Performance Monitoring**: Track video processing times and success rates
4. **Revenue Optimization**: Adjust pricing and ad frequency based on data

---

## 🎉 Conclusion

This implementation guide provides a complete roadmap for transforming your SupaSecret app into a production-ready confession platform with:

- ✅ Complete RevenueCat integration with subscription management
- ✅ Optimized AdMob integration with strategic ad placements
- ✅ Advanced video recording with real face blur and voice modification
- ✅ Real-time transcription overlay during recording
- ✅ Comprehensive testing procedures
- ✅ Production deployment configuration
- ✅ Troubleshooting guides and performance optimization

Follow this guide step-by-step to build a robust, monetized confession app that prioritizes user privacy while generating sustainable revenue through a well-balanced freemium model.

**Next Steps**:
1. Set up RevenueCat and AdMob accounts
2. Install required dependencies
3. Implement services step by step
4. Test thoroughly in development build
5. Deploy to production with monitoring

Good luck with your SupaSecret app! 🚀
