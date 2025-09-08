import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getTextInputA11yProps, getButtonA11yProps } from "../utils/accessibility";

interface AuthInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "username" | "off";
  error?: string;
  isValid?: boolean;
  touched?: boolean;
  required?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export default function AuthInput({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete = "off",
  error,
  isValid = true,
  touched = false,
  required = false,
  maxLength,
  showCharacterCount = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const isPasswordField = secureTextEntry;
  const actualSecureTextEntry = isPasswordField && !showPassword;
  const actualRightIcon = isPasswordField ? (showPassword ? "eye-off" : "eye") : rightIcon;
  const actualOnRightIconPress = isPasswordField ? handleTogglePassword : onRightIconPress;

  return (
    <View className="mb-4">
      <Text className="text-white text-15 font-medium mb-2">{label}</Text>
      <View
        className={`flex-row items-center bg-gray-900 border rounded-2xl px-4 py-3 ${
          error ? "border-red-500" : isFocused ? "border-blue-500" : "border-gray-700"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? "#EF4444" : isFocused ? "#1D9BF0" : "#8B98A5"}
            style={{ marginRight: 12 }}
          />
        )}
        <TextInput
          className="flex-1 text-white text-16"
          value={value}
          onChangeText={(text) => {
            if (maxLength && text.length > maxLength) {
              return; // Prevent input beyond max length
            }
            onChangeText(text);
          }}
          placeholder={placeholder}
          placeholderTextColor="#8B98A5"
          secureTextEntry={actualSecureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          maxLength={maxLength}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          style={{
            color: "#FFFFFF",
            fontSize: 16,
          }}
          {...getTextInputA11yProps(
            label,
            error || placeholder,
            required,
            false  // multiline
          )}
        />
        {actualRightIcon && (
          <Pressable
            onPress={actualOnRightIconPress}
            className="ml-3 p-1"
            disabled={disabled}
            {...getButtonA11yProps(
              secureTextEntry
                ? (actualSecureTextEntry ? 'Show password' : 'Hide password')
                : 'Action button',
              secureTextEntry
                ? 'Double tap to toggle password visibility'
                : undefined,
              disabled
            )}
          >
            <Ionicons name={actualRightIcon} size={20} color={error ? "#EF4444" : isFocused ? "#1D9BF0" : "#8B98A5"} />
          </Pressable>
        )}
      </View>
      {/* Bottom Row: Error/Success and Character Count */}
      <View className="flex-row justify-between items-center mt-2">
        <View className="flex-1">
          {/* Error Message */}
          {error && touched && (
            <View className="flex-row items-center">
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text className="text-red-500 text-12 ml-1 flex-1">{error}</Text>
            </View>
          )}

          {/* Success Indicator */}
          {!error && touched && isValid && value.length > 0 && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text className="text-green-400 text-12 ml-1">Looks good!</Text>
            </View>
          )}
        </View>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <Text
            className={`text-12 ml-2 ${
              value.length >= maxLength
                ? 'text-red-400'
                : value.length > maxLength * 0.8
                  ? 'text-yellow-400'
                  : 'text-gray-500'
            }`}
          >
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}
