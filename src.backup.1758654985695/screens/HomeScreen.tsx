import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, RefreshControl, type GestureResponderEvent } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { Confession } from "../types/confession";
import { useConfessionStore } from "../state/confessionStore";
import { useReplyStore } from "../state/replyStore";
import { useSavedStore } from "../state/savedStore";
import { format } from "date-fns";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { checkConfessionStoreState } from "../utils/debugConfessions";
import { useOptimizedReplies } from "../hooks/useOptimizedReplies";
import { useScreenStatus } from "../hooks/useScreenStatus";
import { ErrorState } from "../components/ErrorState";
import { withErrorBoundary } from "../components/ErrorBoundary";
import OptimizedAdBanner from "../components/OptimizedAdBanner";
import { useScrollRestoration } from "../hooks/useScrollRestoration";
import type { ScrollView } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import ReportModal from "../components/ReportModal";
import FeedActionSheet from "../components/FeedActionSheet";
import ConfessionSkeleton from "../components/ConfessionSkeleton";
import HashtagText from "../components/HashtagText";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { getLikeButtonA11yProps, getBookmarkButtonA11yProps, getReportButtonA11yProps } from "../utils/accessibility";
import { useDebouncedLikeToggle } from "../utils/consolidatedUtils";

import Animated from "react-native-reanimated";
import { createScreenValidator } from "../utils/screenValidation";

