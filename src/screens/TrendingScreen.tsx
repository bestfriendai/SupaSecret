import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTrendingStore } from "../state/trendingStore";
import { getTimePeriodText, formatEngagementScore, HashtagData, TrendingSecret } from "../utils/trending";
import { format } from "date-fns";
import TrendingSkeleton from "../components/TrendingSkeleton";
import { getButtonA11yProps, getCloseButtonA11yProps } from "../utils/accessibility";
import { useDebouncedSearch } from "../utils/debounce";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";
import { getOptimizedTextInputProps, dismissKeyboard } from "../utils/keyboardUtils";

type TimePeriod = 24 | 168 | 720; // 24h, 1w, 1m
type ViewMode = "hashtags" | "secrets";

export default function TrendingScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("hashtags");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(24);

  const {
    trendingHashtags,
    trendingSecrets,
    searchResults,
    isLoading,
    isRefreshing,
    error,
    loadTrendingHashtags,
    loadTrendingSecrets,
    searchByHashtag,
    refreshAll,
    clearSearch,
    clearError,
  } = useTrendingStore();

  // Debounced search functionality
  const { searchQuery, isSearching, handleSearchChange, setSearchQuery } = useDebouncedSearch(
    async (query: string) => {
      if (query.trim()) {
        await searchByHashtag(query.trim());
      } else {
        clearSearch();
      }
    },
    300, // 300ms debounce delay
  );

  // Load initial data
  useEffect(() => {
    loadTrendingHashtags(timePeriod);
    loadTrendingSecrets(timePeriod);
  }, [timePeriod, loadTrendingHashtags, loadTrendingSecrets]);

  const handleRefresh = async () => {
    try {
      await refreshAll(timePeriod);
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearSearch();
  };

  const TimePeriodButton = ({ period, label }: { period: TimePeriod; label: string }) => (
    <Pressable
      className={`px-4 py-2 rounded-full ${timePeriod === period ? "bg-blue-500" : "bg-gray-800"}`}
      onPress={() => {
        setTimePeriod(period);
        // Clear error when changing time period
        if (error) clearError();
      }}
    >
      <Text className={`text-14 font-medium ${timePeriod === period ? "text-white" : "text-gray-400"}`}>{label}</Text>
    </Pressable>
  );

  const ViewModeButton = ({ mode, label }: { mode: ViewMode; label: string }) => (
    <Pressable
      className={`flex-1 py-3 ${viewMode === mode ? "border-b-2 border-blue-500" : ""}`}
      onPress={() => setViewMode(mode)}
    >
      <Text className={`text-center text-16 font-medium ${viewMode === mode ? "text-white" : "text-gray-400"}`}>
        {label}
      </Text>
    </Pressable>
  );

  const HashtagItem = ({ item }: { item: HashtagData }) => (
    <Pressable
      className="flex-row items-center justify-between py-3 px-4 bg-gray-900 rounded-xl mb-2"
      onPress={() => handleSearchChange(item.hashtag)}
    >
      <View className="flex-1">
        <Text className="text-white text-16 font-medium">{item.hashtag}</Text>
        <Text className="text-gray-400 text-13">
          {item.count} {item.count === 1 ? "mention" : "mentions"}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-blue-400 text-14 font-bold">{item.percentage.toFixed(1)}%</Text>
        <View className="w-16 h-2 bg-gray-700 rounded-full mt-1">
          <View
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${Math.min(item.percentage * 2, 100)}%` }}
          />
        </View>
      </View>
    </Pressable>
  );

  const SecretItem = ({ item }: { item: TrendingSecret }) => (
    <View className="bg-gray-900 rounded-xl p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-white text-15 leading-5" numberOfLines={3}>
            {item.confession.content}
          </Text>
        </View>
        <View className="ml-3 items-end">
          <Text className="text-blue-400 text-12 font-bold">Score: {formatEngagementScore(item.engagementScore)}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="heart" size={14} color="#EF4444" />
          <Text className="text-gray-400 text-12 ml-1">{item.confession.likes || 0}</Text>
          <Ionicons name="time" size={14} color="#8B98A5" className="ml-3" />
          <Text className="text-gray-400 text-12 ml-1">{format(item.confession.timestamp, "MMM d, h:mm a")}</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name={item.confession.type === "video" ? "videocam" : "document-text"} size={14} color="#8B98A5" />
          <Text className="text-gray-400 text-12 ml-1 capitalize">{item.confession.type}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenKeyboardWrapper className="flex-1 bg-black" scrollable={true} dismissOnTap={true}>
      {/* Search and Filters */}
      <View className="px-4 py-3 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={handleClearSearch}>
            <Ionicons name="search" size={24} color="#8B98A5" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-900 rounded-full px-4 py-2 mb-3">
          <Ionicons name="search" size={16} color="#8B98A5" />
          <TextInput
            {...getOptimizedTextInputProps("search")}
            className="flex-1 text-white text-15 ml-2"
            placeholder="Search hashtags..."
            placeholderTextColor="#8B98A5"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => dismissKeyboard()}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} {...getCloseButtonA11yProps()}>
              <Ionicons name="close-circle" size={16} color="#8B98A5" />
            </Pressable>
          )}
        </View>

        {/* Time Period Filters */}
        {!isSearching && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row space-x-2">
              <TimePeriodButton period={24} label="24h" />
              <TimePeriodButton period={168} label="7d" />
              <TimePeriodButton period={720} label="30d" />
            </View>
          </ScrollView>
        )}

        {/* View Mode Tabs */}
        {!isSearching && (
          <View className="flex-row border-b border-gray-800">
            <ViewModeButton mode="hashtags" label="Hashtags" />
            <ViewModeButton mode="secrets" label="Secrets" />
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View className="mx-4 mb-2 p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
          <View className="flex-row items-center">
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text className="text-red-400 text-14 ml-2 flex-1">{error}</Text>
            <Pressable
              onPress={clearError}
              {...getButtonA11yProps("Dismiss error", "Double tap to dismiss error message")}
            >
              <Ionicons name="close" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1D9BF0" />}
      >
        {isLoading && !isRefreshing && <TrendingSkeleton />}

        {!isLoading && isSearching ? (
          /* Search Results */
          <View className="py-4">
            <Text className="text-gray-400 text-14 mb-3">
              {searchResults.length} results for "{searchQuery}"
            </Text>
            {searchResults.map((confession) => (
              <SecretItem key={confession.id} item={{ confession, engagementScore: 0 }} />
            ))}
            {searchResults.length === 0 && (
              <View className="items-center py-8">
                <Ionicons name="search" size={48} color="#4B5563" />
                <Text className="text-gray-500 text-16 mt-2">No results found</Text>
              </View>
            )}
          </View>
        ) : !isLoading ? (
          /* Trending Content */
          <View className="py-4">
            <Text className="text-gray-400 text-14 mb-3">{getTimePeriodText(timePeriod)}</Text>

            {viewMode === "hashtags" ? (
              <View>
                {trendingHashtags.map((hashtag, index) => (
                  <HashtagItem key={`${hashtag.hashtag}-${index}`} item={hashtag} />
                ))}
                {trendingHashtags.length === 0 && (
                  <View className="items-center py-8">
                    <Ionicons name="trending-up" size={48} color="#4B5563" />
                    <Text className="text-gray-500 text-16 mt-2">No trending hashtags</Text>
                    <Text className="text-gray-600 text-13 mt-1 text-center">
                      Hashtags will appear when people use them in their secrets
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                {trendingSecrets.map((secret, index) => (
                  <SecretItem key={`${secret.confession.id}-${index}`} item={secret} />
                ))}
                {trendingSecrets.length === 0 && (
                  <View className="items-center py-8">
                    <Ionicons name="flame" size={48} color="#4B5563" />
                    <Text className="text-gray-500 text-16 mt-2">No trending secrets</Text>
                    <Text className="text-gray-600 text-13 mt-1 text-center">
                      Popular secrets will appear here based on engagement
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </ScreenKeyboardWrapper>
  );
}
