import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type EmojiType = "mask" | "sunglasses" | "blur" | "robot" | "incognito";

interface Face {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FaceEmojiOverlayProps {
  faces: Face[];
  emojiType: EmojiType;
}

const EMOJI_MAP: Record<EmojiType, string> = {
  mask: "😷",
  sunglasses: "🕶️",
  blur: "🌫️",
  robot: "🤖",
  incognito: "🥸",
};

export const FaceEmojiOverlay: React.FC<FaceEmojiOverlayProps> = ({ faces, emojiType }) => {
  if (!faces || faces.length === 0) {
    return null;
  }

  return (
    <>
      {faces.map((face, index) => {
        const { x, y, width, height } = face.bounds;

        console.log(`😷 Face ${index}:`, { x, y, width, height });

        // Make emoji significantly larger to fully cover face
        const emojiSize = Math.max(width, height) * 2.0;
        // Center the emoji over the face
        const offsetX = x - (emojiSize - width) / 2;
        const offsetY = y - (emojiSize - height) / 2;

        return (
          <View
            key={`face-${index}`}
            style={[
              styles.emojiContainer,
              {
                left: offsetX,
                top: offsetY,
                width: emojiSize,
                height: emojiSize,
              },
            ]}
          >
            <Text style={[styles.emoji, { fontSize: emojiSize * 0.9 }]}>{EMOJI_MAP[emojiType]}</Text>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  emojiContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  emoji: {
    textAlign: "center",
  },
});
