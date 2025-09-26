import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../state/authStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import * as Haptics from "expo-haptics";

interface ReportSystemProps {
  contentId: string;
  contentType: "confession" | "comment" | "user";
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const REPORT_CATEGORIES = [
  { id: "spam", label: "Spam or Fake Content", icon: "warning" },
  { id: "harassment", label: "Harassment or Bullying", icon: "shield" },
  { id: "hate_speech", label: "Hate Speech", icon: "ban" },
  { id: "violence", label: "Violence or Threats", icon: "alert-circle" },
  { id: "inappropriate", label: "Inappropriate Content", icon: "eye-off" },
  { id: "misinformation", label: "False Information", icon: "information-circle" },
  { id: "privacy", label: "Privacy Violation", icon: "lock-closed" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal" },
] as const;

type ReportCategory = (typeof REPORT_CATEGORIES)[number]["id"];

export const ReportSystem: React.FC<ReportSystemProps> = ({ contentId, contentType, onClose, onReportSubmitted }) => {
  const { user } = useAuthStore();
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();

  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"category" | "details" | "confirmation">("category");
  const [reportId, setReportId] = useState<string | null>(null);

  const handleCategorySelect = useCallback(
    async (category: ReportCategory) => {
      setSelectedCategory(category);
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setStep("details");
    },
    [hapticsEnabled, impactAsync],
  );

  const handleSubmitReport = useCallback(async () => {
    if (!selectedCategory || !user) {
      Alert.alert("Error", "Please select a category and ensure you're logged in.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("reports")
        .insert({
          reporter_user_id: user.id, // Fixed: use reporter_user_id instead of reporter_id
          content_id: contentId,
          content_type: contentType,
          reason: selectedCategory, // Fixed: use reason instead of category
          additional_details: description.trim() || null,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      // Store the actual report ID from the database
      if (data?.id) {
        setReportId(data.id);
      }

      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setStep("confirmation");
      onReportSubmitted?.();
    } catch (error) {
      console.error("Report submission error:", error);
      Alert.alert("Submission Failed", "Unable to submit your report. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCategory, user, contentId, contentType, description, hapticsEnabled, impactAsync, onReportSubmitted]);

  // Handle auto-close with timeout cleanup
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (step === "confirmation") {
      timeoutId = setTimeout(() => {
        onClose();
      }, 2000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [step, onClose]);

  const renderCategoryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Why are you reporting this content?</Text>
      <Text style={styles.stepSubtitle}>Select the category that best describes the issue</Text>

      <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
        {REPORT_CATEGORIES.map((category) => (
          <Pressable
            key={category.id}
            style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonSelected]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={24}
              color={selectedCategory === category.id ? "#1D9BF0" : "#666"}
            />
            <Text style={[styles.categoryLabel, selectedCategory === category.id && styles.categoryLabelSelected]}>
              {category.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={selectedCategory === category.id ? "#1D9BF0" : "#666"} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Additional Details</Text>
      <Text style={styles.stepSubtitle}>Help us understand the issue better (optional)</Text>

      <View style={styles.selectedCategoryDisplay}>
        <Ionicons
          name={REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.icon as any}
          size={20}
          color="#1D9BF0"
        />
        <Text style={styles.selectedCategoryText}>
          {REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
        </Text>
      </View>

      <TextInput
        style={styles.descriptionInput}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue in more detail..."
        placeholderTextColor="#666"
        multiline
        maxLength={500}
        textAlignVertical="top"
      />

      <Text style={styles.characterCount}>{description.length}/500 characters</Text>

      <View style={styles.actionButtons}>
        <Pressable style={styles.backButton} onPress={() => setStep("category")}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitReport}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? "Submitting..." : "Submit Report"}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.confirmationIcon}>
        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
      </View>

      <Text style={styles.confirmationTitle}>Report Submitted</Text>
      <Text style={styles.confirmationMessage}>
        Thank you for helping keep our community safe. We'll review your report and take appropriate action.
      </Text>

      <View style={styles.confirmationDetails}>
        <Text style={styles.confirmationDetailText}>
          Report ID: {reportId ? reportId.slice(0, 8) + "..." : "Pending..."}
        </Text>
        <Text style={styles.confirmationDetailText}>
          Category: {REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report Content</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: step === "category" ? "33%" : step === "details" ? "66%" : "100%",
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>Step {step === "category" ? "1" : step === "details" ? "2" : "3"} of 3</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {step === "category" && renderCategoryStep()}
        {step === "details" && renderDetailsStep()}
        {step === "confirmation" && renderConfirmationStep()}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Reports are reviewed by our moderation team within 24 hours</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1D9BF0",
    borderRadius: 2,
  },
  progressText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepSubtitle: {
    color: "#666",
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  categoryButtonSelected: {
    borderColor: "#1D9BF0",
    backgroundColor: "#1A2332",
  },
  categoryLabel: {
    color: "white",
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  categoryLabelSelected: {
    color: "#1D9BF0",
    fontWeight: "500",
  },
  selectedCategoryDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2332",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedCategoryText: {
    color: "#1D9BF0",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  descriptionInput: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    minHeight: 120,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  characterCount: {
    color: "#666",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#1D9BF0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#666",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmationIcon: {
    alignItems: "center",
    marginBottom: 24,
  },
  confirmationTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmationMessage: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmationDetails: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
  },
  confirmationDetailText: {
    color: "white",
    fontSize: 14,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default ReportSystem;
