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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debug logging for component lifecycle
  if (__DEV__) {
    console.log(`[RetryBanner] Component rendered - visible: ${visible}, message: "${message}" at ${new Date().toISOString()}`);
  }

  useEffect(() => {
    const unsubscribe = subscribeRetryEvents((e: RetryEvent) => {
      const source = e.source === "supabase" ? "Database" : e.source === "api" ? "Network" : "Network";
      setMessage(`${source}: retrying (attempt ${e.attempt})…`);
      
      if (__DEV__) {
        console.log(`[RetryBanner] Retry event received - source: ${e.source}, attempt: ${e.attempt} at ${new Date().toISOString()}`);
        console.log(`[RetryBanner] Banner becoming visible with message: "${source}: retrying (attempt ${e.attempt})…"`);
      }
      
      setVisible(true);

      // Fade in quickly
      Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();

      // Clear any existing timeout before setting a new one
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      // Auto-hide after 1500ms unless another retry event extends it
      hideTimeoutRef.current = setTimeout(() => {
        if (__DEV__) {
          console.log(`[RetryBanner] Auto-hiding banner after timeout at ${new Date().toISOString()}`);
        }
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setVisible(false);
          if (__DEV__) {
            console.log(`[RetryBanner] Banner hidden and visibility set to false at ${new Date().toISOString()}`);
          }
        });
        hideTimeoutRef.current = null;
      }, 1500);
    });

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [fade]);

  if (!visible) {
    if (__DEV__) {
      console.log(`[RetryBanner] Banner not visible, returning null at ${new Date().toISOString()}`);
    }
    return null;
  }

  // Debug logging for render with position and styling
  if (__DEV__) {
    console.log(`[RetryBanner] Rendering visible banner with pointerEvents="none" at ${new Date().toISOString()}`);
    console.log(`[RetryBanner] Banner positioned absolutely at top: 0, zIndex: 9998`);
  }

  return (
    <SafeAreaView 
      pointerEvents="none" 
      style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 9998,
        // Add visual debugging border in development
        ...(__DEV__ ? { borderWidth: 1, borderColor: "red", borderStyle: "dashed" } : {})
      }}
    >
      <Animated.View
        style={{
          opacity: fade,
          margin: 8,
          borderRadius: 10,
          overflow: "hidden",
          // Add visual debugging background in development
          ...(__DEV__ ? { backgroundColor: "rgba(255, 0, 0, 0.1)" } : {})
        }}
        pointerEvents="none"
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
          pointerEvents="none"
        >
          <Ionicons name="refresh" size={16} color="#BFDBFE" style={{ marginRight: 8 }} />
          <Text style={{ color: "#DBEAFE", fontSize: 13, fontWeight: "600" }}>{message}</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
