import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Share, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSavedStore } from "../state/savedStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import ReportModal from "./ReportModal";
import { BlurView } from "expo-blur";

interface FeedActionSheetProps {
  confessionId: string;
  confessionText: string;
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
}

export default function FeedActionSheet({ confessionId, confessionText, bottomSheetModalRef }: FeedActionSheetProps) {
  const [showModal, setShowModal] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "confirm">("success");

  const { saveConfession, unsaveConfession, isSaved } = useSavedStore();
  const { impactAsync } = usePreferenceAwareHaptics();

  // Bottom sheet configuration
  const snapPoints = useMemo(() => ["45%"], []);

  const showMessage = (message: string, type: "success" | "confirm") => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    [],
  );

  const handleNativeShare = useCallback(async () => {
    try {
      const shareUrl = `https://secrets.app/confession/${confessionId}`;
      await Share.share({
        message: `Check out this anonymous confession: "${confessionText.substring(0, 100)}..." ${shareUrl}`,
        url: shareUrl,
      });
      impactAsync();
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      if (__DEV__) {
        console.error("Share failed:", error);
      }
    }
  }, [confessionId, confessionText, bottomSheetModalRef, impactAsync]);

  const handleCopyLink = useCallback(async () => {
    try {
      const shareUrl = `https://secrets.app/confession/${confessionId}`;
      await Clipboard.setStringAsync(shareUrl);
      showMessage("Link copied to clipboard!", "success");
      impactAsync();
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      if (__DEV__) {
        console.error("Copy failed:", error);
      }
    }
  }, [confessionId, bottomSheetModalRef, impactAsync]);

  const handleCopyText = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(confessionText);
      showMessage("Text copied to clipboard!", "success");
      impactAsync();
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      if (__DEV__) {
        console.error("Copy failed:", error);
      }
    }
  }, [confessionText, bottomSheetModalRef, impactAsync]);

  const handleSave = useCallback(() => {
    const isCurrentlySaved = isSaved(confessionId);

    if (isCurrentlySaved) {
      unsaveConfession(confessionId);
      showMessage("Removed from saved secrets", "success");
    } else {
      saveConfession(confessionId);
      showMessage("Saved to your collection!", "success");
    }

    impactAsync();
    bottomSheetModalRef.current?.dismiss();
  }, [confessionId, isSaved, saveConfession, unsaveConfession, bottomSheetModalRef, impactAsync]);

  const handleReport = useCallback(() => {
    impactAsync();
    bottomSheetModalRef.current?.dismiss();
    setTimeout(() => {
      setReportModalVisible(true);
    }, 300);
  }, [bottomSheetModalRef, impactAsync]);

  const ActionOption = ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#8B98A5",
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color?: string;
  }) => (
    <Pressable className="flex-row items-center py-4 px-4 active:bg-gray-800 rounded-xl" onPress={onPress}>
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-white text-16 font-medium">{title}</Text>
        <Text className="text-gray-400 text-13 mt-0.5">{subtitle}</Text>
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
        backgroundStyle={{ backgroundColor: "#1F2937" }}
        handleIndicatorStyle={{ backgroundColor: "#4B5563" }}
      >
        <BottomSheetView className="flex-1 px-4">
          {/* Header */}
          <View className="items-center mb-6">
            <Text className="text-white text-18 font-semibold">Actions</Text>
            <Text className="text-gray-400 text-14 mt-1">Choose an action for this secret</Text>
          </View>

          {/* Action Options */}
          <View className="space-y-2">
            <ActionOption
              icon="share-outline"
              title="Share"
              subtitle="Share this anonymous confession"
              onPress={handleNativeShare}
              color="#1D9BF0"
            />

            <ActionOption
              icon="link-outline"
              title="Copy Link"
              subtitle="Copy link to clipboard"
              onPress={handleCopyLink}
              color="#10B981"
            />

            <ActionOption
              icon="copy-outline"
              title="Copy Text"
              subtitle="Copy confession text"
              onPress={handleCopyText}
              color="#8B5CF6"
            />

            <ActionOption
              icon={isSaved(confessionId) ? "bookmark" : "bookmark-outline"}
              title={isSaved(confessionId) ? "Remove from Saved" : "Save"}
              subtitle={isSaved(confessionId) ? "Remove from your collection" : "Save to your collection"}
              onPress={handleSave}
              color="#F59E0B"
            />

            <ActionOption
              icon="flag-outline"
              title="Report"
              subtitle="Report inappropriate content"
              onPress={handleReport}
              color="#EF4444"
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Success/Confirm Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center px-8">
            <View className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center">
                <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark" size={24} color="white" />
                </View>
                <Text className="text-white text-16 font-medium text-center mb-6">{modalMessage}</Text>
                <Pressable className="bg-blue-600 rounded-xl py-3 px-6 w-full" onPress={() => setShowModal(false)}>
                  <Text className="text-white text-16 font-medium text-center">OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        confessionId={confessionId}
        contentType="confession"
      />
    </>
  );
}
