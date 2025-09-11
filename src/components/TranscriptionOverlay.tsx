import React, { useState, useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
// Demo mode - no native voice imports for Expo Go
// import Voice from '@react-native-voice/voice';

interface TranscriptionOverlayProps {
  isRecording: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

export const TranscriptionOverlay: React.FC<TranscriptionOverlayProps> = ({ isRecording, onTranscriptionUpdate }) => {
  const [transcription, setTranscription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const transcriptionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Demo mode - simulate speech recognition
    if (__DEV__) {
      console.log("🎯 Demo: Speech recognition simulation setup");
    }

    return () => {
      if (__DEV__) {
        console.log("🎯 Demo: Speech recognition cleanup");
      }
    };
  }, [onTranscriptionUpdate]);

  useEffect(() => {
    let fadeAnimation: Animated.CompositeAnimation | null = null;

    if (isRecording) {
      startListening();
      fadeAnimation = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });
      fadeAnimation.start();
    } else {
      stopListening();
      fadeAnimation = Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      });
      fadeAnimation.start();
    }

    // Cleanup function for component unmount
    return () => {
      // Stop listening
      stopListening();

      // Stop any running animations
      if (fadeAnimation) {
        fadeAnimation.stop();
      }

      // Clear any intervals
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
    };
  }, [isRecording]);

  const startListening = async () => {
    if (__DEV__) {
      console.log("🎯 Demo: Starting speech recognition simulation");
    }
    setIsListening(true);

    // Simulate transcription updates
    const demoTexts = [
      "This is my anonymous confession...",
      "I have something to share...",
      "Here is what I want to say...",
      "My secret story is...",
    ];

    let textIndex = 0;
    const interval = setInterval(() => {
      if (textIndex < demoTexts.length) {
        const currentText = demoTexts[textIndex];
        setTranscription(currentText);
        onTranscriptionUpdate?.(currentText);
        textIndex++;
      } else {
        // Clear interval when demo text is exhausted
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
          transcriptionIntervalRef.current = null;
        }
      }
    }, 2000);

    // Store interval for cleanup
    transcriptionIntervalRef.current = interval;
  };

  const stopListening = async () => {
    if (__DEV__) {
      console.log("🎯 Demo: Stopping speech recognition simulation");
    }
    setIsListening(false);

    // Clear simulation interval
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
  };

  if (!isRecording && !transcription) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: 12,
        padding: 16,
        opacity: fadeAnim,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isListening ? "#10B981" : "#6B7280",
            marginRight: 8,
          }}
        />
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>Live Transcription</Text>
      </View>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 14,
          lineHeight: 20,
          minHeight: 20,
        }}
      >
        {transcription || (isListening ? "Listening..." : "Start speaking...")}
      </Text>
    </Animated.View>
  );
};
