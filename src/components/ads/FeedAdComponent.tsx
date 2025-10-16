import React from "react";
import { View } from "react-native";
import { BannerAdComponent } from "./BannerAdComponent";
import { useSubscriptionStore } from "../../features/subscription";

interface FeedAdComponentProps {
  index: number;
  interval?: number;
  placement?: "home-feed" | "video-feed" | "profile";
}

export const FeedAdComponent: React.FC<FeedAdComponentProps> = ({ index, interval = 5, placement = "home-feed" }) => {
  const { isPremium } = useSubscriptionStore();

  // Don't show ads for premium users
  if (isPremium) return null;

  return (
    <View
      style={{
        backgroundColor: "#1a1a1a",
        marginVertical: 8,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#2a2a2a",
      }}
    >
      <BannerAdComponent size="medium" style={{ marginVertical: 0 }} placement={placement} />
    </View>
  );
};
