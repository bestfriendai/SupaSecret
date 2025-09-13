import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getButtonA11yProps } from "../utils/accessibility";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function AuthButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
}: AuthButtonProps) {

  const getButtonStyles = () => {
    const baseStyles = "rounded-full flex-row items-center justify-center";
    const widthStyles = fullWidth ? "w-full" : "";

    // Size styles
    const sizeStyles = {
      small: "px-4 py-2",
      medium: "px-6 py-3",
      large: "px-8 py-4",
    };

    // Variant styles
    const variantStyles = {
      primary: disabled || loading ? "bg-gray-700" : "bg-blue-500 active:bg-blue-600",
      secondary: disabled || loading ? "bg-gray-700" : "bg-gray-800 active:bg-gray-700",
      outline:
        disabled || loading
          ? "bg-transparent border border-gray-700"
          : "bg-transparent border border-blue-500 active:bg-blue-500/10",
      ghost: disabled || loading ? "bg-transparent" : "bg-transparent active:bg-gray-800",
    };

    return `${baseStyles} ${widthStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };

  const getTextStyles = () => {
    const baseStyles = "font-semibold text-center";

    // Size styles
    const sizeStyles = {
      small: "text-14",
      medium: "text-16",
      large: "text-18",
    };

    // Variant styles
    const variantStyles = {
      primary: disabled || loading ? "text-gray-400" : "text-white",
      secondary: disabled || loading ? "text-gray-400" : "text-white",
      outline: disabled || loading ? "text-gray-400" : "text-blue-500",
      ghost: disabled || loading ? "text-gray-400" : "text-white",
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };

  const getIconColor = () => {
    if (disabled || loading) return "#9CA3AF";

    switch (variant) {
      case "primary":
      case "secondary":
        return "#FFFFFF";
      case "outline":
        return "#1D9BF0";
      case "ghost":
        return "#FFFFFF";
      default:
        return "#FFFFFF";
    }
  };

  const iconSize = size === "small" ? 16 : size === "large" ? 20 : 18;

  const a11yProps = getButtonA11yProps(
    accessibilityLabel || title,
    accessibilityHint || (loading ? "Loading, please wait" : undefined),
    disabled || loading
  );

  return (
    <Pressable
      className={getButtonStyles()}
      onPress={onPress}
      disabled={disabled || loading}
      {...a11yProps}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          {leftIcon && <Ionicons name={leftIcon} size={iconSize} color={getIconColor()} style={{ marginRight: 8 }} />}
          <Text className={getTextStyles()}>{title}</Text>
          {rightIcon && <Ionicons name={rightIcon} size={iconSize} color={getIconColor()} style={{ marginLeft: 8 }} />}
        </>
      )}
    </Pressable>
  );
}
