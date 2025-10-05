import React, { useEffect, useRef, useCallback } from "react";
import { Modal as RNModal, View, Pressable, Keyboard, Text, BackHandler } from "react-native";
import type { ModalProps as RNModalProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { cn } from "../../../utils/cn";

export interface ModalProps extends Omit<RNModalProps, "transparent" | "animationType"> {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: "fade" | "slide" | "scale";
  backdropOpacity?: number;
  dismissOnBackdrop?: boolean;
  dismissOnBackButton?: boolean;
  size?: "sm" | "md" | "lg" | "full";
  position?: "center" | "bottom" | "top";
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  animationType = "scale",
  backdropOpacity = 0.5,
  dismissOnBackdrop = true,
  dismissOnBackButton = true,
  size = "md",
  position = "center",
  className,
  ...modalProps
}) => {
  const backdropOpacityValue = useSharedValue(0);
  const scaleValue = useSharedValue(0.8);
  const translateYValue = useSharedValue(50);
  const isClosing = useRef(false);

  const animationConfig = { duration: 300 };
  const springConfig = { damping: 20, stiffness: 300 };

  const handleClose = useCallback(() => {
    if (isClosing.current) return;

    isClosing.current = true;
    Keyboard.dismiss();

    backdropOpacityValue.value = withTiming(0, animationConfig);

    if (animationType === "scale") {
      scaleValue.value = withTiming(0.8, animationConfig, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else if (animationType === "slide") {
      translateYValue.value = withTiming(50, animationConfig, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    } else {
      backdropOpacityValue.value = withTiming(0, animationConfig, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    }
  }, [animationConfig, animationType, backdropOpacityValue, onClose, scaleValue, translateYValue]);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      backdropOpacityValue.value = withTiming(backdropOpacity, animationConfig);

      if (animationType === "scale") {
        scaleValue.value = withSpring(1, springConfig);
      } else if (animationType === "slide") {
        translateYValue.value = withSpring(0, springConfig);
      }
    } else if (!isClosing.current) {
      handleClose();
    }

    return () => {
      cancelAnimation(backdropOpacityValue);
      cancelAnimation(scaleValue);
      cancelAnimation(translateYValue);
    };
  }, [
    visible,
    animationConfig,
    animationType,
    backdropOpacity,
    backdropOpacityValue,
    handleClose,
    scaleValue,
    springConfig,
    translateYValue,
  ]);

  useEffect(() => {
    if (!visible || !dismissOnBackButton) return;

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isClosing.current) {
        handleClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, dismissOnBackButton, handleClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }));

  const contentStyle = useAnimatedStyle(() => {
    const baseStyle: any = {};

    if (animationType === "scale") {
      baseStyle.transform = [{ scale: scaleValue.value }];
    } else if (animationType === "slide") {
      baseStyle.transform = [{ translateY: translateYValue.value }];
    }

    return baseStyle;
  }, [animationType]);

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && !isClosing.current) {
      handleClose();
    }
  };

  const handleRequestClose = () => {
    if (dismissOnBackButton && !isClosing.current) {
      handleClose();
    }
  };

  // Size styles
  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    full: "w-full h-full",
  };

  // Position styles
  const positionStyles = {
    center: "justify-center items-center",
    bottom: "justify-end items-center",
    top: "justify-start items-center",
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
      {...modalProps}
    >
      <View className="flex-1">
        {/* Animated backdrop */}
        <Animated.View style={[backdropStyle]} className="absolute inset-0 bg-black" />

        {/* Backdrop pressable */}
        <Pressable
          className="flex-1"
          onPress={handleBackdropPress}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <View className={cn("flex-1 px-6", positionStyles[position])}>
            {/* Modal content */}
            <Pressable onPress={(e) => e.stopPropagation()} className={cn("w-full", sizeStyles[size])}>
              <Animated.View style={[contentStyle]} className={cn("bg-gray-900 rounded-2xl p-6", className)}>
                {children}
              </Animated.View>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </RNModal>
  );
};

// Alert Modal Component
export interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  icon?: string;
  iconColor?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  confirmText = "OK",
  onConfirm,
  icon = "ℹ️",
  iconColor = "bg-blue-500",
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} animationType="scale" size="sm">
      <View className="items-center">
        <View className={cn("w-16 h-16 rounded-full items-center justify-center mb-4", iconColor)}>
          <Text className="text-white text-2xl">{icon}</Text>
        </View>
        <Text className="text-white text-lg font-semibold mb-2 text-center">{title}</Text>
        <Text className="text-gray-400 text-sm text-center mb-6 leading-5">{message}</Text>
        <Pressable
          className="bg-blue-500 rounded-full py-3 px-6 w-full active:opacity-80"
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel={confirmText}
        >
          <Text className="text-white font-semibold text-center">{confirmText}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

// Confirm Modal Component
export interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  destructive = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} animationType="scale" size="sm">
      <View className="items-center">
        <View
          className={cn(
            "w-16 h-16 rounded-full items-center justify-center mb-4",
            destructive ? "bg-red-500" : "bg-yellow-500",
          )}
        >
          <Text className="text-white text-2xl">{destructive ? "⚠️" : "❓"}</Text>
        </View>
        <Text className="text-white text-lg font-semibold mb-2 text-center">{title}</Text>
        <Text className="text-gray-400 text-sm text-center mb-6 leading-5">{message}</Text>
        <View className="flex-row space-x-3 w-full">
          <Pressable
            className="flex-1 py-3 px-4 rounded-full bg-gray-700 active:opacity-80"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelText}
          >
            <Text className="text-white font-semibold text-center">{cancelText}</Text>
          </Pressable>
          <Pressable
            className={cn(
              "flex-1 py-3 px-4 rounded-full active:opacity-80",
              destructive ? "bg-red-600" : "bg-blue-500",
            )}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmText}
          >
            <Text className="text-white font-semibold text-center">{confirmText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Bottom Sheet Modal Component
export const BottomSheetModal: React.FC<Omit<ModalProps, "position" | "animationType">> = (props) => (
  <Modal {...props} position="bottom" animationType="slide" />
);
