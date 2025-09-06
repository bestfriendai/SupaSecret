import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Share, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { generateConfessionLink, generateShareMessage } from "../utils/links";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useReportStore } from "../state/reportStore";
import ReportModal from "./ReportModal";

interface ShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  confessionId: string;
  confessionText: string;
}

const MODAL_HEIGHT = 300;

export default function ShareModal({
  isVisible,
  onClose,
  confessionId,
  confessionText,
}: ShareModalProps) {
  const { impactAsync } = usePreferenceAwareHaptics();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withSpring(MODAL_HEIGHT, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > MODAL_HEIGHT * 0.3) {
        translateY.value = withSpring(MODAL_HEIGHT);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleNativeShare = async () => {
    try {
      const shareUrl = generateConfessionLink(confessionId);
      const shareMessage = generateShareMessage(confessionText, confessionId);

      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });
      impactAsync();
      onClose();
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = generateConfessionLink(confessionId);
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert("Copied!", "Link copied to clipboard");
      impactAsync();
      onClose();
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(confessionText);
      Alert.alert("Copied!", "Confession text copied to clipboard");
      impactAsync();
      onClose();
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleReport = () => {
    setReportModalVisible(true);
    impactAsync();
  };

  const handleReportModalClose = () => {
    setReportModalVisible(false);
  };

  if (!isVisible) return null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "black",
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Modal */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: MODAL_HEIGHT,
              backgroundColor: "#1A1A1A",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 12,
            },
            modalStyle,
          ]}
        >
          {/* Handle */}
          <View className="items-center mb-6">
            <View className="w-10 h-1 bg-gray-600 rounded-full" />
          </View>

          {/* Share Options */}
          <View className="space-y-4">
            <Pressable
              className="flex-row items-center py-4 px-2"
              onPress={handleNativeShare}
            >
              <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-4">
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-medium">Share</Text>
                <Text className="text-gray-400 text-13">Share this confession</Text>
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 px-2"
              onPress={handleCopyLink}
            >
              <View className="w-10 h-10 bg-green-500 rounded-full items-center justify-center mr-4">
                <Ionicons name="link-outline" size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-medium">Copy Link</Text>
                <Text className="text-gray-400 text-13">Copy link to clipboard</Text>
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 px-2"
              onPress={handleCopyText}
            >
              <View className="w-10 h-10 bg-purple-500 rounded-full items-center justify-center mr-4">
                <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-medium">Copy Text</Text>
                <Text className="text-gray-400 text-13">Copy confession text</Text>
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 px-2"
              onPress={handleReport}
            >
              <View className="w-10 h-10 bg-red-500 rounded-full items-center justify-center mr-4">
                <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-16 font-medium">Report</Text>
                <Text className="text-gray-400 text-13">Report inappropriate content</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={handleReportModalClose}
        confessionId={confessionId}
        contentType="confession"
      />
    </View>
  );
}