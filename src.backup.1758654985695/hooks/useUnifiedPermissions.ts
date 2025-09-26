import { useState, useCallback } from "react";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { Alert, Linking } from "react-native";

interface PermissionState {
  camera: boolean;
  microphone: boolean;
  loading: boolean;
}

/**
 * Unified hook for managing camera and microphone permissions
 * Prevents multiple dialogs and state drift between permission hooks
 */
export const useUnifiedPermissions = () => {
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMicrophone] = useMicrophonePermissions();

  const [permissionState, setPermissionState] = useState<PermissionState>({
    camera: cameraPermission?.granted || false,
    microphone: micPermission?.granted || false,
    loading: false,
  });

  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    setPermissionState((prev) => ({ ...prev, loading: true }));

    try {
      const [cameraResult, micResult] = await Promise.all([requestCamera(), requestMicrophone()]);

      const newState = {
        camera: cameraResult.granted,
        microphone: micResult.granted,
        loading: false,
      };

      setPermissionState(newState);

      // Show specific error messages for denied permissions
      if (!cameraResult.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in your device settings to record video confessions.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: requestAllPermissions },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }

      if (!micResult.granted) {
        Alert.alert(
          "Microphone Permission Required",
          "Please enable microphone access in your device settings to record audio for your video confessions.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try Again", onPress: requestAllPermissions },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }

      return cameraResult.granted && micResult.granted;
    } catch (error) {
      console.error("Permission error:", error);
      setPermissionState((prev) => ({ ...prev, loading: false }));

      Alert.alert(
        "Permission Error",
        "Failed to request permissions. Please try again or check your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Try Again", onPress: requestAllPermissions },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );

      return false;
    }
  }, [requestCamera, requestMicrophone]);

  const checkPermissions = useCallback((): boolean => {
    const hasCamera = cameraPermission?.granted || false;
    const hasMicrophone = micPermission?.granted || false;

    setPermissionState((prev) => ({
      ...prev,
      camera: hasCamera,
      microphone: hasMicrophone,
    }));

    return hasCamera && hasMicrophone;
  }, [cameraPermission?.granted, micPermission?.granted]);

  return {
    permissionState,
    requestAllPermissions,
    checkPermissions,
    hasAllPermissions: permissionState.camera && permissionState.microphone,
  };
};
