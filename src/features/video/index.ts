/**
 * Video Feature Module
 * Exports all video-related components, hooks, services, and utilities
 */

// Types
export * from "./types";

// Services
export { VideoService, getVideoService, initializeVideoService } from "./services/videoService";
// FaceBlurService removed - use native iOS blur module instead
export {
  VoiceProcessingService,
  getVoiceProcessingService,
  isVoiceProcessingAvailable,
} from "./services/voiceProcessingService";

// Components
export { VideoPlayer } from "./components/VideoPlayer";
export { VideoRecordingModal } from "./components/VideoRecordingModal";
export { VideoFeed } from "./components/VideoFeed";

// Hooks
export { useVideoRecording } from "./hooks/useVideoRecording";
export { useVideoPlayer } from "./hooks/useVideoPlayer";

// Utils
export {
  uploadVideoToStorage,
  uploadVideoAnonymously,
  pollProcessingStatus,
  downloadProcessedVideo,
  uploadAndProcessVideo,
} from "./utils/videoUpload";
