import React from "react";
import { useNavigation } from "@react-navigation/native";
import EnhancedVideoFeed from "../components/EnhancedVideoFeed";

export default function VideoFeedScreen() {
  const navigation = useNavigation();

  return (
    <EnhancedVideoFeed onClose={() => navigation.goBack()} />
  );
}