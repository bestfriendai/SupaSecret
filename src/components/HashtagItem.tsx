import React, { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { HashtagData } from "../utils/trending";
import { PROGRESS_MAX_PERCENT } from "./trendingConstants";
import { getButtonA11yProps } from "../utils/accessibility";

type Props = {
  item: HashtagData;
  onPress: (hashtag: string) => void;
  index?: number;
  total?: number;
};

function HashtagItemComponent({ item, onPress }: Props) {
  const normalizedPercentage = Math.max(0, Math.min(item.percentage / PROGRESS_MAX_PERCENT, 1));

  const handlePress = useCallback(() => onPress(item.hashtag), [onPress, item.hashtag]);

  return (
    <Pressable
      onPress={handlePress}
      {...getButtonA11yProps(`Hashtag ${item.hashtag}`, `Tap to search ${item.hashtag}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        backgroundColor: "#0F1724",
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{item.hashtag}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
          {item.count} {item.count === 1 ? "mention" : "mentions"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>
          {(normalizedPercentage * 100).toFixed(1)}%
        </Text>
        <View style={{ width: 64, height: 8, backgroundColor: "#1F2937", borderRadius: 99, marginTop: 6 }}>
          <View
            style={{
              height: "100%",
              backgroundColor: "#1D9BF0",
              borderRadius: 99,
              width: `${Math.round(normalizedPercentage * 100)}%`,
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

export const HashtagItem = memo(HashtagItemComponent);

export default HashtagItem;
