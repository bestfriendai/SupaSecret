import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, Share, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";

interface EnhancedShareBottomSheetProps {
  confessionId: string;
  confessionText: string;
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
}

export default function EnhancedShareBottomSheet({
  confessionId,
  confessionText,
  bottomSheetModalRef,
}: EnhancedShareBottomSheetProps) {
  // Bottom sheet configuration
  const snapPoints = useMemo(() => ["40%"], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleNativeShare = useCallback(async () => {
    try {
      const shareUrl = `https://secrets.app/confession/${confessionId}`;
      await Share.share({
        message: `Check out this anonymous confession: "${confessionText.substring(0, 100)}..." ${shareUrl}`,
        url: shareUrl,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [confessionId, confessionText, bottomSheetModalRef]);

  const handleCopyLink = useCallback(async () => {
    try {
      const shareUrl = `https://secrets.app/confession/${confessionId}`;
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert("Copied!", "Anonymous link copied to clipboard");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }, [confessionId, bottomSheetModalRef]);

  const handleCopyText = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(confessionText);
      Alert.alert("Copied!", "Anonymous confession copied to clipboard");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }, [confessionText, bottomSheetModalRef]);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report Anonymous Content",
      "Are you sure you want to report this confession? Your report will be anonymous.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            Alert.alert("Reported", "Thank you for your anonymous report. We'll review this content.");
            bottomSheetModalRef.current?.dismiss();
          },
        },
      ]
    );
  }, [bottomSheetModalRef]);

  const ShareOption = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    color = "#1D9BF0" 
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
    color?: string;
  }) => (
    <Pressable
      className="flex-row items-center py-4 px-4 active:bg-gray-800/50 rounded-xl"
      onPress={onPress}
    >
      <BlurView intensity={20} tint="dark" className="w-12 h-12 rounded-full items-center justify-center mr-4">
        <View 
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
      </BlurView>
      <View className="flex-1">
        <Text className="text-white text-16 font-medium">{title}</Text>
        <Text className="text-gray-400 text-13">{subtitle}</Text>
      </View>
    </Pressable>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#1A1A1A" }}
      handleIndicatorStyle={{ backgroundColor: "#666" }}
    >
      <BottomSheetView className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-18 font-bold">Share Anonymously</Text>
          <Pressable onPress={() => bottomSheetModalRef.current?.dismiss()}>
            <Ionicons name="close" size={24} color="#8B98A5" />
          </Pressable>
        </View>

        {/* Share Options */}
        <View className="space-y-2">
          <ShareOption
            icon="share-outline"
            title="Share"
            subtitle="Share this anonymous confession"
            onPress={handleNativeShare}
            color="#1D9BF0"
          />

          <ShareOption
            icon="link-outline"
            title="Copy Anonymous Link"
            subtitle="Copy link to clipboard"
            onPress={handleCopyLink}
            color="#10B981"
          />

          <ShareOption
            icon="copy-outline"
            title="Copy Text"
            subtitle="Copy confession text"
            onPress={handleCopyText}
            color="#8B5CF6"
          />

          <ShareOption
            icon="flag-outline"
            title="Report Content"
            subtitle="Report inappropriate content anonymously"
            onPress={handleReport}
            color="#EF4444"
          />
        </View>

        {/* Privacy Notice */}
        <View className="mt-6 p-4 bg-gray-800/30 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text className="text-green-400 text-14 font-medium ml-2">Anonymous Sharing</Text>
          </View>
          <Text className="text-gray-400 text-12 leading-4">
            All shares are completely anonymous. No personal information is included in shared links.
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}