function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const loadMoreConfessions = useConfessionStore((state) => state.loadMoreConfessions);
  const toggleLike = useConfessionStore((state) => state.toggleLike);
  const isLoading = useConfessionStore((state) => state.isLoading);
  const isLoadingMore = useConfessionStore((state) => state.isLoadingMore);

  // Initialize screen validator
  const validator = createScreenValidator("HomeScreen");

  // Debug: Log confessions count when it changes
  useEffect(() => {
    console.log("🏠 HomeScreen: Confessions count changed:", confessions.length);
  }, [confessions.length]);

  // Debounced like toggle
  const debouncedToggleLike = useDebouncedLikeToggle(toggleLike, 500);
  const hasMore = useConfessionStore((state) => state.hasMore);
  const { getRepliesForConfession } = useReplyStore();
  const { isSaved } = useSavedStore();
  const { loadRepliesForVisibleItems, clearLoadedReplies } = useOptimizedReplies();
  const { scrollViewRef } = useScrollRestoration({ key: "home-feed" });
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();
  const screenStatus = useScreenStatus({ screenName: "HomeScreen", loadingTimeout: 20000 });
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingConfessionId, setReportingConfessionId] = useState<string | null>(null);
  const [selectedConfessionText, setSelectedConfessionText] = useState<string>("");
  const [networkError, setNetworkError] = useState(false);
  const actionSheetRef = useRef<BottomSheetModal | null>(null);

  // FlashList ref for potential future scroll restoration
  const flashListRef = useRef<any | null>(null);

  // Initialize data loading on component mount
  useEffect(() => {
    const initializeScreen = async () => {
      validator.log("Screen mounted, initializing...");

      try {
        // Check network connectivity first
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          validator.warn("No network connection detected");
          setNetworkError(true);
          return;
        }
        setNetworkError(false);

        // Load initial confessions if none exist
        if (confessions.length === 0 && !isLoading) {
          validator.log("Loading initial confessions...");
          await loadConfessions();
        }
      } catch (error) {
        validator.error("Failed to initialize screen:", error);
        setNetworkError(true);
      }
    };

    initializeScreen();
  }, [confessions.length, isLoading, loadConfessions, validator]);

  const onRefresh = useCallback(async () => {
    console.log("🔄 HomeScreen: Pull to refresh started");
    setRefreshing(true);

    const result = await screenStatus.executeWithLoading(
      async () => {
        // Debug: Check store state before refresh
        if (__DEV__) {
          console.log("🔄 HomeScreen: Store state before refresh:");
          await checkConfessionStoreState();
        }

        // Check network connectivity first
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log("❌ HomeScreen: No network connection");
          setNetworkError(true);
          throw new Error("No network connection");
        }

        console.log("✅ HomeScreen: Network connected, proceeding with refresh");
        setNetworkError(false);

        // Call loadConfessions directly instead of debounced version for pull-to-refresh
        console.log("🔄 HomeScreen: Calling loadConfessions directly");
        await loadConfessions();

        // Clear loaded replies cache to force reload
        clearLoadedReplies();

        // Debug: Check store state after refresh
        if (__DEV__) {
          console.log("🔄 HomeScreen: Store state after refresh:");
          setTimeout(async () => {
            await checkConfessionStoreState();
          }, 1000);
        }

        return true;
      },
      {
        errorContext: "Refreshing home feed",
        onError: (error) => {
          console.error("[HomeScreen] Refresh failed:", error);
          setNetworkError(true);
        },
        onSuccess: () => {
          setNetworkError(false);
        },
      },
    );

    if (!result) {
      setNetworkError(true);
    }

    console.log("🔄 HomeScreen: Pull to refresh completed");
    setRefreshing(false);
  }, [loadConfessions, clearLoadedReplies, screenStatus]);

  // Note: Removed useAnimatedScrollHandler to fix FlashList "_c.call is not a function" error
  // FlashList has its own internal scroll handling that conflicts with Reanimated's scroll handler
  // Scroll restoration can be implemented differently if needed

  const onEndReached = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      try {
        await loadMoreConfessions();
      } catch (error) {
        if (__DEV__) {
          console.error("Error loading more:", error);
        }
      }
    }
  }, [isLoadingMore, hasMore, loadMoreConfessions]);

  const handleToggleLike = useCallback(
    async (confessionId: string) => {
      try {
        validator.log("Toggle like:", { confessionId });
        if (!confessionId) {
          validator.error("Invalid confession ID for like toggle");
          return;
        }
        await debouncedToggleLike(confessionId);
        impactAsync();
      } catch (error) {
        validator.error("Like toggle failed:", error);
      }
    },
    [debouncedToggleLike, impactAsync, validator],
  );

  const handleSecretPress = useCallback(
    (confession: Confession) => {
      try {
        validator.log("Secret press:", { id: confession.id, type: confession.type });
        impactAsync();

        // Validate confession data before navigation
        if (!confession || !confession.id) {
          validator.error("Invalid confession data for navigation");
          return;
        }

        if (confession.type === "video") {
          // Navigate to full-screen video player with validation
          validator.log("Navigating to VideoPlayer");
          (navigation as any).navigate("VideoPlayer", { confessionId: confession.id });
        } else {
          // Navigate to text confession detail with validation
          validator.log("Navigating to SecretDetail");
          (navigation as any).navigate("SecretDetail", { confessionId: confession.id });
        }
      } catch (error) {
        validator.error("Navigation failed:", error);
        // Fallback: Try navigation without validation
        if (confession.type === "video") {
          (navigation as any).navigate("VideoPlayer", { confessionId: confession.id });
        } else {
          (navigation as any).navigate("SecretDetail", { confessionId: confession.id });
        }
      }
    },
    [impactAsync, navigation, validator],
  );

  const handleReportPress = useCallback(
    (confessionId: string, event: GestureResponderEvent) => {
      event.stopPropagation(); // Prevent navigation to detail screen
      setReportingConfessionId(confessionId);
      setReportModalVisible(true);
      impactAsync();
    },
    [impactAsync],
  );

  const handleActionSheetPress = useCallback(
    (confessionId: string, confessionText: string, event: GestureResponderEvent) => {
      event.stopPropagation();
      setReportingConfessionId(confessionId);
      setSelectedConfessionText(confessionText);
      impactAsync();
      const ref = actionSheetRef.current;
      if (ref && typeof ref.present === "function") ref.present();
    },
    [impactAsync],
  );

  const handleReportModalClose = useCallback(() => {
    setReportModalVisible(false);
    setReportingConfessionId(null);
  }, []);

  const renderItem = useCallback(
    ({ item: confession, index }: { item: Confession; index: number }) => {
      const replies = getRepliesForConfession(confession.id);

      return (
        <>
          {/* Optimized Ad Banner */}
          <OptimizedAdBanner placement="home-feed" index={index} />

          {/* Confession Item */}
          <Pressable className="border-b border-gray-800 px-4 py-3" onPress={() => handleSecretPress(confession)}>
            {/* Header with avatar and info */}
            <View className="flex-row items-start mb-3">
              <View className="w-12 h-12 bg-gray-700 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#8B98A5" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-white font-bold text-15">Anonymous</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <Text className="text-gray-500 text-15">{format(new Date(confession.timestamp), "MMM d")}</Text>
                  <View className="w-1 h-1 bg-gray-500 rounded-full mx-2" />
                  <View className="flex-row items-center">
                    <Ionicons
                      name={confession.type === "video" ? "videocam" : "document-text"}
                      size={14}
                      color="#1D9BF0"
                    />
                    <Text className="text-blue-400 text-13 ml-1">{confession.type === "video" ? "Video" : "Text"}</Text>
                  </View>
                </View>

                {/* Content */}
                {confession.type === "text" ? (
                  <HashtagText text={confession.content} className="text-white text-15 leading-5 mb-3" />
                ) : (
                  <View>
                    {confession.transcription && (
                      <HashtagText text={confession.transcription} className="text-white text-15 leading-5 mb-3" />
                    )}
                    <View className="bg-gray-900 border border-gray-700 rounded-2xl p-3 mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="play-circle" size={24} color="#1D9BF0" />
                        <Text className="text-gray-300 ml-2 text-13">Video confession</Text>
                        <View className="ml-auto flex-row items-center">
                          <Ionicons name="eye-off" size={14} color="#8B98A5" />
                          <Text className="text-gray-500 text-11 ml-1">Face blurred</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Action buttons */}
                <View className="flex-row items-center justify-between pt-2">
                  <View className="flex-row items-center gap-6">
                    <Pressable
                      className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
                      onPress={() => handleToggleLike(confession.id)}
                      {...getLikeButtonA11yProps(Boolean(confession.isLiked), confession.likes || 0)}
                    >
                      <Ionicons
                        name={confession.isLiked ? "heart" : "heart-outline"}
                        size={18}
                        color={confession.isLiked ? "#EF4444" : "#8B98A5"}
                      />
                      <Text className={`text-13 ml-1 ${confession.isLiked ? "text-red-400" : "text-gray-500"}`}>
                        {confession.likes || 0}
                      </Text>
                    </Pressable>
                    <View className="flex-row items-center">
                      <Ionicons name="chatbubble-outline" size={18} color="#8B98A5" />
                      <Text className="text-gray-500 text-13 ml-1">{replies.length}</Text>
                    </View>
                    <Pressable
                      className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
                      onPress={(event) => handleReportPress(confession.id, event)}
                      {...getReportButtonA11yProps()}
                    >
                      <Ionicons name="flag-outline" size={16} color="#8B98A5" />
                    </Pressable>
                  </View>
                  <Pressable
                    className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
                    onPress={(event) => handleActionSheetPress(confession.id, confession.content, event)}
                    {...getBookmarkButtonA11yProps(isSaved(confession.id))}
                  >
                    <Ionicons
                      name={isSaved(confession.id) ? "bookmark" : "bookmark-outline"}
                      size={18}
                      color={isSaved(confession.id) ? "#F59E0B" : "#8B98A5"}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </>
      );
    },
    [getRepliesForConfession, handleSecretPress, handleToggleLike, handleReportPress, handleActionSheetPress, isSaved],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ConfessionSkeleton />
        <ConfessionSkeleton />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1">
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
          <ConfessionSkeleton />
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Ionicons name="lock-closed-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-20 font-bold mt-6 text-center">No secrets shared yet</Text>
        <Text className="text-gray-500 text-15 mt-2 text-center leading-5">
          Be the first to share an anonymous confession with the community
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1">
        <Animated.View className="flex-1">
          <FlashList
            ref={(ref) => {
              flashListRef.current = ref;
              scrollViewRef.current = ref as unknown as ScrollView;
            }}
            data={confessions}
            renderItem={renderItem}
            keyExtractor={(item: Confession) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              screenStatus.error ? (
                <ErrorState
                  message={screenStatus.error}
                  onRetry={() => {
                    screenStatus.clearError();
                    screenStatus.retry();
                  }}
                  type="network"
                />
              ) : (
                renderEmpty()
              )
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1D9BF0"]} tintColor="#1D9BF0" />
            }
            onViewableItemsChanged={({ viewableItems }) => {
              const visibleIds = viewableItems.map((item) => item.item.id);
              loadRepliesForVisibleItems(visibleIds);
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            extraData={{ refreshing, isLoadingMore, networkError }}
            // FlashList v2 performance props
          />
        </Animated.View>
      </View>

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={handleReportModalClose}
        confessionId={reportingConfessionId || undefined}
        contentType="confession"
      />

      {/* Feed Action Sheet */}
      {reportingConfessionId && (
        <FeedActionSheet
          confessionId={reportingConfessionId}
          confessionText={selectedConfessionText}
          bottomSheetModalRef={actionSheetRef}
        />
      )}
    </View>
  );
}

export default withErrorBoundary(HomeScreen);
