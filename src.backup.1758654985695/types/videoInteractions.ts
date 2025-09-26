export enum VideoInteractionType {
  Like = "like",
  Comment = "comment",
  Share = "share",
  Save = "save",
  Report = "report",
  Follow = "follow",
  Mute = "mute",
  Unmute = "unmute",
  PlayPause = "play_pause",
  Seek = "seek",
  VolumeChange = "volume_change",
  FullScreen = "fullscreen",
  Settings = "settings",
}

export interface VideoInteractionEvent {
  type: VideoInteractionType;
  videoId: string;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, unknown>;
  position?: {
    x: number;
    y: number;
  };
  value?: number | string | boolean;
}

export type VideoInteractionHandler = (event: VideoInteractionEvent) => void | Promise<void>;

export interface VideoInteractionHandlers {
  onLike?: VideoInteractionHandler;
  onComment?: VideoInteractionHandler;
  onShare?: VideoInteractionHandler;
  onSave?: VideoInteractionHandler;
  onReport?: VideoInteractionHandler;
  onFollow?: VideoInteractionHandler;
  onMute?: VideoInteractionHandler;
  onPlayPause?: VideoInteractionHandler;
  onSeek?: VideoInteractionHandler;
  onVolumeChange?: VideoInteractionHandler;
  onFullScreen?: VideoInteractionHandler;
  onSettings?: VideoInteractionHandler;
  onInteraction?: VideoInteractionHandler; // Generic handler for all interactions
}

export interface VideoGestureConfig {
  enabled: boolean;
  doubleTapToLike: boolean;
  swipeToNavigate: boolean;
  pinchToZoom: boolean;
  tapToPause: boolean;
  longPressToSave: boolean;
  sensitivity?: {
    tap?: number;
    swipe?: number;
    pinch?: number;
  };
}

export interface VideoAnimationConfig {
  likeAnimation: {
    enabled: boolean;
    duration: number;
    scale: number;
    color?: string;
  };
  transitionAnimation: {
    enabled: boolean;
    duration: number;
    type: "fade" | "slide" | "scale" | "none";
  };
  loadingAnimation: {
    enabled: boolean;
    type: "spinner" | "skeleton" | "pulse" | "none";
  };
}

export interface VideoInteractionMetrics {
  totalInteractions: number;
  interactionsByType: Record<VideoInteractionType, number>;
  averageWatchTime: number;
  completionRate: number;
  engagementRate: number;
  lastInteractionTime: number;
}
