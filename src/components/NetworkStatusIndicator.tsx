import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, AccessibilityInfo, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import NetInfo, { NetInfoState, NetInfoStateType } from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ConnectionStatus = "online" | "offline" | "poor" | "reconnecting";
type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "offline";

interface NetworkStatusIndicatorProps {
  position?: "top" | "bottom" | "inline";
  autoHideDelay?: number;
  showBandwidth?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
  minimalMode?: boolean;
  persistentMode?: boolean;
  scrollOffset?: any;
  style?: any;
}

interface ConnectionMetrics {
  status: ConnectionStatus;
  quality: ConnectionQuality;
  type: NetInfoStateType;
  effectiveType?: string;
  downlinkSpeed?: number;
  isInternetReachable: boolean | null;
  details?: string;
}

const getConnectionMetrics = (state: NetInfoState): ConnectionMetrics => {
  const { isConnected, isInternetReachable, type, details } = state;

  if (!isConnected || isInternetReachable === false) {
    return {
      status: "offline",
      quality: "offline",
      type,
      isInternetReachable: isInternetReachable ?? false,
      details: "No internet connection",
    };
  }

  if (type === NetInfoStateType.wifi) {
    const wifiDetails = details as any;
    const strength = wifiDetails?.strength || 100;

    if (strength > 70) {
      return {
        status: "online",
        quality: "excellent",
        type,
        isInternetReachable: true,
        details: "Wi-Fi connected",
      };
    } else if (strength > 50) {
      return {
        status: "online",
        quality: "good",
        type,
        isInternetReachable: true,
        details: "Wi-Fi connected",
      };
    } else {
      return {
        status: "poor",
        quality: "fair",
        type,
        isInternetReachable: true,
        details: "Weak Wi-Fi signal",
      };
    }
  }

  if (type === NetInfoStateType.cellular) {
    const cellularDetails = details as any;
    const generation = cellularDetails?.cellularGeneration;

    switch (generation) {
      case "5g":
        return {
          status: "online",
          quality: "excellent",
          type,
          effectiveType: "5G",
          isInternetReachable: true,
          details: "5G connected",
        };
      case "4g":
        return {
          status: "online",
          quality: "good",
          type,
          effectiveType: "4G",
          isInternetReachable: true,
          details: "4G LTE connected",
        };
      case "3g":
        return {
          status: "poor",
          quality: "fair",
          type,
          effectiveType: "3G",
          isInternetReachable: true,
          details: "3G connection (slower speeds)",
        };
      default:
        return {
          status: "poor",
          quality: "poor",
          type,
          effectiveType: "2G",
          isInternetReachable: true,
          details: "Slow cellular connection",
        };
    }
  }

  return {
    status: isInternetReachable === null ? "reconnecting" : "online",
    quality: "fair",
    type,
    isInternetReachable: isInternetReachable ?? true,
    details: "Checking connection...",
  };
};

