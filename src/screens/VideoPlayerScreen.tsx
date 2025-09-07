import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import OptimizedVideoList from "../components/OptimizedVideoList";
import type { RootStackParamList } from "../navigation/AppNavigator";

type VideoPlayerScreenRouteProp = RouteProp<RootStackParamList, "VideoPlayer">;

export default function VideoPlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoPlayerScreenRouteProp>();
  const { confessionId } = route.params;
  
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  
  const [initialIndex, setInitialIndex] = useState(0);

  // Load confessions if not already loaded
  useEffect(() => {
    if (confessions.length === 0) {
      loadConfessions();
    }
  }, [confessions.length, loadConfessions]);

  // Find the index of the specific video to start with
  useEffect(() => {
    if (confessions.length > 0) {
      const videoConfessions = confessions.filter((c) => c.type === "video");
      const index = videoConfessions.findIndex((c) => c.id === confessionId);
      if (index !== -1) {
        setInitialIndex(index);
      } else {
        // If video not found, start at the beginning
        console.warn(`Video confession with ID ${confessionId} not found, starting at index 0`);
        setInitialIndex(0);
      }
    }
  }, [confessions, confessionId]);

  return (
    <View className="flex-1 bg-black">
      <OptimizedVideoList 
        onClose={() => navigation.goBack()} 
        initialIndex={initialIndex}
      />
    </View>
  );
}
