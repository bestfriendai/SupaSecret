/**
 * Video Feed Component
 * TikTok-style vertical scrolling video feed
 * Uses expo-video for optimal performance
 */

import React, { useCallback, useRef, useState, useEffect } from "react";
import { View, FlatList, Dimensions, StyleSheet, Pressable, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ViewToken } from "react-native";
import { VideoPlayer } from "./VideoPlayer";
import type { VideoFeedItem, VideoFeedProps } from "../types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 120,
  waitForInteraction: false,
};

/**
 * Video Feed Component
 * Displays a vertical scrolling feed of videos
 */
export const VideoFeed: React.FC<VideoFeedProps> = ({
  onClose,
  initialIndex = 0,
  videos = [],
  onVideoChange,
  onRefresh,
}) => {
  const flatListRef = useRef<FlatList<VideoFeedItem>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [muted, setMuted] = useState(false);

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        setActiveIndex(newIndex);
        onVideoChange?.(newIndex);
      }
    },
    [onVideoChange],
  );

  const viewabilityConfigCallbackPairs = useRef([{ viewabilityConfig, onViewableItemsChanged }]);

  // Scroll to initial index
  useEffect(() => {
    if (initialIndex > 0 && videos.length > initialIndex) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [initialIndex, videos.length]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    onRefresh?.();
    setTimeout(() => setIsLoading(false), 1000);
  }, [onRefresh]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  // Render video item
  const renderItem = useCallback(
    ({ item, index }: { item: VideoFeedItem; index: number }) => {
      const isActive = index === activeIndex;

      return (
        <View style={styles.videoContainer}>
          <VideoPlayer
            videoUri={item.videoUri}
            autoPlay={isActive}
            loop={true}
            muted={muted}
            showControls={false}
            contentFit="cover"
            style={styles.video}
          />

          {/* Video info overlay */}
          <View style={styles.infoOverlay}>
            {item.transcription && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionText} numberOfLines={3}>
                  {item.transcription}
                </Text>
              </View>
            )}

            {/* Privacy badges */}
            <View style={styles.badgeContainer}>
              {item.faceBlurApplied && (
                <View style={styles.badge}>
                  <Ionicons name="eye-off" size={14} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Face Blur</Text>
                </View>
              )}
              {item.voiceChangeApplied && (
                <View style={styles.badge}>
                  <Ionicons name="mic-off" size={14} color="#FFFFFF" />
                  <Text style={styles.badgeText}>Voice Change</Text>
                </View>
              )}
            </View>
          </View>

          {/* Interaction buttons */}
          <View style={styles.actionsContainer}>
            <Pressable style={styles.actionButton}>
              <Ionicons name="heart-outline" size={32} color="#FFFFFF" />
              <Text style={styles.actionText}>{item.likes}</Text>
            </Pressable>

            <Pressable style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={32} color="#FFFFFF" />
              <Text style={styles.actionText}>{item.comments}</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleToggleMute}>
              <Ionicons name={muted ? "volume-mute" : "volume-high"} size={32} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      );
    },
    [activeIndex, muted, handleToggleMute],
  );

  // Get item layout for optimization
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  // Key extractor
  const keyExtractor = useCallback((item: VideoFeedItem) => item.id, []);

  // Empty state
  if (videos.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={64} color="#6B7280" />
        <Text style={styles.emptyText}>No videos available</Text>
        {onRefresh && (
          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={2}
        onRefresh={onRefresh ? handleRefresh : undefined}
        refreshing={isLoading}
      />

      {/* Close button */}
      {onClose && (
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoContainer: {
    height: SCREEN_HEIGHT,
    width: "100%",
    backgroundColor: "#000000",
  },
  video: {
    flex: 1,
  },
  infoOverlay: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 60,
    paddingHorizontal: 16,
  },
  transcriptionBox: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  transcriptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  actionsContainer: {
    position: "absolute",
    right: 12,
    bottom: 80,
    alignItems: "center",
    gap: 20,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  refreshButton: {
    backgroundColor: "#1D9BF0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default VideoFeed;
