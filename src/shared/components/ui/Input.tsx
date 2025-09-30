import React, { useState, forwardRef } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import type { TextInputProps, ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { cn } from "../../../utils/cn";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface InputProps extends Omit<TextInputProps, "onChangeText" | "onBlur" | "onFocus"> {
  label?: string;
  error?: string | null;
  helperText?: string;
  isValid?: boolean;
  touched?: boolean;
  required?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  variant?: "default" | "outlined" | "filled";
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
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
      onFocus,
      variant = "default",
      size = "md",
      value = "",
      containerClassName,
      inputClassName,
      labelClassName,
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnimation = useSharedValue(0);
    const errorAnimation = useSharedValue(0);

    React.useEffect(() => {
      focusAnimation.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused, focusAnimation]);

    React.useEffect(() => {
      errorAnimation.value = withTiming(error && touched ? 1 : 0, { duration: 200 });
    }, [error, touched, errorAnimation]);

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    const handleChangeText = (text: string) => {
      if (maxLength && text.length > maxLength) {
        return;
      }
      onChangeText?.(text);
    };

    // Animated styles
    const containerStyle = useAnimatedStyle(() => {
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
      const color = interpolateColor(
        errorAnimation.value,
        [0, 1],
        [interpolateColor(focusAnimation.value, [0, 1], ["#9CA3AF", "#3B82F6"]), "#EF4444"],
      );

      return { color };
    });

    // Size-specific styles
    const sizeStyles = {
      sm: {
        container: "py-2 px-3",
        text: "text-sm",
      },
      md: {
        container: "py-3 px-4",
        text: "text-base",
      },
      lg: {
        container: "py-4 px-4",
        text: "text-lg",
      },
    };

    const textValue = typeof value === "string" ? value : String(value ?? "");
    const characterCount = textValue.length;
    const isNearLimit = maxLength && characterCount > maxLength * 0.8;
    const isAtLimit = maxLength && characterCount >= maxLength;

    const variantClasses = {
      default: "bg-gray-900",
      outlined: "bg-transparent border",
      filled: "bg-gray-800",
    };

    return (
      <View className={cn("mb-4", containerClassName)}>
        {/* Label */}
        {label && (
          <Animated.Text style={labelStyle} className={cn("font-medium mb-2", sizeStyles[size].text, labelClassName)}>
            {label}
            {required && <Text className="text-red-400 ml-1">*</Text>}
          </Animated.Text>
        )}

        {/* Input Container */}
        <Animated.View
          style={[containerStyle]}
          className={cn(
            "rounded-lg flex-row items-center",
            sizeStyles[size].container,
            variantClasses[variant],
            inputClassName,
          )}
        >
          {/* Left Icon */}
          {leftIcon && <View className="mr-3">{leftIcon}</View>}

          {/* Text Input */}
          <AnimatedTextInput
            ref={ref}
            {...textInputProps}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={maxLength}
            className={cn("flex-1 text-white", sizeStyles[size].text)}
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
              {rightIcon}
            </Pressable>
          )}
        </Animated.View>

        {/* Bottom Row: Error/Helper Text and Character Count */}
        <View className="flex-row justify-between items-center mt-1">
          <View className="flex-1">
            {/* Error Message */}
            {error && touched && (
              <View className="flex-row items-center">
                <Text className="text-red-400 text-xs">⚠ {error}</Text>
              </View>
            )}

            {/* Helper Text */}
            {!error && helperText && <Text className="text-gray-500 text-xs">{helperText}</Text>}

            {/* Success Indicator */}
            {!error && touched && isValid && textValue.length > 0 && (
              <View className="flex-row items-center">
                <Text className="text-green-400 text-xs">✓ Looks good!</Text>
              </View>
            )}
          </View>

          {/* Character Count */}
          {showCharacterCount && maxLength && (
            <Text
              className={cn(
                "text-xs ml-2",
                isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-gray-500",
              )}
            >
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      </View>
    );
  },
);

Input.displayName = "Input";

// Preset input components
export const EmailInput = forwardRef<TextInput, Omit<InputProps, "keyboardType" | "autoCapitalize">>(
  (props, ref) => (
    <Input
      ref={ref}
      {...props}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
    />
  ),
);

EmailInput.displayName = "EmailInput";

export const PasswordInput = forwardRef<TextInput, Omit<InputProps, "secureTextEntry">>((props, ref) => {
  const [isSecure, setIsSecure] = useState(true);

  return (
    <Input
      ref={ref}
      {...props}
      rightIcon={
        <Text className="text-gray-400 text-lg">{isSecure ? "👁" : "👁‍🗨"}</Text>
      }
      onRightIconPress={() => setIsSecure(!isSecure)}
      secureTextEntry={isSecure}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
});

PasswordInput.displayName = "PasswordInput";

export const SearchInput = forwardRef<TextInput, InputProps>((props, ref) => (
  <Input
    ref={ref}
    {...props}
    leftIcon={<Text className="text-gray-400 text-lg">🔍</Text>}
    variant="filled"
    placeholder="Search..."
  />
));

SearchInput.displayName = "SearchInput";
