import React, { useCallback } from 'react';
import { View, Text, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfessionCard } from './ConfessionCard';
import { ConfessionSkeleton } from './ConfessionSkeleton';
import type { Confession } from '../types/confession.types';

interface ConfessionListProps {
  confessions: Confession[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  isRefreshing?: boolean;
  hasMore?: boolean;
  replyCountMap?: Record<string, number>;
  savedConfessionIds?: Set<string>;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onConfessionPress?: (confession: Confession) => void;
  onLike?: (confessionId: string) => void;
  onReport?: (confessionId: string) => void;
  onMoreActions?: (confessionId: string, confessionText: string) => void;
}

export function ConfessionList({
  confessions,
  isLoading = false,
  isLoadingMore = false,
  isRefreshing = false,
  hasMore = false,
  replyCountMap = {},
  savedConfessionIds = new Set(),
  onRefresh,
  onLoadMore,
  onConfessionPress,
  onLike,
  onReport,
  onMoreActions,
}: ConfessionListProps) {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item: confession }: { item: Confession }) => {
      return (
        <ConfessionCard
          confession={confession}
          replyCount={replyCountMap[confession.id] || 0}
          isSaved={savedConfessionIds.has(confession.id)}
          onPress={() => onConfessionPress?.(confession)}
          onLike={() => onLike?.(confession.id)}
          onReport={() => onReport?.(confession.id)}
          onMoreActions={() => onMoreActions?.(confession.id, confession.content)}
        />
      );
    },
    [replyCountMap, savedConfessionIds, onConfessionPress, onLike, onReport, onMoreActions]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ConfessionSkeleton />
        <ConfessionSkeleton />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="flex-1">
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
          <ConfessionSkeleton />
          <ConfessionSkeleton />
          <ConfessionSkeleton showVideo />
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Ionicons name="lock-closed-outline" size={64} color="#8B98A5" />
        <Text className="text-white text-20 font-bold mt-6 text-center">
          No secrets shared yet
        </Text>
        <Text className="text-gray-500 text-15 mt-2 text-center leading-5">
          Be the first to share an anonymous confession with the community
        </Text>
      </View>
    );
  }, [isLoading]);

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [isLoadingMore, hasMore, onLoadMore]);

  const keyExtractor = useCallback((item: Confession) => item.id, []);

  return (
    <FlashList
      data={confessions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#1D9BF0']}
            tintColor="#1D9BF0"
          />
        ) : undefined
      }
      estimatedItemSize={150}
    />
  );
}
