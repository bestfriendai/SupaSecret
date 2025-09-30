import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  maxLength?: number;
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
  disabled = false,
  leftIcon,
  maxLength,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = secureTextEntry;
  const actualSecureTextEntry = isPasswordField && !showPassword;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "500", marginBottom: 8 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1F2937",
          borderWidth: 1,
          borderColor: error ? "#EF4444" : isFocused ? "#3B82F6" : "#374151",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? "#EF4444" : isFocused ? "#3B82F6" : "#8B98A5"}
            style={{ marginRight: 12 }}
          />
        )}
        <TextInput
          style={{
            flex: 1,
            color: "#FFFFFF",
            fontSize: 16,
          }}
          value={value}
          onChangeText={(text) => {
            if (maxLength && text.length > maxLength) {
              return;
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
        />
        {isPasswordField && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={{ marginLeft: 12, padding: 4 }}
            disabled={disabled}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={error ? "#EF4444" : isFocused ? "#3B82F6" : "#8B98A5"}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={{ color: "#EF4444", fontSize: 12, marginLeft: 4, flex: 1 }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
