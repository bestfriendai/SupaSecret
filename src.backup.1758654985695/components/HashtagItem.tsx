import React, { memo, useCallback, useMemo } from "react";
import { View, Text, Pressable, ViewStyle, TextStyle } from "react-native";
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
  // Memoize calculated values
  const normalizedPercentage = useMemo(
    () => Math.max(0, Math.min(item.percentage / PROGRESS_MAX_PERCENT, 1)),
    [item.percentage],
  );

  const percentageText = useMemo(() => `${(normalizedPercentage * 100).toFixed(1)}%`, [normalizedPercentage]);

  const progressWidth = useMemo(() => `${Math.round(normalizedPercentage * 100)}%` as const, [normalizedPercentage]);

  const mentionText = useMemo(() => `${item.count} ${item.count === 1 ? "mention" : "mentions"}`, [item.count]);

  // Stable callback
  const handlePress = useCallback(() => onPress(item.hashtag), [onPress, item.hashtag]);

  // Memoize accessibility props
  const a11yProps = useMemo(
    () => getButtonA11yProps(`Hashtag ${item.hashtag}`, `Tap to search ${item.hashtag}`),
    [item.hashtag],
  );

  // Memoize styles
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: "#0F1724",
      borderRadius: 12,
      marginBottom: 8,
    }),
    [],
  );

  const hashtagTextStyle = useMemo<TextStyle>(() => ({ color: "#fff", fontSize: 16, fontWeight: "600" }), []);

  const mentionTextStyle = useMemo<TextStyle>(() => ({ color: "#9CA3AF", fontSize: 13 }), []);

  const percentageTextStyle = useMemo<TextStyle>(() => ({ color: "#60A5FA", fontSize: 14, fontWeight: "700" }), []);

  const progressBarStyle = useMemo<ViewStyle>(
    () => ({ width: 64, height: 8, backgroundColor: "#1F2937", borderRadius: 99, marginTop: 6 }),
    [],
  );

  const progressFillStyle = useMemo<ViewStyle>(
    () => ({
      height: "100%",
      backgroundColor: "#1D9BF0",
      borderRadius: 99,
      width: progressWidth,
    }),
    [progressWidth],
  );

  return (
    <Pressable onPress={handlePress} {...a11yProps} style={containerStyle}>
      <View style={{ flex: 1 }}>
        <Text style={hashtagTextStyle}>{item.hashtag}</Text>
        <Text style={mentionTextStyle}>{mentionText}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={percentageTextStyle}>{percentageText}</Text>
        <View style={progressBarStyle}>
          <View style={progressFillStyle} />
        </View>
      </View>
    </Pressable>
  );
}

// Enhanced memo comparison
const areEqual = (prevProps: Props, nextProps: Props) => {
  // Quick reference check
  if (prevProps.item === nextProps.item) return true;

  // Granular comparison
  return (
    prevProps.item.hashtag === nextProps.item.hashtag &&
    prevProps.item.count === nextProps.item.count &&
    prevProps.item.percentage === nextProps.item.percentage &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.index === nextProps.index &&
    prevProps.total === nextProps.total
  );
};

export const HashtagItem = memo(HashtagItemComponent, areEqual);

export default HashtagItem;
