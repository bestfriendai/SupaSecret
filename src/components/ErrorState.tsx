import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface ErrorConfig {
  icon: IoniconsName;
  title: string;
  message: string;
  actionLabel: string;
}

interface ErrorStateProps {
  type: "network" | "generic" | "empty";
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IoniconsName;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ type, title, message, actionLabel, onAction, icon }) => {
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

  return (
    <View className="flex-1 items-center justify-center px-6 py-20">
      <View className="items-center">
        <View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-6">
          <Ionicons name={config.icon} size={40} color="#8B98A5" />
        </View>

        <Text className="text-white text-20 font-bold mb-3 text-center">{config.title}</Text>

        <Text className="text-gray-500 text-15 mb-8 text-center leading-6 max-w-sm">{config.message}</Text>

        {onAction && (
          <Pressable
            className="bg-blue-500 rounded-full px-8 py-3 min-w-32"
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={config.actionLabel}
          >
            <Text className="text-white font-semibold text-center text-16">{config.actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

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
