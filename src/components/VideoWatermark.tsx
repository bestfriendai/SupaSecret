import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface VideoWatermarkProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: "small" | "medium" | "large";
}

export function VideoWatermark({ position = "top-right", size = "medium" }: VideoWatermarkProps) {
  // Significantly increased sizes for better visibility and social media branding
  const logoSize = size === "small" ? 60 : size === "medium" ? 80 : 100;
  const fontSize = size === "small" ? 14 : size === "medium" ? 18 : 22;
  const padding = size === "small" ? 16 : size === "medium" ? 20 : 24;

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
    opacity: 0.95, // Increased from 0.85 for better visibility
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker background for better contrast
    borderRadius: 16, // Larger radius for modern look
    paddingHorizontal: 16, // Increased padding
    paddingVertical: 12, // Increased padding
    // Enhanced shadow for better visibility
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  logo: {
    marginBottom: 6, // Increased spacing
  },
  text: {
    color: "#ffffff",
    fontWeight: "800", // Bolder font
    textAlign: "center",
    letterSpacing: 0.5, // Better readability
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
