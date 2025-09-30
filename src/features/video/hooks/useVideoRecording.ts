/**
 * useVideoRecording Hook
 * Custom hook for video recording with Vision Camera
 * Handles camera setup, permissions, and recording state
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import type {
  VideoRecordingOptions,
  VideoRecordingState,
  CameraPermissions,
} from '../types';
import { VIDEO_CONSTANTS } from '../types';

const IS_EXPO_GO = !!(global as any).__expo?.isExpoGo;

// Lazy load Vision Camera
let Camera: any;
let useCameraDevice: any;
let useCameraPermission: any;

const loadVisionCamera = async () => {
  if (IS_EXPO_GO) {
    throw new Error('Vision Camera not available in Expo Go');
  }

  try {
    const visionCamera = await import('react-native-vision-camera');
    Camera = visionCamera.Camera;
    useCameraDevice = visionCamera.useCameraDevice;
    useCameraPermission = visionCamera.useCameraPermission;
    return true;
  } catch (error) {
    console.error('Failed to load Vision Camera:', error);
    return false;
  }
};

export interface UseVideoRecordingReturn {
  state: VideoRecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleCamera: () => void;
  requestPermissions: () => Promise<boolean>;
  cameraRef: React.RefObject<any>;
  Camera: any;
  cameraDevice: any;
}

/**
 * Custom hook for video recording
 */
export const useVideoRecording = (
  options: VideoRecordingOptions = {},
): UseVideoRecordingReturn => {
  const {
    maxDuration = VIDEO_CONSTANTS.MAX_DURATION,
    enableFaceBlur = false,
    blurIntensity = VIDEO_CONSTANTS.DEFAULT_BLUR_INTENSITY,
    facing: initialFacing = 'front',
    enableAudio = true,
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  // Refs
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  // State
  const [isVisionCameraLoaded, setIsVisionCameraLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facing, setFacing] = useState(initialFacing);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [cameraDevice, setCameraDevice] = useState<any>(null);

  // Initialize Vision Camera
  useEffect(() => {
    const init = async () => {
      try {
        const loaded = await loadVisionCamera();
        if (loaded) {
          setIsVisionCameraLoaded(true);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Vision Camera';
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    init();
  }, [onError]);

  // Get camera device
  useEffect(() => {
    if (isVisionCameraLoaded && useCameraDevice) {
      try {
        const device = useCameraDevice(facing);
        setCameraDevice(device);
      } catch (error) {
        console.error('Failed to get camera device:', error);
      }
    }
  }, [isVisionCameraLoaded, facing]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isVisionCameraLoaded || !Camera) {
      setError('Vision Camera not loaded');
      return false;
    }

    try {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      const granted = cameraPermission === 'granted' && microphonePermission === 'granted';
      setHasPermissions(granted);

      if (!granted) {
        Alert.alert('Permissions Required', 'Camera and microphone permissions are required to record videos.');
      }

      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      setError('Failed to request permissions');
      return false;
    }
  }, [isVisionCameraLoaded]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current || !cameraDevice) {
      return;
    }

    try {
      // Check permissions
      if (!hasPermissions) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      setError(undefined);
      setRecordingTime(0);
      isRecordingRef.current = true;
      setIsRecording(true);

      onRecordingStart?.();

      console.log('Starting Vision Camera recording...');

      await cameraRef.current.startRecording({
        onRecordingFinished: (video: any) => {
          console.log('Recording finished:', video.path);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          onRecordingStop?.(video.path);
        },
        onRecordingError: (error: any) => {
          console.error('Recording error:', error);
          isRecordingRef.current = false;
          setIsRecording(false);
          setRecordingTime(0);
          const errorMessage = error?.message || 'Recording failed';
          setError(errorMessage);
          onError?.(errorMessage);
        },
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      onError?.(errorMessage);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [cameraDevice, hasPermissions, requestPermissions, onRecordingStart, onRecordingStop, onError]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecordingRef.current) {
      return;
    }

    try {
      console.log('Stopping Vision Camera recording...');
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const state: VideoRecordingState = {
    isRecording,
    recordingTime,
    hasPermissions,
    isReady: isVisionCameraLoaded && !!cameraDevice,
    error,
    facing,
  };

  return {
    state,
    startRecording,
    stopRecording,
    toggleCamera,
    requestPermissions,
    cameraRef,
    Camera,
    cameraDevice,
  };
};

export default useVideoRecording;
