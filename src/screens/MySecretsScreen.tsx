import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { format } from "date-fns";
import SegmentedTabs, { TabItem } from "../components/SegmentedTabs";
import HashtagText from "../components/HashtagText";
import type { Confession } from "../types/confession";
import { useDebouncedValue } from "../utils/debounce";

type FilterType = "all" | "text" | "video";

export default function MySecretsScreen() {
  const insets = useSafeAreaInsets();
  const { impactAsync } = usePreferenceAwareHaptics();

  const { userConfessions, loadUserConfessions, deleteUserConfession, clearAllUserConfessions, isLoading, error } =
    useConfessionStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Debounce search query to improve performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    loadUserConfessions();
  }, [loadUserConfessions]);

  // Filter and search confessions
  const filteredConfessions = useMemo(() => {
    let filtered = userConfessions;

    // Apply type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === activeFilter);
    }

    // Apply search filter with debounced query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.content?.toLowerCase().includes(query) ||
          (c.transcription && c.transcription.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [userConfessions, activeFilter, debouncedSearchQuery]);

  const filterTabs: TabItem[] = [
    { id: "all", label: "All" },
    { id: "text", label: "Text", icon: "document-text" },
    { id: "video", label: "Video", icon: "videocam" },
  ];

  const handleDeleteSingle = useCallback(
    async (id: string) => {
      Alert.alert("Delete Secret", "Are you sure you want to delete this secret? This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserConfession(id);
              impactAsync();
            } catch (error) {
              Alert.alert("Error", "Failed to delete secret");
            }
          },
        },
      ]);
    },
    [deleteUserConfession, impactAsync],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.size === 0) return;

    Alert.alert(
      "Delete Selected",
      `Are you sure you want to delete ${selectedItems.size} secret(s)? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(Array.from(selectedItems).map((id) => deleteUserConfession(id)));
              setSelectedItems(new Set());
              setIsSelectionMode(false);
              impactAsync();
            } catch (error) {
              Alert.alert("Error", "Failed to delete some secrets");
            }
          },
        },
      ],
    );
  }, [selectedItems, deleteUserConfession, impactAsync]);

  const handleDeleteAll = useCallback(async () => {
    if (userConfessions.length === 0) return;

    Alert.alert(
      "Delete All Secrets",
      "Are you sure you want to delete ALL your secrets? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllUserConfessions();
              impactAsync();
            } catch (error) {
              Alert.alert("Error", "Failed to delete all secrets");
            }
          },
        },
      ],
    );
  }, [userConfessions.length, clearAllUserConfessions, impactAsync]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Confession }) => {
      const isSelected = selectedItems.has(item.id);

      return (
        <Pressable
          style={{
            backgroundColor: isSelected ? "rgba(59, 130, 246, 0.1)" : "rgba(17, 24, 39, 0.8)",
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 12,
            borderWidth: isSelected ? 1 : 0,
            borderColor: isSelected ? "#3B82F6" : "transparent",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
          onPress={() => {
            if (isSelectionMode) {
              toggleSelection(item.id);
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              setIsSelectionMode(true);
              toggleSelection(item.id);
            }
            impactAsync();
          }}
        >
          {/* Header with type indicator and timestamp */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center">
              <View
                style={{
                  backgroundColor: item.type === "video" ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                  borderRadius: 8,
                  padding: 6,
                  marginRight: 8,
                }}
              >
                <Ionicons
                  name={item.type === "video" ? "videocam" : "document-text"}
                  size={14}
                  color={item.type === "video" ? "#EF4444" : "#3B82F6"}
                />
              </View>
              <Text className="text-gray-400 text-12">{format(new Date(item.timestamp), "MMM d, h:mm a")}</Text>
            </View>

            {isSelectionMode && (
              <View
                style={{
                  backgroundColor: isSelected ? "#3B82F6" : "rgba(139, 152, 165, 0.2)",
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isSelected ? "checkmark" : "ellipse-outline"}
                  size={16}
                  color={isSelected ? "#FFFFFF" : "#8B98A5"}
                />
              </View>
            )}
          </View>

          {/* Content */}
          <HashtagText text={item.content} className="text-white text-15 leading-6 mb-4" />

          {/* Footer with stats and actions */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center space-x-4">
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    borderRadius: 6,
                    padding: 4,
                    marginRight: 6,
                  }}
                >
                  <Ionicons name="heart" size={12} color="#EF4444" />
                </View>
                <Text className="text-gray-400 text-12">{String(item.likes || 0)}</Text>
              </View>
            </View>

            {!isSelectionMode && (
              <Pressable
                onPress={() => handleDeleteSingle(item.id)}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </Pressable>
            )}
          </View>
        </Pressable>
      );
    },
    [selectedItems, isSelectionMode, toggleSelection, handleDeleteSingle, impactAsync],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-white text-16">Loading your secrets...</Text>
        </View>
      );
    }

    const hasNoSecrets = userConfessions.length === 0;
    const hasNoFilteredResults = filteredConfessions.length === 0 && userConfessions.length > 0;

    if (hasNoSecrets) {
      return (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="document-text-outline" size={64} color="#8B98A5" />
          <Text className="text-white text-18 font-bold mt-4 text-center">No secrets yet</Text>
          <Text className="text-gray-500 text-14 mt-2 text-center">Your anonymous confessions will appear here</Text>
        </View>
      );
    }

    if (hasNoFilteredResults) {
      return (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="search-outline" size={64} color="#8B98A5" />
          <Text className="text-white text-18 font-bold mt-4 text-center">No results found</Text>
          <Text className="text-gray-500 text-14 mt-2 text-center">Try adjusting your search or filter</Text>
        </View>
      );
    }

    return null;
  }, [isLoading, userConfessions.length, filteredConfessions.length]);

  return (
    <View className="flex-1 bg-black">
      {/* Compact Header */}
      <View className="px-4 pt-0 pb-3">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-400 text-14 font-medium">
            {String(filteredConfessions.length)} {filteredConfessions.length === 1 ? "secret" : "secrets"}
          </Text>

          {userConfessions.length > 0 && (
            <Pressable
              onPress={handleDeleteAll}
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
              }}
            >
              <Text className="text-red-400 text-12 font-medium">Delete All</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View className="bg-gray-900 rounded-lg px-4 py-3 mb-4 flex-row items-center">
          <Ionicons name="search" size={16} color="#8B98A5" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search your secrets..."
            placeholderTextColor="#8B98A5"
            className="text-white text-14 ml-3 flex-1"
          />
        </View>

        {/* Filter Tabs */}
        <SegmentedTabs
          tabs={filterTabs}
          activeTab={activeFilter}
          onTabChange={(id) => setActiveFilter(id as FilterType)}
        />
      </View>

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View className="bg-gray-900 px-4 py-3 flex-row justify-between items-center">
          <Text className="text-white text-14">{selectedItems.size} selected</Text>
          <View className="flex-row">
            <Pressable
              onPress={handleDeleteSelected}
              className="bg-red-600 px-3 py-2 rounded-lg mr-2"
              disabled={selectedItems.size === 0}
            >
              <Text className="text-white text-12 font-medium">Delete</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedItems(new Set());
              }}
              className="bg-gray-700 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-12 font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* List */}
      <FlashList
        data={filteredConfessions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingTop: 0 }}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}
