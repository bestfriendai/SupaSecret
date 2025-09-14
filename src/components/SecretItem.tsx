import React, { memo } from "react";
import { View, Text } from "react-native";
import { TrendingSecret } from "../utils/trending";
import { format } from "date-fns";
import { formatEngagementScore } from "../utils/trending";
import { logger } from "../utils/logger";

type Props = {
  item: TrendingSecret;
};

function isValidTimestamp(ts: unknown): boolean {
  const n = typeof ts === "number" ? ts : typeof ts === "string" ? Date.parse(ts) : NaN;
  return !Number.isNaN(n);
}

function SecretItemComponent({ item }: Props) {
  let dateLabel = "";
  try {
    const ts = item.confession.timestamp;
    if (isValidTimestamp(ts)) {
      const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
      dateLabel = format(d, "MMM d, h:mm a");
    } else {
      dateLabel = "Unknown date";
    }
  } catch (err) {
    logger.error("Failed to format timestamp for secret item:", err);
    dateLabel = "Unknown date";
  }

  return (
    <View style={{ backgroundColor: "#0F1724", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 15, lineHeight: 20 }} numberOfLines={3}>
            {item.confession.content}
          </Text>
        </View>
        <View style={{ marginLeft: 12, alignItems: "flex-end" }}>
          <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>
            Score: {formatEngagementScore(item.engagementScore)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#EF4444", marginRight: 6 }}>♥</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{item.confession.likes || 0}</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 12 }}>{dateLabel}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 8 }}>{item.confession.type}</Text>
        </View>
      </View>
    </View>
  );
}

export const SecretItem = memo(SecretItemComponent);

export default SecretItem;
