import React, { useEffect, useRef } from "react";
import { Modal, View, Pressable, Keyboard, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { ANIMATIONS } from "../utils/cn";

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: "fade" | "slide" | "scale";
  backdropOpacity?: number;
  dismissOnBackdrop?: boolean;
  dismissOnBackButton?: boolean;
  className?: string;
}

export default function AnimatedModal({
  visible,
  onClose,
  children,
  animationType = "scale",
  backdropOpacity = 0.5,
  dismissOnBackdrop = true,
  dismissOnBackButton = true,
  className = "",
}: AnimatedModalProps) {
  const backdropOpacityValue = useSharedValue(0);
  const scaleValue = useSharedValue(0.8);
  const translateYValue = useSharedValue(50);
  const isClosing = useRef(false);

  // Animation configurations
  const animationConfig = {
    duration: ANIMATIONS.duration.normal,
  };

  const springConfig = {
    damping: 20,
    stiffness: 300,
  };

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      // Animate in
      backdropOpacityValue.value = withTiming(backdropOpacity, animationConfig);
      
      if (animationType === "scale") {
        scaleValue.value = withSpring(1, springConfig);
      } else if (animationType === "slide") {
        translateYValue.value = withSpring(0, springConfig);
      }
    } else if (!isClosing.current) {
      // Animate out
      handleClose();
    }

    // Cleanup function
    return () => {
      cancelAnimation(backdropOpacityValue);
      cancelAnimation(scaleValue);
      cancelAnimation(translateYValue);
    };
  }, [visible]);

  const handleClose = () => {
    if (isClosing.current) return;
    
    isClosing.current = true;
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // Animate out
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
      // Fade animation - use animation completion callback
      backdropOpacityValue.value = withTiming(0, animationConfig, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }), []);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // We handle animations ourselves
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Animated backdrop */}
        <Animated.View
          style={[backdropStyle]}
          className="absolute inset-0 bg-black"
        />
        
        {/* Backdrop pressable */}
        <Pressable
          className="flex-1"
          onPress={handleBackdropPress}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <View className="flex-1 justify-center items-center px-6">
            {/* Modal content */}
            <Pressable
              onPress={(e) => e.stopPropagation()} // Prevent backdrop press
              className="w-full max-w-sm"
            >
              <Animated.View
                style={[contentStyle]}
                className={`bg-gray-900 rounded-2xl p-6 ${className}`}
              >
                {children}
              </Animated.View>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

// Convenience components for common modal types
export function AlertModal({
  visible,
  onClose,
  title,
  message,
  confirmText = "OK",
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <AnimatedModal visible={visible} onClose={onClose} animationType="scale">
      <View className="items-center">
        <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4">
          <Text className="text-white text-24">ℹ️</Text>
        </View>
        <Text className="text-white text-18 font-semibold mb-2 text-center">{title}</Text>
        <Text className="text-gray-400 text-15 text-center mb-6 leading-5">{message}</Text>
        <Pressable
          className="bg-blue-500 rounded-full py-3 px-6 touch-target w-full"
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel={confirmText}
        >
          <Text className="text-white font-semibold text-center">{confirmText}</Text>
        </Pressable>
      </View>
    </AnimatedModal>
  );
}

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  destructive = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatedModal visible={visible} onClose={onClose} animationType="scale">
      <View className="items-center">
        <View className={`w-16 h-16 ${destructive ? 'bg-red-500' : 'bg-yellow-500'} rounded-full items-center justify-center mb-4`}>
          <Text className="text-white text-24">{destructive ? '⚠️' : '❓'}</Text>
        </View>
        <Text className="text-white text-18 font-semibold mb-2 text-center">{title}</Text>
        <Text className="text-gray-400 text-15 text-center mb-6 leading-5">{message}</Text>
        <View className="flex-row space-x-3 w-full">
          <Pressable
            className="flex-1 py-3 px-4 rounded-full bg-gray-700 touch-target"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelText}
          >
            <Text className="text-white font-semibold text-center">{cancelText}</Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-3 px-4 rounded-full touch-target ${destructive ? 'bg-red-600' : 'bg-blue-500'}`}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmText}
          >
            <Text className="text-white font-semibold text-center">{confirmText}</Text>
          </Pressable>
        </View>
      </View>
    </AnimatedModal>
  );
}
