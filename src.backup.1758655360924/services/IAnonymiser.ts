export interface ProcessedVideo {
  uri: string;
  transcription?: string;
  duration: number;
  thumbnailUri?: string;
  audioUri?: string;
  faceBlurApplied?: boolean;
  voiceChangeApplied?: boolean;
  metadata?: {
    width: number;
    height: number;
    duration: number;
    size: number;
  };
}

export interface VideoProcessingOptions {
  enableFaceBlur?: boolean;
  enableVoiceChange?: boolean;
  enableTranscription?: boolean;
  quality?: "high" | "medium" | "low" | "highest";
  voiceEffect?: "deep" | "light";
  maxDuration?: number;
  muteAudio?: boolean;
  onProgress?: (progress: number, status: string) => void;
}

export interface IAnonymiser {
  initialize(): Promise<void>;
  processVideo(videoUri: string, options: VideoProcessingOptions): Promise<ProcessedVideo>;
  startRealTimeTranscription?(): Promise<void>;
  stopRealTimeTranscription?(): Promise<void>;
}
