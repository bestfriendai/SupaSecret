import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type EmojiType = 'mask' | 'sunglasses' | 'blur' | 'robot' | 'incognito';

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
  mask: '😷',
  sunglasses: '🕶️',
  blur: '🌫️',
  robot: '🤖',
  incognito: '🥸',
};

export const FaceEmojiOverlay: React.FC<FaceEmojiOverlayProps> = ({ faces, emojiType }) => {
  if (!faces || faces.length === 0) return null;

  return (
    <>
      {faces.map((face, index) => {
        const { x, y, width, height } = face.bounds;
        
        // Add padding to make emoji cover face better
        const padding = width * 0.1;
        const emojiSize = Math.max(width, height) * 1.3;
        
        return (
          <View
            key={`face-${index}`}
            style={[
              styles.emojiContainer,
              {
                left: x - padding,
                top: y - padding,
                width: emojiSize,
                height: emojiSize,
              },
            ]}
          >
            <Text style={[styles.emoji, { fontSize: emojiSize * 0.8 }]}>
              {EMOJI_MAP[emojiType]}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  emojiContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});
