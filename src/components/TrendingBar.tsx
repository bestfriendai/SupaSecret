import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTrendingStore } from "../state/trendingStore";
import { TabParamList } from "../navigation/AppNavigator";
import TrendingBarItem from "./TrendingBarItem";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";

type NavigationProp = BottomTabNavigationProp<TabParamList>;

interface TrendingBarProps {
  visible?: boolean;
}

export default function TrendingBar({ visible = true }: TrendingBarProps) {
  const navigation = useNavigation<NavigationProp>();
  const [_isRefreshing, setIsRefreshing] = useState(false);
  const { impactAsync } = usePreferenceAwareHaptics();

  const { trendingHashtags, isLoading, error, loadTrendingHashtags, searchByHashtag } = useTrendingStore();

  const opacity = useSharedValue(visible ? 1 : 0);
  const translateY = useSharedValue(visible ? 0 : -50);

  useEffect(() => {
    // Load trending data on mount
    if (visible) {
      loadTrendingHashtags(24, 5); // Past 24 hours, top 5
    }
  }, [loadTrendingHashtags, visible]);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
    translateY.value = withSpring(visible ? 0 : -50, {
      damping: 15,
      stiffness: 100,
    });
  }, [visible]);

  const handleHashtagPress = (hashtag: string) => {
    // Navigate to trending screen with search
    navigation.navigate("Trending");
    // Trigger search after navigation
    setTimeout(() => {
      searchByHashtag(hashtag);
    }, 100);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    impactAsync();
    try {
      await loadTrendingHashtags(24, 5);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewAll = () => {
    impactAsync();
    navigation.navigate("Trending");
  };

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#000000",
          borderBottomWidth: 1,
          borderBottomColor: "#374151",
          shadowColor: "#1D9BF0",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        animatedStyle,
      ]}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center">
          <Ionicons name="trending-up" size={16} color="#1D9BF0" />
          <Text className="text-white text-13 font-semibold ml-2">Trending Now</Text>
          {isLoading && (
            <View className="ml-2">
              <Ionicons name="refresh" size={12} color="#6B7280" />
            </View>
          )}
        </View>

        <Pressable
          onPress={handleViewAll}
          className="flex-row items-center touch-target px-2 py-2 -mx-2 -my-2 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="View all trending topics"
        >
          <Text className="text-blue-400 text-12 font-medium">View All</Text>
          <Ionicons name="chevron-forward" size={12} color="#1D9BF0" />
        </Pressable>
      </View>

      {/* Trending Items */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-3">
        {trendingHashtags.length > 0 ? (
          trendingHashtags.map((hashtag, index) => (
            <TrendingBarItem
              key={`${hashtag.hashtag}-${index}`}
              item={hashtag}
              onPress={handleHashtagPress}
              index={index}
            />
          ))
        ) : (
          <Pressable
            onPress={error ? handleRefresh : undefined}
            className="flex-row items-center justify-center py-2 px-4 bg-gray-900/50 rounded-lg min-w-[200px]"
          >
            <Ionicons name={error ? "alert-circle" : isLoading ? "refresh" : "time"} size={14} color="#6B7280" />
            <Text className="text-gray-400 text-12 ml-2">
              {error ? "Tap to retry" : isLoading ? "Loading..." : "No trending hashtags yet"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </Animated.View>
  );
}
