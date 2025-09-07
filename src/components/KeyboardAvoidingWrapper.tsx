import React from "react";
import {
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  dismissKeyboard, 
  getKeyboardBehavior, 
  getKeyboardVerticalOffset,
  getKeyboardAwareScrollProps,
  useKeyboard 
} from "../utils/keyboardUtils";

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  className?: string;
  behavior?: "height" | "position" | "padding";
  keyboardVerticalOffset?: number;
  dismissOnTap?: boolean;
  scrollable?: boolean;
  screenType?: "modal" | "screen" | "bottomSheet";
  extraPadding?: number;
  style?: any;
}

export default function KeyboardAvoidingWrapper({
  children,
  className = "",
  behavior,
  keyboardVerticalOffset,
  dismissOnTap = true,
  scrollable = false,
  screenType = "screen",
  extraPadding = 0,
  style,
}: KeyboardAvoidingWrapperProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  
  const actualBehavior = behavior || getKeyboardBehavior();
  const actualOffset = keyboardVerticalOffset ?? getKeyboardVerticalOffset(screenType);
  
  // Calculate bottom padding based on keyboard state and screen type
  const getBottomPadding = () => {
    let padding = extraPadding;
    
    if (screenType === "screen") {
      padding += insets.bottom;
    }
    
    // Add extra padding when keyboard is visible for better UX
    if (keyboard.isVisible && Platform.OS === "ios") {
      padding += 8;
    }
    
    return padding;
  };

  const handleDismiss = () => {
    if (dismissOnTap) {
      dismissKeyboard(true); // With haptic feedback
    }
  };

  const content = (
    <KeyboardAvoidingView
      className={`flex-1 ${className}`}
      behavior={actualBehavior}
      keyboardVerticalOffset={actualOffset}
      style={[
        {
          paddingBottom: getBottomPadding(),
        },
        style,
      ]}
    >
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          {...getKeyboardAwareScrollProps()}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );

  if (dismissOnTap) {
    return (
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View className="flex-1">
          {content}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return content;
}

// Specialized wrappers for common use cases
export function ModalKeyboardWrapper({
  children,
  className = "",
  ...props
}: Omit<KeyboardAvoidingWrapperProps, "screenType">) {
  return (
    <KeyboardAvoidingWrapper
      className={className}
      screenType="modal"
      {...props}
    >
      {children}
    </KeyboardAvoidingWrapper>
  );
}

export function ScreenKeyboardWrapper({
  children,
  className = "",
  scrollable = true,
  ...props
}: Omit<KeyboardAvoidingWrapperProps, "screenType">) {
  return (
    <KeyboardAvoidingWrapper
      className={className}
      screenType="screen"
      scrollable={scrollable}
      {...props}
    >
      {children}
    </KeyboardAvoidingWrapper>
  );
}

export function BottomSheetKeyboardWrapper({
  children,
  className = "",
  ...props
}: Omit<KeyboardAvoidingWrapperProps, "screenType">) {
  return (
    <KeyboardAvoidingWrapper
      className={className}
      screenType="bottomSheet"
      dismissOnTap={false} // Don't dismiss on tap in bottom sheets
      {...props}
    >
      {children}
    </KeyboardAvoidingWrapper>
  );
}
