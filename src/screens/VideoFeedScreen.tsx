import React from "react";
import { useNavigation } from "@react-navigation/native";
import OptimizedVideoList from "../components/OptimizedVideoList";

export default function VideoFeedScreen() {
  const navigation = useNavigation();

  // Use FlashList-based vertical pager for TikTok-like UX
  return <OptimizedVideoList onClose={() => navigation.goBack()} />;
}
