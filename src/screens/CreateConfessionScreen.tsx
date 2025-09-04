import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useConfessionStore } from "../state/confessionStore";
import { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CreateConfessionScreen() {
  const [textContent, setTextContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const addConfession = useConfessionStore((state) => state.addConfession);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      Alert.alert("Error", "Please enter your confession");
      return;
    }

    setIsSubmitting(true);
    try {
      addConfession({
        type: "text",
        content: textContent.trim(),
        isAnonymous: true,
      });
      
      setTextContent("");
      Alert.alert("Success", "Your secret has been shared anonymously");
    } catch (error) {
      Alert.alert("Error", "Failed to share your secret. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoRecord = () => {
    navigation.navigate("VideoRecord");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-4 py-6">
          <Text className="text-white text-2xl font-bold mb-2">
            Share Your Secret
          </Text>
          <Text className="text-gray-400 text-base mb-8">
            Your confession will be completely anonymous
          </Text>

          {/* Text Confession Section */}
          <View className="mb-8">
            <Text className="text-white text-lg font-semibold mb-4">
              Write Your Confession
            </Text>
            <TextInput
              className="bg-gray-800 text-white p-4 rounded-xl text-base min-h-32"
              placeholder="Share your deepest secret..."
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
              value={textContent}
              onChangeText={setTextContent}
              maxLength={1000}
            />
            <Text className="text-gray-500 text-sm mt-2 text-right">
              {textContent.length}/1000
            </Text>
            
            <Pressable
              className={`mt-4 rounded-xl p-4 flex-row items-center justify-center ${
                isSubmitting || !textContent.trim() 
                  ? "bg-gray-700" 
                  : "bg-purple-600"
              }`}
              onPress={handleTextSubmit}
              disabled={isSubmitting || !textContent.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={isSubmitting || !textContent.trim() ? "#6B7280" : "#FFFFFF"} 
              />
              <Text className={`ml-2 font-semibold ${
                isSubmitting || !textContent.trim() 
                  ? "text-gray-400" 
                  : "text-white"
              }`}>
                {isSubmitting ? "Sharing..." : "Share Anonymously"}
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View className="flex-row items-center mb-8">
            <View className="flex-1 h-px bg-gray-700" />
            <Text className="text-gray-500 mx-4">OR</Text>
            <View className="flex-1 h-px bg-gray-700" />
          </View>

          {/* Video Confession Section */}
          <View>
            <Text className="text-white text-lg font-semibold mb-4">
              Record Video Confession
            </Text>
            <Text className="text-gray-400 text-sm mb-4">
              Your face will be blurred and voice changed for complete anonymity
            </Text>
            
            <Pressable
              className="bg-red-600 rounded-xl p-4 flex-row items-center justify-center"
              onPress={handleVideoRecord}
            >
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
              <Text className="text-white ml-2 font-semibold">
                Record Video Secret
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}