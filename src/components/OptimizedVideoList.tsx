import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Dimensions, StatusBar } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { Confession } from "../types/confession";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import EnhancedVideoItem from "./EnhancedVideoItem";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import ReportModal from "./ReportModal";

const { height: screenHeight } = Dimensions.get("window");

interface OptimizedVideoListProps {
  onClose: () => void;
  initialIndex?: number;
}

export default function OptimizedVideoList({ onClose, initialIndex = 0 }: OptimizedVideoListProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const videoConfessions = useMemo(() => confessions.filter((c) => c.type === "video"), [confessions]);
  const { saveConfession, unsaveConfession, isSaved } = useSavedStore();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexRef = useRef(initialIndex);

  // Track if this tab is currently focused
  const isFocused = useIsFocused();

  // Debug focus changes and handle global video pause
  useEffect(() => {
    if (__DEV__) console.log(`🎥 OptimizedVideoList: isFocused changed to ${isFocused}`);

    if (!isFocused) {
      // When tab loses focus, force all video items to pause
      if (__DEV__) console.log(`🎥 Tab lost focus - forcing all videos to pause`);
      // Note: FlashList will re-render items based on extraData including isFocused
    }
  }, [isFocused]);

  // Bottom sheet refs
  const commentSheetRef = useRef<BottomSheetModal>(null);
  const shareSheetRef = useRef<BottomSheetModal>(null);

  // State for current video being interacted with
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentVideoText, setCurrentVideoText] = useState<string>("");
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Load confessions when component mounts
  useEffect(() => {
    if (confessions.length === 0) {
      loadConfessions();
    }
  }, [confessions.length, loadConfessions]);

  // Handle screen focus for video playback control
  useFocusEffect(
    useCallback(() => {
      // Screen gains focus - this handles navigation to/from this screen
      return () => {
        // Screen loses focus - this handles navigation away from this screen
      };
    }, []),
  );

  // FlashList doesn't need getItemLayout as it handles layout automatically

  // Handle viewability changes for video playback
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ item: Confession; isViewable: boolean; index: number | null }> }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index !== null) || viewableItems[0];
    if (first && first.index !== null) {
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

  // Handle comment press
  const handleCommentPress = useCallback(
    (confessionId: string) => {
      setCurrentVideoId(confessionId);
      const video = videoConfessions.find((v) => v.id === confessionId);
      setCurrentVideoText(video?.transcription || video?.content || "");
      commentSheetRef.current?.present();
    },
    [videoConfessions],
  );

  // Handle share press
  const handleSharePress = useCallback((confessionId: string, confessionText: string) => {
    setCurrentVideoId(confessionId);
    setCurrentVideoText(confessionText);
    shareSheetRef.current?.present();
  }, []);

  // Handle save press
  const handleSavePress = useCallback(
    async (confessionId: string) => {
      try {
        if (isSaved(confessionId)) {
          await unsaveConfession(confessionId);
        } else {
          await saveConfession(confessionId);
        }
      } catch (error) {
        console.error("Failed to toggle save:", error);
      }
    },
    [saveConfession, unsaveConfession, isSaved],
  );

  // Handle report press
  const handleReportPress = useCallback((confessionId: string, confessionText: string) => {
    setCurrentVideoId(confessionId);
    setCurrentVideoText(confessionText);
    setReportModalVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Confession; index: number }) => (
      <EnhancedVideoItem
        confession={item}
        isActive={index === currentIndex && isFocused}
        onClose={onClose}
        onCommentPress={handleCommentPress}
        onSharePress={handleSharePress}
        onSavePress={handleSavePress}
        onReportPress={handleReportPress}
        forceUnmuted={true} // Force unmute for video tab
        screenFocused={isFocused}
      />
    ),
    [onClose, currentIndex, isFocused, handleCommentPress, handleSharePress, handleSavePress, handleReportPress],
  );

  const keyExtractor = useCallback((item: Confession) => item.id, []);

  return (
    <>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: "black" }}>
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
          extraData={{ currentIndex, isFocused }}
          showsVerticalScrollIndicator={false}
                    initialScrollIndex={initialIndex}
          getItemType={() => "video"}
          overrideItemLayout={(layout) => {
            layout.span = 1;
          }}
          contentContainerStyle={{ backgroundColor: "black" }}
          bounces={false}
          scrollEventThrottle={16}
          disableIntervalMomentum={true}
          snapToEnd={false}
          // FlashList v2 performance props
        />
      </View>

      {/* Comment Bottom Sheet */}
      <EnhancedCommentBottomSheet
        bottomSheetModalRef={commentSheetRef}
        confessionId={currentVideoId || ""}
        key={currentVideoId || "empty"}
      />

      {/* Share Bottom Sheet */}
      <EnhancedShareBottomSheet
        bottomSheetModalRef={shareSheetRef}
        confessionId={currentVideoId || ""}
        confessionText={currentVideoText}
      />

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        confessionId={currentVideoId || undefined}
        contentType="confession"
      />
    </>
  );
}
