import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMediaPermissions } from "../hooks/useMediaPermissions";
import { getUserFriendlyMessage, StandardError } from "../utils/errorHandling";
import { ErrorState } from "./ErrorState";

interface PermissionGateProps {
  children: React.ReactNode;
  permissions?: ("camera" | "microphone" | "mediaLibrary")[];
  onPermissionDenied?: () => void;
  onPermissionGranted?: () => void;
  customMessages?: {
    camera?: string;
    microphone?: string;
    mediaLibrary?: string;
    permanentlyDenied?: string;
  };
  showSettingsButton?: boolean;
}

const defaultMessages = {
  camera:
    "Camera access is required to record videos. Your privacy is important to us - we only access the camera when you're actively recording.",
  microphone: "Microphone access is needed to capture audio with your videos. Audio is processed locally for privacy.",
  mediaLibrary:
    "Media library access allows you to save and share your videos. We only access files you explicitly choose.",
  permanentlyDenied: "Permissions have been denied. Please enable them in your device settings to continue.",
};

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permissions = ["camera", "microphone"],
  onPermissionDenied,
  onPermissionGranted,
  customMessages = {},
  showSettingsButton = true,
}) => {
  const {
    permissionState,
    rawPermissions,
    requestCameraPermission,
    requestMicrophonePermission,
    requestMediaLibraryPermission,
    checkAllPermissions,
  } = useMediaPermissions();

  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deniedPermissions, setDeniedPermissions] = useState<string[]>([]);

  const messages = { ...defaultMessages, ...customMessages };

  const checkInitialPermissions = async () => {
    setIsChecking(true);
    setError(null);

    try {
      await checkAllPermissions();

      const denied: string[] = [];

      if (permissions.includes("camera") && !permissionState.camera) {
        denied.push("camera");
      }
      if (permissions.includes("microphone") && !permissionState.microphone) {
        denied.push("microphone");
      }
      if (permissions.includes("mediaLibrary") && !permissionState.mediaLibrary) {
        denied.push("mediaLibrary");
      }

      setDeniedPermissions(denied);

      if (denied.length === 0) {
        onPermissionGranted?.();
      } else {
        onPermissionDenied?.();
      }
    } catch (err) {
      const standardError: StandardError = {
        code: "PERMISSION_CHECK_FAILED",
        message: (err as Error)?.message || "Failed to check permissions",
      };
      setError(getUserFriendlyMessage(standardError));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkInitialPermissions();
  }, [checkInitialPermissions]);

  const requestPermission = async (type: "camera" | "microphone" | "mediaLibrary") => {
    setError(null);

    try {
      let result: boolean = false;

      switch (type) {
        case "camera":
          result = await requestCameraPermission();
          break;
        case "microphone":
          result = await requestMicrophonePermission();
          break;
        case "mediaLibrary":
          result = await requestMediaLibraryPermission();
          break;
      }

      if (result) {
        // Remove from denied list
        setDeniedPermissions((prev) => prev.filter((p) => p !== type));

        // Check if all permissions are now granted
        await checkInitialPermissions();
      } else {
        setError(
          `${type.charAt(0).toUpperCase() + type.slice(1)} permission was denied. You can enable it in settings.`,
        );
      }
    } catch (err) {
      const standardError: StandardError = {
        code: "PERMISSION_REQUEST_FAILED",
        message: (err as Error)?.message || `Failed to request ${type} permission`,
      };
      setError(getUserFriendlyMessage(standardError));
    }
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const isPermanentlyDenied = () => {
    // Compute which permissions are needed based on the permissions prop
    const needsCamera = permissions.includes("camera");
    const needsMic = permissions.includes("microphone");
    const needsLib = permissions.includes("mediaLibrary");

    // Helper function to check if a permission is permanently denied
    const isPermanent = (p: any) => p?.status === "denied" && p?.canAskAgain === false;

    // Check if any required permission is permanently denied
    if (needsCamera && isPermanent(rawPermissions.camera)) return true;
    if (needsMic && isPermanent(rawPermissions.microphone)) return true;
    if (needsLib && isPermanent(rawPermissions.mediaLibrary)) return true;
    return false;
  };

  // Show loading state while checking permissions
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // Show error state if there's an error
  if (error) {
    return <ErrorState message={error} onRetry={checkInitialPermissions} type="permission" />;
  }

  // All permissions granted - render children
  if (deniedPermissions.length === 0) {
    return <>{children}</>;
  }

  // Show permission request UI
  const permanentlyDenied = isPermanentlyDenied();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name={permanentlyDenied ? "lock-closed" : "shield-checkmark"}
          size={64}
          color={permanentlyDenied ? "#FF3B30" : "#007AFF"}
          style={styles.icon}
        />

        <Text style={styles.title}>{permanentlyDenied ? "Permissions Required" : "Grant Permissions"}</Text>

        {permanentlyDenied ? (
          <>
            <Text style={styles.description}>{messages.permanentlyDenied}</Text>
            {showSettingsButton && (
              <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
                <Ionicons name="settings-outline" size={20} color="white" />
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.description}>This app needs the following permissions to work properly:</Text>

            <View style={styles.permissionList}>
              {deniedPermissions.map((permission) => (
                <View key={permission} style={styles.permissionItem}>
                  <View style={styles.permissionInfo}>
                    <Ionicons
                      name={permission === "camera" ? "camera" : permission === "microphone" ? "mic" : "images"}
                      size={24}
                      color="#007AFF"
                      style={styles.permissionIcon}
                    />
                    <View style={styles.permissionTextContainer}>
                      <Text style={styles.permissionName}>
                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                      </Text>
                      <Text style={styles.permissionDescription}>{messages[permission as keyof typeof messages]}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.grantButton} onPress={() => requestPermission(permission as any)}>
                    <Text style={styles.grantButtonText}>Grant</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.retryButton} onPress={checkInitialPermissions}>
              <Text style={styles.retryButtonText}>I've granted permissions</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  permissionList: {
    width: "100%",
    marginBottom: 24,
  },
  permissionItem: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  permissionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  permissionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: "#999",
    lineHeight: 20,
  },
  grantButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  grantButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#333",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
