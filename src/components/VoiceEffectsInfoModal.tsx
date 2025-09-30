import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedModal from "./AnimatedModal";

interface VoiceEffectsInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function VoiceEffectsInfoModal({ visible, onClose }: VoiceEffectsInfoModalProps) {
  return (
    <AnimatedModal visible={visible} onClose={onClose} animationType="scale">
      <View className="items-center">
        <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4">
          <Ionicons name="mic" size={24} color="#FFFFFF" />
        </View>
        <Text className="text-white text-18 font-semibold mb-4 text-center">Voice Effects</Text>

        <View className="w-full mb-6">
          <View className="mb-4">
            <Text className="text-blue-400 text-16 font-semibold mb-2">Deep Voice</Text>
            <Text className="text-gray-300 text-14 leading-5">
              Transforms your voice to sound lower and more resonant, creating a deeper, more authoritative tone.
              Perfect for dramatic confessions or when you want to sound mysterious.
            </Text>
          </View>

          <View>
            <Text className="text-blue-400 text-16 font-semibold mb-2">Light Voice</Text>
            <Text className="text-gray-300 text-14 leading-5">
              Makes your voice sound higher and brighter, giving it a lighter, more playful quality. Great for fun
              confessions or when you want a cheerful, energetic feel.
            </Text>
          </View>
        </View>

        <Pressable
          className="bg-blue-500 rounded-full py-3 px-6 touch-target w-full"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Got it"
        >
          <Text className="text-white font-semibold text-center">Got it</Text>
        </Pressable>
      </View>
    </AnimatedModal>
  );
}
