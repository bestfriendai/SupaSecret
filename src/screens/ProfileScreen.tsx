import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Share,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "../state/authStore";
import { useConfessionStore } from "../state/confessionStore";
import { useMembershipStore } from "../state/membershipStore";
import { useSubscriptionStore } from "../state/subscriptionStore";
import { cn } from "../utils/cn";
import type { RootStackParamList } from "../navigation/AppNavigator";

// Enhanced interface for stat items with better UX
interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  onPress?: () => void;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, onPress, color = "#FF6B35" }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flex: 1,
      alignItems: "center",
      padding: 20,
      backgroundColor: "#1F2937",
      borderRadius: 16,
      marginHorizontal: 6,
      borderWidth: 1,
      borderColor: "#374151",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}
    activeOpacity={0.7}
    accessibilityLabel={`${label}: ${value}`}
    accessibilityRole="button"
  >
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        backgroundColor: `${color}20`,
      }}
    >
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={{ fontSize: 24, fontWeight: "bold", color: "white", marginBottom: 4 }}>{value}</Text>
    <Text style={{ color: "#9CA3AF", fontSize: 12, textAlign: "center" }}>{label}</Text>
  </TouchableOpacity>
);

// Enhanced interface for action buttons
interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  variant?: "default" | "danger" | "premium";
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  subtitle,
  onPress,
  variant = "default",
  disabled = false,
}) => {
  const getColors = () => {
    if (disabled) return { bg: "bg-gray-900", icon: "#6B7280", text: "text-gray-500" };

    switch (variant) {
      case "danger":
        return { bg: "bg-red-900/20", icon: "#EF4444", text: "text-red-400" };
      case "premium":
        return { bg: "bg-gradient-to-r from-purple-900/30 to-pink-900/30", icon: "#FFD700", text: "text-yellow-400" };
      default:
        return { bg: "bg-gray-900", icon: "#FF6B35", text: "text-white" };
    }
  };

  const colors = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-between p-4 rounded-xl mx-4 mb-3 border border-gray-800",
        colors.bg,
        disabled && "opacity-50",
      )}
      activeOpacity={0.7}
      accessibilityLabel={`${label}${subtitle ? `: ${subtitle}` : ""}`}
      accessibilityRole="button"
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${colors.icon}20` }}
        >
          <Ionicons name={icon} size={20} color={colors.icon} />
        </View>
        <View className="flex-1">
          <Text className={cn("text-base font-medium", colors.text)}>{label}</Text>
          {subtitle && <Text className="text-gray-400 text-sm mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={disabled ? "#6B7280" : "#9CA3AF"} />
    </TouchableOpacity>
  );
};

const ProfileScreen = () => {
  console.log("[ProfileScreen] Component rendering/re-rendering");

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();

  // Track navigation events
  useEffect(() => {
    console.log("[ProfileScreen] Component mounted");
    console.log("[ProfileScreen] Current auth state on mount:", {
      hasUser: !!user,
      userId: user?.id,
    });

    const unsubscribe = navigation.addListener("focus", () => {
      console.log("[ProfileScreen] Screen focused");
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      console.log("[ProfileScreen] Screen blurred/navigating away");
    });

    return () => {
      console.log("[ProfileScreen] Component unmounting");
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation, user]);
  const { userConfessions, clearAllUserConfessions, loadUserConfessions } = useConfessionStore();
  const { currentTier, loadMembership } = useMembershipStore();
  const { isPremium, checkSubscriptionStatus } = useSubscriptionStore();

  // State management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Computed values - use destructured values
  const finalIsPremium = isPremium || currentTier === "plus";

  const userStats = useMemo(() => {
    const finalUserConfessions = userConfessions || [];
    // Get video analytics from store
    const { videoAnalytics } = useConfessionStore.getState();

    // Calculate total views from video analytics
    const totalViews = finalUserConfessions.reduce((acc, confession) => {
      const analytics = videoAnalytics[confession.id];
      if (analytics) {
        // Use watch_sessions as view count, fallback to interactions
        return acc + (analytics.watch_sessions || analytics.interactions || 0);
      }
      // For confessions without analytics, assume at least 1 view (the user's own view)
      return acc + 1;
    }, 0);

    return {
      confessions: finalUserConfessions.length,
      likes: finalUserConfessions.reduce((acc, confession) => acc + (confession.likes || 0), 0),
      views: totalViews,
      memberSince: user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear(),
    };
  }, [userConfessions, user]);

  // Handlers
  const onRefresh = useCallback(async () => {
    console.log("[ProfileScreen] onRefresh called - starting refresh");
    console.log("[ProfileScreen] Auth state before refresh:", {
      hasUser: !!user,
      userId: user?.id,
    });

    setIsRefreshing(true);
    setError(null);
    try {
      console.log("[ProfileScreen] Refreshing profile data without blocking auth check");
      await Promise.all([loadUserConfessions(), loadMembership(), checkSubscriptionStatus()]);
      console.log("[ProfileScreen] All refresh operations completed");
    } catch (err) {
      console.error("[ProfileScreen] Profile refresh error:", err);
      setError("Failed to refresh profile data. Please try again.");
    } finally {
      console.log("[ProfileScreen] onRefresh completed");
      setIsRefreshing(false);
    }
  }, [loadUserConfessions, loadMembership, checkSubscriptionStatus, user]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            await signOut();
          } catch (err) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
            console.error("Sign out error:", err);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  }, [signOut]);

  const handleClearConfessions = useCallback(() => {
    const confessionCount = userStats.confessions;
    if (confessionCount === 0) {
      Alert.alert("No Confessions", "You don't have any confessions to clear.");
      return;
    }

    Alert.alert(
      "Clear All Confessions",
      `This will permanently delete all ${confessionCount} of your confessions. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await clearAllUserConfessions();
              Alert.alert("Success", "All confessions have been deleted.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete confessions. Please try again.");
              console.error("Clear confessions error:", err);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [clearAllUserConfessions, userStats.confessions]);

  const handleShareApp = useCallback(async () => {
    try {
      const shareContent = {
        message:
          "Join me on Toxic Confessions - the anonymous confession app where you can share your deepest secrets safely! 🤫✨",
        url: "https://apps.apple.com/app/toxic-confessions/id123456789",
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        console.log("App shared successfully");
      }
    } catch (error) {
      console.error("Error sharing app:", error);
      Alert.alert("Error", "Failed to share the app. Please try again.");
    }
  }, []);

  const handleUpgradeToPremium = useCallback(() => {
    navigation.navigate("Paywall", {});
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const handleMySecretsPress = useCallback(() => {
    navigation.navigate("MySecrets");
  }, [navigation]);

  const handleSavedPress = useCallback(() => {
    navigation.navigate("Saved");
  }, [navigation]);

  // Initialize data on mount
  useEffect(() => {
    console.log("[ProfileScreen] Mount useEffect - calling onRefresh");
    onRefresh();
  }, [onRefresh]);

  return (
    <SafeAreaView className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Loading overlay */}
      {isLoading && (
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 items-center justify-center z-50">
          <View className="bg-gray-900 p-6 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="text-white mt-3 text-base">Processing...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800/50">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">Profile</Text>
            {finalIsPremium && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text className="text-yellow-400 ml-1 text-sm font-medium">Premium Member</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSettingsPress}
            className="p-2 -mr-2"
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
            colors={["#FF6B35"]}
            progressBackgroundColor="#1F2937"
          />
        }
      >
        {/* User Info Section - Improved Layout */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: "#FF6B35",
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="person" size={32} color="white" />
              {finalIsPremium && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    backgroundColor: "#FFD700",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#000",
                  }}
                >
                  <Ionicons name="star" size={12} color="black" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "white", marginBottom: 4 }} numberOfLines={1}>
                {user?.email || "Anonymous User"}
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Member since {userStats.memberSince}</Text>
              {finalIsPremium && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={{ color: "#FFD700", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
                    Premium Member
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Section - Improved Layout */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "white", marginBottom: 16, paddingHorizontal: 8 }}>
            Your Stats
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <StatItem
              icon="document-text"
              label="Confessions"
              value={userStats.confessions}
              onPress={handleMySecretsPress}
              color="#3B82F6"
            />
            <StatItem icon="heart" label="Likes" value={userStats.likes} color="#EF4444" />
            <StatItem icon="eye" label="Views" value={userStats.views} color="#10B981" />
          </View>
        </View>

        {/* Premium Upsell */}
        {!finalIsPremium && (
          <View className="px-4 mb-6">
            <View className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 rounded-2xl mx-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text className="text-white font-bold text-lg ml-2">Go Premium</Text>
                  </View>
                  <Text className="text-purple-100 text-sm leading-5">
                    Unlock unlimited confessions, advanced analytics, and exclusive features
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleUpgradeToPremium}
                  className="bg-white px-6 py-3 rounded-xl shadow-lg"
                  accessibilityLabel="Upgrade to premium"
                  accessibilityRole="button"
                >
                  <Text className="text-purple-600 font-bold text-sm">Upgrade</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-2 mb-6">
          <Text className="text-lg font-semibold text-white mb-4 px-2">Quick Actions</Text>

          <ActionButton
            icon="document-text"
            label="My Confessions"
            subtitle="View and manage your secrets"
            onPress={handleMySecretsPress}
          />

          <ActionButton
            icon="bookmark"
            label="Saved Confessions"
            subtitle="Your bookmarked secrets"
            onPress={handleSavedPress}
          />

          <ActionButton
            icon="share-social"
            label="Share App"
            subtitle="Tell your friends about us"
            onPress={handleShareApp}
          />

          {!finalIsPremium && (
            <ActionButton
              icon="diamond"
              label="Upgrade to Premium"
              subtitle="Unlock all features"
              onPress={handleUpgradeToPremium}
              variant="premium"
            />
          )}
        </View>

        {/* App Preferences */}
        <View className="px-2 mb-6">
          <Text className="text-lg font-semibold text-white mb-4 px-2">App Preferences</Text>
          <View className="bg-gray-900 rounded-2xl mx-2 border border-gray-800 overflow-hidden">
            {/* Settings content is already replaced above with inline Switch components */}
          </View>
        </View>

        {/* Account Management */}
        <View className="px-2 mb-8">
          <Text className="text-lg font-semibold text-white mb-4 px-2">Account</Text>

          <ActionButton
            icon="trash"
            label="Clear All Confessions"
            subtitle={
              userStats.confessions === 0
                ? "No confessions to clear"
                : `Delete all ${userStats.confessions} confessions`
            }
            onPress={handleClearConfessions}
            variant="danger"
            disabled={userStats.confessions === 0}
          />

          <ActionButton
            icon="log-out"
            label="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            variant="danger"
          />
        </View>

        {/* Footer spacing for safe area */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
