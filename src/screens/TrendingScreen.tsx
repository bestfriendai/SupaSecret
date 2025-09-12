import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, FlatList, Pressable, TextInput, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTrendingStore } from "../state/trendingStore";
import { getTimePeriodText } from "../utils/trending";
import TrendingSkeleton from "../components/TrendingSkeleton";
import { getButtonA11yProps, getCloseButtonA11yProps } from "../utils/accessibility";
import { useDebouncedSearch } from "../utils/debounce";
import { ScreenKeyboardWrapper } from "../components/KeyboardAvoidingWrapper";
import { getOptimizedTextInputProps, dismissKeyboard } from "../utils/keyboardUtils";
import { TimePeriodButton } from "../components/TimePeriodButton";
import { ViewModeButton } from "../components/ViewModeButton";
import { HashtagItem } from "../components/HashtagItem";
import { SecretItem } from "../components/SecretItem";
import { logger } from "../utils/logger";
import { TIME_PERIOD_24H, TIME_PERIOD_7D, TIME_PERIOD_30D } from "../components/trendingConstants";

type TimePeriod = 24 | 168 | 720; // 24h, 1w, 1m
type ViewMode = "hashtags" | "secrets";

export default function TrendingScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("hashtags");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(TIME_PERIOD_24H);
  const [errorState, setErrorState] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);

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

  /**
   * Debounced search functionality for hashtag search input
   * - Prevents excessive API calls while user is typing
   * - 300ms delay allows for natural typing pause before triggering search
   * - Automatically clears search when input is empty
   */
  const { searchQuery, isSearching, handleSearchChange, setSearchQuery } = useDebouncedSearch(
    async (query: string) => {
      try {
        if (query.trim()) {
          await searchByHashtag(query.trim());
        } else {
          clearSearch();
        }
      } catch (err) {
        logger.error("Debounced search failed:", err);
        setErrorState("Search failed. Please try again.");
      }
    },
    300, // 300ms debounce delay
  );

  /**
   * Immediate search for hashtag taps (non-debounced)
   * - Used when user taps on a hashtag to search immediately
   * - No debouncing needed since this is triggered by explicit user action
   * - Shows user-visible error feedback if search fails
   */
  const immediateSearch = useCallback(
    async (hashtag: string) => {
      try {
        if (hashtag.trim()) {
          await searchByHashtag(hashtag.trim());
        }
      } catch (err) {
        logger.error("Immediate search failed:", err);
        setErrorState("Failed to search hashtag. Please try again.");
      }
    },
    [searchByHashtag],
  );

  /**
   * Load initial trending data when component mounts or time period changes
   * - Dependencies: timePeriod ensures data refreshes when user changes time filter
   * - loadTrendingHashtags and loadTrendingSecrets are stable functions from store
   */
  useEffect(() => {
    loadTrendingHashtags(timePeriod);
    loadTrendingSecrets(timePeriod);
  }, [timePeriod, loadTrendingHashtags, loadTrendingSecrets]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAll(timePeriod);
    } catch (error) {
      logger.error("Failed to refresh:", error);
      setErrorState("Failed to refresh content. Please try again.");
    }
  }, [refreshAll, timePeriod]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    clearSearch();
    setErrorState(null); // Clear any search-related errors
  }, [setSearchQuery, clearSearch]);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleTimePeriodChange = useCallback((period: TimePeriod) => {
    setTimePeriod(period);
    if (error) clearError();
    setErrorState(null); // Clear any period-related errors
  }, [error, clearError]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setErrorState(null); // Clear any view-related errors
  }, []);

  const handleErrorDismiss = useCallback(() => {
    clearError();
    setErrorState(null);
  }, [clearError]);

  const TIME_PERIODS = [
    { period: TIME_PERIOD_24H, label: "24h" },
    { period: TIME_PERIOD_7D, label: "7d" },
    { period: TIME_PERIOD_30D, label: "30d" },
  ];

  const refreshControlElement = (
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1D9BF0" />
  );

  // Inline components moved to separate files for modularity and memoization.

  return (
    <ScreenKeyboardWrapper className="flex-1 bg-black" scrollable={true} dismissOnTap={true}>
      {/* Search and Filters */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#0F1724",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Pressable onPress={focusSearchInput} accessibilityLabel="Focus search" accessibilityRole="button">
            <Ionicons name="search" size={24} color="#8B98A5" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#0F1724",
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginBottom: 12,
          }}
        >
          <Ionicons name="search" size={16} color="#8B98A5" />
          <TextInput
            ref={(ref) => {
              searchInputRef.current = ref;
            }}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="search"
            blurOnSubmit={true}
            enablesReturnKeyAutomatically={true}
            keyboardAppearance="dark"
            selectionColor="#1D9BF0"
            underlineColorAndroid="transparent"
            style={{ flex: 1, color: "#fff", fontSize: 15, marginLeft: 8 }}
            placeholder="Search hashtags..."
            placeholderTextColor="#8B98A5"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => dismissKeyboard()}
            accessibilityLabel="Search hashtags"
            accessibilityHint="Type to search hashtags"
            accessibilityRole="searchbox"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} {...getCloseButtonA11yProps()}>
              <Ionicons name="close-circle" size={16} color="#8B98A5" />
            </Pressable>
          )}
        </View>

        {/* Time Period Filters */}
        {!isSearching && (
          <FlatList
            horizontal
            data={TIME_PERIODS}
            keyExtractor={(it) => `${it.period}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TimePeriodButton
                period={item.period as number}
                label={item.label}
                active={timePeriod === item.period}
                onPress={(p) => handleTimePeriodChange(p as TimePeriod)}
                onClearError={() => {}}
              />
            )}
            style={{ marginBottom: 12 }}
          />
        )}

        {/* View Mode Tabs */}
        {!isSearching && (
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0F1724" }}>
            <ViewModeButton
              mode="hashtags"
              label="Hashtags"
              active={viewMode === "hashtags"}
              onPress={handleViewModeChange}
              index={0}
              total={2}
            />
            <ViewModeButton
              mode="secrets"
              label="Secrets"
              active={viewMode === "secrets"}
              onPress={handleViewModeChange}
              index={1}
              total={2}
            />
          </View>
        )}
      </View>

      {/* Error Messages */}
      {(error || errorState) && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            padding: 12,
            backgroundColor: "rgba(139, 18, 18, 0.08)",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
          }}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${error || errorState}`}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={{ color: "#FCA5A5", fontSize: 14, marginLeft: 8, flex: 1 }}>
              {error || errorState}
            </Text>
            <Pressable
              onPress={handleErrorDismiss}
              {...getButtonA11yProps("Dismiss error", "Double tap to dismiss error message")}
            >
              <Ionicons name="close" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading && !isRefreshing && <TrendingSkeleton />}

      {!isLoading && isSearching ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#9CA3AF", marginBottom: 12 }}>
            {searchResults.length} results for "{searchQuery}"
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SecretItem item={{ confession: item, engagementScore: 0 }} />}
            ListEmptyComponent={() => (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Ionicons name="search" size={48} color="#4B5563" />
                <Text style={{ color: "#6B7280", fontSize: 16, marginTop: 8 }}>No results found</Text>
              </View>
            )}
            refreshControl={refreshControlElement}
          />
        </View>
      ) : !isLoading ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#9CA3AF", marginBottom: 12 }}>{getTimePeriodText(timePeriod)}</Text>

          {viewMode === "hashtags" ? (
            <FlatList
              data={trendingHashtags}
              keyExtractor={(item) => item.hashtag}
              renderItem={({ item }) => <HashtagItem item={item} onPress={immediateSearch} />}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Ionicons name="trending-up" size={48} color="#4B5563" />
                  <Text style={{ color: "#6B7280", fontSize: 16, marginTop: 8 }}>No trending hashtags</Text>
                  <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                    Hashtags will appear when people use them in their secrets
                  </Text>
                </View>
              )}
              refreshControl={refreshControlElement}
            />
          ) : (
            <FlatList
              data={trendingSecrets}
              keyExtractor={(item) => item.confession.id}
              renderItem={({ item }) => <SecretItem item={item} />}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Ionicons name="flame" size={48} color="#4B5563" />
                  <Text style={{ color: "#6B7280", fontSize: 16, marginTop: 8 }}>No trending secrets</Text>
                  <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                    Popular secrets will appear here based on engagement
                  </Text>
                </View>
              )}
              refreshControl={refreshControlElement}
            />
          )}
        </View>
      ) : null}
    </ScreenKeyboardWrapper>
  );
}
