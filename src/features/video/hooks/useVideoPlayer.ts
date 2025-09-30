/**
 * useVideoPlayer Hook
 * Custom hook for video playback with expo-video
 * Provides state management and playback controls
 */

import { useState, useCallback, useEffect } from 'react';
import { useVideoPlayer as useExpoVideoPlayer } from 'expo-video';
import type { VideoPlayerState, VideoPlayerControls } from '../types';

export interface UseVideoPlayerOptions {
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  onPlaybackStateChange?: (state: VideoPlayerState) => void;
  onError?: (error: string) => void;
}

export interface UseVideoPlayerReturn {
  state: VideoPlayerState;
  controls: VideoPlayerControls;
  player: any;
}

/**
 * Custom hook for video playback
 */
export const useVideoPlayer = (
  videoUri: string,
  options: UseVideoPlayerOptions = {},
): UseVideoPlayerReturn => {
  const {
    autoPlay = false,
    loop = false,
    muted = false,
    onPlaybackStateChange,
    onError,
  } = options;

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [error, setError] = useState<string>();

  // Create video player using expo-video
  const player = useExpoVideoPlayer(videoUri, (player) => {
    if (!player) {
      const errorMsg = 'Failed to initialize video player';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Configure player
    player.loop = loop;
    player.muted = muted;

    // Auto-play if enabled
    if (autoPlay) {
      player.play();
      setIsPlaying(true);
    }

    setBuffering(false);

    // Update duration
    if (player.duration) {
      setDuration(player.duration);
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.release();
    };
  }, [player]);

  // Update playback state
  useEffect(() => {
    if (onPlaybackStateChange) {
      const state: VideoPlayerState = {
        isPlaying,
        isMuted,
        currentTime,
        duration,
        buffering,
        error,
        volume,
        playbackRate,
      };
      onPlaybackStateChange(state);
    }
  }, [isPlaying, isMuted, currentTime, duration, buffering, error, volume, playbackRate, onPlaybackStateChange]);

  // Play
  const play = useCallback(() => {
    if (player) {
      player.play();
      setIsPlaying(true);
    }
  }, [player]);

  // Pause
  const pause = useCallback(() => {
    if (player) {
      player.pause();
      setIsPlaying(false);
    }
  }, [player]);

  // Seek to time
  const seekTo = useCallback(
    (time: number) => {
      if (player) {
        player.currentTime = time;
        setCurrentTime(time);
      }
    },
    [player],
  );

  // Set volume
  const setVolume = useCallback(
    (vol: number) => {
      if (player) {
        const clampedVolume = Math.max(0, Math.min(1, vol));
        player.volume = clampedVolume;
        setVolumeState(clampedVolume);
      }
    },
    [player],
  );

  // Set muted
  const setMuted = useCallback(
    (muted: boolean) => {
      if (player) {
        player.muted = muted;
        setIsMuted(muted);
      }
    },
    [player],
  );

  // Set playback rate
  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (player) {
        player.playbackRate = rate;
        setPlaybackRateState(rate);
      }
    },
    [player],
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const state: VideoPlayerState = {
    isPlaying,
    isMuted,
    currentTime,
    duration,
    buffering,
    error,
    volume,
    playbackRate,
  };

  const controls: VideoPlayerControls = {
    play,
    pause,
    seekTo,
    setVolume,
    setMuted,
    setPlaybackRate,
    togglePlayPause,
    toggleMute,
  };

  return {
    state,
    controls,
    player,
  };
};

export default useVideoPlayer;
