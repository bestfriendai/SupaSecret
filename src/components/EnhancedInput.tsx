import React, { useState } from "react";
import { View, Text, TextInput, Pressable, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";

interface EnhancedInputProps extends Omit<TextInputProps, "onChangeText" | "onBlur"> {
  label?: string;
  error?: string | null;
  isValid?: boolean;
  touched?: boolean;
  required?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  helperText?: string;
  variant?: "default" | "outlined" | "filled";
  size?: "small" | "medium" | "large";
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
// Use Reanimated's built-in Animated.Text instead of creating our own
const AnimatedText = Animated.Text;

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  error,
  isValid = true,
  touched = false,
  required = false,
  maxLength,
  showCharacterCount = true,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onChangeText,
  onBlur,
  helperText,
  variant = "default",
  size = "medium",
  value = "",
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);

  React.useEffect(() => {
    focusAnimation.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  React.useEffect(() => {
    errorAnimation.value = withTiming(error && touched ? 1 : 0, { duration: 200 });
  }, [error, touched]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChangeText = (text: string) => {
    if (maxLength && text.length > maxLength) {
      return; // Prevent input beyond max length
    }
    onChangeText?.(text);
  };

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    "worklet";
    const borderColor = interpolateColor(
      errorAnimation.value,
      [0, 1],
      [interpolateColor(focusAnimation.value, [0, 1], ["#374151", "#3B82F6"]), "#EF4444"],
    );

    return {
      borderColor,
      borderWidth: interpolate(focusAnimation.value, [0, 1], [1, 2]),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    "worklet";
    const color = interpolateColor(
      errorAnimation.value,
      [0, 1],
      [interpolateColor(focusAnimation.value, [0, 1], ["#9CA3AF", "#3B82F6"]), "#EF4444"],
    );

    return { color };
  });

  // Get size-specific styles
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          container: "py-2 px-3",
          text: "text-14",
          icon: 16,
        };
      case "large":
        return {
          container: "py-4 px-4",
          text: "text-18",
          icon: 24,
        };
      default:
        return {
          container: "py-3 px-4",
          text: "text-16",
          icon: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const textValue = typeof value === "string" ? value : String(value ?? "");
  const characterCount = textValue.length;
  const isNearLimit = maxLength && characterCount > maxLength * 0.8;
  const isAtLimit = maxLength && characterCount >= maxLength;

  return (
    <View className="mb-4">
      {/* Label */}
      {label && (
        <AnimatedText style={labelStyle} className={`font-medium mb-2 ${sizeStyles.text}`}>
          {label}
          {required && <Text className="text-red-400 ml-1">*</Text>}
        </AnimatedText>
      )}

      {/* Input Container */}
      <Animated.View
        style={[containerStyle]}
        className={`
          bg-gray-900 rounded-lg flex-row items-center
          ${sizeStyles.container}
          ${variant === "outlined" ? "bg-transparent border" : ""}
          ${variant === "filled" ? "bg-gray-800" : ""}
        `}
      >
        {/* Left Icon */}
        {leftIcon && <Ionicons name={leftIcon} size={sizeStyles.icon} color="#9CA3AF" style={{ marginRight: 12 }} />}

        {/* Text Input */}
        <AnimatedTextInput
          {...textInputProps}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={maxLength}
          className={`flex-1 text-white ${sizeStyles.text}`}
          placeholderTextColor="#6B7280"
          selectionColor="#3B82F6"
          accessibilityLabel={label}
          accessibilityHint={helperText}
        />

        {/* Right Icon */}
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            className="ml-3"
            accessibilityRole="button"
            accessibilityLabel="Input action"
          >
            <Ionicons name={rightIcon} size={sizeStyles.icon} color="#9CA3AF" />
          </Pressable>
        )}
      </Animated.View>

      {/* Bottom Row: Error/Helper Text and Character Count */}
      <View className="flex-row justify-between items-center mt-1">
        <View className="flex-1">
          {/* Error Message */}
          {error && touched && (
            <Animated.View entering={undefined} exiting={undefined} className="flex-row items-center">
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text className="text-red-400 text-12 ml-1 flex-1">{error}</Text>
            </Animated.View>
          )}

          {/* Helper Text */}
          {!error && helperText && <Text className="text-gray-500 text-12">{helperText}</Text>}

          {/* Success Indicator */}
          {!error && touched && isValid && textValue.length > 0 && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text className="text-green-400 text-12 ml-1">Looks good!</Text>
            </View>
          )}
        </View>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <Text
            className={`text-12 ml-2 ${isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-gray-500"}`}
          >
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

// Preset input components for common use cases
export const EmailInput: React.FC<Omit<EnhancedInputProps, "leftIcon" | "keyboardType" | "autoCapitalize">> = (
  props,
) => (
  <EnhancedInput
    {...props}
    leftIcon="mail-outline"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
  />
);

export const PasswordInput: React.FC<Omit<EnhancedInputProps, "leftIcon" | "rightIcon" | "secureTextEntry">> = (
  props,
) => {
  const [isSecure, setIsSecure] = useState(true);

  return (
    <EnhancedInput
      {...props}
      leftIcon="lock-closed-outline"
      rightIcon={isSecure ? "eye-outline" : "eye-off-outline"}
      onRightIconPress={() => setIsSecure(!isSecure)}
      secureTextEntry={isSecure}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
};

export const SearchInput: React.FC<Omit<EnhancedInputProps, "leftIcon" | "variant">> = (props) => (
  <EnhancedInput {...props} leftIcon="search-outline" variant="filled" placeholder="Search..." />
);
