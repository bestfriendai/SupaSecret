import React from "react";
import { View, Text, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { usePreferenceAwareHaptics } from "../utils/haptics";

export interface TabItem {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  style?: ViewStyle;
}

export default function SegmentedTabs({ tabs, activeTab, onTabChange, style }: SegmentedTabsProps) {
  const { impactAsync } = usePreferenceAwareHaptics();
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const indicatorPosition = useSharedValue(activeIndex);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    indicatorPosition.value = withSpring(activeIndex, {
      damping: 15,
      stiffness: 150,
    });
  }, [activeIndex]);

  const tabWidth = containerWidth > 0 ? containerWidth / Math.max(1, tabs.length) : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorPosition.value * tabWidth,
    width: tabWidth,
  }));

  const handleTabPress = (tabId: string) => {
    impactAsync();
    onTabChange(tabId);
  };

  return (
    <View
      style={[
        {
          backgroundColor: "transparent",
          borderRadius: 16,
          padding: 2,
          flexDirection: "row",
          position: "relative",
        },
        style,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Active indicator with enhanced styling */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 2,
            bottom: 2,
            backgroundColor: "#3B82F6",
            borderRadius: 14,
            zIndex: 1,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          },
          indicatorStyle,
        ]}
      />

      {/* Tab buttons */}
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <Pressable
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              zIndex: 2,
              borderRadius: 14,
            }}
          >
            {/* Icon */}
            {Boolean(tab.icon) && (
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? "#FFFFFF" : "#9CA3AF"}
                style={{ marginRight: tab.label ? 6 : 0 }}
              />
            )}

            {/* Label */}
            {Boolean(tab.label) && (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isActive ? "#FFFFFF" : "#9CA3AF",
                }}
              >
                {tab.label}
              </Text>
            )}

            {/* Badge */}
            {(tab.badge ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: "#EF4444",
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 4,
                  shadowColor: '#EF4444',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.5,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {(tab.badge ?? 0) > 99 ? "99+" : String(tab.badge ?? 0)}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
