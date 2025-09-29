/**
 * TikTok/Instagram-style video player with animated captions
 * Shows word-by-word captions that appear as they're spoken
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import type { CaptionData } from "../services/CaptionGenerator";
import { getCurrentCaptions } from "../services/CaptionGenerator";

interface CaptionedVideoPlayerProps {
  videoUri: string;
  captionData: CaptionData | null;
  voiceEffect?: "deep" | "normal" | "high";
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  style?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CaptionedVideoPlayer: React.FC<CaptionedVideoPlayerProps> = ({
  videoUri,
  captionData,
  voiceEffect = "deep",
  onPlaybackStatusUpdate,
  style,
}) => {
  const videoRef = useRef<Video>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Get playback rate based on voice effect
  const getPlaybackRate = () => {
    switch (voiceEffect) {
      case "deep":
        return 0.75;
      case "high":
        return 1.25;
      default:
        return 1.0;
    }
  };

  // Update caption based on current playback time
  useEffect(() => {
    if (!captionData) return;

    const caption = getCurrentCaptions(captionData, currentTime);

    if (caption !== currentCaption) {
      setCurrentCaption(caption);

      // Animate caption entrance
      if (caption) {
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      } else {
        // Fade out when no caption
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [currentTime, captionData, currentCaption]);

  // Handle playback status updates
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.positionMillis !== undefined) {
      setCurrentTime(status.positionMillis / 1000); // Convert to seconds
    }
    onPlaybackStatusUpdate?.(status);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        rate={getPlaybackRate()}
        shouldCorrectPitch={false} // Keep pitch shifted for voice effect
        shouldPlay
        isLooping={false}
        resizeMode={ResizeMode.COVER}
        style={styles.video}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />

      {/* Caption Overlay */}
      {currentCaption && (
        <Animated.View
          style={[
            styles.captionContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.captionBackground}>
            <Text style={styles.captionText}>{currentCaption}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  captionContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  captionBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: SCREEN_WIDTH * 0.9,
  },
  captionText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
});
