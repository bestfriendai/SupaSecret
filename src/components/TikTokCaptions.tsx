import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, ViewStyle, TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaptionSegment, RecognizedWord } from "../hooks/useSpeechRecognition";

// Re-export types for convenience
export type { CaptionSegment, RecognizedWord } from "../hooks/useSpeechRecognition";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Responsive spacing based on screen size
const getResponsiveSpacing = () => {
  if (screenHeight < 700) {
    // Small screens (iPhone SE, etc.)
    return { captionBottom: 180, topOffset: 80, centerOffset: 40 };
  } else if (screenHeight < 800) {
    // Medium screens (iPhone 12/13 mini)
    return { captionBottom: 220, topOffset: 100, centerOffset: 50 };
  } else if (screenHeight < 900) {
    // Standard screens (iPhone 12/13/14)
    return { captionBottom: 260, topOffset: 120, centerOffset: 50 };
  } else {
    // Large screens (iPhone Pro Max, Plus)
    return { captionBottom: 300, topOffset: 140, centerOffset: 60 };
  }
};

export interface CaptionStyle {
  id: string;
  name: string;
  fontSize: number;
  fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  textAlign: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing?: number;
  lineHeight?: number;
}

export const TIKTOK_CAPTION_STYLES: CaptionStyle[] = [
  {
    id: "classic",
    name: "Classic",
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    textAlign: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  {
    id: "modern",
    name: "Modern",
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    borderColor: "#FFFFFF",
    borderWidth: 2,
    textAlign: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  {
    id: "neon",
    name: "Neon",
    fontSize: 26,
    fontWeight: "bold",
    color: "#00FF88",
    textAlign: "center",
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  {
    id: "retro",
    name: "Retro",
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF6B9D",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  {
    id: "minimal",
    name: "Minimal",
    fontSize: 20,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 1,
  },
];

export type CaptionPosition = "top" | "center" | "bottom";

export interface TikTokCaptionsProps {
  segments: CaptionSegment[];
  currentSegment: CaptionSegment | null;
  style?: CaptionStyle;
  position?: CaptionPosition;
  maxLines?: number;
  animationDuration?: number;
  showConfidence?: boolean;
  containerStyle?: ViewStyle;
}

export const TikTokCaptions: React.FC<TikTokCaptionsProps> = ({
  segments,
  currentSegment,
  style = TIKTOK_CAPTION_STYLES[0],
  position = "bottom",
  maxLines = 3,
  animationDuration = 300,
  showConfidence = true,
  containerStyle,
}) => {
  const [visibleSegments, setVisibleSegments] = useState<CaptionSegment[]>([]);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());
  const insets = useSafeAreaInsets();

  // ✅ FIX: Update visible segments based on current playback position
  useEffect(() => {
    // Only show the current segment (TikTok style - one caption at a time)
    const segmentsToShow = currentSegment ? [currentSegment] : [];
    setVisibleSegments(segmentsToShow);

    // Initialize animations for new segments
    segmentsToShow.forEach((segment) => {
      if (!animatedValues.current.has(segment.id)) {
        animatedValues.current.set(segment.id, new Animated.Value(0));

        // Animate in
        Animated.timing(animatedValues.current.get(segment.id)!, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }).start();
      }
    });

    // Clean up old animations
    const currentIds = new Set(segmentsToShow.map((s) => s.id));
    for (const [id, animValue] of animatedValues.current.entries()) {
      if (!currentIds.has(id)) {
        animatedValues.current.delete(id);
      }
    }
  }, [segments, currentSegment, maxLines, animationDuration]);

  const getPositionStyle = (): ViewStyle => {
    const spacing = getResponsiveSpacing();
    const baseStyle: ViewStyle = {
      position: "absolute",
      left: 16,
      right: 16,
      alignItems: "center",
      zIndex: 100, // Ensure captions are above video but below controls
    };

    switch (position) {
      case "top":
        return {
          ...baseStyle,
          top: Math.max(spacing.topOffset, insets.top + 60),
        };
      case "center":
        return {
          ...baseStyle,
          top: screenHeight / 2 - spacing.centerOffset,
        };
      case "bottom":
      default:
        // Position captions higher to avoid overlapping with bottom controls
        // Account for safe area and ensure minimum clearance
        return {
          ...baseStyle,
          bottom: Math.max(spacing.captionBottom, insets.bottom + 160),
        };
    }
  };

  const _getWordStyle = (_word: RecognizedWord, _isCurrentSegment: boolean): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      color: style.color,
      textAlign: style.textAlign,
      textTransform: style.textTransform,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
    };

    // Add background if specified
    if (style.backgroundColor) {
      baseStyle.backgroundColor = style.backgroundColor;
      baseStyle.paddingHorizontal = 8;
      baseStyle.paddingVertical = 4;
      baseStyle.borderRadius = 4;
    }

    // Add border if specified
    if (style.borderWidth && style.borderColor) {
      baseStyle.borderWidth = style.borderWidth;
      baseStyle.borderColor = style.borderColor;
      baseStyle.paddingHorizontal = 8;
      baseStyle.paddingVertical = 4;
      baseStyle.borderRadius = 4;
    }

    // Add shadow if specified
    if (style.shadowColor) {
      baseStyle.shadowColor = style.shadowColor;
      baseStyle.shadowOffset = style.shadowOffset;
      baseStyle.shadowOpacity = style.shadowOpacity;
      baseStyle.shadowRadius = style.shadowRadius;
      baseStyle.elevation = 5; // Android shadow
    }

    // Confidence-based styling
    if (showConfidence && _word.confidence < 0.7) {
      baseStyle.opacity = 0.6;
    }

    // Highlight current/incomplete words
    if (_isCurrentSegment && !_word.isComplete) {
      baseStyle.opacity = 0.8;
      baseStyle.textDecorationLine = "underline";
    }

    return baseStyle;
  };

  const renderSegment = (segment: CaptionSegment) => {
    const animValue = animatedValues.current.get(segment.id);
    if (!animValue) return null;

    // ✅ FIX: Render as a single text block with bold styling (like TikTok)
    return (
      <Animated.View
        key={segment.id}
        style={[
          styles.segmentContainer,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.captionBox}>
          <Text style={styles.captionText}>{segment.text}</Text>
        </View>
      </Animated.View>
    );
  };

  if (visibleSegments.length === 0) {
    return null;
  }

  return (
    <View style={[getPositionStyle(), containerStyle]} pointerEvents="none">
      {visibleSegments.map((segment) => renderSegment(segment))}
    </View>
  );
};

// Get responsive font sizes based on screen width
const getResponsiveFontSize = () => {
  if (screenWidth < 375) {
    // Small screens (iPhone SE)
    return { caption: 22, lineHeight: 28 };
  } else if (screenWidth < 414) {
    // Medium screens (iPhone 12/13 mini)
    return { caption: 24, lineHeight: 32 };
  } else {
    // Standard and large screens
    return { caption: 28, lineHeight: 36 };
  }
};

const responsiveFontSize = getResponsiveFontSize();

const styles = StyleSheet.create({
  segmentContainer: {
    marginVertical: 4,
    alignItems: "center",
  },
  captionBox: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: screenWidth < 375 ? 16 : 20,
    paddingVertical: screenWidth < 375 ? 8 : 10,
    borderRadius: 8,
    maxWidth: screenWidth - (screenWidth < 375 ? 80 : 60),
  },
  captionText: {
    fontSize: responsiveFontSize.caption,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: screenWidth < 375 ? 0.5 : 1,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    lineHeight: responsiveFontSize.lineHeight,
  },
  wordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    maxWidth: screenWidth - 40,
  },
  word: {
    // Base word styles - will be overridden by getWordStyle
  },
});
