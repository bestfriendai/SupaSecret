import React, { useMemo } from "react";
import { Text, View } from "react-native";

interface Props {
  text: string;
  currentTime: number; // seconds
  duration: number; // seconds
}

/**
 * Simple TikTok-style progressive captions overlay.
 * Reveals words proportionally to playback progress.
 */
export default function TikTokCaptionsOverlay({ text, currentTime, duration }: Props) {
  const words = useMemo(() => (text || "").trim().split(/\s+/).filter(Boolean), [text]);
  const total = Math.max(words.length, 1);
  const pct = Math.max(0, Math.min(1, duration > 0 ? currentTime / duration : 0));
  const showCount = Math.ceil(total * pct);

  const revealed = words.slice(0, showCount).join(" ");
  const remaining = words.slice(showCount).join(" ");

  return (
    <View>
      {/* Revealed words */}
      <Text
        className="text-white text-15 leading-6"
        style={{ fontWeight: "600" }}
      >
        {revealed}
        {remaining.length > 0 ? " " : ""}
        <Text className="text-gray-400" style={{ fontWeight: "400" }}>{remaining}</Text>
      </Text>
    </View>
  );
}

