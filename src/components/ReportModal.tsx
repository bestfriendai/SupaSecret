import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useReportStore } from "../state/reportStore";
import { ReportReason, REPORT_REASON_LABELS, REPORT_REASON_DESCRIPTIONS } from "../types/report";
import { t } from "../utils/i18n";
import { trackInteraction } from "../utils/reviewPrompt";

interface ReportModalProps {
  isVisible: boolean;
  onClose: () => void;
  confessionId?: string;
  replyId?: string;
  contentType: "confession" | "reply";
}

const MODAL_HEIGHT = 500;

const REPORT_REASONS: ReportReason[] = [
  "inappropriate_content",
  "spam",
  "harassment",
  "false_information",
  "violence",
  "hate_speech",
  "other",
];

export default function ReportModal({ isVisible, onClose, confessionId, replyId, contentType }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createReport, isLoading, error, clearError } = useReportStore();

  const translateY = useSharedValue(MODAL_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withSpring(MODAL_HEIGHT, { damping: 15, stiffness: 150 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
      // Reset form when modal closes
      setSelectedReason(null);
      setAdditionalDetails("");
      clearError();
    }
  }, [isVisible]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
      clearError();
    }
  }, [error, clearError]);

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

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert(t("common.error"), "Please select a reason for reporting");
      return;
    }

    if (selectedReason === "other" && !additionalDetails.trim()) {
      Alert.alert(t("common.error"), "Please provide additional details for 'Other' reason");
      return;
    }

    setIsSubmitting(true);
    trackInteraction(); // Track user interaction for review prompting

    try {
      await createReport({
        confessionId,
        replyId,
        reason: selectedReason,
        additionalDetails: additionalDetails.trim() || undefined,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t("reports.submitted"), t("reports.submittedMessage"), [{ text: t("common.ok"), onPress: onClose }]);
    } catch (error) {
      // Error is handled by the store and useEffect above
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <View className="items-center mb-4">
            <View className="w-10 h-1 bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-18 font-semibold">{t("reports.title")}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#8B98A5" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Reason Selection */}
            <Text className="text-white text-16 font-medium mb-4">Why are you reporting this {contentType}?</Text>

            <View className="space-y-2 mb-6">
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  className={`flex-row items-center p-3 rounded-lg border ${
                    selectedReason === reason ? "border-red-500 bg-red-500/10" : "border-gray-700 bg-gray-800/50"
                  }`}
                  onPress={() => handleReasonSelect(reason)}
                >
                  <View className="mr-3">
                    <Ionicons
                      name={selectedReason === reason ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={selectedReason === reason ? "#EF4444" : "#8B98A5"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-15 font-medium">{REPORT_REASON_LABELS[reason]}</Text>
                    <Text className="text-gray-400 text-13 mt-1">{REPORT_REASON_DESCRIPTIONS[reason]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Additional Details */}
            {(selectedReason === "other" || selectedReason) && (
              <View className="mb-6">
                <Text className="text-white text-16 font-medium mb-3">
                  Additional Details {selectedReason === "other" ? "(Required)" : "(Optional)"}
                </Text>
                <TextInput
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-15"
                  placeholder={`Provide more details about this ${contentType}...`}
                  placeholderTextColor="#8B98A5"
                  value={additionalDetails}
                  onChangeText={setAdditionalDetails}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View className="pt-4 pb-6">
            <Pressable
              className={`rounded-lg py-4 ${
                selectedReason && !isSubmitting && !isLoading ? "bg-red-500" : "bg-gray-700"
              }`}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting || isLoading}
            >
              <Text className="text-white text-16 font-semibold text-center">
                {isSubmitting || isLoading ? "Submitting..." : "Submit Report"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
