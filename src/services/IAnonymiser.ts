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
  voiceEffect?: 'deep' | 'light';
  onProgress?: (progress: number, status: string) => void;
}

export interface IAnonymiser {
  initialize(): Promise<void>;
  processVideo(videoUri: string, options: VideoProcessingOptions): Promise<ProcessedVideo>;
  startRealTimeTranscription?(): Promise<void>;
  stopRealTimeTranscription?(): Promise<void>;
}
