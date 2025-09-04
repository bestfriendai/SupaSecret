import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
}

export default function LoadingSpinner({ message, size = "large" }: LoadingSpinnerProps) {
  const iconSize = size === "large" ? 32 : 20;
  
  return (
    <View className="items-center justify-center py-8">
      <View className="animate-spin">
        <Ionicons name="refresh" size={iconSize} color="#1D9BF0" />
      </View>
      {message && (
        <Text className="text-gray-500 text-15 mt-3 text-center">
          {message}
        </Text>
      )}
    </View>
  );
}