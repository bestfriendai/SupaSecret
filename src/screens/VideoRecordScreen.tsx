import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { processVideoConfession } from "../utils/videoProcessing";
import * as Haptics from "expo-haptics";

export default function VideoRecordScreen() {
  // All hooks must be called at the top level, before any conditional logic
  const [facing, setFacing] = useState<CameraType>("front");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [modalButtons, setModalButtons] = useState<Array<{text: string, onPress?: () => void}>>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<any> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation();
  const addConfession = useConfessionStore((state) => state.addConfession);

  const showMessage = (message: string, type: "success" | "error", buttons?: Array<{text: string, onPress?: () => void}>) => {
    setModalMessage(message);
    setModalType(type);
    setModalButtons(buttons || [{text: "OK", onPress: () => setShowModal(false)}]);
    setShowModal(true);
  };

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    setIsRecording(true);
    setRecordingTime(0);
    
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
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
        let userFriendlyMessage = "Failed to record video. Please try again.";
        
        if (errorMessage.includes("permission")) {
          userFriendlyMessage = "Camera or microphone permission was denied. Please check your settings.";
        } else if (errorMessage.includes("storage") || errorMessage.includes("space")) {
          userFriendlyMessage = "Not enough storage space to record video. Please free up some space.";
        } else if (errorMessage.includes("camera")) {
          userFriendlyMessage = "Camera is not available. Please make sure no other app is using the camera.";
        }
        
        showMessage(userFriendlyMessage, "error", [
          { text: "Try Again" },
          { text: "Go Back", onPress: () => navigation.goBack() }
        ]);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setProcessingProgress(0);
    setProcessingStatus("Starting processing...");
    
    try {
      // Process video with face blur, voice change, and transcription
      const processedVideo = await processVideoConfession(videoUri, {
        enableTranscription: true,
        enableFaceBlur: true,
        enableVoiceChange: true,
        quality: "medium",
        onProgress: (progress, status) => {
          setProcessingProgress(progress);
          setProcessingStatus(status);
        }
      });
      
      addConfession({
        type: "video",
        content: "Video confession with face blur and voice change applied",
        videoUri: processedVideo.uri,
        transcription: processedVideo.transcription,
        isAnonymous: true,
      });

      showMessage(
        "Your video confession has been processed and shared anonymously!", 
        "success",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let userFriendlyMessage = "Failed to process your video confession.";
      let suggestions = "Please try recording again.";
      
      if (errorMessage.includes("transcription")) {
        userFriendlyMessage = "Video recorded successfully, but transcription failed.";
        suggestions = "Your video will be saved without transcription. You can try again later.";
      } else if (errorMessage.includes("storage") || errorMessage.includes("space")) {
        userFriendlyMessage = "Not enough storage space to process video.";
        suggestions = "Please free up some space and try again.";
      } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
        userFriendlyMessage = "Network error during processing.";
        suggestions = "Please check your internet connection and try again.";
      }
      
      showMessage(
        `${userFriendlyMessage}\n\n${suggestions}`,
        "error",
        [
          { text: "Try Again", onPress: () => setIsProcessing(false) },
          { text: "Go Back", onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStatus("");
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
        <View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-6">
          <Ionicons name="camera-outline" size={40} color="#8B98A5" />
        </View>
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-400 text-base mt-2 text-center mb-8 leading-6">
          We need camera and microphone access to record your anonymous video confession with privacy protection.
        </Text>
        <Pressable
          className="bg-blue-500 rounded-full px-8 py-4 mb-4"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold text-16">Grant Permission</Text>
        </Pressable>
        <Pressable
          className="bg-gray-800 rounded-full px-6 py-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-300 font-medium">Go Back</Text>
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
        <Text className="text-gray-400 text-base mt-2 text-center mb-6">
          {processingStatus || "Applying face blur, voice change, and transcription..."}
        </Text>
        
        {/* Progress Bar */}
        <View className="w-full max-w-xs bg-gray-800 rounded-full h-2 mb-4">
          <View 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </View>
        
        <Text className="text-blue-400 text-sm font-medium">
          {Math.round(processingProgress)}% Complete
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
        mode="video"
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
                Protected Mode
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
              <View className="bg-black/70 rounded-2xl px-4 py-3 mb-4 mx-4">
                <View className="flex-row items-center justify-center mb-2">
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text className="text-green-400 text-sm font-semibold ml-2">
                    Privacy Protection Active
                  </Text>
                </View>
                <Text className="text-white text-sm text-center leading-5">
                  Face blur and voice change will be applied automatically
                </Text>
              </View>
              
              {isRecording && (
                <View className="bg-red-600 rounded-full px-6 py-3 mb-4 flex-row items-center">
                  <View className="w-3 h-3 bg-white rounded-full mr-3 animate-pulse" />
                  <Text className="text-white text-base font-bold">
                    REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              
              <View className="flex-row items-center justify-center space-x-8">
                {/* Quality Selector */}
                <Pressable className="bg-black/70 rounded-full p-3">
                  <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
                </Pressable>
                
                {/* Record Button */}
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
                
                {/* Gallery/Preview */}
                <Pressable className="bg-black/70 rounded-full p-3">
                  <Ionicons name="images-outline" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
              
              {!isRecording && (
                <View className="items-center mt-4">
                  <Text className="text-white text-base font-semibold mb-1">
                    Tap to start recording
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Max duration: 60 seconds
                  </Text>
                </View>
              )}
            </SafeAreaView>
          </View>
        </View>
      </CameraView>

      {/* Custom Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <Ionicons 
                name={modalType === "success" ? "checkmark-circle" : "alert-circle"} 
                size={48} 
                color={modalType === "success" ? "#10B981" : "#EF4444"} 
              />
            </View>
            <Text className="text-white text-16 text-center mb-6 leading-5">
              {modalMessage}
            </Text>
            <View className="flex-row space-x-3">
              {modalButtons.map((button, index) => (
                <Pressable
                  key={index}
                  className={`flex-1 py-3 px-4 rounded-full ${
                    index === 0 ? "bg-blue-500" : "bg-gray-700"
                  }`}
                  onPress={() => {
                    setShowModal(false);
                    button.onPress?.();
                  }}
                >
                  <Text className="text-white font-semibold text-center">
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}