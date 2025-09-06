import React, { useCallback, useMemo, useRef } from "react";
import { View, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useVideoPlayer } from "expo-video";
import { useConfessionStore } from "../state/confessionStore";
import EnhancedVideoItem from "./EnhancedVideoItem";

const { height: screenHeight } = Dimensions.get("window");

interface OptimizedVideoListProps {
  onClose: () => void;
}

export default function OptimizedVideoList({ onClose }: OptimizedVideoListProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const userPreferences = useConfessionStore((state) => state.userPreferences);
  const videoConfessions = useMemo(
    () => confessions.filter((c) => c.type === "video"),
    [confessions]
  );

  const currentIndexRef = useRef(0);
  const videoPlayersRef = useRef<Map<string, any>>(new Map());

  // Create video player for a specific item
  const createVideoPlayer = useCallback((confessionId: string, videoUri?: string) => {
    if (!videoPlayersRef.current.has(confessionId)) {
      // Use actual video URI or fallback to placeholder for demo
      const sourceUri = videoUri || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

      const player = useVideoPlayer(
        sourceUri,
        (player) => {
          player.loop = true;
          // Respect user's sound preference
          player.muted = !userPreferences.soundEnabled;
        }
      );
      videoPlayersRef.current.set(confessionId, player);
    }
    return videoPlayersRef.current.get(confessionId);
  }, [userPreferences.soundEnabled]);

  // FlashList doesn't need getItemLayout as it handles layout automatically

  // Handle viewability changes for video playback
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      const visibleItem = viewableItems[0];
      if (visibleItem) {
        const newIndex = visibleItem.index;
        const currentConfession = videoConfessions[newIndex];
        
        // Pause all videos
        videoPlayersRef.current.forEach((player) => {
          player.pause();
        });

        // Play current video
        const currentPlayer = createVideoPlayer(currentConfession.id);
        currentPlayer.play();
        
        currentIndexRef.current = newIndex;
      }
    },
    [videoConfessions, createVideoPlayer]
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 80,
      waitForInteraction: false,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const player = createVideoPlayer(item.id, item.videoUri);
      return (
        <EnhancedVideoItem
          confession={item}
          player={player}
          isActive={index === currentIndexRef.current}
          onClose={onClose}
        />
      );
    },
    [createVideoPlayer, onClose]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View className="flex-1 bg-black">
      <FlashList
        data={videoConfessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        removeClippedSubviews
        estimatedItemSize={screenHeight}
      />
    </View>
  );
}