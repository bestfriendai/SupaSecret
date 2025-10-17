import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { CaptionStyle, TIKTOK_CAPTION_STYLES, CaptionPosition } from "./TikTokCaptions";

// const { width: screenWidth } = Dimensions.get("window");

interface CaptionStyleSelectorProps {
  selectedStyle: CaptionStyle;
  selectedPosition: CaptionPosition;
  onStyleChange: (style: CaptionStyle) => void;
  onPositionChange: (position: CaptionPosition) => void;
  visible: boolean;
}

export const CaptionStyleSelector: React.FC<CaptionStyleSelectorProps> = ({
  selectedStyle,
  selectedPosition,
  onStyleChange,
  onPositionChange,
  visible,
}) => {
  if (!visible) return null;

  const positions: { id: CaptionPosition; name: string; icon: string }[] = [
    { id: "top", name: "Top", icon: "⬆️" },
    { id: "center", name: "Center", icon: "➡️" },
    { id: "bottom", name: "Bottom", icon: "⬇️" },
  ];

  const renderStylePreview = (style: CaptionStyle) => {
    const previewStyle = {
      fontSize: Math.min(style.fontSize * 0.6, 16),
      fontWeight: style.fontWeight,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth ? Math.max(style.borderWidth * 0.5, 1) : 0,
      textAlign: style.textAlign as any,
      textTransform: style.textTransform as any,
      letterSpacing: style.letterSpacing ? style.letterSpacing * 0.5 : 0,
      paddingHorizontal: style.backgroundColor || style.borderWidth ? 6 : 0,
      paddingVertical: style.backgroundColor || style.borderWidth ? 2 : 0,
      borderRadius: style.backgroundColor || style.borderWidth ? 3 : 0,
      shadowColor: style.shadowColor,
      shadowOffset: style.shadowOffset
        ? {
            width: style.shadowOffset.width * 0.5,
            height: style.shadowOffset.height * 0.5,
          }
        : undefined,
      shadowOpacity: style.shadowOpacity ? style.shadowOpacity * 0.8 : undefined,
      shadowRadius: style.shadowRadius ? style.shadowRadius * 0.5 : undefined,
      elevation: style.shadowColor ? 3 : 0,
    };

    return (
      <Text style={previewStyle} numberOfLines={1}>
        Sample Text
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Position Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Caption Position</Text>
        <View style={styles.positionContainer}>
          {positions.map((position) => (
            <TouchableOpacity
              key={position.id}
              style={[styles.positionButton, selectedPosition === position.id && styles.selectedPositionButton]}
              onPress={() => onPositionChange(position.id)}
            >
              <Text style={styles.positionIcon}>{position.icon}</Text>
              <Text style={[styles.positionText, selectedPosition === position.id && styles.selectedPositionText]}>
                {position.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Style Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Caption Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stylesContainer}>
          {TIKTOK_CAPTION_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[styles.styleButton, selectedStyle.id === style.id && styles.selectedStyleButton]}
              onPress={() => onStyleChange(style)}
            >
              <View style={styles.stylePreview}>{renderStylePreview(style)}</View>
              <Text style={[styles.styleName, selectedStyle.id === style.id && styles.selectedStyleName]}>
                {style.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Current Style Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Style</Text>
        <View style={styles.currentStyleContainer}>
          <View style={styles.currentStylePreview}>{renderStylePreview(selectedStyle)}</View>
          <View style={styles.currentStyleInfo}>
            <Text style={styles.currentStyleName}>{selectedStyle.name}</Text>
            <Text style={styles.currentStyleDetails}>
              Size: {selectedStyle.fontSize}px • Weight: {selectedStyle.fontWeight}
            </Text>
            <Text style={styles.currentStyleDetails}>
              Position: {selectedPosition.charAt(0).toUpperCase() + selectedPosition.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  positionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  positionButton: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    minWidth: 80,
  },
  selectedPositionButton: {
    backgroundColor: "#FF6B9D",
  },
  positionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  positionText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  selectedPositionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  stylesContainer: {
    paddingRight: 20,
  },
  styleButton: {
    alignItems: "center",
    marginRight: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    minWidth: 100,
  },
  selectedStyleButton: {
    backgroundColor: "#FF6B9D",
  },
  stylePreview: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    minWidth: 80,
  },
  styleName: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    textAlign: "center",
  },
  selectedStyleName: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  currentStyleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  currentStylePreview: {
    marginRight: 16,
    minWidth: 100,
    alignItems: "center",
  },
  currentStyleInfo: {
    flex: 1,
  },
  currentStyleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  currentStyleDetails: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 2,
  },
});
