import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface ErrorConfig {
  icon: IoniconsName;
  title: string;
  message: string;
  actionLabel: string;
}

interface ErrorStateProps {
  type: "network" | "generic" | "empty" | "auth" | "video" | "permission";
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  onRetry?: () => void;
  icon?: IoniconsName;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ type, title, message, actionLabel, onAction, onRetry, icon }) => {
  const getErrorConfig = (): ErrorConfig => {
    switch (type) {
      case "network":
        return {
          icon: icon || "cloud-offline-outline",
          title: title || "Unable to Load Secrets",
          message: message || "Check your internet connection and try again",
          actionLabel: actionLabel || "Retry",
        };
      case "empty":
        return {
          icon: icon || "lock-closed-outline",
          title: title || "No secrets shared yet",
          message: message || "Be the first to share an anonymous confession with the community",
          actionLabel: actionLabel || "Share Secret",
        };
      case "auth":
        return {
          icon: icon || "person-circle-outline",
          title: title || "Authentication Error",
          message: message || "Unable to verify your authentication status. Please try again.",
          actionLabel: actionLabel || "Retry",
        };
      case "video":
        return {
          icon: icon || "videocam-off-outline",
          title: title || "Video Error",
          message: message || "Unable to load videos. Please check your connection and try again.",
          actionLabel: actionLabel || "Retry",
        };
      case "permission":
        return {
          icon: icon || "shield-outline",
          title: title || "Permission Error",
          message: message || "Unable to check permissions. Please try again.",
          actionLabel: actionLabel || "Retry",
        };
      case "generic":
      default:
        return {
          icon: icon || "alert-circle-outline",
          title: title || "Something went wrong",
          message: message || "We encountered an unexpected error. Please try again.",
          actionLabel: actionLabel || "Try Again",
        };
    }
  };

  const config: ErrorConfig = getErrorConfig();

  // Use onRetry if provided, otherwise use onAction
  const handleAction = onRetry || onAction;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={40} color="#8B98A5" />
        </View>

        <Text style={styles.title}>{config.title}</Text>

        <Text style={styles.message}>{config.message}</Text>

        {handleAction && (
          <Pressable
            style={styles.button}
            onPress={handleAction}
            accessibilityRole="button"
            accessibilityLabel={config.actionLabel}
          >
            <Text style={styles.buttonText}>{config.actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1F2937',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#6B7280',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 128,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});

// Specific error state components for common use cases
export const NetworkErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <ErrorState type="network" onAction={onRetry} />
);

export const EmptyState: React.FC<{ onAction?: () => void; actionLabel?: string }> = ({ onAction, actionLabel }) => (
  <ErrorState type="empty" onAction={onAction} actionLabel={actionLabel} />
);

export const GenericErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <ErrorState type="generic" onAction={onRetry} />
);
