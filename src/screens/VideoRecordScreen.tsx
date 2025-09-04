import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { processVideoConfession } from "../utils/videoProcessing";

export default function VideoRecordScreen() {
  // All hooks must be called at the top level, before any conditional logic
  const [facing, setFacing] = useState<CameraType>("front");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation();
  const addConfession = useConfessionStore((state) => state.addConfession);

  // Cleanup effect - must be called after all other hooks
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    try {
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: 60, // 1 minute max
      });
      
      const video = await recordingPromiseRef.current;
      
      if (video && video.uri) {
        await processVideo(video.uri);
      }
    } catch (error) {
      console.error("Recording error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage !== "Recording stopped") {
        Alert.alert("Error", "Failed to record video. Please try again.");
      }
    } finally {
      setIsRecording(false);
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  // Render permission loading state
  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  // Render permission request screen
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="camera-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-400 text-base mt-2 text-center mb-8">
          We need camera access to record your video confession
        </Text>
        <Pressable
          className="bg-blue-500 rounded-full px-6 py-3"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Render processing screen
  if (isProcessing) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="cog" size={64} color="#1D9BF0" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Processing Your Video
        </Text>
        <Text className="text-gray-400 text-base mt-2 text-center">
          Applying face blur, voice change, and transcription...
        </Text>
      </SafeAreaView>
    );
  }

  // Render main camera screen
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
              className="bg-black/70 rounded-full p-3"
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            
            <View className="bg-black/70 rounded-full px-4 py-2 flex-row items-center">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-white text-sm font-medium">
                Face Blur: ON
              </Text>
            </View>
            
            <Pressable
              className="bg-black/70 rounded-full p-3"
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
              
              {isRecording && (
                <View className="bg-red-600 rounded-full px-4 py-2 mb-4">
                  <Text className="text-white text-sm font-medium">
                    Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              
              <View className="flex-row items-center justify-center">
                <Pressable
                  className={`rounded-full p-6 border-4 ${
                    isRecording 
                      ? "bg-red-600 border-red-400" 
                      : "bg-transparent border-white"
                  }`}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <View className={`rounded-full ${
                    isRecording ? "w-6 h-6 bg-white" : "w-8 h-8 bg-red-500"
                  }`} />
                </Pressable>
              </View>
              
              {!isRecording && (
                <Text className="text-gray-300 text-sm mt-4 font-medium">
                  Tap to start recording
                </Text>
              )}
            </SafeAreaView>
          </View>
        </View>
      </CameraView>
    </View>
  );
}