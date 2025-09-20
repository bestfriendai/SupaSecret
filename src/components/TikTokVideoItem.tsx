import React, { useEffect } from "react";
import { type VideoPlayer } from "expo-video";
import { type SharedValue } from "react-native-reanimated";
import type { Confession } from "../types/confession";
import UnifiedVideoItem from "./UnifiedVideoItem";

interface TikTokVideoItemProps {
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
}

/**
 * @deprecated Use UnifiedVideoItem directly with variant="tiktok" instead.
 * This component is a thin wrapper maintained for backwards compatibility.
 */
export default function TikTokVideoItem(props: TikTokVideoItemProps) {
  // Dev-time deprecation warning
  useEffect(() => {
    if (__DEV__) {
      console.warn(
        'TikTokVideoItem is deprecated. Use UnifiedVideoItem with variant="tiktok" instead.'
      );
    }
  }, []);

  // Render UnifiedVideoItem with tiktok variant
  return (
    <UnifiedVideoItem
      {...props}
      variant="tiktok"
    />
  );
}