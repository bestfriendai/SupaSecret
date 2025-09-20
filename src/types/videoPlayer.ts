export enum VideoPlayerState {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Playing = 'playing',
  Paused = 'paused',
  Buffering = 'buffering',
  Error = 'error',
  Disposed = 'disposed'
}

export interface VideoPlayerConfig {
  shouldPlay: boolean;
  isLooping: boolean;
  isMuted: boolean;
  volume: number;
  rate: number;
  positionMillis?: number;
  progressUpdateIntervalMillis?: number;
  shouldCorrectPitch?: boolean;
  androidImplementation?: 'MediaPlayer' | 'SimpleExoPlayer';
}

export interface VideoPlayerMetrics {
  bufferedPercentage: number;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  isPlaying: boolean;
  isLoaded: boolean;
  playbackRate: number;
  volume: number;
}

export interface VideoGestureEvent {
  type: 'tap' | 'doubleTap' | 'swipe' | 'longPress' | 'pinch';
  x: number;
  y: number;
  velocityX?: number;
  velocityY?: number;
  scale?: number;
  timestamp: number;
}

export class VideoPlayerError extends Error {
  code: string;
  details?: unknown;
  recoverable: boolean;

  constructor(code: string, message: string, details?: unknown, recoverable = false) {
    super(message);
    this.name = 'VideoPlayerError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
  }
}

export interface VideoPlayerInterface {
  state: VideoPlayerState;
  config: VideoPlayerConfig;
  metrics: VideoPlayerMetrics;

  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMillis: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  dispose(): Promise<void>;

  onStateChange?: (state: VideoPlayerState) => void;
  onError?: (error: VideoPlayerError) => void;
  onProgress?: (metrics: VideoPlayerMetrics) => void;
  onGesture?: (event: VideoGestureEvent) => void;
}