export default function NetworkStatusIndicator({
  position = "top",
  autoHideDelay = 5000,
  showBandwidth = false,
  showRetryButton = true,
  onRetry,
  minimalMode = false,
  persistentMode = false,
  scrollOffset,
  style,
}: NetworkStatusIndicatorProps) {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    status: "online",
    quality: "good",
    type: NetInfoStateType.unknown,
    isInternetReachable: true,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [bandwidthMbps, setBandwidthMbps] = useState<number | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttempts = useRef(0);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(position === "top" ? -50 : 50);
  const scale = useSharedValue(0.95);
  const pulseScale = useSharedValue(1);
  const dotScale = useSharedValue(1);
  const retryRotation = useSharedValue(0);

  const statusColors = useMemo(
    () => ({
      online: "#10B981",
      offline: "#EF4444",
      poor: "#F59E0B",
      reconnecting: "#6B7280",
    }),
    [],
  );

  const qualityIcons = useMemo(
    () => ({
      excellent: "wifi",
      good: "wifi",
      fair: "cellular-outline",
      poor: "cellular-outline",
      offline: "cloud-offline",
    }),
    [],
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newMetrics = getConnectionMetrics(state);
      const prevStatus = metrics.status;

      setMetrics(newMetrics);

      if (Platform.OS === "android" && state.details) {
        const details = state.details as any;
        if (details.linkDownBandwidthKbps) {
          setBandwidthMbps(details.linkDownBandwidthKbps / 1000);
        }
      }

      if (newMetrics.status === "offline") {
        setIsVisible(true);
        reconnectAttempts.current = 0;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        AccessibilityInfo.announceForAccessibility("Internet connection lost");
      } else if (newMetrics.status === "poor") {
        setIsVisible(true);
        scheduleAutoHide();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        AccessibilityInfo.announceForAccessibility("Poor connection detected");
      } else if (prevStatus === "offline" && newMetrics.status === "online") {
        setIsVisible(true);
        scheduleAutoHide();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        AccessibilityInfo.announceForAccessibility("Internet connection restored");
      } else if (!persistentMode && newMetrics.status === "online") {
        scheduleAutoHide();
      }

      if (newMetrics.status === "reconnecting") {
        reconnectAttempts.current++;
        startReconnectAnimation();
      }
    });

    NetInfo.fetch().then((state) => {
      const initialMetrics = getConnectionMetrics(state);
      setMetrics(initialMetrics);
      if (initialMetrics.status !== "online" || persistentMode) {
        setIsVisible(true);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });

      if (metrics.status === "poor" || metrics.status === "reconnecting") {
        pulseScale.value = withRepeat(
          withSequence(withTiming(1.05, { duration: 600 }), withTiming(1, { duration: 600 })),
          -1,
          false,
        );
      }

      dotScale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(0.8, { duration: 500 })),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(position === "top" ? -50 : 50, { duration: 300 });
      scale.value = withTiming(0.95, { duration: 300 });
    }
  }, [isVisible, metrics.status, position]);

  const scheduleAutoHide = () => {
    if (!persistentMode && autoHideDelay > 0 && metrics.status === "online") {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
    }
  };

  const startReconnectAnimation = () => {
    retryRotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    retryRotation.value = withSequence(withTiming(360, { duration: 500 }), withTiming(0, { duration: 0 }));
    if (onRetry) onRetry();
    NetInfo.fetch();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const baseTranslateY = translateY.value;
    const scrollAdjustment = scrollOffset ? scrollOffset.value * 0.5 : 0;

    return {
      opacity: opacity.value,
      transform: [{ translateY: baseTranslateY - scrollAdjustment }, { scale: scale.value * pulseScale.value }],
    };
  });

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const retryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${retryRotation.value}deg` }],
  }));

  if (!isVisible && metrics.status === "online" && !persistentMode) {
    return null;
  }

  const positionStyles = {
    top: { top: 50 },
    bottom: { bottom: 100 },
    inline: {},
  };

  const renderMinimal = () => (
    <Animated.View style={[styles.minimalContainer, positionStyles[position], animatedStyle, style]}>
      <Animated.View style={[styles.minimalDot, { backgroundColor: statusColors[metrics.status] }, dotAnimatedStyle]} />
      {metrics.status === "offline" && <Text style={[styles.minimalText, { color: theme.colors.error }]}>Offline</Text>}
    </Animated.View>
  );

  const renderFull = () => (
    <Animated.View
      style={[
        styles.container,
        positionStyles[position],
        { backgroundColor: theme.colors.surfaceLight },
        animatedStyle,
        style,
      ]}
      entering={SlideInUp.duration(300).springify()}
      exiting={SlideOutUp.duration(300).springify()}
    >
      <View style={styles.content}>
        <View style={styles.statusSection}>
          <Animated.View
            style={[styles.statusDot, { backgroundColor: statusColors[metrics.status] }, dotAnimatedStyle]}
          />
          <Ionicons
            name={qualityIcons[metrics.quality] as any}
            size={20}
            color={statusColors[metrics.status]}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: theme.colors.text }]}>{metrics.details}</Text>
            {showBandwidth && bandwidthMbps && (
              <Text style={[styles.bandwidthText, { color: theme.colors.textSecondary }]}>
                {bandwidthMbps.toFixed(1)} Mbps
              </Text>
            )}
          </View>
        </View>

        {showRetryButton && metrics.status !== "online" && (
          <AnimatedPressable
            onPress={handleRetry}
            style={[styles.retryButton, retryAnimatedStyle]}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
          >
            <Ionicons name="refresh" size={18} color={theme.colors.primary} />
          </AnimatedPressable>
        )}
      </View>

      {metrics.status === "reconnecting" && (
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
        </View>
      )}
    </Animated.View>
  );

  return minimalMode ? renderMinimal() : renderFull();
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    zIndex: 1000,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bandwidthText: {
    fontSize: 12,
    marginTop: 2,
  },
  retryButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  progressBar: {
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  progressFill: {
    height: "100%",
    width: "30%",
  },
  minimalContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
  },
  minimalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  minimalText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    color: "white",
  },
});
