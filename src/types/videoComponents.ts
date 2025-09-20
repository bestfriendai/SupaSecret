import type { SharedValue } from 'react-native-reanimated';
import type { VideoPlayer } from 'expo-video';
import type { Confession } from './confession';

export type VideoVariant = 'tiktok' | 'enhanced';

export interface VideoItemProps {
  confession: Confession;
  isActive: boolean;
  shouldPreload?: boolean;
  onClose?: () => void;
  videoPlayer: VideoPlayer | null;
  muted: boolean;
  onToggleMute: () => void;
  isPlaying: boolean;
  onRegisterLikeHandler: (handler: (() => Promise<void>) | null) => void;
  progressY?: SharedValue<number>;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  networkStatus?: boolean;
  variant?: VideoVariant;
}

export interface LegacyVideoItemProps {
  confession: Confession;
  isActive: boolean;
  shouldPreload?: boolean;
  onClose?: () => void;
  videoPlayer?: VideoPlayer | null;
  muted?: boolean;
  onToggleMute?: () => void;
  isPlaying?: boolean;
  onRegisterLikeHandler?: (handler: (() => Promise<void>) | null) => void;
  progressY?: SharedValue<number>;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  networkStatus?: boolean;
}