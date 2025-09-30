/**
 * Video Player Component
 * Uses latest expo-video API with useVideoPlayer hook
 * Implements modern best practices for video playback
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import type { VideoPlayerState, VideoPlayerControls } from '../types';

export interface VideoPlayerProps {
  videoUri: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  onPlaybackStateChange?: (state: VideoPlayerState) => void;
  onError?: (error: string) => void;
  style?: any;
  contentFit?: 'contain' | 'cover' | 'fill';
}

/**
 * Modern Video Player Component
 * Uses expo-video's useVideoPlayer hook for optimal performance
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUri,
  autoPlay = false,
  loop = false,
  muted = false,
  showControls = true,
  onPlaybackStateChange,
  onError,
  style,
  contentFit = 'cover',
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Create video player using latest API
  const player = useVideoPlayer(videoUri, (player) => {
    if (!player) {
      console.error('Video player initialization failed');
      setHasError(true);
      onError?.('Failed to initialize video player');
      return;
    }

    // Configure player
    player.loop = loop;
    player.muted = muted;

    // Set up event listener for time updates (optional)
    // player.timeUpdateEventInterval = 1;

    // Auto-play if enabled
    if (autoPlay) {
      player.play();
      setIsPlaying(true);
    }

    setIsLoading(false);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.release();
    };
  }, [player]);

  // Handle playback state changes
  useEffect(() => {
    if (onPlaybackStateChange && player) {
      const state: VideoPlayerState = {
        isPlaying,
        isMuted,
        currentTime: player.currentTime || 0,
        duration: player.duration || 0,
        buffering: isLoading,
        volume: player.volume || 1,
        playbackRate: player.playbackRate || 1,
      };
      onPlaybackStateChange(state);
    }
  }, [isPlaying, isMuted, isLoading, player, onPlaybackStateChange]);

  // Player controls
  const togglePlayPause = useCallback(() => {
    if (!player) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [player, isPlaying]);

  const toggleMute = useCallback(() => {
    if (!player) return;

    const newMutedState = !isMuted;
    player.muted = newMutedState;
    setIsMuted(newMutedState);
  }, [player, isMuted]);

  const seekTo = useCallback(
    (time: number) => {
      if (!player) return;
      player.currentTime = time;
    },
    [player],
  );

  const setVolume = useCallback(
    (volume: number) => {
      if (!player) return;
      player.volume = Math.max(0, Math.min(1, volume));
    },
    [player],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (!player) return;
      player.playbackRate = rate;
    },
    [player],
  );

  // Export controls via ref (if needed)
  const controls: VideoPlayerControls = {
    play: () => {
      player?.play();
      setIsPlaying(true);
    },
    pause: () => {
      player?.pause();
      setIsPlaying(false);
    },
    seekTo,
    setVolume,
    setMuted: (muted: boolean) => {
      if (player) {
        player.muted = muted;
        setIsMuted(muted);
      }
    },
    setPlaybackRate,
    togglePlayPause,
    toggleMute,
  };

  // Error state
  if (hasError) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit={contentFit}
        nativeControls={false}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Custom controls */}
      {showControls && !isLoading && (
        <>
          {/* Play/Pause overlay */}
          <Pressable
            style={styles.controlsOverlay}
            onPress={togglePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
          >
            <View style={styles.playPauseButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
              />
            </View>
          </Pressable>

          {/* Mute button */}
          <Pressable
            style={styles.muteButton}
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
});

export default VideoPlayer;
