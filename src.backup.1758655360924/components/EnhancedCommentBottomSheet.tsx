import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  UIManager} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetFlatList,
  BottomSheetView} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons} from "@expo/vector-icons";
import { format } from "date-fns";
import Svg, { Circle, Rect, Path, Polygon, Ellipse, G } from "react-native-svg";

import { useReplyStore, type ReactionType, type } from "../state/replyStore";
import { VideoDataService } from "../services/VideoDataService";
import { PreferenceAwareHaptics } from "../utils/haptics";
import { InlineCharacterCounter } from "./CharacterCounter";
import { sanitizeText } from "../utils/consolidatedUtils";
import { useToastHelpers } from "../contexts/ToastContext";

// Enable on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Enhanced anonymous avatar generator with geometric patterns
const GeometricAvatar = memo(({ seed, size = 40 }: { seed: string; size?: number }) => {
  const generatePattern = useCallback(
    (seed: string) => {
      const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colorIndex = hash % 10;
      const patternIndex = hash % 8;
      const shapeCount = (hash % 3) + 3;

      const gradientColors = [
        ["#FF6B6B", "#4ECDC4"],
        ["#667EEA", "#764BA2"],
        ["#F093FB", "#F5576C"],
        ["#4FACFE", "#00F2FE"],
        ["#43E97B", "#38F9D7"],
        ["#FA709A", "#FEE140"],
        ["#30CFD0", "#330867"],
        ["#A8EDEA", "#FED6E3"],
        ["#FF9A9E", "#FECFEF"],
        ["#FBC2EB", "#A6C1EE"],
      ] as const;

      const colors = gradientColors[colorIndex];

      const patterns = [
        // Circles
        () => (
          <G>
            {Array.from({ length: shapeCount }).map((_, i) => (
              <Circle
                key={i}
                cx={size / 2 + Math.sin(i * 2.5) * (size / 4)}
                cy={size / 2 + Math.cos(i * 2.5) * (size / 4)}
                r={size / 6 - i * 2}
                fill={colors[i % 2]}
                opacity={0.8 - i * 0.1}
              />
            ))}
          </G>
        ),
        // Rectangles
        () => (
          <G>
            {Array.from({ length: shapeCount }).map((_, i) => (
              <Rect
                key={i}
                x={size / 4 + i * 3}
                y={size / 4 + i * 3}
                width={size / 2 - i * 6}
                height={size / 2 - i * 6}
                fill={colors[i % 2]}
                opacity={0.8 - i * 0.15}
                transform={`rotate(${i * 15} ${size / 2} ${size / 2})`}
              />
            ))}
          </G>
        ),
        // Triangles
        () => (
          <G>
            {Array.from({ length: shapeCount }).map((_, i) => (
              <Polygon
                key={i}
                points={`${size / 2},${size / 4 + i * 3} ${size / 4 + i * 3},${(3 * size) / 4 - i * 3} ${(3 * size) / 4 - i * 3},${(3 * size) / 4 - i * 3}`}
                fill={colors[i % 2]}
                opacity={0.8 - i * 0.15}
              />
            ))}
          </G>
        ),
        // Hexagons
        () => {
          const hexPoints = (cx: number, cy: number, r: number) => {
            return Array.from({ length: 6 })
              .map((_, i) => {
                const angle = (i * Math.PI) / 3;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(" ");
          };
          return (
            <G>
              {Array.from({ length: shapeCount }).map((_, i) => (
                <Polygon
                  key={i}
                  points={hexPoints(size / 2, size / 2, size / 3 - i * 4)}
                  fill={colors[i % 2]}
                  opacity={0.8 - i * 0.15}
                />
              ))}
            </G>
          );
        },
        // Stars
        () => {
          const starPoints = (cx: number, cy: number, r: number) => {
            const points = [];
            for (let i = 0; i < 10; i++) {
              const radius = i % 2 === 0 ? r : r / 2;
              const angle = (i * Math.PI) / 5 - Math.PI / 2;
              points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
            }
            return points.join(" ");
          };
          return (
            <G>
              {Array.from({ length: Math.min(shapeCount, 3) }).map((_, i) => (
                <Polygon
                  key={i}
                  points={starPoints(size / 2, size / 2, size / 3 - i * 6)}
                  fill={colors[i % 2]}
                  opacity={0.8 - i * 0.2}
                />
              ))}
            </G>
          );
        },
        // Waves
        () => (
          <G>
            {Array.from({ length: shapeCount }).map((_, i) => (
              <Path
                key={i}
                d={`M 0,${size / 2 + i * 8} Q ${size / 4},${size / 4 + i * 8} ${size / 2},${size / 2 + i * 8} T ${size},${size / 2 + i * 8}`}
                stroke={colors[i % 2]}
                strokeWidth={3}
                fill="none"
                opacity={0.8 - i * 0.15}
              />
            ))}
          </G>
        ),
        // Dots Grid
        () => (
          <G>
            {Array.from({ length: 16 }).map((_, i) => {
              const row = Math.floor(i / 4);
              const col = i % 4;
              const dotSize = ((hash + i) % 3) + 2;
              return (
                <Circle
                  key={i}
                  cx={size / 5 + (col * size) / 5}
                  cy={size / 5 + (row * size) / 5}
                  r={dotSize}
                  fill={colors[(row + col) % 2]}
                  opacity={0.8 - (row + col) * 0.1}
                />
              );
            })}
          </G>
        ),
        // Spirals
        () => {
          const spiralPath = () => {
            let path = `M ${size / 2},${size / 2}`;
            for (let i = 0; i < 50; i++) {
              const angle = i * 0.3;
              const radius = i * 0.5;
              const x = size / 2 + radius * Math.cos(angle);
              const y = size / 2 + radius * Math.sin(angle);
              path += ` L ${x},${y}`;
            }
            return path;
          };
          return (
            <G>
              <Path d={spiralPath()} stroke={colors[0]} strokeWidth={2} fill="none" opacity={0.8} />
              <Path
                d={spiralPath()}
                stroke={colors[1]}
                strokeWidth={2}
                fill="none"
                opacity={0.5}
                transform={`rotate(120 ${size / 2} ${size / 2})`}
              />
            </G>
          );
        },
      ];

      return { colors, pattern: patterns[patternIndex] };
    },
    [size],
  );

  const { colors, pattern } = useMemo(() => generatePattern(seed), [seed, generatePattern]);

  return (
    <View className="rounded-full overflow-hidden" style={{ width: size, height: size }}>
      <LinearGradient colors={colors} className="absolute w-full h-full" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Svg width={size} height={size} className="absolute">
        {pattern()}
      </Svg>
    </View>
  );
});

// types are now imported from replyStore

// Enhanced comment item with threading support
interface CommentItemProps {
  item: any;
  level?: number;
  onReply: (item: any) => void;
  onReact: (item: any, type: ReactionType) => void;
  onToggleLike: (item: any) => void;
  onLongPress: (item: any) => void;
  onReport: (item: any) => void;
  highlightedId?: string;
  expandedThreads: Set<string>;
  onToggleThread: (id: string, item: any) => void;
  typingUsers: Map<string, boolean>;
}

const CommentItem = memo(
  ({
    item,
    level = 0,
    onReply,
    onReact,
    onToggleLike,
    onLongPress,
    onReport,
    highlightedId,
    expandedThreads,
    onToggleThread,
    typingUsers}: CommentItemProps) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const highlightAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true}),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true}),
      ]).start();
    }, []);

    useEffect(() => {
      if (highlightedId === item.id) {
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false}),
          Animated.timing(highlightAnim, {
            toValue: 0,
            duration: 300,
            delay: 1000,
            useNativeDriver: false}),
        ]).start();
      }
    }, [highlightedId]);

    const handlePress = useCallback(() => {
      PreferenceAwareHaptics.impactAsync();
      onReply(item);
    }, [item, onReply]);

    const handleLongPress = useCallback(() => {
      PreferenceAwareHaptics.impactAsync();
      onLongPress(item);
    }, [item, onLongPress]);

    const _handleReaction = useCallback(
      (type: ReactionType) => {
        PreferenceAwareHaptics.impactAsync();
        onReact(item, type);
      },
      [item, onReact],
    );

    const handleToggleLike = useCallback(() => {
      PreferenceAwareHaptics.impactAsync();
      onToggleLike(item);
    }, [item, onToggleLike]);

    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = expandedThreads.has(item.id);
    const isTyping = typingUsers.get(item.id);

    const highlightColor = highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["transparent", "rgba(147, 51, 234, 0.1)"]});

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim}}
      >
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Comment by Anonymous user`}
        >
          <Animated.View
            className={`flex-row p-3 mx-2 my-1 rounded-xl ${level > 0 ? "ml-6" : ""}`}
            style={{
              backgroundColor: highlightColor}}
          >
            {level > 0 && <View className="absolute -left-3 top-0 bottom-0 w-0.5 bg-purple-500/20 rounded-full" />}

            <GeometricAvatar seed={item.userId || item.id} size={36} />

            <View className="flex-1 ml-3">
              <View className="flex-row items-center mb-1">
                <Text className="text-purple-500 font-semibold text-xs">
                  Anonymous {item.userId?.slice(-4) || "User"}
                </Text>
                <Text className="text-gray-500 text-xs ml-2">
                  {item.timestamp ? format(new Date(item.timestamp), "MMM d, h:mm a") : "just now"}
                </Text>
                {item.edited_at && <Text className="text-gray-500 text-xs ml-1 italic">(edited)</Text>}
              </View>

              <Text className="text-white text-sm leading-5">{sanitizeText(item.content)}</Text>

              {item.reactionCounts && Object.keys(item.reactionCounts).length > 0 && (
                <View className="flex-row mt-2 gap-1">
                  {Object.entries(item.reactionCounts || )
                    .filter(([_, count]: [string, any]) => count > 0)
                    .map(([type, count]: [string, any]) => (
                      <View key={type} className="flex-row items-center bg-purple-500/10 px-2 py-1 rounded-full">
                        <Text className="text-xs mr-1">
                          {type === "heart"
                            ? "❤️"
                            : type === "laugh"
                              ? "😂"
                              : type === "sad"
                                ? "😢"
                                : type === "angry"
                                  ? "😠"
                                  : type === "wow"
                                    ? "😮"
                                    : "👍"}
                        </Text>
                        <Text className="text-purple-500 text-xs">{String(count)}</Text>
                      </View>
                    ))}
                </View>
              )}

              <View className="flex-row mt-2 gap-3">
                <TouchableOpacity onPress={handleToggleLike} className="flex-row items-center">
                  <Ionicons
                    name={item.isLiked ? "heart" : "heart-outline"}
                    size={16}
                    color={item.isLiked ? "#FF3040" : "#94A3B8"}
                  />
                  <Text className="text-gray-400 text-xs ml-1">{item.likes || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onReply(item)} className="flex-row items-center">
                  <Ionicons name="chatbubble-outline" size={16} color="#94A3B8" />
                  <Text className="text-gray-400 text-xs ml-1">Reply</Text>
                </TouchableOpacity>

                {hasReplies && (
                  <TouchableOpacity onPress={() => onToggleThread(item.id, item)} className="flex-row items-center">
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9333EA" />
                    <Text className="text-purple-500 text-xs ml-1">
                      {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => onReport(item)} className="ml-auto">
                  <Ionicons name="flag-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {isTyping && (
                <View className="flex-row items-center mt-2">
                  <ActivityIndicator size="small" color="#9333EA" />
                  <Text className="text-gray-500 text-xs ml-2">Someone is typing...</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Pressable>

        {hasReplies && isExpanded && (
          <View>
            {item.replies.map((reply: any) => (
              <CommentItem
                key={reply.id}
                item={reply}
                level={level + 1}
                onReply={onReply}
                onReact={onReact}
                onToggleLike={onToggleLike}
                onLongPress={onLongPress}
                onReport={onReport}
                highlightedId={highlightedId}
                expandedThreads={expandedThreads}
                onToggleThread={onToggleThread}
                typingUsers={typingUsers}
              />
            ))}
          </View>
        )}
      </Animated.View>
    );
  },
);

// Loading skeleton component
const CommentSkeleton = memo(() => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true}),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true}),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      className="flex-row p-3 mx-2 my-1"
      style={{
        opacity: pulseAnim}}
    >
      <View className="w-9 h-9 rounded-full bg-gray-700" />
      <View className="flex-1 ml-3">
        <View className="w-24 h-3 bg-gray-700 rounded mb-2" />
        <View className="w-4/5 h-4 bg-gray-700 rounded mb-1" />
        <View className="w-3/5 h-4 bg-gray-700 rounded" />
      </View>
    </Animated.View>
  );
});

// Main EnhancedCommentBottomSheet component
interface EnhancedCommentBottomSheetProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
  confessionId: string;
}

const EnhancedCommentBottomSheet = React.memo(
  function EnhancedCommentBottomSheet(props: EnhancedCommentBottomSheetProps) {
    const { bottomSheetModalRef, confessionId } = props ?? ( as any);
    const inputRef = useRef<any>(null);
    const flatListRef = useRef<any>(null);
    const _insets = useSafeAreaInsets();

    const [comment, setComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<"all" | "recent" | "popular">("recent");
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [highlightedId, _setHighlightedId] = useState<string | undefined>();
    const [_showReactionPicker, _setShowReactionPicker] = useState<string | null>(null);

    const { showSuccess, _showError } = useToastHelpers();

    const {
      replies: allReplies,
      pagination: allPagination,
      _loading,
      _error,
      loadReplies,
      loadMoreReplies,
      addReply,
      toggleReplyLike,
      startTyping,
      stopTyping,
      addReaction,
      _removeReaction,
      reportComment,
      searchComments,
      clearSearch,
      subscribeToReplies,
      unsubscribeFromReplies,
      subscribeToTypingIndicators,
      unsubscribeFromTypingIndicators,
      _editReply,
      deleteReply,
      loadThreadReplies} = useReplyStore();

    // Access additional state from store
    const allSearchResults = useReplyStore((state) => state.searchResults);
    const allTypingUsers = useReplyStore((state) => state.typingUsers);

    // Derive data from store state
    const replies = useMemo(() => allReplies[confessionId] ?? [], [allReplies, confessionId]);
    const searchResults = useMemo(() => allSearchResults[confessionId] ?? [], [allSearchResults, confessionId]);
    const page = useMemo(() => allPagination[confessionId], [allPagination, confessionId]);
    const hasMore = page?.hasMore ?? false;
    const totalCount = page?.totalCount ?? replies.length;

    // Derive typing users map
    const typingUsersArr = useMemo(() => allTypingUsers[confessionId] || [], [allTypingUsers, confessionId]);
    const typingUsers = useMemo(
      () => new Map(typingUsersArr.map((t) => [t.replyId || "root", true])),
      [typingUsersArr],
    );

    // Determine which data to display
    const listData = isSearching && searchQuery.trim() ? searchResults : replies;

    const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);

    const initialLoadIdRef = useRef<string | null>(null);
    const loadRepliesStable = useCallback(
      async (id: string) => {
        try {
          await loadReplies(id);
        } catch {
          // Silently handle errors
        }
      },
      [loadReplies],
    );

    useEffect(() => {
      if (!confessionId) return;
      if (initialLoadIdRef.current === confessionId) return;

      initialLoadIdRef.current = confessionId;
      loadRepliesStable(confessionId);
      subscribeToReplies(confessionId);
      subscribeToTypingIndicators(confessionId);

      // Track comment sheet open
      VideoDataService.trackVideoEvent("comment_sheet_opened", {
        confession_id: confessionId,
        timestamp: Date.now()});

      return () => {
        unsubscribeFromReplies();
        unsubscribeFromTypingIndicators();
      };
    }, [confessionId, loadRepliesStable]); // Only depend on confessionId and the memoized loadRepliesStable

    const handleSendComment = useCallback(async () => {
      if (!comment.trim()) return;

      PreferenceAwareHaptics.impactAsync();

      const parentId = replyingTo?.id || null;
      await addReply(confessionId, comment.trim(), true, parentId);

      // Track comment submission
      VideoDataService.trackVideoEvent("comment_submitted", {
        confession_id: confessionId,
        parent_id: parentId,
        comment_length: comment.length,
        has_parent: !!parentId,
        timestamp: Date.now()});

      setComment("");
      setReplyingTo(null);
      showSuccess("Comment added successfully!");

      // Scroll to the new comment
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 300);
    }, [comment, confessionId, replyingTo, addReply, showSuccess]);

    const handleReply = useCallback(
      (item: any) => {
        setReplyingTo(item);
        inputRef.current?.focus();

        // Track reply action
        VideoDataService.trackVideoEvent("comment_reply_initiated", {
          confession_id: confessionId,
          parent_comment_id: item.id,
          timestamp: Date.now()});
      },
      [confessionId],
    );

    const _handleReaction = useCallback(
      async (item: any, type: ReactionType) => {
        await addReaction(item.id, type);

        // Track reaction
        VideoDataService.trackVideoEvent("comment_reaction_added", {
          confession_id: confessionId,
          comment_id: item.id,
          reaction_type: type,
          timestamp: Date.now()});
      },
      [confessionId, addReaction],
    );

    const handleLongPress = useCallback(
      (item: any) => {
        Alert.alert("Comment Options", "", [
          {
            text: "Copy",
            onPress: () => {
              PreferenceAwareHaptics.notificationAsync();
            }},
          {
            text: "Edit",
            onPress: () => {
              // Handle edit
            }},
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteReply(item.id)},
              ]);
            }},
          { text: "Cancel", style: "cancel" },
        ]);
      },
      [deleteReply],
    );

    const handleReport = useCallback(
      (item: any) => {
        Alert.alert("Report Comment", "Why are you reporting this comment?", [
          {
            text: "Spam",
            onPress: () => reportComment(item.id, "spam")},
          {
            text: "Inappropriate",
            onPress: () => reportComment(item.id, "inappropriate")},
          {
            text: "Harassment",
            onPress: () => reportComment(item.id, "harassment")},
          { text: "Cancel", style: "cancel" },
        ]);
      },
      [reportComment],
    );

    const toggleThread = useCallback(
      async (id: string, item: any) => {
        const isExpanding = !expandedThreads.has(id);

        // If expanding and has replies but not loaded, load them first
        if (isExpanding && item.replyCount > 0 && !item.replies?.length) {
          await loadThreadReplies(id);
        }

        setExpandedThreads((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
      },
      [expandedThreads, loadThreadReplies],
    );

    const handleSearch = useCallback(
      (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
          searchComments(confessionId, query);
        } else {
          clearSearch();
        }
      },
      [confessionId, searchComments, clearSearch],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} pressBehavior="close" />
      ),
      [],
    );

    const renderComment = useCallback(
      ({ item }: { item: any }) => (
        <CommentItem
          item={item}
          onReply={handleReply}
          onReact={_handleReaction}
          onToggleLike={(item) => toggleReplyLike(item.id, confessionId)}
          onLongPress={handleLongPress}
          onReport={handleReport}
          highlightedId={highlightedId}
          expandedThreads={expandedThreads}
          onToggleThread={toggleThread}
          typingUsers={typingUsers}
        />
      ),
      [
        handleReply,
        _handleReaction,
        handleLongPress,
        handleReport,
        highlightedId,
        expandedThreads,
        toggleThread,
        typingUsers,
      ],
    );

    const ListHeaderComponent = useCallback(
      () => (
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Text className="text-white text-lg font-bold">{totalCount} Comments</Text>
              <View className="ml-2 bg-purple-500 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-semibold">{totalCount}</Text>
              </View>
            </View>
            <Pressable onPress={() => bottomSheetModalRef.current?.dismiss()}>
              <Ionicons name="close" size={24} color="#8B98A5" />
            </Pressable>
          </View>

          <View className="flex-row gap-2 mb-3">
            {(["recent", "popular", "all"] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-full ${selectedFilter === filter ? "bg-purple-500" : "bg-gray-800"}`}
              >
                <Text className={`text-xs font-semibold ${selectedFilter === filter ? "text-white" : "text-gray-400"}`}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isSearching && (
            <View className="flex-row items-center bg-gray-800 rounded-xl px-3 mb-3">
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                className="flex-1 py-2 px-2 text-sm text-white"
                placeholder="Search comments..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    clearSearch();
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ),
      [totalCount, selectedFilter, isSearching, searchQuery, handleSearch, clearSearch, bottomSheetModalRef],
    );

    const ListEmptyComponent = useCallback(() => {
      if (page?.isLoading) {
        return (
          <View>
            {Array.from({ length: 5 }).map((_, i) => (
              <CommentSkeleton key={i} />
            ))}
          </View>
        );
      }

      return (
        <View className="p-8 items-center">
          <Ionicons name="chatbubble-outline" size={48} color="#CBD5E1" />
          <Text className="text-gray-400 text-base mt-3 text-center">
            {searchQuery ? "No comments found" : "No comments yet"}
          </Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">
            {searchQuery ? "Try a different search" : "Be the first to comment!"}
          </Text>
        </View>
      );
    }, [page?.isLoading, searchQuery]);

    const ListFooterComponent = useCallback(() => {
      if (!hasMore) return null;

      return (
        <View className="p-4 items-center">
          <ActivityIndicator size="small" color="#9333EA" />
        </View>
      );
    }, [hasMore]);

    // Handle empty confessionId case after all hooks are called
    if (!confessionId || confessionId === "") {
      return (
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: "#1A1A1A" }}
          handleIndicatorStyle={{ backgroundColor: "#666" }}
        >
          <BottomSheetView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#6B7280", fontSize: 16 }}>No confession selected</Text>
          </BottomSheetView>
        </BottomSheetModal>
      );
    }

    return (
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#1A1A1A" }}
        handleIndicatorStyle={{ backgroundColor: "#666" }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={{ flex: 1 }}>
          <BottomSheetFlatList
            ref={flatListRef}
            data={listData}
            renderItem={renderComment}
            keyExtractor={(item: any) => item.id}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={ListEmptyComponent}
            ListFooterComponent={ListFooterComponent}
            onEndReached={() => {
              if (hasMore && !page?.isLoadingMore) {
                loadMoreReplies(confessionId);
              }
            }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
            <BlurView intensity={95} className="absolute bottom-0 left-0 right-0">
              <SafeAreaView edges={["bottom"]}>
                {replyingTo && (
                  <View className="flex-row items-center px-4 py-2 bg-purple-500/10 border-t border-purple-500/20">
                    <Text className="flex-1 text-purple-500 text-xs">
                      Replying to {replyingTo.userId?.slice(-4) || "Anonymous"}
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Ionicons name="close" size={18} color="#9333EA" />
                    </TouchableOpacity>
                  </View>
                )}

                <View className="flex-row items-end px-4 py-3 border-t border-gray-800 bg-gray-900/95">
                  <View className="flex-1 flex-row items-end bg-gray-800 rounded-2xl border border-gray-700 px-4 py-2 min-h-[40px] max-h-[120px]">
                    <BottomSheetTextInput
                      ref={inputRef}
                      className="flex-1 text-white text-sm max-h-[100px]"
                      placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                      placeholderTextColor="#94A3B8"
                      value={comment}
                      onChangeText={(text) => {
                        setComment(text);
                        if (text.length > 0) {
                          startTyping(confessionId, replyingTo?.id);
                        } else {
                          stopTyping(confessionId, replyingTo?.id);
                        }
                      }}
                      onBlur={() => stopTyping(confessionId, replyingTo?.id)}
                      multiline
                      maxLength={500}
                      autoCorrect
                      autoCapitalize="sentences"
                    />

                    <TouchableOpacity onPress={() => setIsSearching(!isSearching)} className="ml-2">
                      <Ionicons name="search" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleSendComment}
                    disabled={!comment.trim()}
                    className={`ml-2 w-9 h-9 rounded-full items-center justify-center ${
                      comment.trim() ? "bg-purple-500" : "bg-gray-700"
                    }`}
                  >
                    <Ionicons name="send" size={18} color={comment.trim() ? "white" : "#94A3B8"} />
                  </TouchableOpacity>
                </View>

                {comment.length > 400 && (
                  <View className="px-4 pb-1">
                    <InlineCharacterCounter currentLength={comment.length} maxLength={500} className="text-xs" />
                  </View>
                )}
              </SafeAreaView>
            </BlurView>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.confessionId === nextProps.confessionId;
  },
);

export default EnhancedCommentBottomSheet;
