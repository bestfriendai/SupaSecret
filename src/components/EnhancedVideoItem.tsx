import React, { useEffect } from "react";
import type { Confession } from "../types/confession";
import UnifiedVideoItem from "./UnifiedVideoItem";
import { useVideoPlayer } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";
import { useSharedValue } from "react-native-reanimated";

interface EnhancedVideoItemProps {
  confession: Confession;
  isActive: boolean;
  onClose: () => void;
  onCommentPress?: (confessionId: string) => void;
  onSharePress?: (confessionId: string, confessionText: string) => void;
  onSavePress?: (confessionId: string) => void;
  onReportPress?: (confessionId: string, confessionText: string) => void;
  forceUnmuted?: boolean;
  screenFocused?: boolean;
}

/**
 * @deprecated Use UnifiedVideoItem directly with variant="enhanced" instead.
 * This component is a thin wrapper maintained for backwards compatibility.
 */
export default function EnhancedVideoItem({
  confession,
  isActive,
  onClose,
  onCommentPress,
  onSharePress,
  onSavePress,
  onReportPress,
  forceUnmuted = false,
  screenFocused = true,
}: EnhancedVideoItemProps) {
  // Dev-time deprecation warning
  useEffect(() => {
    if (__DEV__) {
      console.warn(
        'EnhancedVideoItem is deprecated. Use UnifiedVideoItem with variant="enhanced" instead.'
      );
    }
  }, []);

  const soundEnabled = useConfessionStore((state) => state.userPreferences.sound_enabled);
  const sourceUri = confession.videoUri || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
    p.muted = forceUnmuted ? false : !soundEnabled;
    if (isActive && screenFocused) {
      try {
        p.play();
      } catch (error) {
        if (__DEV__) {
          console.warn(`Initial autoplay failed for ${confession.id}:`, error);
        }
      }
    }
  });

  // Map props to UnifiedVideoItem interface
  const progressY = useSharedValue(0); // Create a default if not provided

  const handleToggleMute = () => {
    if (player) {
      player.muted = !player.muted;
    }
  };

  const handleRegisterLikeHandler = (handler: (() => Promise<void>) | null) => {
    // This would be handled internally by UnifiedVideoItem
  };

  const handleSingleTap = () => {
    if (player) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  const handleDoubleTap = () => {
    // Double tap to like is handled in UnifiedVideoItem
  };

  // Render UnifiedVideoItem with enhanced variant
  return (
    <UnifiedVideoItem
      confession={confession}
      isActive={isActive}
      onClose={onClose}
      videoPlayer={player}
      muted={forceUnmuted ? false : !soundEnabled}
      onToggleMute={handleToggleMute}
      isPlaying={player?.playing || false}
      onRegisterLikeHandler={handleRegisterLikeHandler}
      progressY={progressY}
      onSingleTap={handleSingleTap}
      onDoubleTap={handleDoubleTap}
      networkStatus={true}
      variant="enhanced"
    />
  );
}