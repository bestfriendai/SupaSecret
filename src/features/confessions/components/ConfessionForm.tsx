import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConfessionFormProps {
  onSubmitText?: (content: string) => void;
  onVideoRecord?: () => void;
  isSubmitting?: boolean;
}

export function ConfessionForm({ onSubmitText, onVideoRecord, isSubmitting = false }: ConfessionFormProps) {
  const [textContent, setTextContent] = useState("");

  const handleTextSubmit = () => {
    const trimmedContent = textContent.trim();
    if (!trimmedContent || trimmedContent.length < 10 || trimmedContent.length > 280) {
      return;
    }
    onSubmitText?.(trimmedContent);
  };

  const isValid = textContent.trim().length >= 10 && textContent.trim().length <= 280 && !isSubmitting;

  return (
    <View className="flex-1 bg-black">
      {/* Action Bar */}
      <View className="px-4 py-2 border-b border-gray-800 flex-row items-center justify-between">
        <Text className="text-white text-18 font-semibold">Share Secret</Text>
        <Pressable
          className={`rounded-full px-4 py-2 ${isValid ? "bg-blue-500" : "bg-gray-700"}`}
          onPress={handleTextSubmit}
          disabled={!isValid}
        >
          <Text className="text-white font-semibold">{isSubmitting ? "Sharing..." : "Share"}</Text>
        </Pressable>
      </View>

      {/* Compose Area */}
      <View className="flex-row p-4">
        <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
          <Ionicons name="person" size={20} color="#8B98A5" />
        </View>
        <View className="flex-1">
          <TextInput
            className="text-white text-20 leading-6"
            placeholder="What's your secret?"
            placeholderTextColor="#8B98A5"
            multiline
            textAlignVertical="top"
            value={textContent}
            onChangeText={setTextContent}
            maxLength={280}
            style={{ minHeight: 120 }}
          />

          {/* Character counter */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                className={`text-13 ${
                  textContent.length > 260
                    ? "text-red-500"
                    : textContent.length > 240
                      ? "text-yellow-500"
                      : "text-gray-500"
                }`}
              >
                {textContent.length}/280
              </Text>
              {textContent.length < 10 && textContent.length > 0 && (
                <Text className="text-gray-500 text-13">Min 10 characters</Text>
              )}
            </View>

            {/* Anonymous indicator */}
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text className="text-green-500 text-13 ml-1">Anonymous</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-gray-800 mx-4" />

      {/* Video Option */}
      <View className="p-4">
        <Text className="text-white text-17 font-bold mb-2">Or record a video confession</Text>
        <Text className="text-gray-500 text-15 mb-4 leading-5">
          Your face will be automatically blurred and voice changed for complete anonymity
        </Text>

        <Pressable
          className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex-row items-center"
          onPress={onVideoRecord}
        >
          <View className="w-12 h-12 bg-red-600 rounded-full items-center justify-center mr-3">
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-15">Record Video</Text>
            <Text className="text-gray-500 text-13">Face blur & voice change enabled</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8B98A5" />
        </Pressable>
      </View>

      {/* Privacy Notice */}
      <View className="px-4 pb-4">
        <View className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="lock-closed" size={16} color="#1D9BF0" />
            <Text className="text-blue-400 font-bold text-15 ml-2">Privacy Protected</Text>
          </View>
          <Text className="text-gray-400 text-13 leading-4">
            All confessions are completely anonymous. No personal information is stored or shared.
          </Text>
        </View>
      </View>
    </View>
  );
}
