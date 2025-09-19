import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Share, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { PreferenceAwareHaptics } from "../utils/haptics";
import { generateConfessionLink, generateShareMessage } from "../utils/links";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import ReportModal from "./ReportModal";
import { BlurView } from "expo-blur";

interface EnhancedShareBottomSheetProps {
  confessionId: string;
  confessionText: string;
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
}

interface ShareOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  color?: string;
}

export default function EnhancedShareBottomSheet({
  confessionId,
  confessionText,
  bottomSheetModalRef,
}: EnhancedShareBottomSheetProps) {
  const impactAsync = PreferenceAwareHaptics.impactAsync;
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const snapPoints = useMemo(() => ["40%"], []);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    [],
  );

  const handleNativeShare = useCallback(async () => {
    try {
      const shareUrl = generateConfessionLink(confessionId);
      const shareMessage = generateShareMessage(confessionText, confessionId);

      const result = await Share.share({
        message: shareMessage,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        impactAsync();
        bottomSheetModalRef.current?.dismiss();
      }
    } catch (error) {
      console.error("Share failed:", error);
      Alert.alert("Share Failed", "Unable to share this confession. Please try again.");
    }
  }, [confessionId, confessionText, bottomSheetModalRef, impactAsync]);

  const handleCopyLink = useCallback(async () => {
    try {
      const shareUrl = generateConfessionLink(confessionId);
      await Clipboard.setStringAsync(shareUrl);

      Alert.alert(
        "Link Copied",
        "Anonymous link copied to clipboard",
        [{ text: "OK", onPress: () => bottomSheetModalRef.current?.dismiss() }]
      );

      impactAsync();
    } catch (error) {
      console.error("Copy failed:", error);
      Alert.alert("Copy Failed", "Unable to copy link. Please try again.");
    }
  }, [confessionId, bottomSheetModalRef, impactAsync]);

  const handleCopyText = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(confessionText);

      Alert.alert(
        "Text Copied",
        "Confession text copied to clipboard",
        [{ text: "OK", onPress: () => bottomSheetModalRef.current?.dismiss() }]
      );

      impactAsync();
    } catch (error) {
      console.error("Copy failed:", error);
      Alert.alert("Copy Failed", "Unable to copy text. Please try again.");
    }
  }, [confessionText, bottomSheetModalRef, impactAsync]);

  const handleReport = useCallback(() => {
    setReportModalVisible(true);
    bottomSheetModalRef.current?.dismiss();
    impactAsync();
  }, [bottomSheetModalRef, impactAsync]);

  const handleReportModalClose = useCallback(() => {
    setReportModalVisible(false);
  }, []);

  const ShareOption: React.FC<ShareOptionProps> = ({ icon, title, subtitle, onPress, color = "#1D9BF0" }) => (
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
    <>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#1A1A1A" }}
        handleIndicatorStyle={{ backgroundColor: "#666" }}
      >
        <BottomSheetView className="flex-1 px-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-18 font-bold">Share Anonymously</Text>
            <Pressable onPress={() => bottomSheetModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color="#8B98A5" />
            </Pressable>
          </View>

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

      <ReportModal
        isVisible={reportModalVisible}
        onClose={handleReportModalClose}
        confessionId={confessionId}
        contentType="confession"
      />
    </>
  );
}