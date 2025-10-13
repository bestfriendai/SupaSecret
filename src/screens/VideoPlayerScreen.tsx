import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useShallow } from "zustand/react/shallow";
import { useConfessionStore } from "../state/confessionStore";
import OptimizedVideoList from "../components/OptimizedVideoList";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { createScreenValidator } from "../utils/screenValidation";

type VideoPlayerScreenRouteProp = RouteProp<RootStackParamList, "VideoPlayer">;

export default function VideoPlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoPlayerScreenRouteProp>();
  const { confessionId } = route.params || {};
  const validator = createScreenValidator("VideoPlayerScreen");

  // Use shallow equality for confessions array to prevent unnecessary re-renders
  const confessions = useConfessionStore(useShallow((state) => state.confessions));
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);

  const [initialIndex, setInitialIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const indexCalculatedRef = useRef(false);

  // Load confessions if not already loaded
  useEffect(() => {
    validator.log("Screen mounted", { confessionId, confessionsCount: confessions.length });

    if (!confessionId) {
      validator.warn("No confession ID provided, using default");
    }

    if (confessions.length === 0) {
      validator.log("Loading confessions...");
      loadConfessions().catch((error) => {
        validator.error("Failed to load confessions:", error);
      });
    }
  }, [confessions.length, loadConfessions, confessionId, validator]);

  // Find the index of the specific video to start with - ONLY ONCE
  useEffect(() => {
    // Only calculate index once when confessions are loaded
    if (confessions.length > 0 && !indexCalculatedRef.current) {
      const videoConfessions = confessions.filter((c) => c.type === "video");
      validator.log("Video confessions found:", videoConfessions.length);

      if (confessionId) {
        const index = videoConfessions.findIndex((c) => c.id === confessionId);
        if (index !== -1) {
          validator.log("Starting at video index:", index);
          setInitialIndex(index);
        } else {
          validator.warn(`Video ${confessionId} not found, starting at index 0`);
          setInitialIndex(0);
        }
      } else {
        validator.log("No specific video requested, starting at index 0");
        setInitialIndex(0);
      }

      // Mark as calculated and ready to render
      indexCalculatedRef.current = true;
      setIsReady(true);
    }
  }, [confessions.length, confessionId, validator]);

  const handleClose = useCallback(() => {
    try {
      validator.log("Closing video player");
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        validator.warn("Cannot go back, navigating to Home");
        (navigation as any).navigate("Home");
      }
    } catch (error) {
      validator.error("Navigation failed:", error);
      // Force navigate to home as fallback
      (navigation as any).navigate("Home");
    }
  }, [navigation, validator]);

  // Don't render until we've calculated the initial index
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center" edges={[]}>
        <Text className="text-white">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={[]}>
      <OptimizedVideoList
        onClose={handleClose}
        initialIndex={initialIndex}
        onError={(error) => {
          validator.error("Video list error:", error);
        }}
      />
    </SafeAreaView>
  );
}
