import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, Dimensions, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../state/authStore";
import { useConfessionStore } from "../state/confessionStore";
import { useMembershipStore } from "../state/membershipStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProfileStats {
  confessions: number;
  likes: number;
  views: number;
  followers: number;
  following: number;
}

interface EnhancedProfileScreenProps {
  userId?: string; // If provided, shows another user's profile
}

export const EnhancedProfileScreen: React.FC<EnhancedProfileScreenProps> = ({ userId }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuthStore();
  const { userConfessions, loadUserConfessions } = useConfessionStore();
  const { membershipTier } = useMembershipStore();
  const { hapticsEnabled, impactAsync } = usePreferenceAwareHaptics();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    confessions: 0,
    likes: 0,
    views: 0,
    followers: 0,
    following: 0,
  });
  const [activeTab, setActiveTab] = useState<"confessions" | "liked" | "saved">("confessions");
  const [profileData, setProfileData] = useState<any>(null);

  // Add isMounted flag to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Set isMounted to false on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = profileData || user;

  // Load profile data
  const loadProfileData = useCallback(async () => {
    if (!displayUser?.id) return;

    try {
      // Load user profile
      if (!isOwnProfile) {
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", userId).single();

        // Check if component is still mounted before updating state
        if (isMountedRef.current) {
          setProfileData(profile);
        }
      }

      // Load user stats
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const { data: confessions } = await supabase
        .from("confessions")
        .select("id, likes, views")
        .eq("user_id", targetUserId);

      const totalLikes = confessions?.reduce((sum, c) => sum + (c.likes || 0), 0) || 0;
      const totalViews = confessions?.reduce((sum, c) => sum + (c.views || 0), 0) || 0;

      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setStats({
          confessions: confessions?.length || 0,
          likes: totalLikes,
          views: totalViews,
          followers: 0, // Placeholder - would need followers table
          following: 0, // Placeholder - would need following table
        });
      }

      // Load user confessions
      if (isOwnProfile && isMountedRef.current) {
        await loadUserConfessions();
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  }, [userId, user?.id, isOwnProfile, loadUserConfessions]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfileData();
    setIsRefreshing(false);
  }, [loadProfileData]);

  const handleTabChange = useCallback(
    async (tab: typeof activeTab) => {
      setActiveTab(tab);
      if (hapticsEnabled) {
        await impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticsEnabled, impactAsync],
  );

  const handleEditProfile = useCallback(() => {
    // Navigate to edit profile screen
    navigation.navigate("EditProfile");
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          if (hapticsEnabled) {
            await impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          await signOut();
        },
      },
    ]);
  }, [signOut, hapticsEnabled, impactAsync]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMembershipBadge = () => {
    switch (membershipTier) {
      case "plus":
        return { icon: "diamond", color: "#FFD700", label: "Plus" };
      case "free":
      default:
        return null;
    }
  };

  const membershipBadge = getMembershipBadge();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{displayUser?.username || "Anonymous"}</Text>
            <Text style={styles.headerSubtitle}>{stats.confessions} secrets</Text>
          </View>

          {isOwnProfile && (
            <Pressable onPress={handleSettings} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color="white" />
            </Pressable>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
            {membershipBadge && (
              <View style={[styles.membershipBadge, { backgroundColor: membershipBadge.color }]}>
                <Ionicons name={membershipBadge.icon as any} size={16} color="white" />
              </View>
            )}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>
              {displayUser?.display_name || displayUser?.username || "Anonymous User"}
            </Text>
            {membershipBadge && (
              <Text style={[styles.membershipLabel, { color: membershipBadge.color }]}>
                {membershipBadge.label} Member
              </Text>
            )}
            <Text style={styles.bio}>{displayUser?.bio || "Sharing secrets anonymously 🤫"}</Text>
            <Text style={styles.joinDate}>
              Joined{" "}
              {new Date(displayUser?.created_at || Date.now()).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <Pressable style={styles.editButton} onPress={handleEditProfile}>
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </Pressable>
                <Pressable style={styles.signOutButton} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.followButton}>
                  <Text style={styles.followButtonText}>Follow</Text>
                </Pressable>
                <Pressable style={styles.messageButton}>
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Pressable style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.confessions)}</Text>
            <Text style={styles.statLabel}>Secrets</Text>
          </Pressable>

          <Pressable style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.likes)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </Pressable>

          <Pressable style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.views)}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </Pressable>

          <Pressable style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(stats.followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === "confessions" && styles.activeTab]}
            onPress={() => handleTabChange("confessions")}
          >
            <Ionicons name="document-text" size={20} color={activeTab === "confessions" ? "#1D9BF0" : "#666"} />
            <Text style={[styles.tabText, activeTab === "confessions" && styles.activeTabText]}>Secrets</Text>
          </Pressable>

          {isOwnProfile && (
            <>
              <Pressable
                style={[styles.tab, activeTab === "liked" && styles.activeTab]}
                onPress={() => handleTabChange("liked")}
              >
                <Ionicons name="heart" size={20} color={activeTab === "liked" ? "#1D9BF0" : "#666"} />
                <Text style={[styles.tabText, activeTab === "liked" && styles.activeTabText]}>Liked</Text>
              </Pressable>

              <Pressable
                style={[styles.tab, activeTab === "saved" && styles.activeTab]}
                onPress={() => handleTabChange("saved")}
              >
                <Ionicons name="bookmark" size={20} color={activeTab === "saved" ? "#1D9BF0" : "#666"} />
                <Text style={[styles.tabText, activeTab === "saved" && styles.activeTabText]}>Saved</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {activeTab === "confessions" && (
            <View style={styles.confessionsGrid}>
              {userConfessions.length > 0 ? (
                userConfessions.map((confession) => (
                  <View key={confession.id} style={styles.confessionCard}>
                    <Text style={styles.confessionText} numberOfLines={3}>
                      {confession.content}
                    </Text>
                    <View style={styles.confessionStats}>
                      <View style={styles.confessionStat}>
                        <Ionicons name="heart" size={12} color="#EF4444" />
                        <Text style={styles.confessionStatText}>{confession.likes || 0}</Text>
                      </View>
                      <View style={styles.confessionStat}>
                        <Ionicons name="eye" size={12} color="#666" />
                        <Text style={styles.confessionStatText}>{confession.views || 0}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#666" />
                  <Text style={styles.emptyStateText}>No secrets yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {isOwnProfile ? "Share your first secret" : "This user hasn't shared any secrets"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "liked" && isOwnProfile && (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No liked secrets</Text>
              <Text style={styles.emptyStateSubtext}>Secrets you like will appear here</Text>
            </View>
          )}

          {activeTab === "saved" && isOwnProfile && (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No saved secrets</Text>
              <Text style={styles.emptyStateSubtext}>Secrets you save will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  profileSection: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1D9BF0",
  },
  membershipBadge: {
    position: "absolute",
    bottom: 0,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "black",
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  displayName: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  membershipLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  bio: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  joinDate: {
    color: "#666",
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  followButton: {
    flex: 1,
    backgroundColor: "#1D9BF0",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  followButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  messageButton: {
    backgroundColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    color: "#666",
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#1D9BF0",
  },
  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#1D9BF0",
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  confessionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  confessionCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  confessionText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  confessionStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  confessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  confessionStatText: {
    color: "#666",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});

export default EnhancedProfileScreen;
