import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useConfessionStore } from "../state/confessionStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AlertModal } from "../components/AnimatedModal";
import CharacterCounter from "../components/CharacterCounter";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";
import { getOptimizedTextInputProps } from "../utils/keyboardUtils";
import { NavigationHelpers } from "../utils/navigation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateConfessionScreen() {
  const [textContent, setTextContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const navigation = useNavigation<NavigationProp>();
  const addConfession = useConfessionStore((state) => state.addConfession);

  const showMessage = (message: string, type: "success" | "error") => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const handleTextSubmit = async () => {
    const trimmedContent = textContent.trim();

    // Enhanced validation
    if (!trimmedContent) {
      showMessage("Please enter your confession", "error");
      return;
    }

    if (trimmedContent.length > 280) {
      showMessage("Your confession is too long. Please keep it under 280 characters.", "error");
      return;
    }

    if (trimmedContent.length < 10) {
      showMessage("Your confession is too short. Please write at least 10 characters.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (__DEV__) {
        console.log("📝 CreateConfessionScreen: Submitting confession (length:", trimmedContent.length, "chars)");
      }

      await addConfession({
        type: "text",
        content: trimmedContent,
        isAnonymous: true,
        views: 0,
        likes: 0,
      });

      if (__DEV__) {
        console.log("✅ CreateConfessionScreen: Confession submitted successfully");
      }

      setTextContent("");
      showMessage("Your secret has been shared anonymously! 🎉", "success");

      // Navigate to home after a short delay
      setTimeout(() => {
        if (__DEV__) {
          console.log("📱 CreateConfessionScreen: Navigating to home");
        }
        NavigationHelpers.goToHome(navigation);
      }, 1500);
    } catch (error) {
      if (__DEV__) {
        console.error("❌ CreateConfessionScreen: Failed to create confession:", error);
      }
      showMessage("Failed to share your secret. Please check your connection and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoRecord = () => {
    navigation.navigate("VideoRecord");
  };

  return (
    <View className="flex-1 bg-black">
      {/* Action Bar */}
      <View className="px-4 py-2 border-b border-gray-800 flex-row items-center justify-between">
        <Text className="text-white text-18 font-semibold">Share Secret</Text>
        <Pressable
          className={`rounded-full px-4 py-2 ${
            isSubmitting || !textContent.trim() || textContent.length > 280 || textContent.length < 10
              ? "bg-gray-700"
              : "bg-blue-500"
          }`}
          onPress={handleTextSubmit}
          disabled={isSubmitting || !textContent.trim() || textContent.length > 280 || textContent.length < 10}
        >
          <Text className="text-white font-semibold">{isSubmitting ? "Sharing..." : "Share"}</Text>
        </Pressable>
      </View>

      <ScreenKeyboardWrapper className="flex-1" scrollable={false} extraPadding={16}>
        <View className="flex-1">
          {/* Compose Area */}
          <View className="flex-row p-4">
            <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
              <Ionicons name="person" size={20} color="#8B98A5" />
            </View>
            <View className="flex-1">
              <TextInput
                {...getOptimizedTextInputProps("text")}
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

              {/* Character counter with progressive warnings */}
              <View className="mt-4">
                <CharacterCounter
                  currentLength={textContent.length}
                  maxLength={280}
                  warningThreshold={240}
                  dangerThreshold={260}
                  className="mb-3"
                />

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
              onPress={handleVideoRecord}
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
      </ScreenKeyboardWrapper>

      {/* Animated Modal */}
      <AlertModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === "success" ? "Success!" : "Error"}
        message={modalMessage}
        confirmText="OK"
      />
    </View>
  );
}
