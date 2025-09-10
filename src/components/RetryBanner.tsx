import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { subscribeRetryEvents, RetryEvent } from "../utils/retryLogic";

// Lightweight top banner that shows briefly when a network retry is in progress
export default function RetryBanner() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>("");
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = subscribeRetryEvents((e: RetryEvent) => {
      const source = e.source === "supabase" ? "Database" : e.source === "api" ? "Network" : "Network";
      setMessage(`${source}: retrying (attempt ${e.attempt})…`);
      setVisible(true);

      // Fade in quickly
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();

      // Auto-hide after 1500ms unless another retry event extends it
      const timeout = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
      }, 1500);

      return () => clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
    };
  }, [fade]);

  if (!visible) return null;

  return (
    <SafeAreaView pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9998 }}>
      <Animated.View
        style={{
          opacity: fade,
          margin: 8,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            backgroundColor: "#1D4ED8", // blue-700
            borderColor: "#60A5FA", // blue-400
            borderWidth: 1,
            paddingVertical: 8,
            paddingHorizontal: 12,
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          <Ionicons name="refresh" size={16} color="#BFDBFE" style={{ marginRight: 8 }} />
          <Text style={{ color: "#DBEAFE", fontSize: 13, fontWeight: "600" }}>{message}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
