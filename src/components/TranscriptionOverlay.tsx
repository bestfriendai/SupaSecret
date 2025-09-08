import React, { useState, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
// Demo mode - no native voice imports for Expo Go
// import Voice from '@react-native-voice/voice';

interface TranscriptionOverlayProps {
  isRecording: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

export const TranscriptionOverlay: React.FC<TranscriptionOverlayProps> = ({
  isRecording,
  onTranscriptionUpdate
}) => {
  const [transcription, setTranscription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Demo mode - simulate speech recognition
    console.log('🎯 Demo: Speech recognition simulation setup');

    return () => {
      console.log('🎯 Demo: Speech recognition cleanup');
    };
  }, [onTranscriptionUpdate]);

  useEffect(() => {
    if (isRecording) {
      startListening();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      stopListening();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const startListening = async () => {
    console.log('🎯 Demo: Starting speech recognition simulation');
    setIsListening(true);

    // Simulate transcription updates
    const demoTexts = [
      'This is my anonymous confession...',
      'I have something to share...',
      'Here is what I want to say...',
      'My secret story is...'
    ];

    let textIndex = 0;
    const interval = setInterval(() => {
      if (textIndex < demoTexts.length) {
        const currentText = demoTexts[textIndex];
        setTranscription(currentText);
        onTranscriptionUpdate?.(currentText);
        textIndex++;
      }
    }, 2000);

    // Store interval for cleanup
    (window as any).transcriptionInterval = interval;
  };

  const stopListening = async () => {
    console.log('🎯 Demo: Stopping speech recognition simulation');
    setIsListening(false);

    // Clear simulation interval
    if ((window as any).transcriptionInterval) {
      clearInterval((window as any).transcriptionInterval);
      (window as any).transcriptionInterval = null;
    }
  };

  if (!isRecording && !transcription) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 16,
        opacity: fadeAnim,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isListening ? '#10B981' : '#6B7280',
            marginRight: 8,
          }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
          Live Transcription
        </Text>
      </View>
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 14,
          lineHeight: 20,
          minHeight: 20,
        }}
      >
        {transcription || (isListening ? 'Listening...' : 'Start speaking...')}
      </Text>
    </Animated.View>
  );
};
