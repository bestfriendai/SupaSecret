import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useConfessionStore } from "../state/confessionStore";
import { useAuthStore } from "../state/authStore";
import { useNotificationStore } from "../state/notificationStore";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { format } from "date-fns";
import SettingsToggle from "../components/SettingsToggle";
import SettingsPicker from "../components/SettingsPicker";
import { pushNotificationManager } from "../utils/pushNotifications";
import { AlertModal, ConfirmModal } from "../components/AnimatedModal";
import { useDebounce } from "../utils/debounce";
import { getPrivacyPolicyUrl, getTermsOfServiceUrl, getHelpSupportUrl } from "../constants/urls";
import { runAllTests } from "../utils/testDatabase";

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { confessions, clearAllConfessions, userPreferences, updateUserPreferences, loadUserPreferences } =
    useConfessionStore();
  const { user, signOut } = useAuthStore();
  const { preferences: notificationPreferences, loadPreferences, updatePreferences } = useNotificationStore();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"confirm" | "success" | "signout">("confirm");

  useEffect(() => {
    loadUserPreferences();
    loadPreferences();
  }, [loadUserPreferences, loadPreferences]);

  const showMessage = (message: string, type: "confirm" | "success" | "signout") => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const handleClearAll = () => {
    showMessage(
      `Are you sure you want to delete all ${confessions.length} confessions? This action cannot be undone.`,
      "confirm",
    );
  };

  const confirmClearAll = () => {
    clearAllConfessions();
    setShowModal(false);
    setTimeout(() => {
      showMessage("All confessions have been cleared.", "success");
    }, 100);
  };

  const handleSignOut = () => {
    showMessage("Are you sure you want to sign out?", "signout");
  };

  const confirmSignOut = async () => {
    try {
      await signOut();
      setShowModal(false);
    } catch (error) {
      if (__DEV__) {
        console.error("Sign out error:", error);
      }
    }
  };

  const handleTestDatabase = async () => {
    console.log("🧪 Starting database tests...");
    showMessage("Running database tests... Check console for results.", "success");
    try {
      await runAllTests();
    } catch (error) {
      console.error("❌ Database test failed:", error);
    }
  };

  // Debounced preference update handlers
  const debouncedPreferenceUpdate = useDebounce(
    async (key: keyof typeof userPreferences, value: any) => {
      try {
        await updateUserPreferences({ [key]: value });
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to update preference:", error);
        }
      }
    },
    500, // 500ms debounce delay
    [updateUserPreferences]
  );

  const debouncedNotificationPreferenceUpdate = useDebounce(
    async (key: string, value: any) => {
      try {
        await updatePreferences({ [key]: value });

        // Handle push notification registration/removal
        if (key === "push_enabled") {
          if (value) {
            await pushNotificationManager.registerForPushNotifications();
          } else {
            await pushNotificationManager.removePushToken();
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to update notification preference:", error);
        }
      }
    },
    500, // 500ms debounce delay
    [updatePreferences]
  );

  const handlePreferenceUpdate = (key: keyof typeof userPreferences, value: any) => {
    // Update UI immediately for better UX
    updateUserPreferences({ [key]: value });
    // Debounce the actual save to backend
    debouncedPreferenceUpdate(key, value);
  };

  const handleNotificationPreferenceUpdate = (key: string, value: any) => {
    // Update UI immediately for better UX
    updatePreferences({ [key]: value });
    // Debounce the actual save to backend
    debouncedNotificationPreferenceUpdate(key, value);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Account Section */}
        {user && (
          <View className="border-b border-gray-800">
            <View className="px-4 py-4">
              <Text className="text-white text-17 font-bold mb-4">Account</Text>
              <View className="space-y-4">
                <View className="flex-row items-center py-2">
                  <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-15 font-medium">{user.username || "Anonymous User"}</Text>
                    <Text className="text-gray-500 text-13">{user.email}</Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-white text-15">Member Since</Text>
                  <Text className="text-gray-400 text-13">{format(new Date(user.createdAt), "MMM d, yyyy")}</Text>
                </View>
                <Pressable
                  className="flex-row items-center justify-between py-2 touch-target px-2 -mx-2 rounded-lg"
                  onPress={handleSignOut}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out of account"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text className="text-red-500 text-15 font-medium ml-3">Sign Out</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">Content</Text>
            <Pressable
              className="flex-row items-center justify-between py-3"
              onPress={() => navigation.navigate("Saved")}
            >
              <View className="flex-row items-center">
                <Ionicons name="bookmark" size={20} color="#F59E0B" />
                <Text className="text-white text-15 font-medium ml-3">Saved Secrets</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
            </Pressable>
          </View>
        </View>

        {/* Preferences Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">Preferences</Text>
            <View className="space-y-1">
              <SettingsToggle
                title="Autoplay Videos"
                description="Automatically play videos when scrolling"
                value={userPreferences.autoplay}
                onValueChange={(value) => handlePreferenceUpdate("autoplay", value)}
                icon="play-circle"
              />
              <SettingsToggle
                title="Sound Enabled"
                description="Play audio for videos and interactions"
                value={userPreferences.soundEnabled}
                onValueChange={(value) => handlePreferenceUpdate("soundEnabled", value)}
                icon="volume-high"
              />
              <SettingsToggle
                title="Captions by Default"
                description="Show captions on videos when available"
                value={userPreferences.captionsDefault}
                onValueChange={(value) => handlePreferenceUpdate("captionsDefault", value)}
                icon="text"
              />
              <SettingsToggle
                title="Haptic Feedback"
                description="Vibrate on interactions and gestures"
                value={userPreferences.hapticsEnabled}
                onValueChange={(value) => handlePreferenceUpdate("hapticsEnabled", value)}
                icon="phone-portrait"
              />
              <SettingsToggle
                title="Reduce Motion"
                description="Minimize animations and transitions"
                value={userPreferences.reducedMotion}
                onValueChange={(value) => handlePreferenceUpdate("reducedMotion", value)}
                icon="speedometer"
              />
              <SettingsPicker
                title="Video Quality"
                description="Choose video playback quality"
                value={userPreferences.qualityPreference}
                onValueChange={(value) => handlePreferenceUpdate("qualityPreference", value)}
                icon="videocam"
                options={[
                  { value: "auto", label: "Auto", description: "Adjust quality based on connection" },
                  { value: "high", label: "High", description: "Best quality, uses more data" },
                  { value: "medium", label: "Medium", description: "Balanced quality and data usage" },
                  { value: "low", label: "Low", description: "Lower quality, saves data" },
                ]}
              />
              <SettingsPicker
                title="Data Usage"
                description="Control when to use mobile data"
                value={userPreferences.dataUsageMode}
                onValueChange={(value) => handlePreferenceUpdate("dataUsageMode", value)}
                icon="cellular"
                options={[
                  { value: "unlimited", label: "Unlimited", description: "Use data freely" },
                  { value: "wifi-only", label: "Wi-Fi Only", description: "Only load content on Wi-Fi" },
                  { value: "minimal", label: "Data Saver", description: "Reduce data usage" },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Notification Preferences Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">Notifications</Text>
            <View className="space-y-1">
              <SettingsToggle
                title="Like Notifications"
                description="Get notified when someone likes your secrets"
                value={notificationPreferences?.likes_enabled ?? true}
                onValueChange={(value) => handleNotificationPreferenceUpdate("likes_enabled", value)}
                icon="heart"
              />
              <SettingsToggle
                title="Reply Notifications"
                description="Get notified when someone replies to your secrets"
                value={notificationPreferences?.replies_enabled ?? true}
                onValueChange={(value) => handleNotificationPreferenceUpdate("replies_enabled", value)}
                icon="chatbubble"
              />
              <SettingsToggle
                title="Push Notifications"
                description="Receive push notifications on your device"
                value={notificationPreferences?.push_enabled ?? false}
                onValueChange={(value) => handleNotificationPreferenceUpdate("push_enabled", value)}
                icon="notifications"
              />
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">Statistics</Text>
            <View className="space-y-3">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Total Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">{confessions.length}</Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Text Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">
                  {confessions.filter((c) => c.type === "text").length}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-white text-15">Video Confessions</Text>
                <Text className="text-blue-400 font-bold text-15">
                  {confessions.filter((c) => c.type === "video").length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Privacy Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">Privacy & Security</Text>
            <View className="space-y-4">
              <View className="flex-row items-center py-2">
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Anonymous Confessions</Text>
                  <Text className="text-gray-500 text-13">All posts are completely anonymous</Text>
                </View>
              </View>
              <View className="flex-row items-center py-2">
                <Ionicons name="eye-off" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Face Blur Protection</Text>
                  <Text className="text-gray-500 text-13">Video faces are automatically blurred</Text>
                </View>
              </View>
              <View className="flex-row items-center py-2">
                <Ionicons name="volume-off" size={20} color="#10B981" />
                <View className="ml-3 flex-1">
                  <Text className="text-white text-15 font-medium">Voice Change</Text>
                  <Text className="text-gray-500 text-13">Video voices are automatically changed</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="border-b border-gray-800">
          <View className="px-4 py-4">
            <Text className="text-white text-17 font-bold mb-4">About</Text>
            <View className="space-y-4">
              <Pressable
                className="flex-row items-center justify-between py-2 touch-target px-2 -mx-2 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="View privacy policy"
                onPress={() => navigation.navigate("WebView", {
                  url: getPrivacyPolicyUrl(),
                  title: "Privacy Policy"
                })}
              >
                <Text className="text-white text-15">Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
              <Pressable
                className="flex-row items-center justify-between py-2 touch-target px-2 -mx-2 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="View terms of service"
                onPress={() => navigation.navigate("WebView", {
                  url: getTermsOfServiceUrl(),
                  title: "Terms of Service"
                })}
              >
                <Text className="text-white text-15">Terms of Service</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
              <Pressable
                className="flex-row items-center justify-between py-2 touch-target px-2 -mx-2 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="Get help and support"
                onPress={() => navigation.navigate("WebView", {
                  url: getHelpSupportUrl(),
                  title: "Help & Support"
                })}
              >
                <Text className="text-white text-15">Help & Support</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-4 py-6">
          <Text className="text-red-500 text-17 font-bold mb-4">Danger Zone</Text>
          <View className="bg-gray-900 border border-red-900 rounded-2xl p-4">
            <Text className="text-white text-15 font-medium mb-2">Clear All Confessions</Text>
            <Text className="text-gray-500 text-13 mb-4 leading-4">
              This will permanently delete all {confessions.length} confessions from your device. This action cannot be
              undone.
            </Text>
            <Pressable
              className="bg-red-600 rounded-full py-3 px-4 flex-row items-center justify-center"
              onPress={handleClearAll}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-15 ml-2">Clear All Confessions</Text>
            </Pressable>
          </View>

          {/* Test Database Button (Development Only) */}
          {__DEV__ && (
            <View className="bg-gray-900 border border-blue-900 rounded-2xl p-4 mt-4">
              <Text className="text-white text-15 font-medium mb-2">Test Database Connection</Text>
              <Text className="text-gray-500 text-13 mb-4 leading-4">
                Run comprehensive tests to verify Supabase backend connectivity and functionality.
              </Text>
              <Pressable
                className="bg-blue-600 rounded-full py-3 px-4 flex-row items-center justify-center"
                onPress={handleTestDatabase}
              >
                <Ionicons name="flask" size={16} color="#FFFFFF" />
                <Text className="text-white font-bold text-15 ml-2">Run Database Tests</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Animated Modals */}
      {modalType === "confirm" && (
        <ConfirmModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title="Clear All Confessions"
          message={modalMessage}
          confirmText="Clear All"
          cancelText="Cancel"
          onConfirm={confirmClearAll}
          destructive={true}
        />
      )}

      {modalType === "signout" && (
        <ConfirmModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title="Sign Out"
          message={modalMessage}
          confirmText="Sign Out"
          cancelText="Cancel"
          onConfirm={confirmSignOut}
          destructive={true}
        />
      )}

      {modalType !== "confirm" && modalType !== "signout" && (
        <AlertModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title={modalType === "success" ? "Success!" : "Notice"}
          message={modalMessage}
          confirmText="OK"
        />
      )}
    </View>
  );
}
