/**
 * Media Permissions Hook
 * Unified hook for managing camera, microphone, and media library permissions
 * with proper fallbacks and user guidance
 */

import { useState, useCallback, useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export interface MediaPermissionState {
  camera: boolean;
  microphone: boolean;
  mediaLibrary: boolean;
  loading: boolean;
  error?: string;
}

export interface MediaPermissionOptions {
  showAlerts?: boolean;
  autoRequest?: boolean;
}

/**
 * Unified hook for managing all media-related permissions
 */
export const useMediaPermissions = (options: MediaPermissionOptions = {}) => {
  const { showAlerts = true, autoRequest = false } = options;

  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMicrophone] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibrary] = ImagePicker.useMediaLibraryPermissions();

  const [permissionState, setPermissionState] = useState<MediaPermissionState>({
    camera: false,
    microphone: false,
    mediaLibrary: false,
    loading: false,
  });

  const showPermissionAlert = useCallback(
    (title: string, message: string, onRetry?: () => void) => {
      if (!showAlerts) return;

      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        ...(onRetry ? [{ text: "Try Again", onPress: onRetry }] : []),
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings(),
          style: "default",
        },
      ]);
    },
    [showAlerts],
  );

  // Update state when permissions change
  useEffect(() => {
    setPermissionState((prev) => ({
      ...prev,
      camera: cameraPermission?.granted || false,
      microphone: micPermission?.granted || false,
      mediaLibrary: mediaLibraryPermission?.granted || false,
    }));
  }, [cameraPermission?.granted, micPermission?.granted, mediaLibraryPermission?.granted]);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await requestCamera();

      if (!result.granted) {
        showPermissionAlert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to record video confessions.",
          requestCameraPermission,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Camera permission error:", error);
      setPermissionState((prev) => ({
        ...prev,
        error: "Failed to request camera permission",
      }));
      return false;
    }
  }, [requestCamera, showPermissionAlert]);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await requestMicrophone();

      if (!result.granted) {
        showPermissionAlert(
          "Microphone Permission Required",
          "Please enable microphone access in your device settings to record audio for your video confessions.",
          requestMicrophonePermission,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Microphone permission error:", error);
      setPermissionState((prev) => ({
        ...prev,
        error: "Failed to request microphone permission",
      }));
      return false;
    }
  }, [requestMicrophone, showPermissionAlert]);

  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await requestMediaLibrary();

      if (!result.granted) {
        showPermissionAlert(
          "Photo Library Permission Required",
          "Please enable photo library access in your device settings to select images for your profile.",
          requestMediaLibraryPermission,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Media library permission error:", error);
      setPermissionState((prev) => ({
        ...prev,
        error: "Failed to request media library permission",
      }));
      return false;
    }
  }, [requestMediaLibrary, showPermissionAlert]);

  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    setPermissionState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const [cameraGranted, micGranted, mediaGranted] = await Promise.all([
        requestCameraPermission(),
        requestMicrophonePermission(),
        requestMediaLibraryPermission(),
      ]);

      const allGranted = cameraGranted && micGranted && mediaGranted;

      setPermissionState((prev) => ({
        ...prev,
        loading: false,
        camera: cameraGranted,
        microphone: micGranted,
        mediaLibrary: mediaGranted,
      }));

      return allGranted;
    } catch (error) {
      console.error("All permissions request error:", error);
      setPermissionState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to request all permissions",
      }));
      return false;
    }
  }, [requestCameraPermission, requestMicrophonePermission, requestMediaLibraryPermission]);

  // Auto-request permissions on mount if enabled
  useEffect(() => {
    if (autoRequest) {
      requestAllPermissions();
    }
  }, [autoRequest, requestAllPermissions]);

  const requestVideoPermissions = useCallback(async (): Promise<boolean> => {
    setPermissionState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const [cameraGranted, micGranted] = await Promise.all([requestCameraPermission(), requestMicrophonePermission()]);

      const allGranted = cameraGranted && micGranted;

      setPermissionState((prev) => ({
        ...prev,
        loading: false,
        camera: cameraGranted,
        microphone: micGranted,
      }));

      return allGranted;
    } catch (error) {
      console.error("Video permission request error:", error);
      setPermissionState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to request video permissions",
      }));
      return false;
    }
  }, [requestCameraPermission, requestMicrophonePermission]);

  const checkAllPermissions = useCallback((): boolean => {
    const hasCamera = cameraPermission?.granted || false;
    const hasMicrophone = micPermission?.granted || false;
    const hasMediaLibrary = mediaLibraryPermission?.granted || false;

    setPermissionState((prev) => ({
      ...prev,
      camera: hasCamera,
      microphone: hasMicrophone,
      mediaLibrary: hasMediaLibrary,
    }));

    return hasCamera && hasMicrophone && hasMediaLibrary;
  }, [cameraPermission?.granted, micPermission?.granted, mediaLibraryPermission?.granted]);

  const hasVideoPermissions = useCallback((): boolean => {
    return (cameraPermission?.granted || false) && (micPermission?.granted || false);
  }, [cameraPermission?.granted, micPermission?.granted]);

  const getPermissionStatus = useCallback(() => {
    return {
      camera: {
        granted: cameraPermission?.granted || false,
        canAskAgain: cameraPermission?.canAskAgain || false,
        status: cameraPermission?.status || "undetermined",
      },
      microphone: {
        granted: micPermission?.granted || false,
        canAskAgain: micPermission?.canAskAgain || false,
        status: micPermission?.status || "undetermined",
      },
      mediaLibrary: {
        granted: mediaLibraryPermission?.granted || false,
        canAskAgain: mediaLibraryPermission?.canAskAgain || false,
        status: mediaLibraryPermission?.status || "undetermined",
      },
    };
  }, [cameraPermission, micPermission, mediaLibraryPermission]);

  const clearError = useCallback(() => {
    setPermissionState((prev) => ({ ...prev, error: undefined }));
  }, []);

  return {
    // State
    permissionState,

    // Individual permission requests
    requestCameraPermission,
    requestMicrophonePermission,
    requestMediaLibraryPermission,

    // Bulk permission requests
    requestAllPermissions,
    requestVideoPermissions,

    // Permission checks
    checkAllPermissions,
    hasVideoPermissions,
    hasAllPermissions: permissionState.camera && permissionState.microphone && permissionState.mediaLibrary,

    // Utilities
    getPermissionStatus,
    clearError,

    // Raw permission objects (for advanced use)
    rawPermissions: {
      camera: cameraPermission,
      microphone: micPermission,
      mediaLibrary: mediaLibraryPermission,
    },
  };
};
