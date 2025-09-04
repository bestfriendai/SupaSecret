import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AuthInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "username" | "off";
  error?: string;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export default function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete = "off",
  error,
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
  const actualRightIcon = isPasswordField 
    ? (showPassword ? "eye-off" : "eye")
    : rightIcon;
  const actualOnRightIconPress = isPasswordField 
    ? handleTogglePassword 
    : onRightIconPress;

  return (
    <View className="mb-4">
      <Text className="text-white text-15 font-medium mb-2">{label}</Text>
      <View
        className={`flex-row items-center bg-gray-900 border rounded-2xl px-4 py-3 ${
          error
            ? "border-red-500"
            : isFocused
            ? "border-blue-500"
            : "border-gray-700"
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
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8B98A5"
          secureTextEntry={actualSecureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            color: "#FFFFFF",
            fontSize: 16,
          }}
        />
        {actualRightIcon && (
          <Pressable
            onPress={actualOnRightIconPress}
            className="ml-3 p-1"
            disabled={disabled}
          >
            <Ionicons
              name={actualRightIcon}
              size={20}
              color={error ? "#EF4444" : isFocused ? "#1D9BF0" : "#8B98A5"}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <View className="flex-row items-center mt-2">
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text className="text-red-500 text-13 ml-2">{error}</Text>
        </View>
      )}
    </View>
  );
}