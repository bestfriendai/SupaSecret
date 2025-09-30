import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export default function AuthButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  leftIcon,
  fullWidth = true,
}: AuthButtonProps) {
  const getButtonStyle = () => {
    const base: any = {
      borderRadius: 9999,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 24,
      ...(fullWidth && { width: "100%" }),
    };

    if (disabled || loading) {
      return { ...base, backgroundColor: "#374151" };
    }

    switch (variant) {
      case "primary":
        return { ...base, backgroundColor: "#3B82F6" };
      case "secondary":
        return { ...base, backgroundColor: "#1F2937" };
      case "outline":
        return { ...base, backgroundColor: "transparent", borderWidth: 1, borderColor: "#3B82F6" };
      default:
        return { ...base, backgroundColor: "#3B82F6" };
    }
  };

  const getTextColor = () => {
    if (disabled || loading) return "#9CA3AF";
    if (variant === "outline") return "#3B82F6";
    return "#FFFFFF";
  };

  return (
    <Pressable
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={18}
              color={getTextColor()}
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={{
              color: getTextColor(),
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
