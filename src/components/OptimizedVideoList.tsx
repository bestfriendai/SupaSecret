import React, { useCallback, useMemo, useRef } from "react";
import { View, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useConfessionStore } from "../state/confessionStore";
import EnhancedVideoItem from "./EnhancedVideoItem";

const { height: screenHeight } = Dimensions.get("window");

interface OptimizedVideoListProps {
  onClose: () => void;
}

export default function OptimizedVideoList({ onClose }: OptimizedVideoListProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const videoConfessions = useMemo(() => confessions.filter((c) => c.type === "video"), [confessions]);

  const currentIndexRef = useRef(0);
  // Track current index for isActive flag
  const videoPlayersRef = useRef<Map<string, any>>(new Map());

  // FlashList doesn't need getItemLayout as it handles layout automatically

  // Handle viewability changes for video playback
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      const visibleItem = viewableItems[0];
      if (visibleItem) {
        const newIndex = visibleItem.index;

        currentIndexRef.current = newIndex;
      }
    },
    [videoConfessions],
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 80,
      waitForInteraction: false,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      return <EnhancedVideoItem confession={item} isActive={index === currentIndexRef.current} onClose={onClose} />;
    },
    [onClose],
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
