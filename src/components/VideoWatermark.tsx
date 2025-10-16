import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface VideoWatermarkProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: "small" | "medium" | "large";
}

export function VideoWatermark({ position = "top-right", size = "medium" }: VideoWatermarkProps) {
  const logoSize = size === "small" ? 40 : size === "medium" ? 50 : 60;
  const fontSize = size === "small" ? 10 : size === "medium" ? 12 : 14;
  const padding = size === "small" ? 12 : size === "medium" ? 16 : 20;

  const positionStyle = {
    "top-left": { top: padding, left: padding },
    "top-right": { top: padding, right: padding },
    "bottom-left": { bottom: padding, left: padding },
    "bottom-right": { bottom: padding, right: padding },
  }[position];

  return (
    <View style={[styles.watermarkContainer, positionStyle]} pointerEvents="none">
      <Image
        source={require("../../assets/logo.png")}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
      <Text style={[styles.text, { fontSize }]}>ToxicConfessions.app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  watermarkContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    opacity: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    // Subtle shadow for better visibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  logo: {
    marginBottom: 4,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
