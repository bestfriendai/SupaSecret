import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TrendingBarChart from "./TrendingBarChart";
import { HashtagData } from "../utils/trending";
import { usePreferenceAwareHaptics } from "../utils/haptics";

interface TrendingBarItemProps {
  item: HashtagData;
  onPress: (hashtag: string) => void;
  index: number;
}

export default function TrendingBarItem({
  item,
  onPress,
  index,
}: TrendingBarItemProps) {
  const { impactAsync } = usePreferenceAwareHaptics();

  const handlePress = () => {
    impactAsync();
    onPress(item.hashtag);
  };

  // Color gradient based on ranking
  const getItemColor = (index: number) => {
    const colors = [
      "#EF4444", // Red for #1
      "#F97316", // Orange for #2
      "#EAB308", // Yellow for #3
      "#22C55E", // Green for #4
      "#1D9BF0", // Blue for #5+
    ];
    return colors[Math.min(index, colors.length - 1)];
  };

  const itemColor = getItemColor(index);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center bg-gray-900/80 rounded-lg px-3 py-2 mr-2 min-w-[120px]"
      style={{
        borderLeftWidth: 2,
        borderLeftColor: itemColor,
      }}
    >
      {/* Ranking Badge */}
      <View
        className="w-5 h-5 rounded-full items-center justify-center mr-2"
        style={{ backgroundColor: itemColor }}
      >
        <Text className="text-white text-10 font-bold">
          {index + 1}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text
          className="text-white text-12 font-semibold"
          numberOfLines={1}
        >
          {item.hashtag}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-gray-400 text-10">
            {item.count}
          </Text>
          <Text className="text-gray-500 text-10 ml-1">
            ({item.percentage.toFixed(1)}%)
          </Text>
        </View>
      </View>

      {/* Mini Chart */}
      <View className="ml-2 items-center">
        <TrendingBarChart
          percentage={item.percentage * 2} // Scale up for visibility
          maxHeight={16}
          color={itemColor}
          backgroundColor="rgba(75, 85, 99, 0.5)"
        />
      </View>

      {/* Trending Icon */}
      <View className="ml-2">
        <Ionicons
          name="trending-up"
          size={12}
          color={itemColor}
        />
      </View>
    </Pressable>
  );
}
