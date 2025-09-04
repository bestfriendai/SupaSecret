import React, { useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import EnhancedVideoFeed from "../components/EnhancedVideoFeed";

export default function VideoFeedScreen() {
  const navigation = useNavigation();

  // Handle screen focus/blur for video audio management
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - videos can play with sound
      return () => {
        // Screen is blurred - mute all videos
        // This will be handled in the EnhancedVideoFeed component
      };
    }, [])
  );

  return (
    <EnhancedVideoFeed onClose={() => navigation.goBack()} />
  );
}