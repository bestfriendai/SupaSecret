import React, { useEffect, useCallback, createContext, useContext, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInDown,
  SlideOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../../utils/cn";

export type ToastType = "success" | "error" | "warning" | "info";
export type ToastPosition = "top" | "bottom";

export interface ToastConfig {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  show: (config: Omit<ToastConfig, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  hide: (id: string) => void;
  hideAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const show = useCallback((config: Omit<ToastConfig, "id">) => {
    const id = Math.random().toString(36).substring(7);
    const toast: ToastConfig = {
      id,
      duration: 3000,
      position: "top",
      ...config,
    };

    setToasts((prev) => [...prev, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }
  }, []);

  const success = useCallback(
    (message: string, title?: string) => {
      show({ type: "success", message, title });
    },
    [show],
  );

  const error = useCallback(
    (message: string, title?: string) => {
      show({ type: "error", message, title });
    },
    [show],
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      show({ type: "warning", message, title });
    },
    [show],
  );

  const info = useCallback(
    (message: string, title?: string) => {
      show({ type: "info", message, title });
    },
    [show],
  );

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = {
    show,
    success,
    error,
    warning,
    info,
    hide,
    hideAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hide} />
    </ToastContext.Provider>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const topToasts = toasts.filter((t) => t.position === "top");
  const bottomToasts = toasts.filter((t) => t.position === "bottom");

  return (
    <>
      {/* Top Toasts */}
      {topToasts.length > 0 && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            zIndex: 9999,
          }}
          pointerEvents="box-none"
        >
          {topToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </View>
      )}

      {/* Bottom Toasts */}
      {bottomToasts.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 8,
            left: 16,
            right: 16,
            zIndex: 9999,
          }}
          pointerEvents="box-none"
        >
          {bottomToasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </View>
      )}
    </>
  );
};

// Individual Toast Item Component
interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-green-500",
          icon: "✓",
          iconBg: "bg-green-600",
        };
      case "error":
        return {
          bg: "bg-red-500",
          icon: "✕",
          iconBg: "bg-red-600",
        };
      case "warning":
        return {
          bg: "bg-yellow-500",
          icon: "⚠",
          iconBg: "bg-yellow-600",
        };
      case "info":
      default:
        return {
          bg: "bg-blue-500",
          icon: "ℹ",
          iconBg: "bg-blue-600",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutUp.springify().damping(15)}
      className={cn("rounded-xl p-4 mb-2 shadow-lg", styles.bg)}
    >
      <View className="flex-row items-start">
        {/* Icon */}
        <View className={cn("w-8 h-8 rounded-full items-center justify-center mr-3", styles.iconBg)}>
          <Text className="text-white text-base font-bold">{styles.icon}</Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          {toast.title && <Text className="text-white font-semibold mb-1">{toast.title}</Text>}
          <Text className="text-white text-sm leading-5">{toast.message}</Text>

          {/* Action Button */}
          {toast.action && (
            <Pressable
              onPress={toast.action.onPress}
              className="mt-2 self-start"
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <Text className="text-white font-semibold text-sm underline">{toast.action.label}</Text>
            </Pressable>
          )}
        </View>

        {/* Dismiss Button */}
        <Pressable
          onPress={handleDismiss}
          className="ml-2 p-1"
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Text className="text-white text-lg">✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

// Simple Toast Component (without provider)
export interface SimpleToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
  duration?: number;
  position?: ToastPosition;
}

export const SimpleToast: React.FC<SimpleToastProps> = ({
  visible,
  message,
  type = "info",
  onDismiss,
  duration = 3000,
  position = "top",
}) => {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(position === "top" ? -100 : 100);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15 });

      if (duration > 0) {
        const timer = setTimeout(() => {
          opacity.value = withTiming(0, { duration: 300 });
          translateY.value = withTiming(position === "top" ? -100 : 100, { duration: 300 }, (finished) => {
            if (finished && onDismiss) {
              runOnJS(onDismiss)();
            }
          });
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(position === "top" ? -100 : 100, { duration: 300 });
    }
    return undefined;
  }, [visible, duration, opacity, translateY, position, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
      default:
        return "bg-blue-500";
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          [position]: position === "top" ? insets.top + 8 : insets.bottom + 8,
          left: 16,
          right: 16,
          zIndex: 9999,
        },
      ]}
      className={cn("rounded-xl p-4 shadow-lg", getTypeStyles())}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-sm flex-1">{message}</Text>
        {onDismiss && (
          <Pressable onPress={onDismiss} className="ml-3" accessibilityRole="button" accessibilityLabel="Dismiss">
            <Text className="text-white text-lg">✕</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

// Export toast hook for direct usage
export const toast = {
  success: (message: string, title?: string) => {
    // This will be set by ToastProvider
    console.warn("Toast not initialized. Wrap your app with ToastProvider.");
  },
  error: (message: string, title?: string) => {
    console.warn("Toast not initialized. Wrap your app with ToastProvider.");
  },
  warning: (message: string, title?: string) => {
    console.warn("Toast not initialized. Wrap your app with ToastProvider.");
  },
  info: (message: string, title?: string) => {
    console.warn("Toast not initialized. Wrap your app with ToastProvider.");
  },
};
