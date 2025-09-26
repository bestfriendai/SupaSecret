import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as Device from "expo-device";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: (string | number)[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

/**
 * Comprehensive Error Boundary with detailed error reporting
 * and recovery mechanisms
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    // Call super first without type annotation to avoid Hermes issues
    super(props);

    // Initialize state directly without type inference issues
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error details for debugging
    this.logError(error, errorInfo);

    // Report to crash analytics (if implemented)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => prevProps.resetKeys?.[index] !== key);

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any prop changes (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    if (__DEV__) {
      console.group("🚨 Error Boundary Caught Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Component Stack:", errorInfo.componentStack);
      console.groupEnd();
    }
  };

  private reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // Collect device and app information
      const deviceInfo = {
        deviceName: Device.deviceName,
        deviceType: Device.deviceType,
        osName: Device.osName,
        osVersion: Device.osVersion,
        modelName: Device.modelName,
        appVersion: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
      };

      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        deviceInfo,
        userAgent: navigator.userAgent,
      };

      // Error reporting service removed
      if (__DEV__) {
        console.log("Error Report:", errorReport);
      }

      // TODO: Implement actual error reporting
      // await crashAnalytics.recordError(errorReport);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    // In React Native, we can't reload the app directly
    // But we can reset the error boundary and hope for the best
    this.resetErrorBoundary();

    // Auto-retry after a short delay
    this.resetTimeoutId = setTimeout(() => {
      if (this.state.hasError) {
        this.resetErrorBoundary();
      }
    }, 1000);
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo!);
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          errorId={this.state.errorId}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
  onReload: () => void;
  errorId: string;
}

function DefaultErrorFallback({ error, errorInfo, onRetry, onReload, errorId }: DefaultErrorFallbackProps) {
  // Use platform-specific default safe area insets
  const insets = Platform.select({
    ios: { top: 44, bottom: 34, left: 0, right: 0 },
    android: { top: 24, bottom: 0, left: 0, right: 0 },
    default: { top: 0, bottom: 0, left: 0, right: 0 },
  })!;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-red-500/20 rounded-full items-center justify-center mb-4">
            <Ionicons name="warning" size={40} color="#EF4444" />
          </View>

          <Text className="text-white text-24 font-bold text-center mb-2">Oops! Something went wrong</Text>

          <Text className="text-gray-400 text-16 text-center mb-6 leading-6">
            We encountered an unexpected error. Don't worry, your data is safe.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="gap-4 mb-8">
          <Pressable className="bg-blue-600 rounded-full py-4 px-6" onPress={onRetry}>
            <Text className="text-white text-16 font-semibold text-center">Try Again</Text>
          </Pressable>

          <Pressable className="bg-gray-700 rounded-full py-4 px-6" onPress={onReload}>
            <Text className="text-white text-16 font-semibold text-center">Reload App</Text>
          </Pressable>
        </View>

        {/* Error Details (Development Only) */}
        {__DEV__ && (
          <View className="bg-gray-900 rounded-lg p-4">
            <Text className="text-red-400 text-14 font-semibold mb-2">Error Details (Dev Mode)</Text>
            <Text className="text-gray-300 text-12 mb-2">ID: {errorId}</Text>
            <Text className="text-gray-300 text-12 mb-2">Message: {error.message}</Text>
            {error.stack && (
              <ScrollView className="max-h-32">
                <Text className="text-gray-400 text-10 font-mono">{error.stack}</Text>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for manually triggering error boundary
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    // This will trigger the nearest error boundary
    throw error;
  }, []);
}
