import React, { useCallback, useMemo, useRef, useState, useEffect, memo } from "react";
import { View, Dimensions, StatusBar, NativeSyntheticEvent, NativeScrollEvent, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import type { Confession } from "../types/confession";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useConfessionStore } from "../state/confessionStore";
import { useSavedStore } from "../state/savedStore";
import EnhancedVideoItem from "./EnhancedVideoItem";
import EnhancedCommentBottomSheet from "./EnhancedCommentBottomSheet";
import EnhancedShareBottomSheet from "./EnhancedShareBottomSheet";
import ReportModal from "./ReportModal";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

// Performance constants
const PRELOAD_BUFFER = 2;
const VELOCITY_THRESHOLD = 0.5;
const CLEANUP_INTERVAL = 30000; // 30 seconds

interface OptimizedVideoListProps {
  onClose: () => void;
  initialIndex?: number;
  onError?: (error: unknown) => void;
}

function OptimizedVideoList({ onClose, initialIndex = 0, onError }: OptimizedVideoListProps) {
  const confessions = useConfessionStore((state) => state.confessions);
  const loadConfessions = useConfessionStore((state) => state.loadConfessions);
  const isLoading = useConfessionStore((state) => state.isLoading);
  const videoConfessions = useMemo(() => confessions.filter((c) => c.type === "video"), [confessions]);
  const { saveConfession, unsaveConfession, isSaved } = useSavedStore();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexRef = useRef(initialIndex);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollTime = useRef(Date.now());
  const lastScrollY = useRef(0);
  const preloadedIndexes = useRef<Set<number>>(new Set());
  const performanceMetrics = useRef({
    renderCount: 0,
    scrollEvents: 0,
    avgVelocity: 0,
  });

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
    const loadData = async () => {
      try {
        // Always try to load fresh data when the video tab is accessed
        await loadConfessions();
      } catch (error) {
        onError?.(error);
        console.error('Failed to load confessions:', error);
      }
    };

    loadData();
  }, []); // Run only on mount

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

  // Enhanced viewability changes with intelligent preloading
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Confession; isViewable: boolean; index: number | null }> }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index !== null) || viewableItems[0];
      if (first && first.index !== null) {
        const newIndex = first.index;
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);

        // Intelligent preloading based on scroll direction
        if (Math.abs(scrollVelocity) > VELOCITY_THRESHOLD) {
          const direction = scrollVelocity > 0 ? 1 : -1;
          for (let i = 1; i <= PRELOAD_BUFFER; i++) {
            const preloadIndex = newIndex + (i * direction);
            if (preloadIndex >= 0 && preloadIndex < videoConfessions.length) {
              preloadedIndexes.current.add(preloadIndex);
            }
          }
        }

        // Cleanup old preloaded indexes
        if (preloadedIndexes.current.size > PRELOAD_BUFFER * 2) {
          const toKeep = new Set<number>();
          for (let i = -PRELOAD_BUFFER; i <= PRELOAD_BUFFER; i++) {
            const keepIndex = newIndex + i;
            if (preloadedIndexes.current.has(keepIndex)) {
              toKeep.add(keepIndex);
            }
          }
          preloadedIndexes.current = toKeep;
        }
      }
    },
    [scrollVelocity, videoConfessions.length],
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 60,
      minimumViewTime: 100,
      waitForInteraction: false,
    }),
    [],
  );

  // Optimized scroll handler with velocity tracking
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentTime = Date.now();
    const currentY = event.nativeEvent.contentOffset.y;
    const timeDelta = currentTime - lastScrollTime.current;
    const scrollDelta = currentY - lastScrollY.current;

    if (timeDelta > 0) {
      const velocity = scrollDelta / timeDelta;
      setScrollVelocity(velocity);

      // Update performance metrics
      performanceMetrics.current.scrollEvents++;
      performanceMetrics.current.avgVelocity =
        (performanceMetrics.current.avgVelocity * (performanceMetrics.current.scrollEvents - 1) + Math.abs(velocity)) /
        performanceMetrics.current.scrollEvents;
    }

    lastScrollTime.current = currentTime;
    lastScrollY.current = currentY;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    setIsScrolling(false);
    setScrollVelocity(0);
  }, []);

  // Handle comment press
  const handleCommentPress = useCallback(
    (confessionId: string) => {
      try {
        setCurrentVideoId(confessionId);
        const video = videoConfessions.find((v) => v.id === confessionId);
        setCurrentVideoText(video?.transcription || video?.content || "");
        commentSheetRef.current?.present();
      } catch (error) {
        onError?.(error);
        console.error("Failed to open comments:", error);
      }
    },
    [videoConfessions, onError],
  );

  // Handle share press
  const handleSharePress = useCallback((confessionId: string, confessionText: string) => {
    try {
      setCurrentVideoId(confessionId);
      setCurrentVideoText(confessionText);
      shareSheetRef.current?.present();
    } catch (error) {
      onError?.(error);
      console.error("Failed to open share:", error);
    }
  }, [onError]);

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
        onError?.(error);
        console.error("Failed to toggle save:", error);
      }
    },
    [saveConfession, unsaveConfession, isSaved, onError],
  );

  // Handle report press
  const handleReportPress = useCallback((confessionId: string, confessionText: string) => {
    setCurrentVideoId(confessionId);
    setCurrentVideoText(confessionText);
    setReportModalVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Confession; index: number }) => {
      const isPreloading = preloadedIndexes.current.has(index);
      const isNearActive = Math.abs(index - currentIndex) <= 1;
      const shouldOptimizeRender = isScrolling && !isNearActive;

      // Track render performance
      if (__DEV__) {
        performanceMetrics.current.renderCount++;
      }

      return (
        <View style={{ height: screenHeight, width: screenWidth }}>
          <EnhancedVideoItem
            confession={item}
            isActive={index === currentIndex && isFocused && !isScrolling}
            onClose={onClose}
            onCommentPress={handleCommentPress}
            onSharePress={handleSharePress}
            onSavePress={handleSavePress}
            onReportPress={handleReportPress}
            forceUnmuted={true}
            screenFocused={isFocused && index === currentIndex}
          />
        </View>
      );
    },
    [onClose, currentIndex, isFocused, isScrolling, handleCommentPress, handleSharePress, handleSavePress, handleReportPress, onError],
  );

  const keyExtractor = useCallback((item: Confession) => item.id, []);

  // Performance tracking and cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      if (__DEV__) {
        const metrics = performanceMetrics.current;
        if (metrics.scrollEvents > 0) {
          console.log('[OptimizedVideoList] Performance:', {
            renders: metrics.renderCount,
            scrolls: metrics.scrollEvents,
            avgVelocity: metrics.avgVelocity.toFixed(2),
            preloaded: preloadedIndexes.current.size,
          });
        }
      }
      // Clear old preloaded indexes
      if (preloadedIndexes.current.size > PRELOAD_BUFFER * 3) {
        const currentIdx = currentIndexRef.current;
        const newSet = new Set<number>();
        preloadedIndexes.current.forEach(idx => {
          if (Math.abs(idx - currentIdx) <= PRELOAD_BUFFER * 2) {
            newSet.add(idx);
          }
        });
        preloadedIndexes.current = newSet;
      }
    }, CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Show loading state if data is loading
  if (isLoading && videoConfessions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <StatusBar hidden />
        <View style={{ alignItems: "center" }}>
          <View style={{ marginBottom: 16 }}>
            <Ionicons name="videocam-outline" size={48} color="#666" />
          </View>
          <Text style={{ color: "#999", fontSize: 16 }}>Loading videos...</Text>
        </View>
      </View>
    );
  }

  // Show empty state if no videos
  if (!isLoading && videoConfessions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <StatusBar hidden />
        <View style={{ alignItems: "center" }}>
          <View style={{ marginBottom: 16 }}>
            <Ionicons name="videocam-off-outline" size={48} color="#666" />
          </View>
          <Text style={{ color: "#999", fontSize: 16, marginBottom: 8 }}>No videos available</Text>
          <Text style={{ color: "#666", fontSize: 14 }}>Check back later for new content</Text>
        </View>
      </View>
    );
  }

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
            extraData={{ currentIndex, isFocused, isScrolling }}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
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

// Memoized export with optimized comparison
export default memo(OptimizedVideoList, (prevProps, nextProps) => {
  return (
    prevProps.onClose === nextProps.onClose &&
    prevProps.initialIndex === nextProps.initialIndex
  );
});
