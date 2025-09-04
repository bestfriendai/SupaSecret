import React, { useState, useRef } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { processVideoConfession } from "../utils/videoProcessing";

export default function VideoRecordScreen() {
  const [facing, setFacing] = useState<CameraType>("front");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation();
  const addConfession = useConfessionStore((state) => state.addConfession);

  if (!permission) {
    return <View className="flex-1 bg-slate-900" />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Ionicons name="camera-outline" size={64} color="#6B7280" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-400 text-base mt-2 text-center mb-8">
          We need camera access to record your video confession
        </Text>
        <Pressable
          className="bg-purple-600 rounded-xl px-6 py-3"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60, // 1 minute max
      });
      
      if (video) {
        await processVideo(video.uri);
      }
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const processVideo = async (videoUri: string) => {
    setIsProcessing(true);
    try {
      // Process video with face blur, voice change, and transcription
      const processedVideo = await processVideoConfession(videoUri);
      
      addConfession({
        type: "video",
        content: "Video confession with face blur and voice change applied",
        videoUri: processedVideo.uri,
        transcription: processedVideo.transcription,
        isAnonymous: true,
      });

      Alert.alert(
        "Success", 
        "Your video confession has been processed and shared anonymously!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Processing error:", error);
      Alert.alert("Error", "Failed to process video. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Ionicons name="cog" size={64} color="#8B5CF6" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Processing Your Video
        </Text>
        <Text className="text-gray-400 text-base mt-2 text-center">
          Applying face blur, voice change, and transcription...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
      >
        {/* Overlay UI */}
        <View className="absolute top-0 left-0 right-0 bottom-0 z-10">
          {/* Top Controls */}
          <SafeAreaView className="flex-row justify-between items-center px-4 py-2">
            <Pressable
              className="bg-black/50 rounded-full p-3"
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            
            <View className="bg-black/50 rounded-full px-4 py-2">
              <Text className="text-white text-sm font-medium">
                Face Blur: ON
              </Text>
            </View>
            
            <Pressable
              className="bg-black/50 rounded-full p-3"
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>

          {/* Bottom Controls */}
          <View className="absolute bottom-0 left-0 right-0">
            <SafeAreaView className="items-center pb-8">
              <Text className="text-white text-sm mb-4 text-center px-4">
                Your face will be blurred and voice changed automatically
              </Text>
              
              <View className="flex-row items-center justify-center">
                <Pressable
                  className={`rounded-full p-4 ${
                    isRecording ? "bg-red-600" : "bg-red-500"
                  }`}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <Ionicons 
                    name={isRecording ? "stop" : "videocam"} 
                    size={32} 
                    color="#FFFFFF" 
                  />
                </Pressable>
              </View>
              
              {isRecording && (
                <Text className="text-red-400 text-sm mt-2 font-medium">
                  Recording... Tap to stop
                </Text>
              )}
            </SafeAreaView>
          </View>
        </View>
      </CameraView>
    </View>
  );
}