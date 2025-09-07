import React from "react";
import { View, Text, Pressable } from "react-native";
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
  style?: any;
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
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: 4,
          flexDirection: "row",
          position: "relative",
        },
        style,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Active indicator */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 4,
            bottom: 4,
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            zIndex: 1,
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
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              zIndex: 2,
              borderRadius: 8,
            }}
          >
            {/* Icon */}
            {Boolean(tab.icon) && (
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? "#000000" : "#FFFFFF"}
                style={{ marginRight: tab.label ? 6 : 0 }}
              />
            )}

            {/* Label */}
            {Boolean(tab.label) && (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isActive ? "#000000" : "#FFFFFF",
                }}
              >
                {tab.label}
              </Text>
            )}

            {/* Badge */}
            {(tab.badge ?? 0) > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  right: 8,
                  backgroundColor: "#EF4444",
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: "600",
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
