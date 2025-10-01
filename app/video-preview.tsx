import React from "react";
import { useLocalSearchParams } from "expo-router";
import VideoPreviewScreen from "../src/screens/VideoPreviewScreen";

export default function VideoPreview() {
  const params = useLocalSearchParams();

  // Parse processedVideo from params if passed as JSON string
  const processedVideo = params.processedVideo
    ? typeof params.processedVideo === 'string'
      ? JSON.parse(params.processedVideo)
      : params.processedVideo
    : undefined;

  return <VideoPreviewScreen route={{ params: { processedVideo } }} />;
}
