import React, { useRef, useEffect, useCallback, useState } from 'react';
import { VideoView, useVideoPlayer, useEventListener } from 'expo-video';
import { View } from 'react-native';

interface HermesCompatibleVideoPlayerProps {
  videoUri: string;
  isActive: boolean;
  onError?: (error: Error) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
  style?: any;
  className?: string;
}

/**
 * Enhanced video player component with Hermes-specific disposal handling
 * Addresses "Player pause failed during disposal" warnings
 */
export const HermesCompatibleVideoPlayer: React.FC<HermesCompatibleVideoPlayerProps> = ({
  videoUri,
  isActive,
  onError,
  onPlaybackStatusUpdate,
  style,
  className,
}) => {
  const playerRef = useRef<VideoView>(null);
  const [isDisposing, setIsDisposing] = useState(false);
  const disposalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create player with enhanced error handling
  const player = useVideoPlayer(videoUri, (player) => {
    try {
      player.loop = true;
      player.muted = false;
      
      // Set initial play state
      if (isActive && !isDisposing) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Video player setup error:', error);
      }
      onError?.(error as Error);
    }
  });

  // Handle play/pause based on active state
  useEffect(() => {
    if (!player || isDisposing) return;

    try {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Video play/pause error:', error);
      }
    }
  }, [player, isActive, isDisposing]);

  // Enhanced disposal handling for Hermes compatibility
  const disposePlayer = useCallback(async () => {
    if (isDisposing || !player) return;

    setIsDisposing(true);

    try {
      // Clear any pending disposal timeout
      if (disposalTimeoutRef.current) {
        clearTimeout(disposalTimeoutRef.current);
        disposalTimeoutRef.current = null;
      }

      // Graceful pause with timeout
      const pausePromise = new Promise<void>((resolve) => {
        try {
          // Check if player is still valid
          let shouldPause = false;
          try {
            shouldPause = player.playing;
          } catch (checkError: any) {
            // Player already disposed
            if (checkError?.message?.includes('NativeSharedObjectNotFoundException') ||
                checkError?.message?.includes('Unable to find the native shared object')) {
              resolve();
              return;
            }
          }

          if (shouldPause) {
            try {
              player.pause();
            } catch (pauseErr: any) {
              // Only log non-disposal errors
              if (__DEV__ &&
                  !pauseErr?.message?.includes('NativeSharedObjectNotFoundException') &&
                  !pauseErr?.message?.includes('Unable to find the native shared object')) {
                console.warn('Video pause error during disposal:', pauseErr?.message);
              }
            }
          }
          resolve();
        } catch (pauseError: any) {
          // Ignore disposal-related errors
          if (__DEV__ &&
              !pauseError?.message?.includes('NativeSharedObjectNotFoundException') &&
              !pauseError?.message?.includes('Unable to find the native shared object')) {
            console.warn('Video pause failed during disposal:', pauseError?.message);
          }
          resolve();
        }
      });

      // Set a timeout for pause operation
      const timeoutPromise = new Promise<void>((resolve) => {
        disposalTimeoutRef.current = setTimeout(() => {
          resolve();
        }, 100); // 100ms timeout for pause
      });

      // Wait for either pause to complete or timeout
      await Promise.race([pausePromise, timeoutPromise]);

      // Additional cleanup if available
      if (typeof player.unload === 'function') {
        try {
          await player.unload();
        } catch (unloadError) {
          // Silently ignore unload errors
          if (__DEV__) {
            console.warn('Video unload failed:', unloadError);
          }
        }
      }

    } catch (error) {
      // Silently ignore all disposal errors
      if (__DEV__) {
        console.warn('Video disposal error:', error);
      }
    } finally {
      // Clean up timeout
      if (disposalTimeoutRef.current) {
        clearTimeout(disposalTimeoutRef.current);
        disposalTimeoutRef.current = null;
      }
    }
  }, [player, isDisposing]);

  // Cleanup on unmount or URI change
  useEffect(() => {
    return () => {
      disposePlayer();
    };
  }, [disposePlayer]);

  // Handle player status changes with useEventListener for proper expo-video API usage
  useEventListener(player, 'statusChange', useCallback(({ status, error }) => {
    if (isDisposing) return;

    try {
      if (error) {
        if (__DEV__) {
          console.warn('Video playback error:', error);
        }
        onError?.(new Error(error.message || 'Video playback error'));
      }

      // Create status object compatible with the existing interface
      const statusUpdate = {
        ...status,
        error: error?.message || null,
      };

      onPlaybackStatusUpdate?.(statusUpdate);
    } catch (statusError) {
      if (__DEV__) {
        console.warn('Playback status update error:', statusError);
      }
    }
  }, [onError, onPlaybackStatusUpdate, isDisposing]));

  if (isDisposing) {
    return <View style={style} className={className} />;
  }

  return (
    <VideoView
      ref={playerRef}
      style={style}
      player={player}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      showsTimecodes={false}
      requiresLinearPlayback={false}
    />
  );
};

export default HermesCompatibleVideoPlayer;
