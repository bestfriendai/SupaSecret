import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Dimensions, StatusBar } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useConfessionStore } from "../state/confessionStore";
import EnhancedVideoItem from "./EnhancedVideoItem";

const { height: screenHeight } = Dimensions.get("window");

interface OptimizedVideoListProps {
  onClose: () => void;
  initialIndex?: number;
}

export default function OptimizedVideoList({ onClose, initialIndex = 0 }: OptimizedVideoListProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const videoConfessions = useMemo(() => confessions.filter((c) => c.type === "video"), [confessions]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexRef = useRef(initialIndex);

  // Load confessions when component mounts
  useEffect(() => {
    if (confessions.length === 0) {
      loadConfessions();
    }
  }, [confessions.length, loadConfessions]);

  // FlashList doesn't need getItemLayout as it handles layout automatically

  // Handle viewability changes for video playback
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const first = viewableItems.find((v: any) => v.isViewable) || viewableItems[0];
    if (first && typeof first.index === "number") {
      currentIndexRef.current = first.index;
      setCurrentIndex(first.index); // trigger re-render so isActive updates
    }
  }, []);

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
      waitForInteraction: false,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <EnhancedVideoItem confession={item} isActive={index === currentIndex} onClose={onClose} />
    ),
    [onClose, currentIndex],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <FlashList
          data={videoConfessions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          pagingEnabled={true}
          snapToInterval={screenHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          extraData={currentIndex}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          estimatedItemSize={screenHeight}
          initialScrollIndex={initialIndex}
          getItemType={() => "video"}
          overrideItemLayout={(layout) => {
            layout.size = screenHeight;
          }}
          contentContainerStyle={{ backgroundColor: 'black' }}
          bounces={false}
          scrollEventThrottle={16}
          disableIntervalMomentum={true}
          snapToEnd={false}
        />
      </View>
    </>
  );
}
