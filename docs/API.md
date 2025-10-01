# API Documentation

This document provides comprehensive API documentation for SupaSecret services and integrations, updated for September 2025 standards and Expo 54 best practices.

## Table of Contents

- [Expo 54 Best Practices](#expo-54-best-practices)
- [RevenueCat Service](#revenuecat-service)
- [AdMob Service](#admob-service)
- [Video Processing Services](#video-processing-services)
- [AI Services](#ai-services)
- [State Management](#state-management)
- [Hooks](#hooks)
- [Utilities](#utilities)
- [Error Handling Patterns](#error-handling-patterns)
- [TypeScript Interfaces](#typescript-interfaces)
- [Supabase Integration](#supabase-integration)

## Expo 54 Best Practices

Expo 54 introduces several key improvements for React Native development:

### Development Workflow

- Use `npx expo start` for development with automatic bundler selection
- Leverage `npx expo prebuild` for native code generation
- Use `npx expo run:ios` and `npx expo run:android` for local compilation
- Enable development builds for full native functionality

### Environment Configuration

```typescript
// .env configuration for Expo 54
EXPO_PUBLIC_ENV = development;
EXPO_PUBLIC_SUPABASE_URL = your_supabase_url;
EXPO_PUBLIC_SUPABASE_ANON_KEY = your_anon_key;
EXPO_PUBLIC_REVENUECAT_API_KEY = your_revenuecat_key;
EXPO_PUBLIC_ADMOB_APP_ID = your_admob_app_id;
```

### Platform-Specific Code

```typescript
import { Platform } from "react-native";

// Platform-specific implementations
const getPlatformSpecificConfig = () => {
  if (Platform.OS === "ios") {
    return {
      /* iOS specific config */
    };
  }
  return {
    /* Android/Web config */
  };
};
```

### Performance Optimizations

- Use Hermes engine for improved JavaScript execution
- Enable bytecode compilation with `EXPO_USE_METRO_REQUIRE=true`
- Use tree shaking for production builds
- Implement proper bundle splitting for web deployments

### Security Best Practices

- Store sensitive keys in EAS Secrets, not environment variables
- Use `expo-secure-store` for local data encryption
- Implement proper authentication flows with Supabase
- Enable SSL pinning for API communications

## RevenueCat Service

The RevenueCat service handles all subscription management and in-app purchases.

### Initialization

```typescript
import { RevenueCatService } from "../services/RevenueCatService";

// Initialize RevenueCat (called automatically in app startup)
await RevenueCatService.initialize();
```

### Methods

#### `initialize(): Promise<void>`

Initializes the RevenueCat SDK with proper configuration.

- **Returns**: Promise that resolves when initialization is complete
- **Throws**: Error if initialization fails

#### `getOfferings(): Promise<RevenueCatOfferings | null>`

Retrieves available subscription offerings from RevenueCat.

- **Returns**: Object containing current and all available offerings, or null if none available
- **Throws**: Error if offerings cannot be retrieved

**Response Structure:**

```typescript
interface RevenueCatOfferings {
  current: RevenueCatOffering | null;
  all: Record<string, RevenueCatOffering>;
}

interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, any>;
  packages: RevenueCatPackage[];
  availablePackages: RevenueCatPackage[];
}

interface RevenueCatPackage {
  identifier: string;
  packageType: string;
  product: RevenueCatProduct;
  offeringIdentifier: string;
}

interface RevenueCatProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  introPrice: RevenueCatProductPrice | null;
}
```

#### `purchasePackage(packageToPurchase: RevenueCatPackage): Promise<RevenueCatPurchaseResult | MockPurchaseResult>`

Purchases a subscription package.

- **Parameters**:
  - `packageToPurchase`: The RevenueCat package to purchase
- **Returns**: Purchase result containing customer info and product identifier
- **Throws**: Error if purchase fails

#### `restorePurchases(): Promise<RevenueCatCustomerInfo | MockPurchaseResult>`

Restores previously purchased subscriptions.

- **Returns**: Customer info with restored subscriptions
- **Throws**: Error if restore fails

#### `getCustomerInfo(): Promise<RevenueCatCustomerResult>`

Retrieves current customer information including active subscriptions.

- **Returns**: Customer info or mock result in demo mode
- **Throws**: Error if customer info cannot be retrieved

#### `isUserPremium(): Promise<boolean>`

Checks if the current user has an active premium subscription.

- **Returns**: `true` if user has premium access, `false` otherwise

#### `setUserID(userID: string): Promise<void>`

Sets the user ID for RevenueCat tracking.

- **Parameters**:
  - `userID`: The user identifier to set

#### `getSubscriptionTiers(): Promise<SubscriptionTier[] | null>`

Retrieves available subscription tiers with pricing and features.

- **Returns**: Array of subscription tiers or null if unavailable

**SubscriptionTier Structure:**

```typescript
interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}
```

### Usage Examples

```typescript
// Check if user is premium
const isPremium = await RevenueCatService.isUserPremium();

// Get available offerings
const offerings = await RevenueCatService.getOfferings();
if (offerings?.current?.availablePackages) {
  const packages = offerings.current.availablePackages;
  // Display packages to user
}

// Purchase a package
try {
  const result = await RevenueCatService.purchasePackage(selectedPackage);
  console.log("Purchase successful:", result);
} catch (error) {
  console.error("Purchase failed:", error);
}

// Restore purchases
try {
  const customerInfo = await RevenueCatService.restorePurchases();
  console.log("Purchases restored:", customerInfo);
} catch (error) {
  console.error("Restore failed:", error);
}
```

## AdMob Service

The AdMob service manages advertising integration including banner, interstitial, and rewarded ads.

### Initialization

```typescript
import { AdMobService } from "../services/AdMobService";

// Initialize AdMob (called automatically in app startup)
await AdMobService.initialize();
```

### Methods

#### `initialize(): Promise<void>`

Initializes the AdMob SDK with proper configuration and consent handling.

- **Returns**: Promise that resolves when initialization is complete

#### `shouldShowAd(isPremium: boolean): boolean`

Determines if ads should be shown based on user subscription status.

- **Parameters**:
  - `isPremium`: Whether the user has a premium subscription
- **Returns**: `true` if ads should be shown, `false` otherwise

#### `showInterstitialAd(isPremium?: boolean): Promise<boolean>`

Shows an interstitial ad with cooldown protection.

- **Parameters**:
  - `isPremium`: Whether the user has a premium subscription (default: false)
- **Returns**: `true` if ad was shown successfully, `false` otherwise

#### `showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean }>`

Shows a rewarded ad and returns whether the user earned the reward.

- **Returns**: Object indicating if ad was shown and if user was rewarded

#### `getBannerAdUnitId(): string`

Gets the appropriate banner ad unit ID for the current platform and environment.

- **Returns**: Ad unit ID string, or empty string if ads should be hidden

#### `isExpoGo(): boolean`

Checks if the app is running in Expo Go (demo mode).

- **Returns**: `true` if running in Expo Go, `false` otherwise

### Usage Examples

```typescript
// Check if ads should be shown
const shouldShow = AdMobService.shouldShowAd(userIsPremium);

// Show interstitial ad
if (shouldShow) {
  const shown = await AdMobService.showInterstitialAd(userIsPremium);
  if (shown) {
    console.log("Interstitial ad displayed");
  }
}

// Show rewarded ad
const result = await AdMobService.showRewardedAd();
if (result.shown && result.rewarded) {
  console.log("User earned reward!");
  // Grant reward to user
}

// Get banner ad unit for component
const bannerUnitId = AdMobService.getBannerAdUnitId();
if (bannerUnitId) {
  // Render banner ad component
}
```

## Video Processing Services

### UnifiedVideoService

Comprehensive video processing service with Expo 54 compatibility, supporting both Expo Go fallbacks and development build features.

#### Key Features

- Vision Camera v4 integration with Reanimated v4 worklets
- Real-time face blur and voice effects
- Automatic fallback to Expo Camera for Expo Go
- FFmpeg integration for post-processing
- Skia integration for advanced effects

#### Initialization

```typescript
import { getUnifiedVideoService } from "../services/UnifiedVideoService";

// Get singleton instance
const videoService = await getUnifiedVideoService();

// Check capabilities
const capabilities = videoService.getCapabilities();
console.log("Vision Camera available:", capabilities.recording.visionCamera);
```

#### Core Methods

```typescript
// Record video with best available method
const recordingResult = await videoService.recordVideo({
  camera: cameraRef.current,
  quality: "high",
  maxDuration: 60,
  onProgress: (progress) => console.log(`Recording: ${progress}%`),
  onFinished: (video) => console.log("Video recorded:", video.uri),
  onError: (error) => console.error("Recording failed:", error),
});

// Process video with effects
const processedVideo = await videoService.processVideo(videoUri, {
  quality: "high",
  blur: true,
  trim: { start: 0, end: 30 },
  effects: ["face_blur", "voice_deep"],
});

// Get video player component
const { VideoView, useVideoPlayer } = videoService.getVideoPlayer();

// Request permissions
const hasPermission = await videoService.requestPermissions();
```

#### Capabilities Interface

```typescript
interface UnifiedVideoCapabilities {
  recording: {
    visionCamera: boolean; // High-quality Vision Camera v4
    expoCamera: boolean; // Expo Camera fallback
    ffmpeg: boolean; // Post-processing support
  };
  effects: {
    realtimeFaceBlur: boolean; // Vision Camera frame processors
    realtimeFilters: boolean; // Skia-based filters
    postProcessBlur: boolean; // FFmpeg blur
    postProcessTrim: boolean; // FFmpeg trim
    postProcessCompress: boolean; // FFmpeg compression
  };
  playback: {
    expoVideo: boolean; // Expo Video player
    streaming: boolean; // HLS/DASH support
    controls: boolean; // Native controls
  };
  animation: {
    reanimatedV4: boolean; // Reanimated v4 support
    worklets: boolean; // Worklets for frame processing
    gestureHandler: boolean; // Gesture support
  };
}
```

### VisionCameraProcessor

Advanced frame processing with Vision Camera v4 and Reanimated v4 worklets.

#### Frame Processing

```typescript
import { VisionCameraProcessor } from "../services/VisionCameraProcessor";

// Create face blur processor (runs on worklet)
const faceBlurProcessor = visionCameraProcessor.createFrameProcessor("blur");

// Use in Vision Camera
<Camera
  frameProcessor={faceBlurProcessor}
  frameProcessorFps={30}
/>
```

#### Real-time Effects

```typescript
// Custom frame processor with Skia
const customProcessor = useSkiaFrameProcessor((frame) => {
  "worklet";
  const faces = detectFaces(frame);
  return applyEffects(frame, faces);
}, []);
```

### ProductionVoiceProcessor

Audio processing with react-native-audio-api for voice effects.

#### Voice Effects

```typescript
import { ProductionVoiceProcessor } from "../services/ProductionVoiceProcessor";

// Available effects
const effects = ProductionVoiceProcessor.getAvailableEffects();
// Returns: ['deep', 'light', 'none']

// Apply voice effect to audio file
const processedAudioUri = await ProductionVoiceProcessor.applyVoiceEffect(audioUri, {
  effect: "deep",
  onProgress: (progress, status) => console.log(`${status}: ${progress}%`),
});
```

### CaptionGenerator

AI-powered caption generation with word-level timestamps.

#### Caption Generation

```typescript
import { generateCaptions, getCurrentCaptions } from "../services/CaptionGenerator";

// Generate captions from video/audio
const captionData = await generateCaptions(videoUri, (progress, status) => {
  console.log(`${status}: ${progress}%`);
});

// Get current caption text at playback time
const currentText = getCurrentCaptions(captionData, currentTime, 3);
```

#### Caption Data Structure

```typescript
interface CaptionData {
  segments: CaptionSegment[];
  duration: number;
  language: string;
}

interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

interface CaptionWord {
  word: string;
  start: number;
  end: number;
}
```

### VisionCameraProcessor

Handles real-time face detection and blurring during video recording.

```typescript
import { VisionCameraProcessor } from "../services/VisionCameraProcessor";

// Initialize face detection
const processor = new VisionCameraProcessor();

// Process frame for face detection
const faces = await processor.detectFaces(frameData);

// Apply blur to detected faces
const blurredFrame = await processor.applyFaceBlur(frameData, faces);
```

### ProductionVoiceProcessor

Handles voice effect processing and audio manipulation.

```typescript
import { ProductionVoiceProcessor } from "../services/ProductionVoiceProcessor";

// Apply voice effect
const processedAudio = await ProductionVoiceProcessor.applyVoiceEffect(
  audioUri,
  "robot", // effect type
);

// Get available effects
const effects = ProductionVoiceProcessor.getAvailableEffects();
// Returns: ['robot', 'chipmunk', 'deep', 'echo', 'reverb']
```

## AI Services

### Anthropic Service

Claude-powered AI services with automatic fallback handling for Expo Go compatibility.

#### Client Initialization

```typescript
import { getAnthropicClient, validateAnthropicModel } from "../api/anthropic";

// Get client (returns stub in Expo Go)
const client = await getAnthropicClient();

// Validate model name
validateAnthropicModel("claude-3-5-sonnet-20240620");
```

#### Available Models (September 2025)

- `claude-sonnet-4-20250514` - Latest Sonnet model
- `claude-3-7-sonnet-latest` - Claude 3.7 Sonnet
- `claude-3-5-haiku-latest` - Fast, efficient model
- `claude-3-5-sonnet-20240620` - Stable Sonnet model

#### Content Generation

```typescript
import { anthropicService } from "../api/anthropic";

// Generate captions for video content
const captions = await anthropicService.generateCaptions({
  videoDescription: "Confession about workplace anxiety and burnout",
  style: "tiktok",
  language: "en",
  maxLength: 150,
});

// Analyze video content for moderation
const analysis = await anthropicService.analyzeVideoContent(videoUri, {
  includeModeration: true,
  detectTopics: true,
});
```

### OpenAI Service

OpenAI GPT and DALL-E integration with comprehensive error handling.

#### Client Setup

```typescript
import { getOpenAIClient, validateOpenAIModel } from "../api/openai";

const client = await getOpenAIClient();
validateOpenAIModel("gpt-4o");
```

#### Available Models (September 2025)

- `gpt-4.1-2025-04-14` - Latest GPT-4.1
- `o4-mini-2025-04-16` - Optimized mini model
- `gpt-4o-2024-11-20` - Stable GPT-4o

#### Content Processing

```typescript
import { openaiService } from "../api/openai";

// Generate image descriptions for accessibility
const description = await openaiService.generateImageDescription(imageUri, {
  maxTokens: 100,
  language: "en",
});

// Moderate content for community guidelines
const moderation = await openaiService.moderateContent(text, {
  categories: ["violence", "hate", "adult"],
});

// Generate text completions
const completion = await openaiService.generateCompletion({
  prompt: "Generate a supportive response to: " + userMessage,
  maxTokens: 200,
  temperature: 0.7,
});
```

### Grok Service

xAI Grok integration using OpenAI-compatible API.

#### Setup

```typescript
import { getGrokClient, validateGrokModel } from "../api/grok";

const client = await getGrokClient();
validateGrokModel("grok-3-fast-latest");
```

#### Available Models

- `grok-3-latest` - Latest Grok model
- `grok-3-fast-latest` - Fast inference
- `grok-3-mini-latest` - Lightweight model

#### Usage

```typescript
import { grokService } from "../api/grok";

// Generate creative content
const content = await grokService.generateContent({
  prompt: "Create an engaging caption for a confession video",
  style: "humorous",
  maxTokens: 100,
});
```

### Image Generation Service

Custom image generation API with Vibecode integration.

#### Image Generation

```typescript
import { generateImage } from "../api/image-generation";

// Generate image from prompt
const result = await generateImage("A serene digital artwork representing finding peace after stress", {
  model: "flux",
  width: 1024,
  height: 1024,
  steps: 4,
  seed: 42,
});

console.log("Generated image URL:", result.imageUrl);
```

#### Error Handling

All AI services include comprehensive error handling:

```typescript
try {
  const result = await anthropicService.generateCaptions(options);
} catch (error) {
  if (error.code === "API_KEY_NOT_FOUND") {
    // Handle missing API key
  } else if (error.code === "RATE_LIMITED") {
    // Handle rate limiting
  } else if (error.code === "NETWORK_ERROR") {
    // Handle network issues
  }
}
```

## State Management

Zustand-based state management with persistence, error handling, and performance monitoring.

### Auth Store

User authentication and session management.

```typescript
import { useAuthStore } from "../state/authStore";

// Basic usage
const { user, isAuthenticated, signIn, signOut } = useAuthStore();

// Sign in user
await signIn({ email, password });

// Check auth state
await checkAuthState();

// Get current user
const currentUser = getCurrentUser();
```

#### Auth Store Interface

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: StandardError | null;

  signUp: (data: SignUpData) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  checkAuthState: () => Promise<void>;
  clearError: () => void;
}
```

### Confession Store

Video confession management with offline queue support.

```typescript
import { useConfessionStore } from "../state/confessionStore";

// Load confessions
await loadConfessions();

// Add new confession
await addConfession({
  type: "video",
  content: "My confession text",
  videoUri: videoUri,
  isAnonymous: true,
});

// Toggle like with optimistic updates
await toggleLike(confessionId);
```

#### Confession Store Features

- Optimistic updates for likes/interactions
- Offline queue for network-failover
- Real-time subscriptions via Supabase
- Video analytics tracking
- User preferences persistence

### Subscription Store

RevenueCat subscription management.

```typescript
import { useSubscriptionStore } from "../state/subscriptionStore";

// Check premium status
const isPremium = await isUserPremium();

// Get subscription tiers
const tiers = await getSubscriptionTiers();

// Purchase subscription
await purchasePackage(selectedPackage);
```

## Hooks

Custom React hooks for common functionality with error handling and performance optimization.

### useApiWithErrorHandling

API calls with automatic error handling and retry logic.

```typescript
import { useApiWithErrorHandling } from "../hooks/useApiWithErrorHandling";

const apiCall = async (params) => {
  return await supabase.from("confessions").select("*").eq("id", params.id);
};

const { execute, loading, data, error, retry } = useApiWithErrorHandling(apiCall, {
  showErrorToast: true,
  enableNetworkRecovery: true,
});

// Execute API call
await execute({ id: confessionId });

// Retry on failure
if (error?.retryable) {
  await retry();
}
```

### useCaptionGeneration

Video caption generation with progress tracking.

```typescript
import { useCaptionGeneration } from "../hooks/useCaptionGeneration";

const { captionData, isGenerating, error, progress, progressStatus, generateCaptionsForVideo, clearCaptions } =
  useCaptionGeneration();

// Generate captions
await generateCaptionsForVideo(videoUri, forceRegenerate);

// Display current captions during playback
const currentText = getCurrentCaptions(captionData, currentTime);
```

### useVideoRecorder

Comprehensive video recording with real-time effects.

```typescript
import { useVideoRecorder } from "../hooks/useVideoRecorder";

const { startRecording, stopRecording, isRecording, recordingTime, hasPermissions, error } = useVideoRecorder({
  maxDuration: 60,
  enableFaceBlur: true,
  enableVoiceChange: true,
  voiceEffect: "deep",
  onRecordingStop: (uri) => console.log("Video saved:", uri),
  onError: (error) => console.error("Recording error:", error),
});

// Start recording
await startRecording();

// Stop recording
await stopRecording();
```

### useNetworkRecovery

Automatic network error recovery and offline handling.

```typescript
import { useNetworkRecovery } from "../hooks/useNetworkRecovery";

const { isConnected, manualRetry, autoRetry } = useNetworkRecovery({
  autoRetry: true,
  maxRetries: 3,
});

// Check connection status
if (!isConnected) {
  await manualRetry();
}
```

## Utilities

Core utility functions for common operations.

### Error Handling

Standardized error processing and user-friendly messages.

```typescript
import { processError, getUserFriendlyMessage } from "../utils/errorHandling";

// Process any error into standard format
const standardError = processError(error, "auth.signIn");

// Get user-friendly message
const message = getUserFriendlyMessage(standardError, "SignInScreen");
```

### Retry Logic

Exponential backoff retry with customizable options.

```typescript
import { createApiRetry } from "../utils/retryLogic";

const retryableOperation = createApiRetry({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
});

const result = await retryableOperation(async () => {
  return await fetchApiEndpoint();
});
```

### Validation

Comprehensive input validation with detailed error messages.

```typescript
import { confessionValidation, videoValidation } from "../utils/validation";

// Validate confession input
const confessionResult = confessionValidation.complete({
  content: confessionText,
  type: "video",
  video: { file: { uri: videoUri } },
});

if (!confessionResult.isValid) {
  console.error(confessionResult.error);
}

// Validate video file
const videoResult = videoValidation.videoFile({ uri: videoUri });
```

### Storage

Secure file storage with Supabase integration.

```typescript
import { uploadVideoToSupabase, ensureSignedVideoUrl } from "../utils/storage";

// Upload video
const uploadResult = await uploadVideoToSupabase(videoUri, userId, {
  onProgress: (progress) => console.log(`Upload: ${progress}%`),
});

// Get signed URL for playback
const { signedUrl } = await ensureSignedVideoUrl(storagePath);
```

### Offline Queue

Background processing for offline actions.

```typescript
import { offlineQueue, OFFLINE_ACTIONS } from "../utils/offlineQueue";

// Queue action for offline processing
await offlineQueue.enqueue(OFFLINE_ACTIONS.CREATE_CONFESSION, { confession: confessionData }, { priority: 10 });

// Check network status
const isOnline = offlineQueue.getNetworkStatus();
```

## Error Handling Patterns

### Standard Error Format

```typescript
interface StandardError {
  code: string;
  message: string;
  timestamp?: number;
  context?: string;
  isRetryable?: boolean;
  originalError?: unknown;
  details?: Record<string, any>;
  statusCode?: number;
}
```

### Error Boundary Pattern

```typescript
import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    console.error("Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### Async Error Handling

```typescript
import { withErrorHandling } from "../utils/errorHandling";

const asyncOperation = async () => {
  // Operation that might fail
  return await apiCall();
};

await withErrorHandling(setState, asyncOperation, {
  shouldThrow: false,
  context: "user.profile.update",
  customMessage: "Failed to update profile",
});
```

### Network Error Recovery

```typescript
import { useNetworkRecovery } from "../hooks/useNetworkRecovery";

const { isConnected, manualRetry } = useNetworkRecovery();

if (!isConnected) {
  // Show offline UI
  return <OfflineMessage onRetry={manualRetry} />;
}
```

## TypeScript Interfaces

### Core Types

```typescript
// User types
interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  createdAt: string;
  isOnboarded: boolean;
  lastLoginAt?: string;
}

// Confession types
interface Confession {
  id: string;
  type: "text" | "video";
  content: string;
  videoUri?: string;
  transcription?: string;
  timestamp: number;
  isAnonymous: boolean;
  likes: number;
  views: number;
  isLiked: boolean;
}

// Video processing types
interface VideoProcessingOptions {
  quality?: "low" | "medium" | "high";
  blur?: boolean;
  trim?: { start: number; end: number };
  effects?: string[];
}

interface ProcessedVideo {
  uri: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
}

// API response types
interface ApiResponse<T = any> {
  data?: T;
  error?: StandardError;
  success: boolean;
}

// Validation types
interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}
```

### Store Types

```typescript
// Auth store state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: StandardError | null;
}

// Confession store state
interface ConfessionState {
  confessions: Confession[];
  userConfessions: Confession[];
  videoAnalytics: Record<string, VideoAnalytics>;
  userPreferences: UserPreferences;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  isStoreInitialized: boolean;
}
```

### Hook Types

```typescript
// API hook return type
interface UseApiResult<T> {
  execute: (...args: any[]) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  loading: boolean;
  data: T | null;
  error: StandardError | null;
  isConnected: boolean;
}

// Video recorder hook
interface VideoRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  recordingTime: number;
  processingProgress: number;
  processingStatus: string;
  hasPermissions: boolean;
  isInitialized: boolean;
  error?: string;
}
```

## Real Code Examples

### Complete Video Recording Flow

```typescript
import React, { useRef } from "react";
import { View, Button, Text } from "react-native";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { getUnifiedVideoService } from "../services/UnifiedVideoService";
import { useConfessionStore } from "../state/confessionStore";

export const VideoRecorderScreen = () => {
  const cameraRef = useRef(null);
  const { addConfession } = useConfessionStore();

  const {
    startRecording,
    stopRecording,
    isRecording,
    recordingTime,
    hasPermissions,
    error,
  } = useVideoRecorder({
    maxDuration: 60,
    enableFaceBlur: true,
    enableVoiceChange: true,
    voiceEffect: "deep",
    onRecordingStop: async (uri) => {
      // Process and upload video
      const videoService = await getUnifiedVideoService();
      const processed = await videoService.processVideo(uri, {
        quality: "high",
        blur: true,
      });

      // Add to confession feed
      await addConfession({
        type: "video",
        content: "My anonymous confession",
        videoUri: processed.uri,
        isAnonymous: true,
      });
    },
    onError: (error) => {
      console.error("Recording failed:", error);
    },
  });

  if (!hasPermissions) {
    return <Text>Camera permissions required</Text>;
  }

  return (
    <View>
      <Camera ref={cameraRef} />
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={isRecording ? stopRecording : startRecording}
      />
      {isRecording && <Text>Recording: {recordingTime}s</Text>}
      {error && <Text>Error: {error}</Text>}
    </View>
  );
};
```

### Authentication Flow with Error Handling

```typescript
import React, { useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import { useAuthStore } from "../state/authStore";
import { getUserFriendlyMessage } from "../utils/errorHandling";

export const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleSignIn = async () => {
    try {
      clearError();
      await signIn({ email, password });
      // Navigation will happen automatically via auth state change
    } catch (error) {
      const message = getUserFriendlyMessage(error, "SignInScreen");
      Alert.alert("Sign In Failed", message);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={isLoading ? "Signing In..." : "Sign In"}
        onPress={handleSignIn}
        disabled={isLoading}
      />
      {error && <Text>{getUserFriendlyMessage(error)}</Text>}
    </View>
  );
};
```

### AI-Powered Caption Generation

```typescript
import React, { useState } from "react";
import { View, Button, Text, ProgressBar } from "react-native";
import { useCaptionGeneration } from "../hooks/useCaptionGeneration";
import { generateCaptions } from "../services/CaptionGenerator";

export const CaptionGenerator = ({ videoUri }) => {
  const {
    captionData,
    isGenerating,
    error,
    progress,
    progressStatus,
    generateCaptionsForVideo,
  } = useCaptionGeneration();

  const handleGenerate = async () => {
    try {
      await generateCaptionsForVideo(videoUri);
    } catch (err) {
      console.error("Caption generation failed:", err);
    }
  };

  return (
    <View>
      <Button
        title="Generate Captions"
        onPress={handleGenerate}
        disabled={isGenerating}
      />

      {isGenerating && (
        <View>
          <Text>{progressStatus}</Text>
          <ProgressBar progress={progress / 100} />
        </View>
      )}

      {captionData && (
        <Text>Captions generated successfully!</Text>
      )}

      {error && <Text>Error: {error}</Text>}
    </View>
  );
};
```

## Supabase Integration

### Authentication with Session Management

```typescript
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../state/authStore";

// Sign up with email confirmation
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: {
      username: "user123",
    },
  },
});

// Sign in with persistence
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});

// Get current session
const {
  data: { session },
  error,
} = await supabase.auth.getSession();

// Listen to auth changes
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    useAuthStore.getState().checkAuthState();
  }
});
```

### Database Operations with Retry Logic

```typescript
import { wrapWithRetry, rpcWithRetry } from "../utils/supabaseWithRetry";

// Query with automatic retry
const { data: confessions, error } = await wrapWithRetry(async () => {
  return await supabase.from("public_confessions").select("*").order("created_at", { ascending: false }).limit(20);
});

// RPC call for complex operations
const { data: result, error } = await rpcWithRetry("toggle_confession_like", {
  confession_uuid: id,
});

// Insert with error handling
const { data, error } = await supabase
  .from("confessions")
  .insert({
    user_id: userId,
    type: "video",
    content: confessionText,
    video_uri: videoPath,
    is_anonymous: true,
  })
  .select()
  .single();
```

### Storage with Signed URLs

```typescript
import { uploadVideoToSupabase, ensureSignedVideoUrl } from "../utils/storage";

// Upload video with progress
const uploadResult = await uploadVideoToSupabase(videoUri, userId, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress}%`);
  },
});

// Get signed URL for secure access
const { signedUrl, expiresAt } = await ensureSignedVideoUrl(uploadResult.path);

// Use signed URL for video playback
<VideoPlayer source={{ uri: signedUrl }} />;
```

### Real-time Subscriptions with Cleanup

```typescript
import { setupConfessionSubscriptions, cleanupConfessionSubscriptions } from "../state/confessionStore";

// Set up real-time updates
useEffect(() => {
  setupConfessionSubscriptions();

  return () => {
    cleanupConfessionSubscriptions();
  };
}, []);

// Subscribe to specific changes
const channel = supabase
  .channel("user_confessions")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "confessions",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log("Confession changed:", payload);
      // Update local state
    },
  )
  .subscribe();
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on confessions table
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;

-- Allow users to read all public confessions
CREATE POLICY "Public confessions are viewable by everyone"
ON confessions FOR SELECT
USING (is_anonymous = true OR user_id = auth.uid());

-- Allow users to insert their own confessions
CREATE POLICY "Users can insert their own confessions"
ON confessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own confessions
CREATE POLICY "Users can update their own confessions"
ON confessions FOR UPDATE
USING (auth.uid() = user_id);
```

## Environment Configuration

### Expo 54 Environment Variables

```bash
# App Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_APP_NAME=SupaSecret
EXPO_PUBLIC_APP_VERSION=1.0.0

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Services
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key
EXPO_PUBLIC_GROK_API_KEY=your-grok-key

# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-key

# AdMob
EXPO_PUBLIC_ADMOB_APP_ID=your-admob-app-id
```

### EAS Secrets for Production

```json
{
  "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
  "EXPO_PUBLIC_ANTHROPIC_API_KEY": "your-anthropic-key",
  "EXPO_PUBLIC_REVENUECAT_API_KEY": "your-revenuecat-key"
}
```

## Performance Optimization

### Bundle Splitting

```typescript
// Dynamic imports for large libraries
const VisionCamera = () => {
  const [Camera, setCamera] = useState(null);

  useEffect(() => {
    import("react-native-vision-camera").then((module) => {
      setCamera(() => module.Camera);
    });
  }, []);

  return Camera ? <Camera /> : <ExpoCamera />;
};
```

### Image Optimization

```typescript
import { Image } from "expo-image";

// Optimized image loading
<Image
  source={{ uri: imageUrl }}
  placeholder={require("./placeholder.png")}
  contentFit="cover"
  transition={300}
  cachePolicy="memory-disk"
/>
```

### Memory Management

```typescript
// Clean up video players
useEffect(() => {
  return () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current = null;
    }
  };
}, []);
```

This documentation covers the complete SupaSecret codebase API, with comprehensive examples and best practices for Expo 54 development.

### Database Operations

```typescript
// Confessions table
const { data: confessions } = await supabase
  .from("confessions")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);

// User profiles
const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

// Video analytics
const { data: analytics } = await supabase.from("video_analytics").select("*").eq("video_id", videoId);
```

### Storage

```typescript
// Upload video
const { data, error } = await supabase.storage.from("videos").upload(`${userId}/${videoId}.mp4`, videoFile);

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from("videos").getPublicUrl(`${userId}/${videoId}.mp4`);
```

### Real-time Subscriptions

```typescript
// Subscribe to new confessions
const subscription = supabase
  .channel("confessions")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (payload) => {
    console.log("New confession:", payload.new);
    // Update UI
  })
  .subscribe();
```

## Error Handling

All services implement comprehensive error handling with appropriate user feedback:

```typescript
try {
  const result = await SomeService.doSomething();
} catch (error) {
  if (error.code === "NETWORK_ERROR") {
    // Show network error message
  } else if (error.code === "AUTH_ERROR") {
    // Redirect to login
  } else {
    // Show generic error
  }
}
```

## Environment Configuration

Services automatically adapt based on environment:

- **Expo Go**: Demo mode with mock responses
- **Development**: Test keys and verbose logging
- **Production**: Production keys and optimized performance

## Type Definitions

All services include comprehensive TypeScript definitions for better developer experience and type safety. Import types as needed:

```typescript
import type { RevenueCatCustomerInfo, SubscriptionTier, VideoProcessingOptions } from "../services/types";
```
