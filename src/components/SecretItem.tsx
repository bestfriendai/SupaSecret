import React, { memo, useMemo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { TrendingSecret } from "../utils/trending";
import { format } from "date-fns";
import { formatEngagementScore } from "../utils/trending";
import { logger } from "../utils/logger";

type Props = {
  item: TrendingSecret;
  onPress?: (item: TrendingSecret) => void;
  onLikePress?: (id: string) => void;
};

function isValidTimestamp(ts: unknown): boolean {
  const n = typeof ts === "number" ? ts : typeof ts === "string" ? Date.parse(ts) : NaN;
  return !Number.isNaN(n);
}

function SecretItemComponent({ item, onPress, onLikePress }: Props) {
  // Memoize date formatting to avoid recalculation
  const dateLabel = useMemo(() => {
    try {
      const ts = item.confession.timestamp;
      if (isValidTimestamp(ts)) {
        const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
        return format(d, "MMM d, h:mm a");
      }
      return "Unknown date";
    } catch (err) {
      logger.error("Failed to format timestamp for secret item:", err);
      return "Unknown date";
    }
  }, [item.confession.timestamp]);

  // Memoize formatted engagement score
  const formattedScore = useMemo(
    () => formatEngagementScore(item.engagementScore),
    [item.engagementScore]
  );

  // Memoize computed values
  const likesCount = useMemo(() => item.confession.likes || 0, [item.confession.likes]);
  const contentText = useMemo(() => item.confession.content, [item.confession.content]);
  const confessionType = useMemo(() => item.confession.type, [item.confession.type]);

  // Stable callbacks
  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  const handleLikePress = useCallback(() => {
    onLikePress?.(item.confession.id);
  }, [onLikePress, item.confession.id]);

  // Memoize styles to avoid recreation
  const containerStyle = useMemo(
    () => ({ backgroundColor: "#0F1724", borderRadius: 12, padding: 12, marginBottom: 12 }),
    []
  );

  const contentTextStyle = useMemo(
    () => ({ color: "#fff", fontSize: 15, lineHeight: 20 }),
    []
  );

  const scoreTextStyle = useMemo(
    () => ({ color: "#60A5FA", fontSize: 12, fontWeight: "700" as const }),
    []
  );

  const metaTextStyle = useMemo(
    () => ({ color: "#9CA3AF", fontSize: 12 }),
    []
  );

  return (
    <Pressable onPress={handlePress} style={containerStyle}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={contentTextStyle} numberOfLines={3}>
            {contentText}
          </Text>
        </View>
        <View style={{ marginLeft: 12, alignItems: "flex-end" }}>
          <Text style={scoreTextStyle}>
            Score: {formattedScore}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={handleLikePress} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#EF4444", marginRight: 6 }}>♥</Text>
          <Text style={metaTextStyle}>{likesCount}</Text>
        </Pressable>
        <Text style={[metaTextStyle, { marginLeft: 12 }]}>{dateLabel}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[metaTextStyle, { marginLeft: 8 }]}>{confessionType}</Text>
      </View>
    </Pressable>
  );
}

// Enhanced memo comparison for better performance
const areEqual = (prevProps: Props, nextProps: Props) => {
  // Quick reference check
  if (prevProps.item === nextProps.item) return true;

  // Granular comparison of essential properties
  return (
    prevProps.item.confession.id === nextProps.item.confession.id &&
    prevProps.item.confession.content === nextProps.item.confession.content &&
    prevProps.item.confession.likes === nextProps.item.confession.likes &&
    prevProps.item.confession.timestamp === nextProps.item.confession.timestamp &&
    prevProps.item.confession.type === nextProps.item.confession.type &&
    prevProps.item.engagementScore === nextProps.item.engagementScore &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onLikePress === nextProps.onLikePress
  );
};

export const SecretItem = memo(SecretItemComponent, areEqual);

export default SecretItem;
