import React from "react";
import { View, Text, Pressable } from "react-native";
import type { ViewProps } from "react-native";
import { cn } from "../../../utils/cn";

export interface ErrorProps extends ViewProps {
  title?: string;
  message: string;
  error?: Error | null;
  onRetry?: () => void;
  retryText?: string;
  showDetails?: boolean;
  variant?: "default" | "minimal" | "full";
  icon?: string;
}

export const Error: React.FC<ErrorProps> = ({
  title = "Something went wrong",
  message,
  error,
  onRetry,
  retryText = "Try Again",
  showDetails = false,
  variant = "default",
  icon = "❌",
  className,
  ...viewProps
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  if (variant === "minimal") {
    return (
      <View className={cn("bg-red-900/20 border border-red-500 rounded-lg p-3", className)} {...viewProps}>
        <View className="flex-row items-start">
          <Text className="text-red-400 text-lg mr-2">{icon}</Text>
          <View className="flex-1">
            <Text className="text-red-400 text-sm">{message}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (variant === "full") {
    return (
      <View className={cn("flex-1 bg-black items-center justify-center px-6", className)} {...viewProps}>
        <View className="items-center max-w-md">
          <View className="w-20 h-20 bg-red-500/20 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">{icon}</Text>
          </View>
          <Text className="text-white text-2xl font-bold mb-2 text-center">{title}</Text>
          <Text className="text-gray-400 text-base text-center mb-6 leading-6">{message}</Text>

          {showDetails && error && (
            <View className="w-full mb-6">
              <Pressable
                onPress={() => setShowErrorDetails(!showErrorDetails)}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4"
              >
                <Text className="text-gray-400 text-sm font-medium mb-2">
                  {showErrorDetails ? "Hide" : "Show"} Error Details
                </Text>
                {showErrorDetails && (
                  <View className="mt-2 pt-2 border-t border-gray-700">
                    <Text className="text-red-400 text-xs font-mono">{error.message}</Text>
                    {error.stack && <Text className="text-gray-500 text-xs font-mono mt-2">{error.stack}</Text>}
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {onRetry && (
            <Pressable
              onPress={onRetry}
              className="bg-blue-500 rounded-full py-3 px-8 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={retryText}
            >
              <Text className="text-white font-semibold text-base">{retryText}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Default variant
  return (
    <View className={cn("bg-gray-900 border border-red-500/30 rounded-xl p-6 items-center", className)} {...viewProps}>
      <View className="w-16 h-16 bg-red-500/20 rounded-full items-center justify-center mb-4">
        <Text className="text-3xl">{icon}</Text>
      </View>
      <Text className="text-white text-lg font-semibold mb-2 text-center">{title}</Text>
      <Text className="text-gray-400 text-sm text-center mb-6 leading-5">{message}</Text>

      {showDetails && error && (
        <View className="w-full mb-4">
          <Pressable
            onPress={() => setShowErrorDetails(!showErrorDetails)}
            className="bg-gray-800 border border-gray-700 rounded-lg p-3"
          >
            <Text className="text-gray-400 text-xs font-medium">
              {showErrorDetails ? "Hide" : "Show"} Error Details
            </Text>
            {showErrorDetails && (
              <View className="mt-2 pt-2 border-t border-gray-700">
                <Text className="text-red-400 text-xs font-mono">{error.message}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="bg-blue-500 rounded-full py-3 px-6 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={retryText}
        >
          <Text className="text-white font-semibold text-center">{retryText}</Text>
        </Pressable>
      )}
    </View>
  );
};

// Error Boundary Fallback Component
export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({ error, resetError }) => {
  return (
    <Error
      title="Application Error"
      message="An unexpected error occurred. Please try restarting the app."
      error={error}
      onRetry={resetError}
      retryText="Restart"
      showDetails={__DEV__}
      variant="full"
      icon="⚠️"
    />
  );
};

// Network Error Component
export const NetworkError: React.FC<Omit<ErrorProps, "title" | "icon">> = (props) => (
  <Error
    {...props}
    title="No Internet Connection"
    icon="📡"
    message={props.message || "Please check your internet connection and try again."}
  />
);

// Not Found Error Component
export const NotFoundError: React.FC<Omit<ErrorProps, "title" | "icon">> = (props) => (
  <Error
    {...props}
    title="Not Found"
    icon="🔍"
    message={props.message || "The content you're looking for doesn't exist."}
  />
);

// Permission Error Component
export const PermissionError: React.FC<Omit<ErrorProps, "title" | "icon">> = (props) => (
  <Error
    {...props}
    title="Permission Required"
    icon="🔒"
    message={props.message || "You don't have permission to access this content."}
  />
);

// Server Error Component
export const ServerError: React.FC<Omit<ErrorProps, "title" | "icon">> = (props) => (
  <Error
    {...props}
    title="Server Error"
    icon="🔧"
    message={props.message || "Our servers are experiencing issues. Please try again later."}
  />
);

// Inline Error Message
export interface InlineErrorProps {
  message: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className }) => {
  return (
    <View className={cn("flex-row items-center mt-1", className)}>
      <Text className="text-red-400 text-xs">⚠ {message}</Text>
    </View>
  );
};

// Error Alert Banner
export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  dismissText?: string;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, dismissText = "Dismiss", className }) => {
  return (
    <View className={cn("bg-red-900/30 border-l-4 border-red-500 p-4 flex-row items-center justify-between", className)}>
      <View className="flex-1 flex-row items-start">
        <Text className="text-red-400 text-base mr-2">⚠️</Text>
        <Text className="text-red-400 text-sm flex-1">{message}</Text>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ml-3" accessibilityRole="button" accessibilityLabel={dismissText}>
          <Text className="text-red-400 text-sm font-medium">{dismissText}</Text>
        </Pressable>
      )}
    </View>
  );
};
